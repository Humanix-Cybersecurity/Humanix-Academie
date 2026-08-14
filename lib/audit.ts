// SPDX-License-Identifier: AGPL-3.0-or-later
// Audit log centralise pour la conformite RGPD / NIS2 / ISO 27001.
//
// Principes :
//  - Tous les points sensibles (auth, gestion users, billing, exports
//    de donnees) appellent auditLog() pour tracer qui fait quoi.
//  - Best-effort : un echec d'ecriture log ne doit pas casser l'action
//    metier. On capture et on log dans la console.
//  - Snapshot d'identite : on ecrit actorEmail et actorRole au moment
//    de l'action, pour ne pas perdre l'info si l'user est supprime.
//  - IP hashee SHA-256 (cf. lib/password-reset.ts hashIp).
//
// Usage :
//   await auditLog({
//     action: "USER_DELETED",
//     outcome: "SUCCESS",
//     actor: { userId, email, role },
//     tenantId,
//     target: { type: "user", id: deletedUserId, label: deletedEmail },
//     message: "Suppression RGPD effectuee",
//   });
import {
  AuditAction,
  AuditOutcome,
  AuditSeverity,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/password-reset";
import { recordAuditMetric } from "@/lib/metrics/registry";

export type AuditActor = {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
};

export type AuditTarget = {
  type: string;
  id?: string | null;
  label?: string | null;
};

export type AuditLogInput = {
  action: AuditAction;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  actor?: AuditActor;
  tenantId?: string | null;
  target?: AuditTarget;
  ip?: string | null;
  userAgent?: string | null;
  message?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Ecrit un log d'audit. Best-effort : retourne true si succes, false si
 * echec (et n'echoue jamais).
 */
/**
 * Actions dont l'occurrence doit atteindre Loki, et donc declencher une alerte.
 *
 * Critere d'inclusion : un pic anormal de cet evenement peut signaler une
 * violation en cours. On reste volontairement court -- une liste qui grossit
 * finit par tout emettre, et une alerte qui se declenche tous les jours
 * n'alerte plus personne.
 */
const EVENEMENTS_A_SURVEILLER: ReadonlySet<AuditAction> = new Set([
  AuditAction.USER_LOGIN_FAILED,
  AuditAction.EXFILTRATION_SUSPECTED,
  // Un export est legitime -- c'est un droit du Client. On l'emet pour
  // pouvoir alerter sur un DEBIT anormal, pas sur son existence.
  AuditAction.DATA_EXPORTED,
  AuditAction.USER_LOCKED,
  AuditAction.USER_ROLE_CHANGED,
  AuditAction.USER_MFA_DISABLED,
  AuditAction.USER_MFA_RESET_BY_ADMIN,
  AuditAction.TENANT_DELETED,
]);

export async function auditLog(input: AuditLogInput): Promise<boolean> {
  const severity = input.severity ?? defaultSeverityFor(input.action);

  // --- Miroir sur la SORTIE STANDARD pour les evenements surveillables ---
  //
  // Vector ne collecte que le stdout des conteneurs. Un AuditLog part en base,
  // donc il n'atteint JAMAIS Loki : sans cette ligne, aucune alerte Grafana ne
  // peut voir un echec d'authentification ou une exfiltration suspectee.
  //
  // C'est le maillon qui manquait a docs/PROCEDURE-VIOLATION-DONNEES.md, dont
  // l'engagement de notification sous 48 h ne court qu'a partir de la
  // CONNAISSANCE de l'incident. Sans detection, ce delai reste theorique.
  //
  // On n'emet QUE les evenements a surveiller, pas tout l'audit : deverser des
  // milliers de lignes par jour dans Loki noierait le signal et couterait de
  // l'ingestion pour rien.
  //
  // Format JSON sur une ligne : la source `docker_logs` de Vector le parse
  // ensuite via `parse_json`, ce qui rend les champs requetables en LogQL.
  if (EVENEMENTS_A_SURVEILLER.has(input.action)) {
    // console.warn et non console.log : le niveau distingue ces lignes du
    // bruit applicatif ordinaire, et sert de premier filtre cote Loki.
    console.warn(
      JSON.stringify({
        canal: "securite",
        action: input.action,
        severite: severity,
        outcome: input.outcome ?? AuditOutcome.SUCCESS,
        tenantId: input.tenantId ?? null,
        // JAMAIS l'email ni l'IP en clair : ces lignes partent vers un service
        // tiers. L'AuditLog en base garde le detail, sous la retention du
        // client. Ici on veut savoir QU'IL SE PASSE quelque chose, pas qui.
        acteurPresent: Boolean(input.actor?.userId),
      }),
    );
  }

  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        outcome: input.outcome ?? AuditOutcome.SUCCESS,
        severity,
        tenantId: input.tenantId ?? null,
        actorUserId: input.actor?.userId ?? null,
        actorEmail: input.actor?.email ?? null,
        actorRole: input.actor?.role ?? null,
        targetType: input.target?.type ?? null,
        targetId: input.target?.id ?? null,
        targetLabel: input.target?.label ?? null,
        ipHash: input.ip ? hashIp(input.ip) : null,
        userAgent: input.userAgent?.slice(0, 1000) ?? null,
        message: input.message?.slice(0, 2000) ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
    // Increment du counter Prometheus (best-effort, ne throw jamais).
    // Permet d'alerter sur les pics de USER_LOGIN_FAILED, l'apparition
    // de EXFILTRATION_SUSPECTED, AI_PROMPT_INJECTION_ATTEMPT, etc.
    // cf. lib/metrics/registry.ts + app/api/metrics/route.ts.
    recordAuditMetric(input.action, severity);
    return true;
  } catch (e) {
    // On log dans la console mais on ne propage pas : un crash de l'audit
    // ne doit jamais bloquer une action metier (sinon on cree une nouvelle
    // surface d'attaque DoS).
    console.error("auditLog failed", { action: input.action, error: e });
    return false;
  }
}

/**
 * Severite par defaut selon le type d'action. Sert au filtrage dans la
 * page de consultation.
 */
function defaultSeverityFor(action: AuditAction): AuditSeverity {
  switch (action) {
    case AuditAction.USER_LOGIN_FAILED:
    case AuditAction.USER_PASSWORD_RESET_REQUESTED:
      return AuditSeverity.NOTICE;
    case AuditAction.USER_LOCKED:
    case AuditAction.USER_MFA_DISABLED:
    case AuditAction.USER_DELETED:
    case AuditAction.USER_ROLE_CHANGED:
    case AuditAction.BILLING_PAYMENT_FAILED:
    case AuditAction.DATA_ERASURE_REQUESTED:
      return AuditSeverity.WARNING;
    case AuditAction.USER_MFA_RESET_BY_ADMIN:
    case AuditAction.USER_WEBAUTHN_DELETED:
    case AuditAction.TENANT_DELETED:
    case AuditAction.DATA_ERASURE_COMPLETED:
      return AuditSeverity.CRITICAL;
    default:
      return AuditSeverity.INFO;
  }
}

/**
 * Helpers semantiques pour reduire la verbosite cote callers.
 */
export const AuditActions = AuditAction;
export const AuditOutcomes = AuditOutcome;
export const AuditSeverities = AuditSeverity;

/**
 * Extrait l'IP cliente depuis les headers (pour insertion dans server actions).
 */
export function readIpFromHeaders(h: Headers): string | null {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}
