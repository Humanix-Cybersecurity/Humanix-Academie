// SPDX-License-Identifier: AGPL-3.0-or-later
// Mapping bidirectionnel User Prisma <-> SCIM User.
// Les champs custom Humanix (role, service) sont exposes via une extension
// dediee : urn:humanix:scim:schemas:extension:User:1.0

import { SCIM_SCHEMAS, type ScimUser, type ScimName } from "./types";

type PrismaUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  service: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const HUMANIX_EXT = SCIM_SCHEMAS.HUMANIX_USER;

// SECURITE : roles provisionnables via SCIM (IdP du tenant). SUPERADMIN est un
// role d'OPERATEUR PLATEFORME et ne doit JAMAIS pouvoir etre attribue par un
// IdP client (sinon un tenant se fabrique un acces plateforme). Tout role hors
// de cette liste (y compris SUPERADMIN ou une valeur inconnue) retombe sur le
// role le plus faible. Garde central applique aux chemins create ET patch.
const SCIM_ASSIGNABLE_ROLES = new Set(["LEARNER", "MANAGER", "RSSI", "ADMIN"]);

export function coerceScimRole(raw: unknown): string {
  if (typeof raw !== "string") return "LEARNER";
  const r = raw.trim().toUpperCase();
  return SCIM_ASSIGNABLE_ROLES.has(r) ? r : "LEARNER";
}

/**
 * Convertit un User Prisma en SCIM User pour reponse GET.
 */
export function prismaToScim(user: PrismaUser, baseUrl: string): ScimUser {
  const split = splitName(user.name);
  return {
    schemas: [SCIM_SCHEMAS.USER, HUMANIX_EXT],
    id: user.id,
    userName: user.email,
    name: split,
    displayName: user.name ?? user.email,
    emails: [
      {
        value: user.email,
        primary: true,
        type: "work",
      },
    ],
    active: user.isActive,
    [HUMANIX_EXT]: {
      role: user.role,
      service: user.service,
    },
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${baseUrl}/scim/v2/Users/${user.id}`,
      version: `W/"${user.updatedAt.getTime()}"`,
    },
  };
}

/**
 * Convertit un payload SCIM POST/PUT en update Prisma.
 * Retourne null si payload invalide.
 */
export function scimToPrismaCreate(payload: unknown): {
  email: string;
  name: string | null;
  role: string;
  service: string | null;
  isActive: boolean;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const userName = typeof p.userName === "string" ? p.userName : null;
  if (!userName) return null;

  // Email primaire
  const emails = Array.isArray(p.emails)
    ? (p.emails as Record<string, unknown>[])
    : [];
  const primaryEmail = emails.find((e) => e.primary === true) ?? emails[0];
  const email =
    (primaryEmail && typeof primaryEmail.value === "string"
      ? primaryEmail.value
      : null) ?? userName;

  // Nom : displayName en priorite, sinon name.formatted, sinon givenName + familyName
  const name = extractDisplayName(p);

  // Active (default true)
  const active = p.active === undefined ? true : Boolean(p.active);

  // Extension Humanix
  const ext = p[HUMANIX_EXT] as Record<string, unknown> | undefined;
  const role = coerceScimRole(ext?.role);
  const service =
    (ext && typeof ext.service === "string" && ext.service.trim()) || null;

  return {
    email,
    name,
    role,
    service,
    isActive: active,
  };
}

/**
 * Applique les operations PATCH sur un user Prisma existant.
 * Renvoie un partial update (champs a mettre a jour).
 *
 * Limites : on ne supporte que les paths simples (active, name, displayName,
 * userName, emails, ext:role, ext:service). Les paths complexes type
 * "emails[type eq \"work\"].value" ne sont pas supportes (rare en SCIM PATCH).
 */
export function applyScimPatch(
  current: PrismaUser,
  ops: { op: string; path?: string; value?: unknown }[],
): Partial<{
  email: string;
  name: string | null;
  role: string;
  service: string | null;
  isActive: boolean;
}> {
  const update: Record<string, unknown> = {};

  for (const rawOp of ops) {
    const op = rawOp.op.toLowerCase();
    const path = rawOp.path?.toLowerCase();
    const value = rawOp.value;

    if (op === "remove") {
      // Reset au null/false selon le champ
      if (path === "active") update.isActive = false;
      if (path === "name" || path === "displayname") update.name = null;
      continue;
    }

    // add / replace : meme traitement (idempotence)
    if (path === "active") {
      update.isActive = Boolean(value);
    } else if (path === "username") {
      if (typeof value === "string") update.email = value;
    } else if (path === "displayname") {
      if (typeof value === "string") update.name = value;
    } else if (path?.startsWith(HUMANIX_EXT.toLowerCase())) {
      // urn:humanix:...:User:1.0:role ou ...:service
      const sub = path.split(":").pop() ?? "";
      if (sub === "role" && typeof value === "string")
        update.role = coerceScimRole(value);
      if (sub === "service" && typeof value === "string")
        update.service = value;
    } else if (!path && value && typeof value === "object") {
      // PATCH bulk sans path : value contient un payload partiel SCIM
      const v = value as Record<string, unknown>;
      if (v.active !== undefined) update.isActive = Boolean(v.active);
      if (typeof v.userName === "string") update.email = v.userName;
      if (typeof v.displayName === "string") update.name = v.displayName;
      const ext = v[HUMANIX_EXT] as Record<string, unknown> | undefined;
      if (ext) {
        if (typeof ext.role === "string") update.role = coerceScimRole(ext.role);
        if (typeof ext.service === "string") update.service = ext.service;
      }
    }
  }

  return update as Partial<{
    email: string;
    name: string | null;
    role: string;
    service: string | null;
    isActive: boolean;
  }>;
}

// ---------- Helpers prives ----------

function splitName(full: string | null): ScimName | undefined {
  if (!full) return undefined;
  const trimmed = full.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { formatted: trimmed, givenName: trimmed };
  }
  return {
    formatted: trimmed,
    givenName: parts[0],
    familyName: parts.slice(1).join(" "),
  };
}

function extractDisplayName(p: Record<string, unknown>): string | null {
  if (typeof p.displayName === "string" && p.displayName.trim()) {
    return p.displayName.trim();
  }
  const name = p.name as Record<string, unknown> | undefined;
  if (name) {
    if (typeof name.formatted === "string" && name.formatted.trim()) {
      return name.formatted.trim();
    }
    const given = typeof name.givenName === "string" ? name.givenName : "";
    const family = typeof name.familyName === "string" ? name.familyName : "";
    const composed = `${given} ${family}`.trim();
    if (composed) return composed;
  }
  return null;
}
