// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/phishing/[token]/debrief - Genere un debrief IA personnalise.
//
// CONTEXT (Phase 5a Phishing Engine v2, mai 2026) :
//   La landing /phishing/[token] appelle cette route en async pour afficher
//   un debrief Mistral personnalise selon :
//     - Le template clique
//     - L'historique du user (clic/submit/report sur les 90 derniers jours)
//     - Le service du user (pour adapter le ton)
//
// SECURITE :
//   - Token cuid opaque suffit pour identifier la session phishing : pas
//     d'auth supplementaire necessaire (l'user qui a recu le mail peut voir
//     son propre debrief, c'est OK pedagogiquement).
//   - On NE TRANSMET PAS le nom complet a Mistral, juste le prenom.
//   - Pas de cle ou IP loggee.
//
// FALLBACK :
//   Si Mistral down ou pas de cle API, retourne 200 avec ok=false. Le client
//   affiche alors un fallback (le bloc markers hardcoded reste visible).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/phishing";
import { generatePhishingDebrief } from "@/lib/ai/phishing-debrief";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  if (!token) {
    return NextResponse.json({ ok: false, error: "invalid_token" });
  }

  // ANTI-ABUS : chaque appel declenche une generation Mistral. Le contenu est
  // deterministe pour un token donne -> on borne a 5/h/token (un porteur de
  // token legitime n'en a pas besoin de plus ; bloque le martelage du quota).
  const rl = checkRateLimit(`phishing-debrief:${token}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const result = await db.phishingResult.findUnique({
    where: { trackToken: token },
    include: {
      campaign: { select: { template: true, tenantId: true } },
      user: { select: { id: true, name: true, service: true, role: true } },
    },
  });
  if (!result) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const tpl = getTemplate(result.campaign.template);
  // Si pas de template enum-based (cas quishing/SMS qui ont d'autres
  // structures), on n'IA pas pour l'instant -- fallback systematique.
  if (!tpl) {
    return NextResponse.json({ ok: false, error: "template_not_supported" });
  }

  // Historique 90 derniers jours (pour personnalisation)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const history = await db.phishingResult.findMany({
    where: {
      userId: result.userId,
      sentAt: { gte: ninetyDaysAgo },
      // Exclure le PhishingResult courant (on regarde le PASSE)
      id: { not: result.id },
    },
    select: {
      clickedAt: true,
      submittedAt: true,
      reportedAt: true,
      campaign: { select: { template: true } },
    },
  });

  const clickedCount = history.filter((h) => h.clickedAt !== null).length;
  const submittedCount = history.filter((h) => h.submittedAt !== null).length;
  const reportedCount = history.filter((h) => h.reportedAt !== null).length;
  // Deduit le theme depuis le slug du template ("FAKE_MICROSOFT" -> "microsoft")
  const clickedThemes = Array.from(
    new Set(
      history
        .filter((h) => h.clickedAt !== null)
        .map((h) =>
          h.campaign.template
            .replace(/^FAKE_/, "")
            .replace(/^SMS_FAKE_/, "")
            .replace(/^QR_FAKE_/, "")
            .toLowerCase(),
        ),
    ),
  );

  const firstName = (result.user.name?.split(" ")[0] ?? "toi").trim();
  // Service ou role generique. Ne pas envoyer le nom complet a Mistral.
  const serviceOrRole = result.user.service ?? result.user.role ?? "Employe";

  const debrief = await generatePhishingDebrief({
    firstName,
    serviceOrRole,
    templateName: tpl.name,
    markers: tpl.markers,
    history: { clickedCount, submittedCount, reportedCount, clickedThemes },
    hasSubmitted: result.submittedAt !== null,
  });

  if (!debrief.ok) {
    return NextResponse.json({ ok: false, error: debrief.error });
  }

  return NextResponse.json({ ok: true, text: debrief.text });
}
