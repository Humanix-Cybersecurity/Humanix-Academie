// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/regles : les regles de securite numerique de l'organisation.
//
// Ce que la page produit, au nom de l'organisation : l'acte d'adoption
// (deliberation du conseil municipal pour une commune, decision de la
// direction sinon), l'affiche des cinq regles, et le suivi des attestations
// de lecture. C'est le pivot du parcours Mairies : des regles qui ne
// demandent pas de juger, et l'autorite qui couvre le refus. Une formation
// enseigne ce ressort ; cette page le rend opposable.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import {
  lireEtatRegles,
  tableauLectures,
} from "@/lib/regles-organisation/etat";
import {
  MESSAGES_ERREUR_REGLES,
  type ErreurRegles,
} from "@/lib/regles-organisation/formulaire";
import { dateLongue } from "@/lib/regles-organisation/deliberation";
import {
  reglesPour,
  TYPES_ORGANISATION,
  VOCABULAIRE,
} from "@/lib/regles-organisation/regles";
import { enregistrerReglesAction as enregistrerReglesActionRef } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Règles de l'organisation - Humanix Académie",
};

const MESSAGES: Record<string, string> = {
  enregistre: "Enregistré.",
  adoptee:
    "Règles adoptées. Chaque personne voit désormais la demande d'attestation de lecture sur sa page d'apprentissage.",
};

function dateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function ReglesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; erreur?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;
  const params = await searchParams;
  const [etat, lectures] = await Promise.all([
    lireEtatRegles(tenantId),
    tableauLectures(tenantId),
  ]);
  const v = VOCABULAIRE[etat.typeOrganisation];
  const regles = reglesPour(etat.typeOrganisation);
  const attestees = lectures.filter((l) => l.lueLe).length;
  const message = params.msg ? MESSAGES[params.msg] : null;
  const erreur = params.erreur
    ? (MESSAGES_ERREUR_REGLES[params.erreur as ErreurRegles] ??
      "Formulaire invalide.")
    : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon="📜"
        title="Les règles de l'organisation"
        description="Cinq règles que personne n'a à interpréter, adoptées par l'organe qui décide, affichées, et lues par chacun. Ce que l'on montre le jour où ça arrive."
      />

      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100 px-4 py-3 text-sm"
        >
          {message}
        </p>
      )}
      {erreur && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100 px-4 py-3 text-sm"
        >
          {erreur}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Adoption
          </p>
          <p className="text-lg font-bold mt-1">
            {etat.adopteeLe
              ? `Adoptées le ${dateLongue(etat.adopteeLe)}`
              : "Pas encore adoptées"}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {etat.adopteeLe
              ? `par ${v.organe}`
              : `par ${v.organe}, à partir de l'acte ci-dessous`}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Attestations de lecture
          </p>
          <p className="text-lg font-bold mt-1">
            {attestees} sur {lectures.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            comptes actifs ayant lu la version {etat.versionRegles}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Documents
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <a
              href="/api/admin/regles/deliberation"
              className="btn-primary text-sm text-center"
            >
              Télécharger la {v.acte} (PDF)
            </a>
            <a
              href="/api/admin/regles/affiche"
              className="btn-secondary text-sm text-center"
            >
              Télécharger l&apos;affiche (PDF)
            </a>
          </div>
        </div>
      </div>

      <AdminSection
        title="L'acte d'adoption"
        description="Renseignez ce qui figurera sur le document. Les champs vides deviennent des pointillés à compléter à la main. Cochez « adoptées » une fois le vote acquis : la demande d'attestation apparaît alors chez chaque personne."
      >
        <form
          action={enregistrerReglesActionRef}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Type d&apos;organisation</span>
            <select
              name="type"
              defaultValue={etat.typeOrganisation}
              className="input"
            >
              {TYPES_ORGANISATION.map((t) => (
                <option key={t} value={t}>
                  {VOCABULAIRE[t].libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Nom de l&apos;organisation</span>
            <input
              name="nom"
              required
              minLength={2}
              maxLength={120}
              defaultValue={etat.nomOrganisation}
              className="input"
              placeholder="Commune de …"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Signataire</span>
            <input
              name="signataire"
              maxLength={120}
              defaultValue={etat.nomSignataire ?? ""}
              className="input"
              placeholder="Prénom Nom"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Fonction du signataire</span>
            <input
              name="fonction"
              maxLength={80}
              defaultValue={etat.fonctionSignataire ?? ""}
              className="input"
              placeholder={v.fonctionSignataire}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Référence de l&apos;acte</span>
            <input
              name="reference"
              maxLength={40}
              defaultValue={etat.referenceActe ?? ""}
              className="input"
              placeholder="2026-042"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Date de séance</span>
            <input
              name="dateSeance"
              type="date"
              defaultValue={dateInput(etat.dateSeance)}
              className="input"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              name="adoptee"
              type="checkbox"
              defaultChecked={etat.adopteeLe != null}
            />
            <span>
              <strong>Règles adoptées</strong> par {v.organe}
              {etat.adopteeLe ? ` (le ${dateLongue(etat.adopteeLe)})` : ""}
            </span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </AdminSection>

      <AdminSection
        title={`Les ${regles.length === 5 ? "cinq" : regles.length} règles`}
        description={`Le texte est le même pour tout le monde et porte un numéro de version (${etat.versionRegles}). Le lien à partager avec les agents : /regles.`}
      >
        <ol className="space-y-3 list-decimal list-inside">
          {regles.map((r) => (
            <li key={r.id} className="text-sm">
              <span className="font-bold">{r.titre}.</span>{" "}
              <span className="text-gray-700 dark:text-gray-200">
                {r.resume}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Voir la page telle que la voient les agents :{" "}
          <Link href="/regles" className="underline">
            /regles
          </Link>
          .
        </p>
      </AdminSection>

      <AdminSection
        title="Qui a lu les règles"
        description="Une attestation par personne et par version. Un compte créé après l'adoption reçoit la demande à sa première connexion."
      >
        {lectures.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Aucun compte actif.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">Personne</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2">Attestation</th>
                </tr>
              </thead>
              <tbody>
                {lectures.map((l) => (
                  <tr
                    key={l.userId}
                    className="border-t border-gray-200 dark:border-slate-700"
                  >
                    <td className="py-2 pr-4">{l.nom}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                      {l.service ?? "—"}
                    </td>
                    <td className="py-2">
                      {l.lueLe ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                          Lue le {dateLongue(l.lueLe)}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          En attente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}
