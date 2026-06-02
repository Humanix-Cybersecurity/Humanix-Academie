// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Composant client : verification SPF/DKIM/DMARC du domaine d'envoi.
//
// Affiche un bouton "Vérifier" qui declenche la server action
// runDeliverabilityCheck. Resultat sous forme de 3 cards (une par
// protocole) avec :
//   - Statut OK / ERROR / WARN (couleur)
//   - Valeur brute du record (pour copy-paste si besoin)
//   - Explainer pedagogique du protocole
//   - Conseil actionnable
//
// CHARGE A LA DEMANDE : pas de probe automatique au chargement de la page
// pour eviter de spammer le DNS du domaine (et de payer le temps de
// reponse de 3 lookups au render). L'admin clique quand il veut.

import { useState, useTransition } from "react";
import { runDeliverabilityCheck } from "./actions";
import type {
  AuthRecord,
  DnsAuthCheckResult,
} from "@/lib/smtp/dns-auth-check";

export default function DeliverabilityCheck({ domain }: { domain: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DnsAuthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    startTransition(async () => {
      setError(null);
      const res = await runDeliverabilityCheck(domain);
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <section className="rounded-2xl border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-extrabold text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
            <span aria-hidden="true">📧</span> Délivrabilité du domaine
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Verifie que <strong className="font-mono text-cyan-700 dark:text-cyan-300">{domain}</strong> a SPF, DKIM et DMARC bien configures.
            Sans ca, tes phishing simulés risquent d&apos;arriver en spam.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={isPending}
          className="btn-secondary text-sm whitespace-nowrap"
        >
          {isPending
            ? "Probing DNS..."
            : result
              ? "Re-verifier"
              : "Vérifier maintenant"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-300"
        >
          Echec du check : <code className="font-mono">{error}</code>
        </div>
      )}

      {result && (
        <>
          {/* Score global */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
                Score deliverability
              </p>
              <p className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
                {result.overallScore}{" "}
                <span className="text-sm font-medium text-gray-400">/ 100</span>
              </p>
            </div>
            <ScoreBadge score={result.overallScore} />
          </div>

          {/* Cards par protocole */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.records.map((r) => (
              <RecordCard key={r.protocol} record={r} />
            ))}
          </div>

          {/* Lien explainer pedagogique */}
          <details className="text-xs text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer font-medium hover:text-cyan-600">
              📚 C&apos;est quoi SPF / DKIM / DMARC ?
            </summary>
            <div className="mt-2 space-y-2 leading-relaxed">
              <p>
                <strong>SPF (Sender Policy Framework)</strong> : record TXT
                qui declare quels serveurs ont le droit d&apos;envoyer du mail
                pour ton domaine. Sans SPF, les serveurs recepteurs (Gmail,
                Outlook) considerent tes mails suspects.
              </p>
              <p>
                <strong>DKIM (DomainKeys Identified Mail)</strong> : signature
                cryptographique des mails. Ton serveur SMTP signe avec une
                cle privee, et le record TXT publie la cle publique. Le
                recepteur verifie la signature : si valide = mail non
                modifié.
              </p>
              <p>
                <strong>DMARC</strong> : politique declaree au monde "que
                faire si SPF OU DKIM échoue". Trois modes :
              </p>
              <ul className="list-disc pl-5">
                <li>
                  <code>p=none</code> : ne rien faire (monitoring uniquement)
                </li>
                <li>
                  <code>p=quarantine</code> : mettre en spam
                </li>
                <li>
                  <code>p=reject</code> : rejeter direct (le plus strict)
                </li>
              </ul>
              <p>
                <strong>Recommandation</strong> : commencer SPF + DKIM + DMARC
                p=none, observer les rapports pendant 2-4 semaines, puis
                durcir vers p=quarantine puis p=reject.
              </p>
            </div>
          </details>

          <p className="text-[10px] text-gray-400 italic">
            Verifie le {new Date(result.checkedAt).toLocaleString("fr-FR")}{" "}
            via lookup DNS direct (pas de cache).
          </p>
        </>
      )}
    </section>
  );
}

function RecordCard({ record }: { record: AuthRecord }) {
  const styleByStatus = record.found
    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30"
    : record.severity === "ERROR"
      ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30"
      : record.severity === "WARN"
        ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30"
        : "border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30";

  const icon = record.found ? "✅" : record.severity === "ERROR" ? "❌" : "⚠️";
  const statusLabel = record.found
    ? "Trouvé"
    : record.severity === "ERROR"
      ? "Manquant"
      : "À vérifier";

  return (
    <div className={`rounded-xl border-2 p-3 ${styleByStatus}`}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          {record.protocol}
        </h3>
        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-600 dark:text-gray-400">
          {statusLabel}
        </span>
      </div>
      {record.value && (
        <details className="mb-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Valeur DNS
          </summary>
          <pre className="mt-1 text-[10px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 overflow-x-auto font-mono">
            {record.value}
          </pre>
        </details>
      )}
      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
        {record.advice}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cfg =
    score >= 80
      ? {
          label: "Excellent",
          cls: "bg-emerald-500 text-white",
          icon: "✅",
        }
      : score >= 50
        ? { label: "Moyen", cls: "bg-amber-500 text-white", icon: "⚠️" }
        : { label: "À corriger", cls: "bg-red-500 text-white", icon: "❌" };
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${cfg.cls}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
