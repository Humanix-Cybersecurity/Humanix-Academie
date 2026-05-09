// SPDX-License-Identifier: AGPL-3.0-or-later
// Page tarifs publique - refonte cosy mai 2026 (pivot open core service-led).
// Cf. Pack_Lancement_Solo/05_Pivot_OSS_Mai_2026/05_PRICING_VOLUME.md
//
// 6 paliers : Community Edition (self-host) · Découverte (cloud free) ·
// Starter · Essentielle ⭐ · Pro · Enterprise.
//
// Refonte cosy mai 2026 :
//  - Hero HexBackdrop avec sous-titre "notre conviction tarifaire"
//  - Section "Pourquoi" : palette 6 saisons cyclees sur les 9 cartes
//  - Cards palette adoucie sur les paliers + cascade slide-up
//  - Citation finale "Hex veille" qui resume le pari editorial
//  - Vocabulaire transforme : "score" reste car c'est tabular, mais ROI
//    perd "sans bullshit" pour "sans embellir" + pas d'urgence martelee
import type { ReactNode } from "react";
import Link from "next/link";
import { TIERS, ADD_ONS, type PricingTier } from "@/lib/pricing";
import PricingSimulator from "@/components/PricingSimulator";
import HexBackdrop from "@/components/HexBackdrop";

const META_TITLE = "Tarifs - Humanix Académie";
const META_DESCRIPTION =
  "Cybersensibilisation française open source AGPL. Self-host gratuit à vie. Cloud à partir de 0 €/mois. 6 paliers, hébergement souverain France.";

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    type: "website",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: ["/logo-humanix-academie-512.png"],
  },
};

type BillingCycle = "monthly" | "annual";

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const params = await searchParams;
  const billing: BillingCycle =
    params.billing === "annual" ? "annual" : "monthly";

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* =====================================================================
          1. HERO - invitation cosy a la lecture des prix
          ===================================================================== */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Notre conviction tarifaire · sans embellir
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            La cybersécurité,{" "}
            <span className="text-accent-500">accessible.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Self-host gratuit à vie sous AGPLv3, ou cloud souverain à partir de
            0 €. Pas de tarif à quatre chiffres, pas d'engagement piège, pas de
            jargon. Le prix est un choix politique - celui de ne laisser
            personne au bord du chemin.
          </p>
          <div
            className="flex flex-wrap justify-center gap-2 text-xs mt-6 animate-fadeIn"
            style={{ animationDelay: "340ms" }}
          >
            <Trust>🇫🇷 Code open source AGPL</Trust>
            <Trust>🛡️ RGPD-compliant native</Trust>
            <Trust>📋 Aligné NIS2 et ANSSI</Trust>
            <Trust>🌐 Connecteur CISO Assistant</Trust>
            <Trust>♻️ Forever-free 5 sièges</Trust>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">

      {/* =====================================================================
          2. AUDIT FLASH CTA - invitation, pas urgence
          ===================================================================== */}
      <section
        className="mb-12 animate-slide-up"
        style={{ animationDelay: "100ms" }}
        aria-labelledby="audit-cta-title"
      >
        <div className="rounded-3xl bg-gradient-to-br from-accent-500 to-primary-500 text-white p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-8 -right-6 text-[140px] opacity-10 select-none pointer-events-none rotate-12"
          >
            🌱
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6 relative">
            <div className="text-6xl" aria-hidden="true">
              🎯
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.25em] opacity-80 font-bold mb-1">
                Photo claire · 5 minutes · gratuit
              </p>
              <h2
                id="audit-cta-title"
                className="font-display text-2xl sm:text-3xl font-extrabold mb-2"
              >
                Tu hésites entre nos offres ?
              </h2>
              <p className="opacity-90 mb-4 leading-relaxed">
                Notre <strong>audit cyber flash</strong> donne une photo claire
                de la maturité humaine de ton organisation, en 15 questions
                bienveillantes. Rapport PDF a la fin, recommandation
                personnalisee - sans pression.
              </p>
              <Link
                href="/audit-flash"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-primary-500 font-bold hover:scale-105 transition shadow-md"
              >
                Démarrer l'audit · 5 min →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SIMULATEUR - gardé, branché sur la nouvelle grille
          ===================================================================== */}
      <section className="mb-16">
        <div className="card bg-gradient-to-br from-primary-50 via-white to-cyan-50 border-2 border-accent-500/30">
          <PricingSimulator />
        </div>
      </section>

      {/* =====================================================================
          6 PALIERS
          - Mobile : 1 col
          - md : 2 cols (3 lignes)
          - lg : 3 cols (2 lignes : free / cloud)
          - xl : 6 cols (1 ligne) - uniquement sur très grand écran
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-primary-500 mb-2">
            Choisis ton offre
          </h2>
          <p className="text-gray-600">
            Self-host libre ou cloud managé. Tu peux changer à tout moment, sans
            pénalité.
          </p>
        </div>

        {/* === Toggle mensuel / annuel === */}
        <div className="flex justify-center mb-8">
          <div
            role="tablist"
            aria-label="Choix de la facturation"
            className="inline-flex items-center gap-1 rounded-2xl border-2 border-gray-200 bg-white p-1 shadow-sm"
          >
            <Link
              role="tab"
              aria-selected={billing === "monthly"}
              href="/tarifs?billing=monthly"
              scroll={false}
              className={`px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                billing === "monthly"
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-700 hover:text-primary-500"
              }`}
            >
              Mensuel · sans engagement
            </Link>
            <Link
              role="tab"
              aria-selected={billing === "annual"}
              href="/tarifs?billing=annual"
              scroll={false}
              className={`relative px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                billing === "annual"
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-700 hover:text-primary-500"
              }`}
            >
              Annuel
              <span
                className={`ml-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  billing === "annual"
                    ? "bg-white text-primary-600"
                    : "bg-success/10 text-success"
                }`}
              >
                jusqu&apos;à −21 %
              </span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <PricingCard key={t.id} tier={t} billing={billing} />
          ))}
        </div>
        <p className="text-xs text-center text-gray-500 mt-6">
          Tous les prix sont HT. Vente directe sans essai gratuit (la{" "}
          <Link href="/demo" className="underline">démo</Link> remplit ce rôle).
          Mensuel résiliable à tout moment, annuel = engagement 12 mois.
        </p>
      </section>

      {/* =====================================================================
          ADD-ONS
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-primary-500 mb-2">
            Options additionnelles
          </h2>
          <p className="text-gray-600">
            À combiner avec n'importe quel palier payant.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ADD_ONS.map((a) => (
            <div
              key={a.id}
              className="card border border-amber-200 bg-amber-50/30"
            >
              <div className="flex items-start gap-4 mb-3">
                <span className="text-4xl shrink-0">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-primary-500">
                    {a.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {a.description}
                  </p>
                </div>
              </div>
              <p className="text-right">
                <span className="font-extrabold text-amber-700">
                  {a.price.display}
                </span>
                <span className="block text-[10px] text-gray-500">
                  {a.price.details}
                </span>
              </p>
              <ul className="space-y-1 text-sm mt-3 pt-3 border-t border-amber-200/50">
                {a.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">→</span>
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          POURQUOI HUMANIX - palette 6 saisons cyclees, animation cascade
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Notre lecture du marche
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
            Pourquoi Humanix ?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            9 raisons structurelles, pas 9 arguments marketing.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              emoji: "🌐",
              title: "Open source AGPLv3",
              text: "Code complet sur GitHub. Audite-le, fork-le, héberge-le. Zéro boîte noire, transparence totale.",
            },
            {
              emoji: "🇫🇷",
              title: "Souverain par defaut",
              text: "Conçu, hébergé et opéré en France. Conformité RGPD/NIS2 native. Pas de Cloud Act au menu.",
            },
            {
              emoji: "🤝",
              title: "Intégré à l'écosystème",
              text: "Connecteur natif CISO Assistant (intuitem). Format OSCAL standard. Webhooks Sentinel/Splunk/Sekoia.",
            },
            {
              emoji: "🎮",
              title: "Ludique pour de vrai",
              text: "Mascotte evolutive, boutique, challenges entre services, badges. Les collaborateurs reviennent par envie.",
            },
            {
              emoji: "⚡",
              title: "Deployable en 30 minutes",
              text: "Pas de chef de projet, pas de SSO obligatoire, pas de 3 semaines de mise en place. Import CSV, c'est parti.",
            },
            {
              emoji: "📊",
              title: "Score de risque humain",
              text: "Mesure objective, en temps reel, par collaborateur et par service. Ce que ton assureur cyber demande.",
            },
            {
              emoji: "🛒",
              title: "Marketplace communaute",
              text: "Tes pairs RSSI publient leurs modules, moderes par notre equipe. Effet de levier collectif.",
            },
            {
              emoji: "🦊",
              title: "Une mascotte qui te parle",
              text: "Hex t'accompagne, te coache, te felicite. Pas un chatbot froid. Un compagnon de progression.",
            },
            {
              emoji: "💰",
              title: "Volume plutot que rente",
              text: "3 €/user/mois en Essentielle. 5 a 10x moins cher que les acteurs US. Volume > 30 grosses boites.",
            },
          ].map((diff, idx) => (
            <DiffCard
              key={diff.title}
              emoji={diff.emoji}
              title={diff.title}
              text={diff.text}
              paletteIndex={idx}
            />
          ))}
        </div>
      </section>

      {/* =====================================================================
          COMPARATIF DÉTAILLÉ - 6 paliers
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-primary-500 mb-2">
            Comparaison détaillée
          </h2>
          <p className="text-gray-600">
            Ce qui est inclus, ce qui ne l'est pas.
          </p>
        </div>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-bold text-primary-500 sticky left-0 bg-gray-50 z-10">
                  Fonctionnalité
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t.id}
                    className="p-3 font-bold text-primary-500 text-center min-w-[100px]"
                  >
                    <div className="text-lg">{t.emoji}</div>
                    <div className="text-xs">{t.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FeatureRow
                label="Code source AGPL"
                cells={["✓", "—", "—", "—", "—", "—"]}
              />
              <FeatureRow
                label="Self-host"
                cells={["✓", "—", "—", "—", "—", "✓"]}
              />
              <FeatureRow
                label="Cloud SaaS hébergé France"
                cells={["—", "✓", "✓", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="5 modules de base"
                cells={["✓", "✓", "✓", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Catalogue complet"
                cells={["—", "—", "Partiel", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Mascotte évolutive"
                cells={["✓", "✓", "✓", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Console dirigeant"
                cells={[
                  "Basique",
                  "Standard",
                  "Standard",
                  "Avancée",
                  "Avancée",
                  "Avancée",
                ]}
              />
              <FeatureRow
                label="Score de risque humain"
                cells={["—", "—", "—", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="SSO M365 / Google"
                cells={["—", "—", "—", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="SCIM v2 (Entra/Okta)"
                cells={["—", "—", "—", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Certificats individuels PDF"
                cells={["—", "—", "—", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="API REST publique"
                cells={["—", "—", "—", "Lecture", "Illimitée", "Illimitée"]}
              />
              <FeatureRow
                label="Connecteur CISO Assistant"
                cells={["✓", "—", "—", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Webhooks signés HMAC"
                cells={["—", "—", "—", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Phishing email - génération templates"
                cells={["—", "—", "—", "—", "Illimité*", "Illimité*"]}
              />
              <FeatureRow
                label="Vishing IA souverain 🇫🇷 (Mistral + Piper TTS)"
                cells={["—", "—", "—", "—", "✓*", "✓*"]}
              />
              <FeatureRow
                label="Smishing IA souverain 🇫🇷 (Mistral)"
                cells={["—", "—", "—", "—", "✓*", "✓*"]}
              />
              <FeatureRow
                label="MCP Server (agents IA Claude/Mistral/GPT)"
                cells={["✓", "✓", "✓", "✓", "✓", "✓"]}
              />
              <FeatureRow
                label="Challenges d'équipe"
                cells={["—", "—", "—", "—", "✓", "✓"]}
              />
              <FeatureRow
                label="Marketplace communauté"
                cells={["—", "—", "—", "—", "✓", "✓"]}
              />
              <FeatureRow
                label="IA Coach personnalisé"
                cells={["—", "—", "—", "—", "✓", "✓"]}
              />
              <FeatureRow
                label="Cyber-Réflexe (incidents)"
                cells={["—", "—", "—", "—", "✓", "✓"]}
              />
              <FeatureRow
                label="Pack NIS2 turnkey"
                cells={["Lite", "Lite", "Lite", "Lite", "Complet", "Complet"]}
              />
              <FeatureRow
                label="Multi-établissements"
                cells={["—", "—", "—", "—", "Light", "Filiales"]}
              />
              <FeatureRow
                label="Customer Success Manager"
                cells={["—", "—", "—", "—", "Dédié", "Dédié + onsite"]}
              />
              <FeatureRow
                label="SLA garanti"
                cells={["—", "—", "—", "—", "—", "99,9 %"]}
              />
              <FeatureRow
                label="Option SecNumCloud"
                cells={["—", "—", "—", "—", "—", "✓"]}
              />
              <FeatureRow
                label="White-label"
                cells={["—", "—", "—", "—", "—", "✓"]}
              />
              <FeatureRow
                label="Support"
                cells={[
                  "Communauté",
                  "Communauté",
                  "Email 48h",
                  "Chat 4h",
                  "CSM dédié",
                  "7j/7 + DPO",
                ]}
              />
            </tbody>
          </table>
        </div>

        {/* Footnote phishing/vishing/smishing - clarifier le modèle */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/15 p-4 text-sm text-amber-900 dark:text-amber-100">
          <p>
            <strong>* Phishing / Vishing / Smishing</strong> - Humanix génère
            gratuitement les <strong>templates et scripts pédagogiques</strong>{" "}
            via IA souveraine Mistral. L'<strong>envoi réel</strong> (emails,
            SMS, appels téléphoniques) n'est <strong>pas inclus</strong> :
            chaque message a un coût opérateur (provider transactionnel SMS,
            email, ou SIP). Deux options : (1) vous gérez l'envoi via votre
            propre provider FR, ou (2)
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Forfait+phishing+vishing+smishing+sur+mesure"
              className="underline font-medium ml-1"
            >
              forfait sur mesure
            </a>{" "}
            avec exécution complète et traçabilité par Humanix.
          </p>
        </div>
      </section>

      {/* =====================================================================
          ROI - chiffres a froid, sans urgence
          ===================================================================== */}
      <section className="mb-16">
        <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 p-6 sm:p-10 shadow-sm">
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
            <div className="text-6xl" aria-hidden="true">
              💡
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                Retour sur investissement · sans embellir
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-3 leading-tight">
                Les chiffres, posés froidement.
              </h2>
              <ul className="space-y-2 text-gray-700">
                <Roi
                  label="Une attaque par phishing réussie en PME"
                  value="coûte en moyenne 35 000 € (Tracfin 2024)"
                />
                <Roi
                  label="Notre offre Essentielle pour 25 collaborateurs"
                  value="coûte 900 €/an (75 €/mois)"
                />
                <Roi
                  label="Réduction observée du taux de clic phishing après 6 mois"
                  value="−60 % (cible standard du marché)"
                />
                <Roi
                  label="Réduction de la prime d'assurance cyber"
                  value="5 à 15 % avec preuve de formation continue"
                />
              </ul>
              <p className="text-sm text-gray-600 mt-4 italic">
                À 900 €/an, l'investissement est rentabilisé dès la première
                attaque évitée - qui statistiquement arrive en 18 mois sur une
                PME non-formée.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          FAQ
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-primary-500 mb-2">
            Questions fréquentes
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Faq question="C'est trop pas cher, ça m'inspire pas confiance">
            Notre code est en open source sur GitHub, vous pouvez l'auditer
            ligne par ligne. Notre équipe vit de l'expertise et de
            l'accompagnement (audit, formation, RSSI externalisé), pas du
            hold-up sur les abonnements SaaS. Le prix bas est un choix politique
            : la cybersécurité ne doit pas être un luxe.
          </Faq>
          <Faq question="Pourquoi gratuit en self-host si vous êtes sérieux ?">
            C'est exactement le modèle de CISO Assistant (intuitem), OpenCTI
            (Filigran), Centreon, Wazuh. Open source = plateforme libre +
            service expert payant. Modèle éprouvé qui finance durablement le
            développement.
          </Faq>
          <Faq question="Comment tester avant de payer ?">
            Pas d&apos;essai gratuit sur les paliers payants : la{" "}
            <Link href="/demo" className="underline">
              démo en ligne
            </Link>{" "}
            (comptes pré-remplis, données fictives) couvre déjà ce besoin.
            Pour la version libre,{" "}
            <Link href="/inscription" className="underline">
              le plan Découverte
            </Link>{" "}
            est forever-free 5 sièges. Au-delà : vente directe (mensuel sans
            engagement ou annuel −17 à −21 %).
          </Faq>
          <Faq question="Mes données sont-elles hébergées en France ?">
            Hébergement Union Européenne par défaut (Paris ou Roubaix selon
            configuration). Hébergement français exclusif sur Pro et Enterprise.
            Option SecNumCloud disponible en Enterprise.
          </Faq>
          <Faq question="Que se passe-t-il en cas de désinstallation ?">
            Tes données restent accessibles 30 jours pour export complet (RGPD).
            Au-delà, suppression définitive avec attestation. Les certificats
            individuels déjà émis restent valables.
          </Faq>
          <Faq question="Y aura-t-il des hausses de prix dans 6 mois ?">
            La grille de mai 2026 est garantie pour 12 mois minimum. Les clients
            déjà inscrits gardent leur tarif lock-in à vie (grand-fathering).
            Toute évolution sera annoncée 60 jours en avance.
          </Faq>
          <Faq question="Quel est l'engagement contractuel ?">
            Aucun engagement minimum sur Cloud. Tu peux résilier à tout moment
            depuis ta console, prorata jour exact. Engagement annuel = remise
            –17 à –21 %, totalement optionnel.
          </Faq>
          <Faq question="Quelle différence avec votre concurrent intuitem (CISO Assistant) ?">
            Aucune, on est complémentaires. CISO Assistant fait la conformité
            (registres, contrôles, preuves). Humanix fait la sensibilisation
            humaine (modules, gamification, phishing). Notre intégration native
            exporte les preuves Humanix vers CISO Assistant.
          </Faq>
        </div>
      </section>

      {/* =====================================================================
          CTA FINAL - invitation cosy, pas urgence
          ===================================================================== */}
      <section
        aria-labelledby="cta-final"
        className="relative text-center bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 rounded-3xl p-8 sm:p-12 text-white shadow-xl overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-8 text-[180px] opacity-10 select-none pointer-events-none rotate-12"
        >
          🌱
        </div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-80 mb-2 relative">
          A toi de jouer
        </p>
        <h2
          id="cta-final"
          className="font-display text-3xl sm:text-4xl font-extrabold mb-3 relative leading-tight"
        >
          Prends une etoile, prends un compte, ou juste un cafe.
        </h2>
        <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto leading-relaxed relative">
          Self-host libre ou cloud gratuit en 2 minutes. Premier module jouable
          immediatement. Pas de carte bancaire, pas de relance commerciale, pas
          de pression.
        </p>
        <div className="flex flex-wrap justify-center gap-3 relative">
          <Link
            href="/demo"
            className="bg-white text-primary-500 font-bold px-6 sm:px-8 py-4 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            🎮 Tester la demo publique
          </Link>
          <a
            href="https://github.com/Humanix-Cybersecurity/Humanix-Academie"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 backdrop-blur border-2 border-white/70 text-white font-bold px-6 sm:px-8 py-4 rounded-2xl hover:bg-white/20 transition"
          >
            ⭐ Voir le repo GitHub
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
          <a
            href="mailto:contact@humanix-cybersecurity.fr"
            className="bg-white/10 backdrop-blur border-2 border-white/70 text-white font-bold px-6 sm:px-8 py-4 rounded-2xl hover:bg-white/20 transition"
          >
            📞 Echanger avec un expert
          </a>
        </div>
        <p className="text-xs opacity-70 mt-6 relative">
          Une question ? <strong>contact@humanix-cybersecurity.fr</strong> - on
          repond sous 4 h ouvrees.
        </p>
      </section>

      {/* =====================================================================
          CITATION FINALE - signature cosy "Hex veille"
          ===================================================================== */}
      <section className="text-center pt-10 pb-4">
        <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Le prix est un choix politique. On a choisi de ne laisser personne
          au bord du chemin - pas par charite, par strategie. La cybersecurite
          ne peut pas etre un luxe quand 90 % des attaques visent les humains. »
        </blockquote>
        <p
          aria-hidden="true"
          className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        >
          - Hex veille
        </p>
      </section>
      </div>
    </main>
  );
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function PricingCard({
  tier: t,
  billing,
}: {
  tier: PricingTier;
  billing: BillingCycle;
}) {
  // Détermine la couleur du badge selon le type de tier
  const badge = t.selfHostOnly
    ? { label: "Open Source", color: "bg-purple-100 text-purple-700" }
    : t.freeForever
      ? { label: "Forever Free", color: "bg-emerald-100 text-emerald-700" }
      : t.highlight
        ? { label: "⭐ Le plus populaire", color: "bg-accent-500 text-white" }
        : null;

  // Selectionne le prix a afficher selon le cycle. Pour les tiers gratuits
  // / sur devis on garde l'unique display existant.
  const activePricing = t.pricing[billing];

  return (
    <article
      className={`card flex flex-col relative min-w-0 ${
        t.highlight
          ? "border-2 border-accent-500 shadow-xl ring-1 ring-accent-500/20"
          : "border border-gray-200"
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full whitespace-nowrap ${badge.color}`}
        >
          {badge.label}
        </span>
      )}

      <div className="text-4xl mb-2">{t.emoji}</div>
      <h3 className="text-xl font-bold text-primary-500 mb-1">{t.name}</h3>
      <p className="text-xs text-gray-500 italic mb-3 min-h-[32px]">
        {t.tagline}
      </p>

      <div className="mb-4 pb-4 border-b border-gray-100">
        {activePricing.amount === null ? (
          <p className="text-2xl font-extrabold text-primary-500">Sur devis</p>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-primary-500">
              {activePricing.display}
            </p>
            {billing === "annual" && t.pricing.annual.saving && (
              <p className="text-xs text-success font-bold mt-1">
                {t.pricing.annual.saving}
              </p>
            )}
            {billing === "monthly" && t.pricing.annual.saving && (
              <p className="text-xs text-gray-500 mt-1">
                ou {t.pricing.annual.display} en annuel
              </p>
            )}
          </>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {t.selfHostOnly
            ? "Pas de limite - votre infra"
            : t.seats.max
              ? `${t.seats.min}–${t.seats.max} utilisateurs`
              : `${t.seats.min}+ utilisateurs`}
        </p>
      </div>

      <ul className="space-y-2 text-sm flex-1 mb-5">
        {t.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-success flex-shrink-0 mt-0.5">✓</span>
            <span className="text-gray-700">{f}</span>
          </li>
        ))}
      </ul>

      <CtaButton tier={t} billing={billing} />
    </article>
  );
}

function CtaButton({
  tier: t,
  billing,
}: {
  tier: PricingTier;
  billing: BillingCycle;
}) {
  const cls = t.highlight ? "btn-primary text-sm" : "btn-secondary text-sm";

  if (t.cta.type === "github") {
    return (
      <a
        href="https://github.com/humanix-cybersecurity/humanix-ce"
        target="_blank"
        rel="noreferrer"
        className={cls}
      >
        {t.cta.label} →
      </a>
    );
  }
  if (t.cta.type === "signup-free") {
    // Decouverte = apprenant gratuit sur le tenant Communauté (LEARNER).
    // Pas de création de tenant : on envoie sur /inscription qui pose le
    // cookie d'intention et déclenche le SSO/magic link (Phase 2).
    return (
      <Link href="/inscription" className={cls}>
        {t.cta.label}
      </Link>
    );
  }
  if (t.cta.type === "subscribe") {
    // Plans payants (Solo / Essentielle / Pro) self-service : flow Payplug
    // automatisé. /souscrire collecte email + organisation puis crée la
    // session Payplug. Le webhook back-end provisionne tenant + ADMIN +
    // magic link à la confirmation du paiement (Phase 3b).
    // Le cycle (mensuel / annuel) est propage via la query string pour
    // que /souscrire affiche la bonne offre et pousse au backend.
    return (
      <Link
        href={`/souscrire?plan=${t.id}&billing=${billing}`}
        className={cls}
      >
        {t.cta.label}
      </Link>
    );
  }
  // contact (Enterprise) — instance dédiée, +250 sièges, sur-mesure.
  // Géré manuellement via /demande-abonnement (founder valide les cas
  // particuliers, le reste est self-service).
  return (
    <Link
      href={`/demande-abonnement?type=enterprise&plan=${t.id}`}
      className={cls}
    >
      {t.cta.label}
    </Link>
  );
}

function Trust({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 font-medium text-gray-700">
      {children}
    </span>
  );
}

// Palette 6 saisons cyclees (cyan/emerald/amber/purple/rose/indigo) pour
// donner du caractere aux 9 cartes "Pourquoi Humanix" - la grammaire
// visuelle est partagee avec /comparatif, /librairie, /lancement-oss.
const DIFF_PALETTES = [
  {
    bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
    ring: "border-cyan-200 dark:border-cyan-900/40",
    accent: "text-cyan-700 dark:text-cyan-300",
  },
  {
    bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
    ring: "border-emerald-200 dark:border-emerald-900/40",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
    ring: "border-amber-200 dark:border-amber-900/40",
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
    ring: "border-purple-200 dark:border-purple-900/40",
    accent: "text-purple-700 dark:text-purple-300",
  },
  {
    bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
    ring: "border-rose-200 dark:border-rose-900/40",
    accent: "text-rose-700 dark:text-rose-300",
  },
  {
    bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
    ring: "border-indigo-200 dark:border-indigo-900/40",
    accent: "text-indigo-700 dark:text-indigo-300",
  },
];

function DiffCard({
  emoji,
  title,
  text,
  paletteIndex = 0,
}: {
  emoji: string;
  title: string;
  text: string;
  paletteIndex?: number;
}) {
  const palette = DIFF_PALETTES[paletteIndex % DIFF_PALETTES.length];
  return (
    <article
      className={`rounded-3xl border-2 ${palette.ring} bg-gradient-to-br ${palette.bg} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up h-full`}
      style={{ animationDelay: `${paletteIndex * 60}ms` }}
    >
      <div className="text-3xl mb-3" aria-hidden="true">
        {emoji}
      </div>
      <h3
        className={`font-display text-lg font-extrabold ${palette.accent} mb-2 leading-tight`}
      >
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {text}
      </p>
    </article>
  );
}

function FeatureRow({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-primary-50/30">
      <td className="p-3 text-gray-700 sticky left-0 bg-white z-10">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="p-3 text-center">
          {c === "✓" ? (
            <span className="text-success font-bold">✓</span>
          ) : c === "—" ? (
            <span className="text-gray-300">—</span>
          ) : (
            <span className="text-xs font-medium text-gray-700">{c}</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function Roi({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="text-success text-lg flex-shrink-0">→</span>
      <span>
        <span className="text-gray-700">{label} </span>
        <strong className="text-primary-500">{value}</strong>
      </span>
    </li>
  );
}

function Faq({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="card group">
      <summary className="font-bold text-primary-500 cursor-pointer list-none flex items-center justify-between">
        <span>{question}</span>
        <span className="text-accent-500 group-open:rotate-45 transition-transform text-xl">
          +
        </span>
      </summary>
      <p className="text-sm text-gray-600 mt-3 leading-relaxed">{children}</p>
    </details>
  );
}
