// SPDX-License-Identifier: AGPL-3.0-or-later
// Mappings emoji + libelles pour les AuditAction RGPD.
//
// Utilises par ComplianceCounters et RecentActivity. Centralises ici pour
// que l'ajout d'un nouveau type (ex. CONSENT_UPDATED) se propage en 1 seul
// endroit.

export const ACTION_EMOJI: Record<string, string> = {
  DATA_ACCESSED: "👁",
  DATA_EXPORTED: "📤",
  DATA_ERASURE_REQUESTED: "🗑",
  DATA_ERASURE_COMPLETED: "✅",
  CONSENT_GIVEN: "✓",
  CONSENT_WITHDRAWN: "✗",
};

export const ACTION_LABEL: Record<string, string> = {
  DATA_ACCESSED: "Acces aux données personnelles",
  DATA_EXPORTED: "Export de données (article 20)",
  DATA_ERASURE_REQUESTED: "Demande d'effacement (article 17)",
  DATA_ERASURE_COMPLETED: "Effacement effectue",
  CONSENT_GIVEN: "Consentement donne",
  CONSENT_WITHDRAWN: "Consentement retire",
};
