// Page detail d'un incident : workflow stepper + checklist + timeline + RetEx.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import IncidentActionCheckbox from "@/components/IncidentActionCheckbox";
import IncidentStatusButtons from "@/components/IncidentStatusButtons";
import {
  PHASE_LABELS,
  INCIDENT_TYPE_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
} from "@/lib/incident-response/playbooks";
import { getIncident } from "@/lib/incident-response/service";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import { addTimelineNote, saveRetex } from "../actions";

export const dynamic = "force-dynamic";

const PHASES = ["h0", "h24", "h72", "w1", "retex"] as const;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CONTAINED: "bg-teal-100 text-teal-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-200 text-gray-700",
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "incidents")) redirect("/admin/incidents");

  const { id } = await params;
  const incident = await getIncident(tenantId, id);
  if (!incident) notFound();

  const typeMeta = INCIDENT_TYPE_LABELS[incident.type];
  const severityMeta = INCIDENT_SEVERITY_LABELS[incident.severity];
  const statusMeta = INCIDENT_STATUS_LABELS[incident.status];

  const actionsByPhase = new Map<string, typeof incident.actions>();
  for (const phase of PHASES) actionsByPhase.set(phase, []);
  for (const a of incident.actions) {
    actionsByPhase.get(a.phase)?.push(a);
  }

  const totalDone = incident.actions.filter((a) => a.isDone).length;
  const totalActions = incident.actions.length;
  const progressPct = totalActions === 0 ? 0 : Math.round((totalDone / totalActions) * 100);

  return (
    <>
      <header className="mb-6">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link href="/admin/incidents" className="hover:text-primary-500 dark:hover:text-accent-300">
            ← Tous les incidents
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono text-xs font-bold text-primary-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
            {incident.reference}
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded ${STATUS_COLORS[incident.status]}`}>
            {statusMeta.label}
          </span>
          <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {severityMeta.label}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-1 flex items-center gap-2.5">
          <span aria-hidden="true" className="text-2xl">{typeMeta.emoji}</span>
          <span className="min-w-0">{incident.title}</span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {typeMeta.label} · Détecté le{" "}
          {incident.detectedAt.toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          } as any)}
        </p>
      </header>


      {/* Progression globale */}
      <div className="card my-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-primary-500 dark:text-accent-300">
            Progression du workflow
          </h2>
          <span className="text-sm font-bold">
            {totalDone} / {totalActions} actions ({progressPct} %)
          </span>
        </div>
        <div
          className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression du workflow incident"
        >
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 mb-2">
            Transition de statut
          </p>
          <IncidentStatusButtons
            incidentId={incident.id}
            currentStatus={incident.status}
          />
        </div>
      </div>

      {/* Description */}
      <div className="card mb-6">
        <h2 className="font-bold text-primary-500 dark:text-accent-300 mb-2">
          📝 Description
        </h2>
        <p className="text-sm whitespace-pre-line">{incident.description}</p>
        {(incident.affectedSystems || incident.affectedUsers || incident.dataConcerned) && (
          <dl className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-sm grid sm:grid-cols-3 gap-3">
            {incident.affectedSystems && (
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">Systèmes</dt>
                <dd>{incident.affectedSystems}</dd>
              </div>
            )}
            {incident.affectedUsers !== null && (
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">Personnes touchées</dt>
                <dd>{incident.affectedUsers}</dd>
              </div>
            )}
            {incident.dataConcerned && (
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">Données</dt>
                <dd>{incident.dataConcerned}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Workflow par phases */}
      <section aria-labelledby="workflow-title" className="mb-8">
        <h2
          id="workflow-title"
          className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4"
        >
          🚦 Workflow guidé
        </h2>
        <div className="space-y-8">
          {PHASES.map((phase) => {
            const phaseActions = actionsByPhase.get(phase) ?? [];
            if (phaseActions.length === 0) return null;
            const phaseDone = phaseActions.filter((a) => a.isDone).length;
            const meta = PHASE_LABELS[phase];

            return (
              <div key={phase}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-primary-500 dark:text-accent-300">
                    <span aria-hidden="true">{meta.emoji}</span> {meta.label}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {phaseDone} / {phaseActions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {phaseActions.map((a) => (
                    <IncidentActionCheckbox
                      key={a.id}
                      actionId={a.id}
                      initialDone={a.isDone}
                      title={a.title}
                      description={a.description}
                      documentSlug={a.documentSlug}
                      incidentId={incident.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section aria-labelledby="timeline-title" className="mb-8">
        <h2
          id="timeline-title"
          className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4"
        >
          🕐 Journal
        </h2>

        <form action={addTimelineNote} className="card mb-4 space-y-3">
          <input type="hidden" name="incidentId" value={incident.id} />
          <div>
            <label htmlFor="kind" className="block text-xs uppercase font-bold mb-1">
              Type d'évènement
            </label>
            <select id="kind" name="kind" className="input" defaultValue="note">
              <option value="note">📝 Note</option>
              <option value="decision">⚖ Décision</option>
              <option value="external_comm">📞 Communication externe</option>
              <option value="discovery">🔍 Découverte / élément forensique</option>
            </select>
          </div>
          <div>
            <label htmlFor="content" className="block text-xs uppercase font-bold mb-1">
              Contenu *
            </label>
            <textarea
              id="content"
              name="content"
              required
              minLength={3}
              maxLength={4000}
              rows={3}
              className="input"
              placeholder="Ex : Réunion cellule de crise à 10h. Décision : recourir au prestataire X pour le forensic."
            />
          </div>
          <button type="submit" className="btn-primary text-sm">
            ➕ Ajouter au journal
          </button>
        </form>

        <ol className="space-y-3" aria-label="Journal chronologique">
          {incident.timeline.length === 0 && (
            <li className="text-sm text-gray-500 italic">
              Aucun évènement dans le journal pour le moment.
            </li>
          )}
          {incident.timeline.map((t) => (
            <li
              key={t.id}
              className="flex gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-32">
                {t.occurredAt.toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                } as any)}
                <p className="text-[10px] uppercase font-bold mt-1">{t.kind}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm whitespace-pre-line">{t.content}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  par {t.authorName ?? "—"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* RetEx (visible si statut RESOLVED ou CLOSED) */}
      {(incident.status === "RESOLVED" || incident.status === "CLOSED") && (
        <section aria-labelledby="retex-title" className="mb-8">
          <h2
            id="retex-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4"
          >
            📚 Retour d'expérience
          </h2>
          <form action={saveRetex} className="card space-y-3">
            <input type="hidden" name="incidentId" value={incident.id} />
            <div>
              <label htmlFor="rootCause" className="block text-sm font-medium mb-1">
                Cause racine identifiée
              </label>
              <textarea
                id="rootCause"
                name="rootCause"
                rows={3}
                defaultValue={incident.rootCause ?? ""}
                maxLength={5000}
                className="input"
                placeholder="Ex : Phishing reçu par un employé non sensibilisé, sans MFA sur son compte."
              />
            </div>
            <div>
              <label htmlFor="retexNotes" className="block text-sm font-medium mb-1">
                Leçons apprises et plan d'action
              </label>
              <textarea
                id="retexNotes"
                name="retexNotes"
                rows={5}
                defaultValue={incident.retexNotes ?? ""}
                maxLength={5000}
                className="input"
                placeholder="Ce qui a bien marché, ce qui n'a pas marché, ce qu'on change. Plan d'action 30/60/90 jours."
              />
            </div>
            <div>
              <label htmlFor="estimatedCost" className="block text-sm font-medium mb-1">
                Coût estimé (€) — optionnel
              </label>
              <input
                id="estimatedCost"
                name="estimatedCost"
                type="number"
                min={0}
                defaultValue={incident.estimatedCost ?? ""}
                className="input"
                placeholder="Ex : 25000"
              />
            </div>
            <button type="submit" className="btn-primary text-sm">
              💾 Enregistrer le RetEx
            </button>
          </form>
        </section>
      )}
    </>
  );
}
