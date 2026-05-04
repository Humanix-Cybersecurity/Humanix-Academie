// Creation d'un nouvel incident.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { createIncidentAction } from "../actions";
import { INCIDENT_TYPE_LABELS } from "@/lib/incident-response/playbooks";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

const SEVERITIES = [
  { value: "LOW", label: "Mineur — suspicion ou contenu" },
  { value: "MEDIUM", label: "Significatif — périmètre limité" },
  { value: "HIGH", label: "Majeur — périmètre étendu" },
  { value: "CRITICAL", label: "Critique — continuité menacée" },
];

export default async function NewIncidentPage() {
  const session = await auth();
  const tenantId = (session!.user as any).tenantId as string;
  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "incidents")) redirect("/admin/incidents");

  const today = new Date().toISOString().slice(0, 16);

  return (
    <>
      <AdminPageHeader
        title="Déclarer un incident"
        description="Le workflow va se générer automatiquement avec une checklist adaptée à votre type d'incident (H+0, H+24, H+72, semaine 1, RetEx)."
        icon="🚨"
        actions={
          <Link href="/admin/incidents" className="text-sm text-gray-500 hover:text-primary-500 dark:hover:text-accent-300">
            ← Retour aux incidents
          </Link>
        }
      />

      <AdminSection>
      <form action={createIncidentAction} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Titre court *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={5}
            maxLength={200}
            placeholder="Ex : Compromission email DSI"
            className="input"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Type d'incident *
            </label>
            <select id="type" name="type" required className="input" defaultValue="AUTRE">
              {Object.entries(INCIDENT_TYPE_LABELS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.emoji} {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="severity" className="block text-sm font-medium mb-1">
              Sévérité *
            </label>
            <select
              id="severity"
              name="severity"
              required
              className="input"
              defaultValue="MEDIUM"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="detectedAt" className="block text-sm font-medium mb-1">
            Date / heure de détection *
          </label>
          <input
            id="detectedAt"
            name="detectedAt"
            type="datetime-local"
            required
            defaultValue={today}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description (factuelle, sans interprétation) *
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={5000}
            rows={4}
            placeholder="Ce que vous savez de manière certaine. Ex : « À 9h12, signalement par X que Y. À 9h35, vérification confirme Z. »"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="affectedSystems" className="block text-sm font-medium mb-1">
            Systèmes / services touchés (optionnel)
          </label>
          <input
            id="affectedSystems"
            name="affectedSystems"
            type="text"
            maxLength={1000}
            placeholder="Ex : Microsoft 365, serveur de fichiers, comptes RH"
            className="input"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="affectedUsers" className="block text-sm font-medium mb-1">
              Nombre estimé de personnes touchées
            </label>
            <input
              id="affectedUsers"
              name="affectedUsers"
              type="number"
              min={0}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="dataConcerned" className="block text-sm font-medium mb-1">
              Données personnelles concernées ?
            </label>
            <input
              id="dataConcerned"
              name="dataConcerned"
              type="text"
              maxLength={1000}
              placeholder="Ex : email, état civil, données RH, RIB"
              className="input"
            />
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded text-sm">
          <p className="font-bold text-amber-800 dark:text-amber-200">
            ⚠ Important
          </p>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            En cas d'incident grave : appelez d'abord votre RSSI ou un prestataire
            qualifié PRIS (
            <a
              href="https://cyber.gouv.fr/produits-services-qualifies"
              className="underline"
              target="_blank"
              rel="noopener"
            >
              liste ANSSI
            </a>
            ). Cet outil est un guide, pas un remplaçant.
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button type="submit" className="btn-primary">
            🚨 Créer l'incident et démarrer le workflow
          </button>
          <Link href="/admin/incidents" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
      </AdminSection>
    </>
  );
}
