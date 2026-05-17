// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET  /api/admin/quishing/poster/[campaignId]            (sans logo)
// POST /api/admin/quishing/poster/[campaignId]   multipart (avec logo)
//
// Genere LE PDF unique d'une campagne quishing : 1 page A4 avec le
// QR commun a la campagne. L'admin imprime puis duplique physiquement
// (photocopieuse / impression multiple) pour coller dans les contextes
// adequats (parking, cafeteria, panneau RH...).
//
// LOGO ENTREPRISE :
//   - Optionnel : passe en POST multipart/form-data, field `logo`.
//   - Format accepte : PNG ou JPEG, max 2 MB.
//   - NON STOCKE : lu en memoire, encode base64 pour @react-pdf,
//     supprime apres generation. Aucune persistance disque/BDD.
//   - Si absent : pas de logo affiche (pas non plus de logo Humanix
//     par defaut — l'affiche doit pouvoir passer pour un document
//     interne de l'entreprise).
//
// Auth : ADMIN, RSSI, MANAGER (lecture), SUPERADMIN
// Tenant scope : un admin ne peut telecharger que les posters de SES
// campagnes (cross-tenant impossible).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderQuishingPosterBuffer } from "@/lib/quishing/poster-pdf";
import {
  QUISHING_TEMPLATES,
  type QuishingTemplate,
} from "@/lib/phishing/qr-code";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_LOGO_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Garde-fou auth + ownership tenant + chargement campagne quishing.
 * Centralise pour les 2 handlers (GET sans logo / POST avec logo).
 */
async function authorizeAndLoad(campaignId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "MANAGER" &&
    role !== "RSSI" &&
    role !== "SUPERADMIN"
  ) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  const tenantId = session.user.tenantId as string;

  const campaign = await db.phishingCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign || campaign.tenantId !== tenantId) {
    return {
      error: NextResponse.json(
        { error: "campaign_not_found" },
        { status: 404 },
      ),
    };
  }
  if (campaign.channel !== "QUISHING") {
    return {
      error: NextResponse.json(
        { error: "not_a_quishing_campaign" },
        { status: 400 },
      ),
    };
  }

  const tpl = QUISHING_TEMPLATES[campaign.template as QuishingTemplate];
  if (!tpl) {
    return {
      error: NextResponse.json(
        { error: "invalid_template" },
        { status: 500 },
      ),
    };
  }

  return {
    session,
    tenantId,
    campaign,
    template: campaign.template as QuishingTemplate,
  };
}

/**
 * Lit un fichier File (Web API) et le valide comme logo entreprise.
 * Retourne un data URL prêt pour @react-pdf, ou null si pas de fichier,
 * ou une Response d'erreur si le fichier est invalide.
 */
async function readLogoOrNull(
  file: unknown,
): Promise<{ dataUrl: string | null; error?: NextResponse }> {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { dataUrl: null };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return {
      dataUrl: null,
      error: NextResponse.json(
        { error: "logo_too_large", maxBytes: MAX_LOGO_BYTES },
        { status: 413 },
      ),
    };
  }
  const mime = file.type.toLowerCase();
  if (!ALLOWED_LOGO_MIMES.has(mime)) {
    return {
      dataUrl: null,
      error: NextResponse.json(
        { error: "logo_invalid_mime", allowed: [...ALLOWED_LOGO_MIMES] },
        { status: 415 },
      ),
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  // On peut faire un check magic bytes pour eviter qu'un attaquant
  // upload un .exe renomme en .png. PNG = 89 50 4E 47, JPEG = FF D8 FF
  const head = buffer.subarray(0, 4);
  const isPng =
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47;
  const isJpeg =
    head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (!isPng && !isJpeg) {
    return {
      dataUrl: null,
      error: NextResponse.json(
        { error: "logo_invalid_content" },
        { status: 415 },
      ),
    };
  }
  // Normalisation MIME : on prefere le magic-bytes au header pour eviter
  // les fausses declarations.
  const realMime = isPng ? "image/png" : "image/jpeg";
  const b64 = buffer.toString("base64");
  return { dataUrl: `data:${realMime};base64,${b64}` };
}

async function generatePdfResponse(
  campaignId: string,
  template: QuishingTemplate,
  tenantId: string,
  userId: string | null,
  logoDataUrl: string | null,
): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

  const buffer = await renderQuishingPosterBuffer({
    templateId: template,
    baseUrl,
    campaignId,
    logoDataUrl,
  });

  // Audit log : qui a telecharge quoi
  await db.event
    .create({
      data: {
        tenantId,
        userId,
        type: "quishing_poster_downloaded",
        payload: {
          campaignId,
          template,
          withLogo: !!logoDataUrl,
        },
      },
    })
    .catch(() => {
      // best-effort
    });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `humanix-quishing-${template.toLowerCase()}-${today}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;
  const auth = await authorizeAndLoad(campaignId);
  if ("error" in auth) return auth.error;
  return generatePdfResponse(
    campaignId,
    auth.template,
    auth.tenantId,
    auth.session.user?.id ?? null,
    null,
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;
  const auth = await authorizeAndLoad(campaignId);
  if ("error" in auth) return auth.error;

  // Parse multipart - le logo est optionnel.
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_multipart" },
      { status: 400 },
    );
  }
  const logoResult = await readLogoOrNull(formData.get("logo"));
  if (logoResult.error) return logoResult.error;

  return generatePdfResponse(
    campaignId,
    auth.template,
    auth.tenantId,
    auth.session.user?.id ?? null,
    logoResult.dataUrl,
  );
}
