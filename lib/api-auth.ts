// SPDX-License-Identifier: AGPL-3.0-or-later
// Authentification API key pour endpoints /api/v1/*
import { db } from "@/lib/db";
import { hashApiKey } from "@/lib/crypto";
import { planHasFeature, normalizePlan } from "@/lib/plans";

export type ApiAuthResult = {
  ok: boolean;
  tenantId?: string;
  apiKeyId?: string;
  error?: string;
  status?: number;
};

export async function authenticateApiKey(req: Request): Promise<ApiAuthResult> {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, error: "missing_token", status: 401 };
  }
  const token = auth.slice(7).trim();
  if (!token.startsWith("hxa_")) {
    return { ok: false, error: "invalid_token_format", status: 401 };
  }

  const hashed = hashApiKey(token);
  const key = await db.apiKey.findUnique({
    where: { hashedKey: hashed },
    include: { tenant: true },
  });

  if (!key || !key.isActive) {
    return { ok: false, error: "invalid_token", status: 401 };
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    return { ok: false, error: "token_expired", status: 401 };
  }

  // Plan-gating : l'API REST est reservee aux plans Essentielle+
  // Si le tenant a downgrade vers Solo, on refuse meme avec une cle valide.
  const tenantPlan = normalizePlan(key.tenant?.plan);
  if (!planHasFeature(tenantPlan, "api")) {
    return {
      ok: false,
      error: "plan_upgrade_required",
      status: 402, // Payment Required
    };
  }

  // Update lastUsedAt (fire-and-forget)
  db.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { ok: true, tenantId: key.tenantId, apiKeyId: key.id };
}
