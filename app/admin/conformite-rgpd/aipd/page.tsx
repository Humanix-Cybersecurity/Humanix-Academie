// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/conformite-rgpd/aipd - Generateur AIPD (Analyse d'Impact a la
// Protection des Données) pour les traitements de L'ENTREPRISE CLIENTE.
//
// Cote « conformite de son entreprise », pas cote « donnees chez Humanix » :
// l'AIPD qu'on aide a produire ici porte sur SA paie, SA videosurveillance.
//
// Approche pragmatique : on ne reinvente pas le PIA Tool de la CNIL. On
// fournit un MODELE Markdown pre-rempli avec toutes les sections attendues
// (article 35 RGPD), que le DPO peut copier, completer et exporter.
//
// L'AIPD est un document evolutif - le DPO l'enregistre dans son outil de
// préférence (Notion, OneDrive, GRC). Le modèle Humanix sert de squelette
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
  title: "Générateur AIPD - Console DPO | Humanix",
  description:
    "Modèle d'Analyse d'Impact à la Protection des Données, conforme article 35 RGPD, exportable en Markdown. Squelette méthodologique pour DPO interne ou mutualisé.",
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
        title="Générateur AIPD"
        description="Modèle d'Analyse d'Impact pré-rempli, conforme article 35 RGPD. Copie, complète, exporte."
        icon="📝"
        actions={
          <Link
            href="/admin/conformite-rgpd"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition text-sm font-medium"
          >
            <span aria-hidden="true">←</span>
            Retour au parcours
          </Link>
        }
      />

      {/* ============================================================
          1. Note methodologique
          ============================================================ */}
      <AdminSection
        title="Avant de commencer"
        description="L'AIPD est un exercice structuré. Voici la méthode rapide."
        variant="muted"
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Quand mener une AIPD ?
            </strong>{" "}
            Article 35.3 RGPD impose une AIPD pour les traitements à risque
            élevé : profilage / décisions automatisées, données sensibles à
            grande échelle, surveillance systématique d'espaces publics,
            transferts hors UE de grande ampleur, données de personnes
            vulnérables (mineurs, salariés).
          </p>
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Combien de temps ?
            </strong>{" "}
            Une AIPD bien menée prend 4 à 8 heures de DPO + 2 à 4 heures
            d'échanges avec le métier et l'IT. Au-delà, c'est qu'il y a un
            problème de scoping (le projet est sans doute trop ambitieux et doit
            être decoupé).
          </p>
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Outils recommandés :
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
            (Windows/Mac/Linux) est l'outil officiel - accepté par la CNIL en
            cas de contrôle. Le modèle ci-dessous est un squelette Markdown
            complémentaire pour ceux qui préfèrent travailler dans Notion,
            OneDrive ou un GRC.
          </p>
          <p>
            <strong className="text-primary-500 dark:text-accent-300">
              Module pédagogique :
            </strong>{" "}
            le module{" "}
            <Link
              href="/apprendre/dpo-quotidien/01-aipd"
              className="text-accent-500 underline font-medium"
            >
              "Mener une AIPD sans s'y noyer"
            </Link>{" "}
            de la saison dpo-quotidien détaille la méthode. Lecture 8 minutes.
          </p>
        </div>
      </AdminSection>

      {/* ============================================================
          2. Template AIPD interactif (client component pour le copy)
          ============================================================ */}
      <AdminSection
        title="Modèle Markdown"
        description="Copie le contenu, colle-le dans ton outil préféré, complète les zones [à remplir]."
      >
        <AipdTemplateClient />
      </AdminSection>

      {/* ============================================================
          3. Apres l'AIPD : que faire ?
          ============================================================ */}
      <AdminSection
        title="Après avoir rempli l'AIPD"
        description="Les 4 étapes critiques post-rédaction"
        variant="highlight"
      >
        <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Validation interne :
            </strong>{" "}
            l'AIPD doit être validée par le responsable de traitement (DG /
            métier) ET le DPO. Trace écrite de la validation.
          </li>
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Consultation des personnes concernées :
            </strong>{" "}
            si pertinent, recueillir leur avis (article 35.9). Exemple : CSE
            pour les salariés, panels pour les clients.
          </li>
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Consultation préalable CNIL :
            </strong>{" "}
            si l'AIPD révèle un risque résiduel élevé malgré les mesures, la
            CNIL doit être consultée AVANT mise en oeuvre (article 36). Réponse
            sous 8 semaines.
          </li>
          <li>
            <strong className="text-primary-500 dark:text-accent-300">
              Revue périodique :
            </strong>{" "}
            l'AIPD doit être revue tous les ans ou dès qu'il y a un changement
            substantiel du traitement. Marque la date de prochaine revue dans
            ton calendrier DPO.
          </li>
        </ol>
      </AdminSection>
    </div>
  );
}
