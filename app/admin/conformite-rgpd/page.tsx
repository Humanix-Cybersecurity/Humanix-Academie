// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/conformite-rgpd — Mise en conformite RGPD de l'entreprise cliente.
//
// A QUI CETTE PAGE PARLE
//
//   Pas a un juriste. Dans une TPE/PME le role de DPO atterrit sur la RH, le
//   RAF, parfois le QSE : quelqu'un de competent a qui on a pose un chapeau
//   sans mode d'emploi. On ne fait pas a sa place -- on rend clair.
//
// LE SUJET, C'EST SON ENTREPRISE : sa paie, sa videosurveillance, son fichier
// clients. Rien de ce qui est ici ne parle de Humanix.
//
//   Ce que Humanix detient de ses utilisateurs vit ailleurs, sous /admin/dpo
//   (« Vos donnees chez Humanix »). Les deux ont cohabite sous /admin/dpo
//   jusqu'au 2026-08-19 : la hierarchie d'URL laissait croire que la mise en
//   conformite de l'entreprise etait un sous-chapitre de ce que Humanix fait
//   de ses donnees. C'est l'inverse qui est vrai -- les deux sujets n'ont
//   aucun rapport. La confusion coutait cher : on pouvait croire que cocher
//   NOS cases rendait SON entreprise conforme.
//
// D'ou la scission, et l'encart d'ouverture qui la rappelle.
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
} from "@/lib/conformite-rgpd/catalogue";
import { chargerEtatParcours, statutsSeuls } from "@/lib/conformite-rgpd/etat";
import EtapeCarte from "@/components/admin/conformite-rgpd/EtapeCarte";
import OutilsConformite from "@/components/admin/conformite-rgpd/OutilsConformite";

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
          c&apos;est vous qui le devenez, étape après étape.
        </p>
        <p className="mt-2 text-amber-800 dark:text-amber-300">
          Ce que <em>Humanix</em> conserve de vos utilisateurs — rétention,
          demandes d&apos;effacement, journal — est un tout autre sujet, et se
          règle sur{" "}
          <Link href="/admin/dpo" className="underline font-semibold">
            Vos données chez Humanix
          </Link>
          . Rien de ce qui est coché ici n&apos;y change quoi que ce soit, et
          réciproquement.
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

      <AdminSection
        title="Les outils du parcours"
        description="Trames, modules et sources officielles — tous sur les traitements de votre entreprise."
        variant="muted"
      >
        <OutilsConformite />
      </AdminSection>
    </div>
  );
}
