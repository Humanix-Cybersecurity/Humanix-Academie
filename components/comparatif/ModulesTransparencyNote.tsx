// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Texte de la « Note transparence : modules pédagogiques » de /comparatif.
//
// La page doit rester honnête (cf. la règle éditoriale en tête de
// app/comparatif/page.tsx). Cette note a pourtant affiché deux choses
// inexactes jusqu'au 2026-11-20 :
//
//   - « 503 épisodes ont un scénario détaillé » pour un catalogue de 476
//     modules : le compteur prenait les 27 enquêtes pour des modules
//     (corrigé dans lib/content-availability.ts) ;
//   - « Aucun module ne repose sur un fallback générique », alors que des
//     modules des saisons de démonstration, proposées avec le service,
//     s'affichent en contenu générique.
//
// La note parle donc de deux ensembles, et ne conclut que sur ce qu'elle a
// compté : le catalogue d'un côté, les saisons de démonstration de l'autre.
// Les nombres sont passés en propriétés pour que chaque formulation soit
// testée (components/comparatif/modules-transparency-note.test.tsx).

import Link from "next/link";

type Props = {
  /** Modules annoncés par le catalogue (CATALOGUE_CHIFFRES.modules). */
  catalogueModules: number;
  /** Modules du catalogue qui ont un scénario rédigé. */
  catalogueWritten: number;
  /** Saisons de démonstration CC BY-SA (CATALOGUE_CHIFFRES.saisonsDemo). */
  demoSaisons: number;
  /** Modules de ces saisons. */
  demoModules: number;
  /** Ceux qui sont servis rédigés. */
  demoWritten: number;
};

const PARAGRAPH = "text-sm text-gray-700 dark:text-gray-200 leading-relaxed";

export default function ModulesTransparencyNote({
  catalogueModules,
  catalogueWritten,
  demoSaisons,
  demoModules,
  demoWritten,
}: Props) {
  const demoGeneric = demoModules - demoWritten;

  return (
    <>
      <p className={PARAGRAPH}>
        Notre catalogue affiche {catalogueModules} modules. À ce jour,{" "}
        <strong>
          {catalogueWritten} épisode{catalogueWritten > 1 ? "s ont" : " a"} un
          scénario détaillé rédigé par un expert
        </strong>{" "}
        (badge 📝 sur{" "}
        <Link href="/apprendre" className="text-accent-500 underline">
          /apprendre
        </Link>
        ).
        {catalogueWritten < catalogueModules
          ? " Les autres utilisent un fallback structuré (questions, quiz, débrief générique), la même mécanique que chez la plupart des concurrents listés, qui ne le disent pas."
          : " Aucun module de ce catalogue ne repose sur un fallback générique."}
      </p>
      {demoModules > 0 && (
        <p className={`${PARAGRAPH} mt-2`}>
          S&apos;y ajoutent les {demoSaisons} saisons de démonstration (CC
          BY-SA) : {demoModules} modules
          {demoGeneric <= 0 ? (
            ", tous rédigés."
          ) : (
            <>
              , dont{" "}
              <strong>
                {demoGeneric}{" "}
                {demoGeneric > 1
                  ? "n'ont pas encore leur scénario"
                  : "n'a pas encore son scénario"}
              </strong>
              . {demoGeneric > 1 ? "Ceux-là utilisent" : "Celui-là utilise"} un
              contenu générique (questions, quiz, débrief), signalé par un
              bandeau en tête de module.
            </>
          )}
        </p>
      )}
    </>
  );
}
