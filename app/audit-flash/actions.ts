"use server";

// Server actions de l'audit flash : creation d'une soumission + scoring serveur.
// Securite :
//  - validation Zod stricte cote serveur
//  - hash SHA-256 de l'IP (anti-spam, RGPD-compatible)
//  - rate limit basique (1 soumission / IP / 5 min)
//  - pas de CAPTCHA pour l'instant (a ajouter si abus)

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  buildAuditResult,
  CompanySize,
  Sector,
} from "@/lib/audit-flash/scoring";
import { AUDIT_QUESTIONS } from "@/lib/audit-flash/questions";

const ANSWER_VALUES = ["yes", "no", "unsure"] as const;
const SIZE_VALUES: CompanySize[] = ["1-9", "10-49", "50-249", "250+"];
const SECTOR_VALUES: Sector[] = [
  "services",
  "industrie",
  "commerce",
  "sante",
  "finance",
  "public",
  "associatif",
  "autre",
];

const SubmissionSchema = z.object({
  email: z.string().email("Email invalide").max(200),
  contactName: z.string().max(120).optional().nullable(),
  companyName: z.string().min(2, "Nom d'entreprise requis").max(200),
  size: z.enum(SIZE_VALUES as [string, ...string[]]),
  sector: z.enum(SECTOR_VALUES as [string, ...string[]]),
  consentMarketing: z.boolean().optional().default(false),
  answers: z.record(z.string(), z.enum(ANSWER_VALUES)),
});

export type SubmitState = {
  ok: boolean;
  error?: string;
  submissionId?: string;
};

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + "|humanix-audit-salt-v1").digest("hex").slice(0, 32);
}

export async function submitAuditFlash(input: unknown): Promise<SubmitState> {
  // 1. Validation
  const parsed = SubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  // 2. Verification que toutes les questions ont une reponse
  const requiredIds = AUDIT_QUESTIONS.map((q) => q.id);
  const missing = requiredIds.filter((id) => !data.answers[id]);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Veuillez répondre à toutes les questions (${missing.length} manquante${missing.length > 1 ? "s" : ""}).`,
    };
  }

  // 3. Rate limit basique
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const ipHash = hashIp(ip);
  const ua = hdrs.get("user-agent")?.slice(0, 500) ?? null;

  if (ipHash) {
    const recent = await db.auditFlashSubmission.findFirst({
      where: {
        ipHash,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    if (recent) {
      return {
        ok: false,
        error: "Une soumission récente a déjà été enregistrée depuis votre poste. Merci de patienter quelques minutes.",
      };
    }
  }

  // 4. Scoring serveur (le client ne pourra pas tricher)
  const result = buildAuditResult(
    data.answers,
    data.size as CompanySize,
    data.sector as Sector,
  );

  // 5. Persistence
  const submission = await db.auditFlashSubmission.create({
    data: {
      email: data.email.toLowerCase(),
      contactName: data.contactName ?? null,
      companyName: data.companyName,
      size: data.size,
      sector: data.sector,
      answers: data.answers,
      score: result.score,
      verdictLabel: result.verdict.label,
      topRiskCats: result.topRisks.map((r) => r.category).join(","),
      recommendedPlan: result.recommendedPlan.slug,
      nis2Concerned: result.nis2Concerned,
      consentMarketing: data.consentMarketing ?? false,
      ipHash,
      userAgent: ua,
    },
  });

  return { ok: true, submissionId: submission.id };
}

export async function submitAndRedirect(input: unknown) {
  const res = await submitAuditFlash(input);
  if (!res.ok || !res.submissionId) {
    throw new Error(res.error ?? "Échec de la soumission.");
  }
  redirect(`/audit-flash/result/${res.submissionId}`);
}
