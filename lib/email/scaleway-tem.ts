// SPDX-License-Identifier: AGPL-3.0-or-later
// Scaleway Transactional Email (TEM) - provider email FR souverain.
//
// API REST : POST /transactional-email/v1alpha1/regions/{region}/emails
// Auth : header X-Auth-Token avec une cle secrete Scaleway IAM (scope
// "TransactionalEmailEmailFullAccess").
//
// Documentation : https://www.scaleway.com/en/developers/api/transactional-email/
//
// Environnement requis :
//   SCALEWAY_TEM_TOKEN       (clé secrète IAM)
//   SCALEWAY_TEM_PROJECT_ID  (UUID du projet Scaleway)
//   SCALEWAY_TEM_REGION      (défaut "fr-par")
//   EMAIL_FROM               (adresse expéditrice, domaine vérifié dans
//                             la console Scaleway TEM)
import type { SendEmailParams, SendEmailResult } from "./index";

const DEFAULT_REGION = "fr-par";
const MAX_ERROR_BODY_LENGTH = 500;

export function isScalewayTemConfigured(): boolean {
  return Boolean(
    process.env.SCALEWAY_TEM_TOKEN &&
      process.env.SCALEWAY_TEM_PROJECT_ID &&
      process.env.EMAIL_FROM,
  );
}

function getRegion(): string {
  return process.env.SCALEWAY_TEM_REGION ?? DEFAULT_REGION;
}

function getEndpoint(): string {
  return `https://api.scaleway.com/transactional-email/v1alpha1/regions/${getRegion()}/emails`;
}

/**
 * Detecte le piège classique : utilisateur qui colle l'access-key (commence
 * par "SCW", 20 chars) au lieu du secret-key (UUID 36 chars) dans la conf.
 * L'access-key sert au SDK Scaleway officiel mais pas a l'API REST TEM.
 *
 * Verifie le format avant l'appel API pour donner un message clair plutôt
 * qu'un cryptique "scaleway_tem_401".
 */
function detectMisconfiguredToken(token: string): string | null {
  // Format secret-key attendu : UUID v4 (8-4-4-4-12, 36 chars total)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    token,
  );
  if (isUuid) return null;
  if (token.startsWith("SCW") && token.length < 30) {
    return "SCALEWAY_TEM_TOKEN ressemble a un access-key (SCW..., 20 chars). L'API REST TEM exige le SECRET-key (UUID 36 chars). Cf. .env.example.";
  }
  return `SCALEWAY_TEM_TOKEN n'est pas un UUID 36 chars (recu ${token.length} chars). Verifier qu'il s'agit du secret-key IAM Scaleway, pas de l'access-key. Cf. .env.example.`;
}

export async function sendViaScalewayTem(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!isScalewayTemConfigured()) {
    return { ok: false, reason: "scaleway_tem_not_configured" };
  }
  const token = process.env.SCALEWAY_TEM_TOKEN!;
  const projectId = process.env.SCALEWAY_TEM_PROJECT_ID!;

  const tokenIssue = detectMisconfiguredToken(token);
  if (tokenIssue) {
    console.error(`[scaleway-tem] ${tokenIssue}`);
    return {
      ok: false,
      reason: "scaleway_tem_invalid_token_format",
      details: tokenIssue,
    };
  }
  const fromAddress = params.from ?? process.env.EMAIL_FROM!;
  const fromName =
    params.fromName ?? process.env.NEXT_PUBLIC_APP_NAME ?? "Humanix Académie";

  const recipients = (
    Array.isArray(params.to) ? params.to : [params.to]
  ).map((email) => ({ email }));

  const additionalHeaders = params.headers
    ? Object.entries(params.headers).map(([key, value]) => ({ key, value }))
    : undefined;

  const body = {
    from: { email: fromAddress, name: fromName },
    to: recipients,
    subject: params.subject,
    html: params.html ?? undefined,
    text: params.text ?? undefined,
    project_id: projectId,
    additional_headers: additionalHeaders,
  };

  try {
    const res = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        "X-Auth-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res
        .text()
        .catch(() => "[Unable to read error body]");
      return {
        ok: false,
        details: errBody.slice(0, MAX_ERROR_BODY_LENGTH),
      };
    const data = (await res.json().catch(() => ({}))) as {
      emails?: { id?: string }[];
    };
    return { ok: true, providerMessageId: data?.emails?.[0]?.id ?? null };
  } catch (e: unknown) {
    console.error("[scaleway-tem] send failed", e);
    return {
      ok: false,
      reason: "scaleway_tem_send_failed",
      details:
        e instanceof Error ? `${e.name}: ${e.message}` : "Unknown thrown value",
    };
  }
}
