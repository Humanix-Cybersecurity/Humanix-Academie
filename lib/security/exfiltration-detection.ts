// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Detection d'exfiltration de donnees en masse cote prod.
//
// === Pourquoi (pentest fix #8, 2026-05-24) ===
//
// Le pentest a montre qu'un compte SUPERADMIN compromis peut aspirer
// tout le contenu de la plateforme via les endpoints `/api/admin/*/export`
// (phishing, users at-risk, conformity report, etc.) sans declencher
// la moindre alerte. C'est l'enchainement classique d'une compromission
// admin : exfiltration silencieuse avant la detection.
//
// Cette lib ajoute UNE LIGNE DE DEFENSE en profondeur :
//   - Compte les rows exfiltrees par (tenantId, userId) sur fenetre rolling
//   - Si seuil depasse -> audit log AI_EXFILTRATION_SUSPECTED + alerte
//   - Optionnel : retourne 429 pour ralentir l'exfiltrateur (defense
//     en profondeur, mais pas absolue : un attaquant determine peut
//     ralentir le rythme)
//
// === Pourquoi pas un IDS/SIEM complet ===
//
// Un vrai SIEM (Wazuh, Sekoia, Splunk) ferait ca mieux. Mais :
//   1. Couteux a maintenir pour un solo founder
//   2. Latence : detection souvent > 1h, l'exfiltration est deja terminee
//   3. Cette defense applicative est COMPLEMENTAIRE, pas concurrente
//
// L'idee : detection EN LIGNE pendant la requete, log et alerte rapide,
// laisser ensuite le SIEM faire son travail forensique.
//
// === Limitations connues ===
//
// - In-memory : si l'app redemarre, les compteurs sont perdus (faille
//   exploitable par redemarrage repete, mais l'attaquant doit avoir
//   acces a kill le container = compromission deja totale)
// - Mono-instance : si scaling horizontal, chaque instance a son compteur.
//   Pour scaler il faudra passer en Redis ou table Postgres dediee.
//
// Tradeoff accepte pour la simplicite. Si on passe en multi-instance,
// migration triviale (changer le storage).

import { auditLog, AuditActions } from "@/lib/audit";

// ============================================================================
// Storage in-memory : compteur rolling window par (tenantId, userId)
// ============================================================================

type ExportTracker = {
  // Liste de (timestamp, rowCount) sur la fenetre
  events: Array<{ ts: number; rowCount: number; endpoint: string }>;
  // Derniere alerte emise (pour deboncer les notifications)
  lastAlertAt: number | null;
};

// Cle : `${tenantId}:${userId}`
const trackers = new Map<string, ExportTracker>();

// ============================================================================
// Configuration des seuils
// ============================================================================

/**
 * Fenetre de detection : 5 minutes rolling.
 * Suffisamment court pour detecter une exfiltration rapide, mais assez
 * long pour que les exports legitimes (audit annuel, batch) passent
 * sans declencher.
 */
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Seuil de rows cumulees sur la fenetre. Au-dela, on logge un evenement
 * EXFILTRATION_SUSPECTED.
 *
 * Choix : 5000 rows / 5 min = ~1000 rows/min ~ 17 rows/s. Un export
 * legitime d'audit annuel d'un tenant moyen reste sous ce seuil
 * (typiquement 500-2000 rows par export, 1-2 exports par session).
 *
 * Un attaquant qui essaie d'aspirer la BDD complete depasse facilement
 * (BDD typique tenant : 50-500k rows total).
 */
const ROW_THRESHOLD = 5000;

/**
 * Seuil de nombre d'exports distincts (independamment du rowCount) sur
 * la fenetre. Detecte les abus de petits exports repetes.
 */
const EXPORT_COUNT_THRESHOLD = 20;

/**
 * Periode de debounce entre 2 alertes pour le meme (tenantId, userId).
 * Evite de spammer le SIEM si l'attaquant continue.
 */
const ALERT_DEBOUNCE_MS = 60 * 1000; // 1 minute

// ============================================================================
// API publique
// ============================================================================

/**
 * Enregistre un export effectue par un (tenantId, userId) et verifie si
 * un seuil de detection est atteint.
 *
 * @param params identification du caller + nombre de rows + endpoint
 * @returns
 *   - `{ allowed: true }` : export normal, on laisse passer
 *   - `{ allowed: true, alerted: true, ... }` : export accepte mais
 *     seuil franchi -> audit log emis (mais on bloque pas en HTTP
 *     pour ne pas dropper un export legitime). Le caller peut decider
 *     de retourner 429 ou non.
 */
export async function recordExportAccess(params: {
  tenantId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  rowCount: number;
  endpoint: string;
}): Promise<{
  allowed: boolean;
  alerted: boolean;
  reason?: "row_threshold" | "export_count_threshold";
  totalRowsInWindow: number;
  totalExportsInWindow: number;
}> {
  const key = `${params.tenantId}:${params.userId}`;
  const now = Date.now();

  // Recuperer ou creer le tracker
  let tracker = trackers.get(key);
  if (!tracker) {
    tracker = { events: [], lastAlertAt: null };
    trackers.set(key, tracker);
  }

  // Purger les events hors fenetre
  const cutoff = now - WINDOW_MS;
  tracker.events = tracker.events.filter((e) => e.ts >= cutoff);

  // Ajouter le nouvel event
  tracker.events.push({
    ts: now,
    rowCount: params.rowCount,
    endpoint: params.endpoint,
  });

  // Calculer les totaux sur la fenetre
  const totalRowsInWindow = tracker.events.reduce(
    (sum, e) => sum + e.rowCount,
    0,
  );
  const totalExportsInWindow = tracker.events.length;

  // Verifier les seuils
  let alerted = false;
  let reason: "row_threshold" | "export_count_threshold" | undefined;
  const debounceOK =
    tracker.lastAlertAt === null ||
    now - tracker.lastAlertAt > ALERT_DEBOUNCE_MS;

  if (totalRowsInWindow >= ROW_THRESHOLD && debounceOK) {
    alerted = true;
    reason = "row_threshold";
  } else if (totalExportsInWindow >= EXPORT_COUNT_THRESHOLD && debounceOK) {
    alerted = true;
    reason = "export_count_threshold";
  }

  if (alerted && reason) {
    tracker.lastAlertAt = now;
    // Audit log async (ne pas bloquer le caller)
    try {
      await auditLog({
        action: AuditActions.EXFILTRATION_SUSPECTED,
        outcome: "FAILURE",
        severity: "HIGH",
        actor: {
          userId: params.userId,
          email: params.userEmail,
          role: params.userRole,
        },
        tenantId: params.tenantId,
        target: { type: "data_export", id: params.endpoint },
        message: `Suspicion d'exfiltration : ${
          reason === "row_threshold"
            ? `${totalRowsInWindow} lignes`
            : `${totalExportsInWindow} exports`
        } en 5 min`,
        metadata: {
          reason,
          totalRowsInWindow,
          totalExportsInWindow,
          windowMinutes: WINDOW_MS / 60000,
          rowThreshold: ROW_THRESHOLD,
          exportCountThreshold: EXPORT_COUNT_THRESHOLD,
          endpoint: params.endpoint,
          rowCount: params.rowCount,
          // On NE liste PAS les endpoints individuels dans metadata pour
          // limiter le bruit. Les events individuels sont deja logges
          // par chaque endpoint via PHISHING_REPORT_EXPORTED etc.
        },
      });
    } catch (err) {
      console.error(
        "[exfiltration-detection] audit log failed",
        err,
      );
    }
  }

  return {
    allowed: true,
    alerted,
    reason,
    totalRowsInWindow,
    totalExportsInWindow,
  };
}

/**
 * Reset complet d'un tracker (utile en tests, ou si on veut blanchir
 * un user apres confirmation manuelle qu'un burst etait legitime).
 *
 * NB : pas exposé via UI, usage interne (cron, console admin futur).
 */
export function resetExfiltrationTracker(
  tenantId: string,
  userId: string,
): void {
  trackers.delete(`${tenantId}:${userId}`);
}

/**
 * Snapshot de l'etat courant des trackers, pour debugging et
 * dashboard interne futur (`/superadmin/anomalies`).
 */
export function getTrackerSnapshot(): Array<{
  key: string;
  eventsCount: number;
  totalRows: number;
  lastAlertAt: number | null;
}> {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const snap: Array<{
    key: string;
    eventsCount: number;
    totalRows: number;
    lastAlertAt: number | null;
  }> = [];
  for (const [key, tracker] of trackers.entries()) {
    const events = tracker.events.filter((e) => e.ts >= cutoff);
    if (events.length === 0) continue;
    snap.push({
      key,
      eventsCount: events.length,
      totalRows: events.reduce((s, e) => s + e.rowCount, 0),
      lastAlertAt: tracker.lastAlertAt,
    });
  }
  return snap;
}

/**
 * Purge automatique des trackers vides (rolling window expiree).
 * A appeler periodiquement (ex: cron horaire) pour eviter une fuite
 * memoire si beaucoup de users distincts exportent.
 *
 * Pour le moment, on s'appuie sur le fait que `recordExportAccess`
 * purge ses propres events. Si le user ne refait pas d'export, son
 * tracker garde des events morts indefiniment. Cleanup periodique :
 */
export function cleanupExpiredTrackers(): number {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  let cleaned = 0;
  for (const [key, tracker] of trackers.entries()) {
    const stillFresh = tracker.events.some((e) => e.ts >= cutoff);
    if (!stillFresh) {
      trackers.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

// Constants exportes pour tests + dashboard futur
export const EXFILTRATION_THRESHOLDS = {
  WINDOW_MS,
  ROW_THRESHOLD,
  EXPORT_COUNT_THRESHOLD,
  ALERT_DEBOUNCE_MS,
} as const;
