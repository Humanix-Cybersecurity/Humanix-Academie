// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/dpo/aipd - Generateur AIPD (Analyse d'Impact a la Protection des Donnees).
//
// Approche pragmatique : on ne reinvente pas le PIA Tool de la CNIL. On
// fournit un MODELE Markdown pre-rempli avec toutes les sections attendues
// (article 35 RGPD), que le DPO peut copier, completer et exporter.
//
// L'AIPD est un document evolutif - le DPO l'enregistre dans son outil de
// preference (Notion, OneDrive, GRC). Le modele Humanix sert de squelette
// methodologique.
//
// Pourquoi pas un formulaire web ? Parce que :
//   - Une AIPD prend 4 a 8h, on ne la fait pas en 1 session web
//   - Le DPO veut son AIPD dans SON outil, pas dans la plateforme cyber
//   - Markdown export = pivot ouvert, integrable partout
//   - On reduit le perimetre AGPL a un genere statique vs un generateur lourd

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import AipdTemplateClient from "./AipdTemplateClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Generateur AIPD - Console DPO | Humanix",
  description:
    "Modele d'Analyse d'Impact a la Protection des Donnees, conforme article 35 RGPD, exportable en Markdown. Squelette methodologique pour DPO interne ou mutualise.",
};

export default async function AipdGeneratorPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Generateur AIPD"
        description="Modele d'Analyse d'Impact pre-rempli, conforme article 35 RGPD. Copie, complete, exporte."
        icon="📝"
        actions={
          <Link
            href="/admin/dpo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition text-sm font-medium"
          >
            <span aria-hidden="true">←</span>
            Retour espace DPO
          </Link>
        }
      />

      {/* ============================================================
          1. Note methodologique
          ============================================================ */}
      <AdminSection
        title="Avant de commencer"
        description="L'AIPD est un exercice structure. Voici la methode rapide."
        variant="muted"
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Quand mener une AIPD ?
            </strong>{" "}
            Article 35.3 RGPD impose une AIPD pour les traitements a risque
            eleve : profilage / decisions automatisees, donnees sensibles a
            grande echelle, surveillance systematique d'espaces publics,
            transferts hors UE de grande ampleur, donnees de personnes
            vulnerables (mineurs, salaries).
          </p>
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Combien de temps ?
            </strong>{" "}
            Une AIPD bien menee prend 4 a 8 heures de DPO + 2 a 4 heures
            d'echanges avec le metier et l'IT. Au-dela, c'est qu'il y a un
            probleme de scoping (le projet est sans doute trop ambitieux et
            doit etre decoupé).
          </p>
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Outils recommandes :
            </strong>{" "}
            le{" "}
            <a
              href="https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 underline font-medium"
            >
              PIA Tool gratuit de la CNIL
            </a>{" "}
            (Windows/Mac/Linux) est l'outil officiel - accepte par la CNIL en
            cas de controle. Le modele ci-dessous est un squelette Markdown
            complementaire pour ceux qui preferent travailler dans Notion,
            OneDrive ou un GRC.
          </p>
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Module pedagogique :
            </strong>{" "}
            le module{" "}
            <Link
              href="/apprendre/dpo-quotidien/01-aipd"
              className="text-accent-500 underline font-medium"
            >
              "Mener une AIPD sans s'y noyer"
            </Link>{" "}
            de la saison dpo-quotidien detaille la methode. Lecture 8 minutes.
          </p>
        </div>
      </AdminSection>

      {/* ============================================================
          2. Template AIPD interactif (client component pour le copy)
          ============================================================ */}
      <AdminSection
        title="Modele Markdown"
        description="Copie le contenu, colle-le dans ton outil prefere, complete les zones [a remplir]."
      >
        <AipdTemplateClient />
      </AdminSection>

      {/* ============================================================
          3. Apres l'AIPD : que faire ?
          ============================================================ */}
      <AdminSection
        title="Apres avoir rempli l'AIPD"
        description="Les 4 etapes critiques post-redaction"
        variant="highlight"
      >
        <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Validation interne :
            </strong>{" "}
            l'AIPD doit etre validee par le responsable de traitement (DG /
            metier) ET le DPO. Trace ecrite de la validation.
          </li>
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Consultation des personnes concernees :
            </strong>{" "}
            si pertinent, recueillir leur avis (article 35.9). Exemple : CSE
            pour les salaries, panels pour les clients.
          </li>
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Consultation prealable CNIL :
            </strong>{" "}
            si l'AIPD revele un risque residuel eleve malgre les mesures, la
            CNIL doit etre consultee AVANT mise en oeuvre (article 36).
            Reponse sous 8 semaines.
          </li>
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Revue periodique :
            </strong>{" "}
            l'AIPD doit etre revue tous les ans ou des qu'il y a un changement
            substantiel du traitement. Marque la date de prochaine revue dans
            ton calendrier DPO.
          </li>
        </ol>
      </AdminSection>
    </div>
  );
}
