// SPDX-License-Identifier: AGPL-3.0-or-later
// Scaleway Transactional Email (TEM) — provider email FR souverain.
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
//   SCALEWAY_TEM_REGION      (defaut "fr-par")
//   EMAIL_FROM               (adresse expéditrice, domaine vérifié dans
//                             la console Scaleway TEM)
import type { SendEmailParams, SendEmailResult } from "./index";

const DEFAULT_REGION = "fr-par";

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

export async function sendViaScalewayTem(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!isScalewayTemConfigured()) {
    return { ok: false, reason: "scaleway_tem_not_configured" };
  }
  const token = process.env.SCALEWAY_TEM_TOKEN!;
  const projectId = process.env.SCALEWAY_TEM_PROJECT_ID!;
  const fromAddress = params.from ?? process.env.EMAIL_FROM!;
  const fromName =
    params.fromName ?? process.env.NEXT_PUBLIC_APP_NAME ?? "Humanix Academie";

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
      const errBody = await res.text().catch(() => "");
      return {
        ok: false,
        reason: `scaleway_tem_${res.status}`,
        details: errBody.slice(0, 500),
      };
    }
    const data = (await res.json().catch(() => ({}))) as {
      emails?: { id?: string }[];
    };
    return { ok: true, providerMessageId: data?.emails?.[0]?.id ?? null };
  } catch (e: unknown) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "scaleway_tem_unknown_error",
    };
  }
}
