// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server actions /admin/smtp (Phase 6 Phishing Engine v2, juin 2026).
//
// runDeliverabilityCheck : declenche un probe SPF/DKIM/DMARC sur un domaine
// (cote serveur car les lookups DNS necessitent node:dns/promises).

import { auth } from "@/lib/auth";
import {
  checkDomainAuth,
  type DnsAuthCheckResult,
} from "@/lib/smtp/dns-auth-check";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
}

export type DeliverabilityCheckResult =
  | { ok: true; data: DnsAuthCheckResult }
  | { ok: false; error: string };

export async function runDeliverabilityCheck(
  domain: string,
): Promise<DeliverabilityCheckResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unauthorized",
    };
  }

  // Sanitization basique : domaine valide
  const cleanDomain = domain.trim().toLowerCase();
  if (!cleanDomain || !/^[a-z0-9.-]+$/.test(cleanDomain)) {
    return { ok: false, error: "invalid_domain" };
  }

  try {
    const data = await checkDomainAuth(cleanDomain);
    return { ok: true, data };
  } catch {
    return { ok: false, error: "dns_lookup_failed" };
  }
}
