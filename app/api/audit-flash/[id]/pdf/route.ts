// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/audit-flash/[id]/pdf?exp=<unix>&sig=<hmac_hex>
//
// Telechargement du rapport PDF d'audit flash.
//
// === Securite (pentest fix #4, 2026-05-24) ===
//
// AVANT : URL capability-CUID seule, sans expiration ni audit.
// APRES : URL signee HMAC-SHA256 avec expiration 30j par defaut +
// audit log des acces (table AuditFlashPdfAccess).
//
// Pendant la fenetre de grace (jusqu'a `AUDIT_FLASH_GRACE_UNTIL` env),
// les URLs sans signature sont acceptees avec un log status="no_signature"
// pour permettre la migration progressive des liens deja en circulation
// (boites mail des prospects). Apres la grace : 401.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { AuditFlashReport } from "@/lib/pdf-audit-flash";
import {
  buildAuditResult,
  AuditAnswers,
  CompanySize,
  Sector,
} from "@/lib/audit-flash/scoring";
import { verifySignedPdfUrl } from "@/lib/audit-flash/signed-urls";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Hash de l'IP au format SHA-256 hex (RGPD-compatible, pas reversible).
 */
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Recupere l'IP client en respectant les headers de reverse-proxy
 * (HAProxy bare-metal en frontal en prod).
 */
function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * Fenetre de grace pour les URLs sans signature.
 * Par defaut : 7 jours apres deploiement du fix.
 * Override via env `AUDIT_FLASH_GRACE_UNTIL` (ISO 8601 date).
 */
function isWithinGracePeriod(now: Date = new Date()): boolean {
  const explicit = process.env.AUDIT_FLASH_GRACE_UNTIL;
  if (explicit) {
    const d = new Date(explicit);
    if (!Number.isNaN(d.getTime())) {
      return now < d;
    }
  }
  // Defaut : grace jusqu'au 2026-06-15 (~3 semaines apres deploiement
  // du fix le 2026-05-24, large pour absorber les liens en circulation
  // dans les boites mail). A ajuster manuellement si necessaire.
  const defaultGraceEnd = new Date("2026-06-15T23:59:59Z");
  return now < defaultGraceEnd;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  const submission = await db.auditFlashSubmission.findUnique({
    where: { id },
  });
  if (!submission) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // === Verification de la signature ===
  let accessStatus:
    | "ok"
    | "expired"
    | "bad_signature"
    | "missing_sig"
    | "missing_exp"
    | "no_signature";
  let signatureExp: Date | null = null;

  if (!exp && !sig) {
    // URL sans aucun parametre de signature : ancienne URL.
    // Pendant la grace, on accepte avec log. Apres la grace : 401.
    if (isWithinGracePeriod()) {
      accessStatus = "no_signature";
    } else {
      // Audit log de la tentative rejetee
      await db.auditFlashPdfAccess
        .create({
          data: {
            submissionId: id,
            ipHash: hashIp(clientIp(req)),
            userAgent: req.headers.get("user-agent") ?? null,
            status: "missing_sig",
          },
        })
        .catch((err) => {
          console.error("[audit-flash-pdf] failed to log access", err);
        });
      return NextResponse.json(
        {
          error: "signed_url_required",
          message: "Cette URL n'est plus valide. Regenerez votre lien depuis la page de resultat.",
        },
        { status: 401 },
      );
    }
  } else {
    const verify = verifySignedPdfUrl(id, exp, sig);
    if (!verify.ok) {
      accessStatus = verify.reason;
      // Log de la tentative rejetee
      await db.auditFlashPdfAccess
        .create({
          data: {
            submissionId: id,
            ipHash: hashIp(clientIp(req)),
            userAgent: req.headers.get("user-agent") ?? null,
            status: accessStatus,
          },
        })
        .catch((err) => {
          console.error("[audit-flash-pdf] failed to log access", err);
        });
      const message =
        verify.reason === "expired"
          ? "Ce lien a expire. Regenerez un nouveau lien depuis la page de resultat."
          : "Lien invalide. Verifiez que vous avez bien copie l'URL complete.";
      return NextResponse.json({ error: verify.reason, message }, { status: 401 });
    }
    accessStatus = "ok";
    signatureExp = verify.expiresAt;
  }

  // === Log de l'acces autorise ===
  await db.auditFlashPdfAccess
    .create({
      data: {
        submissionId: id,
        ipHash: hashIp(clientIp(req)),
        userAgent: req.headers.get("user-agent") ?? null,
        status: accessStatus,
        signatureExp,
      },
    })
    .catch((err) => {
      // Best-effort : un echec de log ne doit pas bloquer le download
      console.error("[audit-flash-pdf] failed to log access", err);
    });

  const result = buildAuditResult(
    submission.answers as AuditAnswers,
    submission.size as CompanySize,
    submission.sector as Sector,
  );

  const buffer = await renderToBuffer(
    AuditFlashReport({
      companyName: submission.companyName,
      contactName: submission.contactName,
      email: submission.email,
      size: submission.size as CompanySize,
      sector: submission.sector as Sector,
      generatedAt: submission.createdAt,
      result,
    }),
  );

  const safeCompany = submission.companyName
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();
  const filename = `audit-cyber-humanix-${safeCompany}-${submission.createdAt.toISOString().split("T")[0]}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
