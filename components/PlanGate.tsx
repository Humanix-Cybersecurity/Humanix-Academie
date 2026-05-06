// SPDX-License-Identifier: AGPL-3.0-or-later
// Bloc d'upsell affiche quand le plan du tenant ne couvre pas la feature.
// Composant pur (pas de logique cote serveur) - la verification du plan
// est faite par les pages parent qui decident d'afficher PlanGate ou non.
import Link from "next/link";
import { PLAN_LABEL, PLAN_EMOJI, type PlanId, type Feature } from "@/lib/plans";

const FEATURE_PITCH: Record<
  Feature,
  { title: string; benefits: string[]; emoji: string }
> = {
  api: {
    emoji: "🔌",
    title: "API REST publique",
    benefits: [
      "Récupère les données de progression dans ton SIEM, ton RSSI dashboard, ton MSP.",
      "Endpoints temps réel pour l'audit de conformité (NIS2, ANSSI).",
      "Authentification par clés API hashées (SHA-256), revocation 1-clic.",
    ],
  },
  phishing: {
    emoji: "🎣",
    title: "Campagnes de phishing simulé",
    benefits: [
      "Mesure ton taux de clic réel (pas un score théorique).",
      "Templates pré-validés (fausses factures, fraude au président, RIB).",
      "Page pédagogique dédiée si l'utilisateur tombe dans le panneau.",
    ],
  },
  challenges: {
    emoji: "🏆",
    title: "Challenges d'équipe",
    benefits: [
      "Compétition interne sur 7 ou 30 jours pour booster l'engagement.",
      "Classement par service, badges spéciaux pour les vainqueurs.",
      "Idéal pour le mois Cybersécurité d'octobre.",
    ],
  },
  incidents: {
    emoji: "🚨",
    title: "Cyber-Réflexe - Réponse à incident guidée",
    benefits: [
      "Workflow ANSSI/RGPD/NIS2 pas-à-pas dès la détection d'un incident.",
      "Brouillons pré-remplis pour notifier la CNIL (art. 33), l'ANSSI (NIS2 sous 72h) et informer les personnes concernées.",
      "Journal chronologique horodaté + RetEx structuré pour audit et assurance cyber.",
    ],
  },
  phishing_ia: {
    emoji: "🤖",
    title: "Phishing personnalisé par IA souveraine (Mistral)",
    benefits: [
      "Génère 1 mail de phishing UNIQUE par employé en 1 batch (max 50 cibles).",
      "Adapté au service, au ton de l'attaquant et à un évènement contextuel (CSE, séminaire, deal).",
      "IA française Mistral - aucune donnée hors UE. Signaux faibles à débriefer fournis.",
    ],
  },
  marketplace: {
    emoji: "🛒",
    title: "Marketplace de modules contributeurs",
    benefits: [
      "Accède au catalogue de modules pédagogiques contribués par la communauté Humanix (validés par notre équipe).",
      "Publie tes propres modules en interne - éditeur intégré, médias inclus.",
      "Effet de levier collectif : tes pairs RSSI partagent leurs scénarios métier (BTP, santé, retail, finance).",
    ],
  },
  sso_enterprise: {
    emoji: "🔐",
    title: "SSO Entreprise (SAML 2.0 + SCIM v2)",
    benefits: [
      "Single Sign-On via Azure AD / Entra ID, Okta, Ping Identity, OneLogin (SAML 2.0).",
      "Provisioning automatique des comptes utilisateurs via SCIM v2 - création, mise à jour, désactivation en temps réel.",
      "Enforcement MFA hérité de ton IdP, conformité Zero Trust, audit trail complet pour CISO Assistant.",
    ],
  },
  multi_site: {
    emoji: "🏢",
    title: "Multi-établissements (gestion par filiale)",
    benefits: [
      "Sépare la gouvernance par site, filiale ou business unit dans une seule console.",
      "Dashboards isolés par établissement + vue groupe consolidée pour le RSSI corp.",
      "Adapté aux ETI, groupes multi-marques, collectivités multi-sites, franchises.",
    ],
  },
  white_label: {
    emoji: "🎨",
    title: "White-label (marque blanche complète)",
    benefits: [
      "Logo, couleurs, typographie et nom de domaine personnalisés (academie.tonentreprise.fr).",
      "Idéal pour les ESN qui revendent à leurs clients PME (programme Certified Partner).",
      "Idéal pour les groupes qui veulent une plateforme à leur image - interne ou externe.",
    ],
  },
};

export default function PlanGate({
  feature,
  currentPlan,
  requiredPlan,
}: {
  feature: Feature;
  currentPlan: PlanId;
  requiredPlan: PlanId;
}) {
  const pitch = FEATURE_PITCH[feature];
  return (
    <div className="card max-w-2xl mx-auto bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-slate-800 dark:to-slate-700 border-2 border-accent-500/30">
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{pitch.emoji}</div>
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          Inclus à partir de l'offre {PLAN_LABEL[requiredPlan]}{" "}
          {PLAN_EMOJI[requiredPlan]}
        </p>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-2">
          {pitch.title}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Ton offre actuelle : <strong>{PLAN_LABEL[currentPlan]}</strong>. Cette
          fonctionnalité est disponible dès{" "}
          <strong>{PLAN_LABEL[requiredPlan]}</strong>.
        </p>
      </div>

      <ul className="space-y-2 mb-6">
        {pitch.benefits.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"
          >
            <span className="text-accent-500 mt-0.5">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/tarifs"
          className="btn-primary text-sm py-3 px-5 text-center"
        >
          Voir les tarifs détaillés
        </Link>
        <Link
          href="/demo"
          className="btn-secondary text-sm py-3 px-5 text-center"
        >
          Tester {PLAN_LABEL[requiredPlan]} en démo
        </Link>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4 italic">
        En mode démo : retourne sur /demo et choisis l'offre{" "}
        {PLAN_LABEL[requiredPlan]} pour débloquer.
      </p>
    </div>
  );
}
