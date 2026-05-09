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
const DEFAULT_FROM_NAME = "Humanix Académie";
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
 * Vérifie le format avant l'appel API pour donner un message clair plutôt
 * qu'un cryptique "scaleway_tem_401".
 */
function detectMisconfiguredToken(token: string): string | null {
  // Format secret-key attendu : UUID (8-4-4-4-12, 36 chars total)
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token,
    );
  if (isUuid) return null;

  // Format access-key courant : "SCW" + 17 caracteres alphanumeriques (20 total)
  const looksLikeAccessKey = /^[Ss][Cc][Ww][A-Za-z0-9]{17}$/.test(token);
  if (looksLikeAccessKey) {
    return "SCALEWAY_TEM_TOKEN looks like an access key (SCW..., 20 chars). The TEM REST API requires the secret key (UUID, 36 chars). See .env.example.";
  }

  return "Invalid SCALEWAY_TEM_TOKEN. Verify that it is the Scaleway IAM secret key (UUID, 36 chars), not the access key. See .env.example.";
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
    params.fromName ?? process.env.NEXT_PUBLIC_APP_NAME ?? DEFAULT_FROM_NAME;

  const normalizedHtml =
    typeof params.html === "string" && params.html.trim().length > 0
      ? params.html
      : undefined;
  const normalizedText =
    typeof params.text === "string" && params.text.trim().length > 0
      ? params.text
      : undefined;

  if (!normalizedHtml && !normalizedText) {
    return {
      ok: false,
      reason: "scaleway_tem_missing_content",
      details:
        "Either `html` or `text` content must be provided to send an email.",
    };
  }

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
    html: normalizedHtml,
    text: normalizedText,
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
      const statusDetails = `${res.status} ${res.statusText || "Unknown Status"}`;
      const rawErrBody = await res.text().catch(() => "");
      const errBody =
        rawErrBody ||
        `[Failed to read error response body from Scaleway TEM API] (HTTP ${statusDetails})`;
      const details = `HTTP ${statusDetails}${errBody ? ` - ${errBody}` : ""}`;
      const truncationSuffix = "... [truncated]";
      const boundedDetails =
        details.length > MAX_ERROR_BODY_LENGTH
          ? `${details.slice(0, Math.max(0, MAX_ERROR_BODY_LENGTH - truncationSuffix.length))}${truncationSuffix}`
          : details;
      return {
        ok: false,
        reason: "scaleway_tem_api_error",
        details: boundedDetails,
      };
    }
    let data: { emails?: { id?: string }[] } = {};
    try {
      data = (await res.json()) as { emails?: { id?: string }[] };
    } catch (e: unknown) {
      console.warn("[scaleway-tem] unable to parse success response JSON", e);
    }
    return { ok: true, providerMessageId: data?.emails?.[0]?.id ?? null };
  } catch (e: unknown) {
    console.error("[scaleway-tem] send failed", e);
    return {
      ok: false,
      reason: "scaleway_tem_send_failed",
      details:
        e instanceof Error
          ? `${e.name}: ${e.message}`
          : "Unknown error type thrown during Scaleway TEM email send",
    };
  }
}
