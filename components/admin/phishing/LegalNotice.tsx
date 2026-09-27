// SPDX-License-Identifier: AGPL-3.0-or-later
// Bandeau « cadre éthique et légal » des modules de simulation et de veille.
//
// Un seul composant, une variante par module. Le cadre est le même partout :
// information préalable des collaborateurs (Code du travail, art. L1222-4 :
// aucune information collectée par un dispositif non porté à leur
// connaissance ; art. L2312-38 : information et consultation du CSE),
// aucun usage disciplinaire des résultats, exploitation agrégée (RGPD,
// art. 5 et 32 ; CGV art. 9). Ce qui change, c'est le détail propre au canal :
// la voix de synthèse pour le vishing, l'identifiant d'expéditeur pour le
// smishing, la notice de transparence pour la veille d'exposition.
//
// Le modèle de note d'information à diffuser est servi par
// /admin/conformite-rgpd/note-information.
import Link from "next/link";
import type { ReactNode } from "react";

export type VarianteLegale = "phishing" | "vishing" | "smishing" | "exposition";

const NOTE_INFORMATION = "/admin/conformite-rgpd/note-information";

const CORPS: Record<VarianteLegale, ReactNode> = {
  phishing: (
    <>
      Les simulations doivent être <strong>annoncées préalablement</strong> aux
      collaborateurs (note d&apos;information, charte, CSE). Aucun usage
      disciplinaire des résultats. Pas de stigmatisation : seuls les chiffres
      agrégés sont exploités. Conformément au RGPD (art. 32) et au Code pénal
      (art. 323), ces tests sont des <strong>exercices pédagogiques</strong>,
      pas des attaques.
    </>
  ),
  vishing: (
    <>
      Les appels simulés doivent être <strong>annoncés préalablement</strong>{" "}
      aux collaborateurs (note d&apos;information, charte, CSE). La voix est une{" "}
      <strong>voix de synthèse</strong> : le débrief remis au collaborateur doit
      le dire, et aucune voix d&apos;une personne réelle n&apos;est imitée. Le
      numéro affiché ne doit <strong>jamais usurper un numéro réel</strong> :
      utilisez un numéro dédié fourni par votre opérateur. Aucun usage
      disciplinaire, chiffres agrégés seulement.
    </>
  ),
  smishing: (
    <>
      Les SMS simulés doivent être <strong>annoncés préalablement</strong> aux
      collaborateurs (note d&apos;information, charte, CSE). L&apos;identifiant
      d&apos;expéditeur doit être{" "}
      <strong>celui que votre prestataire SMS vous a attribué</strong> : un
      expéditeur usurpé est refusé par les opérateurs et interdit. Aucun numéro
      ni nom réel d&apos;un service public ou d&apos;une entreprise ne doit être
      imité. Aucun usage disciplinaire, chiffres agrégés seulement.
    </>
  ),
  exposition: (
    <>
      La veille traite des <strong>données personnelles</strong> des
      collaborateurs (adresse professionnelle, présence dans une fuite
      publique). Avant activation : une notice d&apos;information diffusée aux
      collaborateurs, une information du CSE, un accord de traitement signé et
      une durée de conservation fixée. Finalité limitée à la sécurité :{" "}
      <strong>aucun usage disciplinaire ni d&apos;évaluation</strong>. Seules
      les adresses des domaines déclarés sont traitées.
    </>
  ),
};

export default function LegalNotice({
  variante = "phishing",
}: {
  variante?: VarianteLegale;
}) {
  return (
    <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
      <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
        <span aria-hidden="true">⚖️</span>
        Cadre éthique et légal
      </h3>
      <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 leading-relaxed">
        {CORPS[variante]}
      </p>
      <p className="text-xs mt-2">
        <Link
          href={NOTE_INFORMATION}
          className="font-semibold underline text-amber-900 dark:text-amber-100 hover:text-amber-700"
        >
          Modèle de note d&apos;information à diffuser aux collaborateurs →
        </Link>
      </p>
    </article>
  );
}
