// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers RBAC centralises pour les routes API.
//
// Pourquoi cette couche :
// Avant, chaque route API admin dupliquait le pattern :
//   const session = await auth();
//   if (!session?.user) return NextResponse.json({error:...}, {status:401});
//   if (session.user.role !== "ADMIN" && session.user.role !== "RSSI" ...) {
//     return NextResponse.json({error:...}, {status:403});
//   }
// Probleme : ~30 occurrences, oubli facile sur nouvelle route, pas d'audit
// log automatique des refus d'autorisation (signal d'attaque).
//
// Cette lib centralise :
//   - requireSession()          -> session OU NextResponse 401
//   - requireRole(roles)        -> session OU NextResponse 401/403
//   - requireSuperadmin()       -> raccourci
//   - requireTenantMember(id)   -> defense cross-tenant
//
// En cas de DENIED, on appelle auditLog() avec outcome=DENIED. C'est
// notre signal "quelqu'un a tente d'acceder a une route au-dessus de
// son grade". Si on en voit 10/jour pour un user, c'est un signal
// d'incident.
//
// Usage type dans une route :
//
//   import { requireRole } from "@/lib/api/require-role";
//
//   export async function POST(req: Request) {
//     const guard = await requireRole(["ADMIN", "RSSI"], req);
//     if ("response" in guard) return guard.response;
//     const { session } = guard;
//     // ... session.user.id / session.user.tenantId / session.user.role
//   }

import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { AuditAction, AuditOutcome } from "@prisma/client";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export type HumanixRole = "LEARNER" | "MANAGER" | "RSSI" | "ADMIN" | "SUPERADMIN";

/**
 * Resultat d'un guard : soit la session (acces autorise), soit une
 * NextResponse a retourner tel quel (401 ou 403).
 *
 * Discriminated union : le caller fait
 *   if ("response" in guard) return guard.response;
 *   // ici TypeScript sait que guard.session existe
 */
export type GuardResult =
  | { session: Session; response?: never }
  | { response: NextResponse; session?: never };

/**
 * Renvoie la session si l'user est authentifie, sinon NextResponse 401.
 */
export async function requireSession(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      ),
    };
  }
  return { session };
}

/**
 * Renvoie la session si l'user a l'un des roles autorises.
 * Refus -> NextResponse 401 (pas authentifie) ou 403 (authentifie mais
 * pas le bon role) + audit log automatique.
 *
 * @param allowedRoles roles autorises (au moins un)
 * @param req requete entrante (pour extraire IP / UA dans l'audit log)
 */
export async function requireRole(
  allowedRoles: readonly HumanixRole[],
  req?: Request,
): Promise<GuardResult> {
  const sessionGuard = await requireSession();
  if ("response" in sessionGuard) return sessionGuard;

  const { session } = sessionGuard;
  const role = session.user.role;

  if (!role || !allowedRoles.includes(role as HumanixRole)) {
    // Tentative d'acces a une route au-dessus du grade : on trace.
    // Best-effort : ne bloque pas la reponse si l'audit log echoue.
    void auditLog({
      action: AuditAction.USER_LOGIN_FAILED, // pas d'action dediee, on reuse
      outcome: AuditOutcome.DENIED,
      actor: {
        userId: session.user.id,
        email: session.user.email,
        role: role ?? null,
      },
      tenantId: session.user.tenantId ?? null,
      message: `Acces refuse : role ${role ?? "none"} insuffisant. Requis : ${allowedRoles.join(", ")}`,
      ip: req ? extractIp(req) : null,
      userAgent: req?.headers.get("user-agent") ?? null,
    });
    return {
      response: NextResponse.json(
        {
          error: "Accès refusé : votre rôle ne permet pas cette action.",
        },
        { status: 403 },
      ),
    };
  }

  return { session };
}

/**
 * Raccourci : exige le role SUPERADMIN (operateur plateforme).
 */
export async function requireSuperadmin(req?: Request): Promise<GuardResult> {
  return requireRole(["SUPERADMIN"], req);
}

/**
 * Raccourci : exige ADMIN ou plus (gestion du tenant).
 * RSSI inclus car il a aussi pouvoir admin sur le tenant + RGPD/securite.
 */
export async function requireAdmin(req?: Request): Promise<GuardResult> {
  return requireRole(["ADMIN", "RSSI", "SUPERADMIN"], req);
}

/**
 * Verifie que l'user est membre du tenant cible. Critique pour les
 * routes qui acceptent un tenantId en parametre (URL ou body) : sans
 * cette verification, un ADMIN du tenant A pourrait acceder aux donnees
 * du tenant B juste en changeant l'URL.
 *
 * Le SUPERADMIN peut acceder a tous les tenants (par definition).
 */
export async function requireTenantMember(
  tenantId: string,
  allowedRoles?: readonly HumanixRole[],
  req?: Request,
): Promise<GuardResult> {
  const guard = allowedRoles
    ? await requireRole(allowedRoles, req)
    : await requireSession();
  if ("response" in guard) return guard;

  const { session } = guard;
  const userTenant = session.user.tenantId;
  const role = session.user.role;

  // SUPERADMIN bypass cross-tenant (audit log trace l'acces)
  if (role === "SUPERADMIN") return { session };

  if (userTenant !== tenantId) {
    void auditLog({
      action: AuditAction.USER_LOGIN_FAILED,
      outcome: AuditOutcome.DENIED,
      actor: {
        userId: session.user.id,
        email: session.user.email,
        role: role ?? null,
      },
      tenantId: userTenant ?? null,
      message: `Tentative d'acces cross-tenant : user du tenant ${userTenant ?? "none"} vers ${tenantId}`,
      ip: req ? extractIp(req) : null,
      userAgent: req?.headers.get("user-agent") ?? null,
    });
    return {
      response: NextResponse.json(
        { error: "Tenant introuvable" }, // 404 plutot que 403 pour ne pas leaker l'existence
        { status: 404 },
      ),
    };
  }
  return { session };
}

/**
 * Extrait l'IP du client en respectant les proxies. Cherche
 * X-Forwarded-For en premier, puis X-Real-IP, puis fallback.
 */
function extractIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}
