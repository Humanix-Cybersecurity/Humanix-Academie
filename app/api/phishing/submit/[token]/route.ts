// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/phishing/submit/[token] - Capture de submission de formulaire fake.
//
// CONTEXT (Phishing Engine v2, mai 2026) :
//   La landing /phishing/[token] presente un formulaire de fake login (email +
//   password). Quand le user clique "Se connecter" sans realiser que c'est un
//   test, le form POST ici. On marque le PhishingResult comme SUBMITTED et on
//   redirige vers la page debrief educative.
//
// SECURITE / RGPD - REGLE CARDINALE :
//   On NE STOCKE JAMAIS la valeur des champs soumis. Meme hashees, meme
//   chiffrees. Le user a tape son VRAI mot de passe en pensant se connecter
//   a Microsoft -- le capturer serait :
//     - Une exfiltration de credentials prod = catastrophe securite
//     - Une violation RGPD (donnee sensible, sans finalite legitime)
//     - Un risque legal (charge mentale de la conserver, du detruire, etc)
//
//   A la place, on capture seulement la METADONNEE :
//     - Nom du champ (email, password, ...)
//     - Type du champ (text, email, password, tel, ...)
//     - Longueur de la valeur (utile pour education : "tu as tape un mdp
//       de 8 chars sur un site bidon, il est probablement reutilise")
//     - User-Agent (pour stats device, pas pour fingerprinting)
//
// IDEMPOTENCE :
//   submittedAt ecrit seulement si null (premier submit gagne). Les retries
//   du navigateur ne pollueront pas les stats.
//
// RATE-LIMIT :
//   Pas de rate-limit applicatif ici -- le token est unique par user/campagne,
//   donc un attaquant ne peut pas spam des trackTokens valides. Si abuse, il
//   suffit d'invalider le PhishingResult cote admin.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PhishingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Reduce une valeur de field a juste sa metadata "safe". Aucune valeur
 * sensible n'est stockee.
 */
function metadataOfField(name: string, value: FormDataEntryValue): {
  name: string;
  type: string;
  length: number;
} {
  const str = typeof value === "string" ? value : "";
  // Heuristique simple pour deviner le type semantique du field, base sur
  // son nom. Pas parfait mais suffit pour le debrief educatif.
  const lowerName = name.toLowerCase();
  let type = "text";
  if (lowerName.includes("password") || lowerName.includes("mdp")) type = "password";
  else if (lowerName.includes("email") || lowerName.includes("mail")) type = "email";
  else if (lowerName.includes("tel") || lowerName.includes("phone")) type = "tel";
  else if (lowerName.includes("user") || lowerName.includes("login")) type = "username";
  return {
    name,
    type,
    length: str.length,
  };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  if (!token || typeof token !== "string" || token.length === 0) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  // Cherche le PhishingResult par trackToken
  const result = await db.phishingResult.findUnique({
    where: { trackToken: token },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      campaignId: true,
      userId: true,
      campaign: { select: { tenantId: true } },
    },
  });

  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Parse le payload (FormData ou JSON). La landing soumet en FormData natif.
  const contentType = req.headers.get("content-type") ?? "";
  let fieldsMetadata: Array<{ name: string; type: string; length: number }> = [];
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      fieldsMetadata = Object.entries(body).map(([name, value]) =>
        metadataOfField(
          name,
          typeof value === "string" ? value : JSON.stringify(value),
        ),
      );
    } else {
      const formData = await req.formData();
      const seen = new Set<string>();
      for (const [name, value] of formData.entries()) {
        if (seen.has(name)) continue;
        seen.add(name);
        fieldsMetadata.push(metadataOfField(name, value));
      }
    }
  } catch {
    // Body parsing failed : on marque quand meme SUBMITTED (le geste de soumettre
    // est ce qui compte pedagogiquement), avec une metadata vide.
    fieldsMetadata = [];
  }

  // Idempotent : ecrit submittedAt + submittedData seulement si pas deja submitted.
  if (result.submittedAt === null) {
    // Le status passe a SUBMITTED seulement si on n'etait pas deja REPORTED
    // (REPORTED a priorite -- un user qui a signale ne devrait pas etre marque
    // SUBMITTED meme s'il a clique apres pour voir).
    const shouldUpgradeStatus =
      result.status !== PhishingStatus.REPORTED;

    await db.phishingResult.update({
      where: { id: result.id },
      data: {
        submittedAt: new Date(),
        submittedData: {
          fields: fieldsMetadata,
          userAgent: req.headers.get("user-agent") ?? null,
          submittedAt: new Date().toISOString(),
        },
        ...(shouldUpgradeStatus ? { status: PhishingStatus.SUBMITTED } : {}),
      },
    });

    // Event metier (utile pour les webhooks tenant + dashboards)
    await db.event.create({
      data: {
        tenantId: result.campaign.tenantId,
        userId: result.userId,
        type: "phishing_submitted",
        payload: {
          campaignId: result.campaignId,
          fieldsCount: fieldsMetadata.length,
          // On expose les TYPES seulement (password, email...), jamais
          // les valeurs.
          fieldTypes: fieldsMetadata.map((f) => f.type),
        },
      },
    });
  }

  // Redirection vers le debrief educatif. Le user verra son apprentissage
  // contextualise ("tu as soumis 2 champs dont 1 password, voici pourquoi
  // c'est dangereux").
  const url = new URL(req.url);
  const redirectTo = `${url.origin}/phishing/${token}?submitted=1`;
  return NextResponse.redirect(redirectTo, 303);
}
