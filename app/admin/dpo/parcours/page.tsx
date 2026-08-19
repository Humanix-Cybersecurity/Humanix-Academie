// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/dpo/parcours — Mise en conformite RGPD, pas a pas.
//
// A QUI CETTE PAGE PARLE
//
//   Pas a un juriste. Dans une TPE/PME le role de DPO atterrit sur la RH, le
//   RAF, parfois le QSE : quelqu'un de competent a qui on a pose un chapeau
//   sans mode d'emploi. On ne fait pas a sa place -- on rend clair.
//
// A NE PAS CONFONDRE avec /admin/dpo, qui montre ce que HUMANIX fait des
// donnees confiees. Ici il s'agit de SON entreprise : sa paie, sa
// videosurveillance, son fichier clients.
//
//   Si les deux se melangeaient, la personne croirait que cocher NOS cases la
//   met en conformite. Ce serait faux, et grave. D'ou l'encart d'ouverture.
//
// Cf. docs/PARCOURS-DPO.md.
// =============================================================================
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import {
  CATALOGUE,
  SECTIONS,
  avancement,
  prochaineEtape,
  type SectionParcours,
} from "@/lib/dpo/catalogue";
import { chargerEtatParcours, statutsSeuls } from "@/lib/dpo/etat";
import EtapeCarte from "@/components/admin/dpo/EtapeCarte";

export const metadata = { title: "Mise en conformité RGPD — Humanix" };

export default async function ParcoursPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }

  const etat = await chargerEtatParcours(
    session.user.id,
    session.user.tenantId as string,
  );
  const statuts = statutsSeuls(etat);
  const { traitees, total } = avancement(statuts);
  const suivante = prochaineEtape(statuts);

  const sections: SectionParcours[] = ["etincelle", "socle", "recurrent"];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon="🧭"
        title="Mise en conformité RGPD, pas à pas"
        description="Ce qu'on attend de vous, dans quel ordre, et une action concrète à chaque étape."
      />

      {/* La distinction qui evite le contresens le plus couteux. */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          Ce parcours concerne <em>votre</em> entreprise
        </p>
        <p className="mt-1 text-amber-800 dark:text-amber-300">
          Votre paie, vos caméras, votre fichier clients. Il ne remplace pas un
          conseil juridique, et cocher ces cases ne vous rend pas conforme :
          c&apos;est vous qui le devenez, étape après étape.{" "}
          <Link href="/admin/dpo" className="underline">
            Ce que Humanix fait de vos données
          </Link>{" "}
          est une autre page.
        </p>
      </div>

      <AdminSection
        title={`${traitees} étape${traitees > 1 ? "s" : ""} sur ${total}`}
        description={
          suivante
            ? `Prochaine : « ${suivante.question} »`
            : "Vous avez traité chaque point. Pensez à revenir : la conformité se rejoue."
        }
      >
        {/* Un compte d'etapes, JAMAIS un pourcentage de conformite : « 82 %
            conforme » serait faux juridiquement et dangereux commercialement. */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuenow={traitees}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${traitees} étapes traitées sur ${total}`}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(traitees / total) * 100}%` }}
          />
        </div>
      </AdminSection>

      {sections.map((s) => {
        const etapes = CATALOGUE.filter((e) => e.section === s);
        if (etapes.length === 0) return null;
        return (
          <AdminSection
            key={s}
            title={SECTIONS[s].titre}
            description={SECTIONS[s].sous_titre}
          >
            <div className="space-y-4">
              {etapes.map((e) => (
                <EtapeCarte
                  key={e.cle}
                  etape={e}
                  etat={etat[e.cle]}
                  estProchaine={suivante?.cle === e.cle}
                />
              ))}
            </div>
          </AdminSection>
        );
      })}
    </div>
  );
}
