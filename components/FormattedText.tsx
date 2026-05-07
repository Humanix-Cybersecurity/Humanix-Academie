// SPDX-License-Identifier: AGPL-3.0-or-later
//
// FormattedText - rendu inline du markdown minimal des champs MDX texte
// brut (scenario, debrief, feedback, explanation, body modules).
//
// Le contenu MDX est consomme via gray-matter qui retourne les chaines
// telles quelles (markdown non-parse). Quand on les rend avec
// `{props.debrief}` dans React, les balises `**...**` apparaissent en
// litteral au lieu de devenir gras.
//
// Ce helper transforme :
//   "Le bon reflexe est **organisationnel, pas technique**"
// en :
//   <>Le bon reflexe est <strong>organisationnel, pas technique</strong></>
//
// Il preserve les sauts de ligne (compatible avec whitespace-pre-line).
//
// Pas de dep markdown externe - on ne supporte volontairement que le
// gras `**...**`. Si on veut un jour de l'italique, du code inline ou des
// liens, basculer sur react-markdown (~30 KB).

import { Fragment } from "react";

const BOLD_RE = /(\*\*[^*]+?\*\*)/g;

export default function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(BOLD_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
