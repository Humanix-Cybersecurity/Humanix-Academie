// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Liste des sessions « Voir en tant que » de l'admin courant : en
// attente de consentement + actives. Permet de naviguer vers la page
// /admin/voir/[sessionId] ou de retirer une demande.

import Link from "next/link";
import { db } from "@/lib/db";

type Props = {
  tenantId: string;
  adminUserId: string;
};

function fmtDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRemaining(endsAt: Date): string {
  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return "expiré";
  const mn = Math.floor(diffMs / 60000);
  if (mn < 60) return `${mn} min`;
  const h = Math.floor(mn / 60);
  return `${h}h${(mn % 60).toString().padStart(2, "0")}`;
}

export default async function ActiveImpersonationsList({
  tenantId,
  adminUserId,
}: Props) {
  // Toutes les sessions pour cet admin, status PENDING ou ACTIVE,
  // de moins de 24h (pour limiter l'historique affiche).
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const sessions = await db.impersonationSession.findMany({
    where: {
      adminUserId,
      adminTenantId: tenantId,
      status: { in: ["PENDING", "ACTIVE"] },
      requestedAt: { gt: since },
    },
    orderBy: { requestedAt: "desc" },
    take: 10,
    select: {
      id: true,
      targetEmail: true,
      status: true,
      requestedAt: true,
      grantedAt: true,
      endsAt: true,
      consentExpiresAt: true,
    },
  });

  if (sessions.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        Aucune demande active. Utilisez le formulaire ci-dessous pour en
        envoyer une.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-bold">
        Demandes en cours ({sessions.length})
      </p>
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`rounded-lg border p-3 text-sm flex items-start gap-3 ${
            s.status === "ACTIVE"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/40"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/40"
          }`}
        >
          <div
            className="text-xl shrink-0"
            aria-hidden="true"
          >
            {s.status === "ACTIVE" ? "👁️" : "⏳"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {s.targetEmail}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {s.status === "ACTIVE" ? (
                <>
                  Acceptée le {s.grantedAt && fmtDateTime(s.grantedAt)} ·{" "}
                  Reste{" "}
                  <strong>
                    {s.endsAt ? fmtRemaining(s.endsAt) : "—"}
                  </strong>
                </>
              ) : (
                <>
                  Envoyée le {fmtDateTime(s.requestedAt)} · Expire le{" "}
                  {fmtDateTime(s.consentExpiresAt)}
                </>
              )}
            </p>
          </div>
          {s.status === "ACTIVE" && (
            <Link
              href={`/admin/voir/${s.id}`}
              className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition"
            >
              Consulter →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
