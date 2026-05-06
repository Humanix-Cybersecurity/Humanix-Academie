// SPDX-License-Identifier: AGPL-3.0-or-later
// Page tarifs publique — refonte mai 2026 (pivot open core service-led).
// Cf. Pack_Lancement_Solo/05_Pivot_OSS_Mai_2026/05_PRICING_VOLUME.md
//
// 6 paliers : Community Edition (self-host) · Découverte (cloud free) ·
// Starter · Essentielle ⭐ · Pro · Enterprise.
import type { ReactNode } from "react";
import Link from "next/link";
import { TIERS, ADD_ONS, type PricingTier } from "@/lib/pricing";
import PricingSimulator from "@/components/PricingSimulator";

export const metadata = {
  title: "Tarifs — Humanix Académie",
  description:
    "Cybersensibilisation française open source AGPL. Self-host gratuit à vie. Cloud à partir de 0 €/mois. 6 paliers, hébergement souverain France.",
};

export default function TarifsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 animate-fadeIn">
      {/* =====================================================================
          HERO — repositionné OSS souverain volume
          ===================================================================== */}
      <section className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Open Source · Souverain · Pour PME
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          La cybersécurité accessible.
          <br />
          <span className="text-accent-500">
            Self-host gratuit ou cloud à partir de 0 €.
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          Plateforme libre AGPLv3, hébergement souverain France, intégration
          native CISO Assistant. Pas de tarif à 4 chiffres. Pas d'engagement
          piège. Pas de jargon.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <Trust>🇫🇷 Code open source AGPL</Trust>
          <Trust>🛡️ RGPD-compliant native</Trust>
          <Trust>📋 Aligné NIS2 et ANSSI</Trust>
          <Trust>🌐 Connecteur CISO Assistant</Trust>
          <Trust>♻️ Forever-free 5 sièges</Trust>
        </div>
      </section>

      {/* =====================================================================
          AUDIT FLASH CTA — gardé, c'est un excellent lead magnet
          ===================================================================== */}
      <section className="mb-12" aria-labelledby="audit-cta-title">
        <div className="rounded-3xl bg-gradient-to-br from-accent-500 to-primary-500 text-white p-6 sm:p-10 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-6xl" aria-hidden="true">
              🎯
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
                100 % gratuit · 5 minutes
              </p>
              <h2
                id="audit-cta-title"
                className="text-2xl sm:text-3xl font-extrabold mb-2"
              >
                Pas sûr de l'offre qu'il vous faut ?
              </h2>
              <p className="opacity-90 mb-4">
                Faites notre <strong>audit cyber flash</strong> : 15 questions,
                un rapport PDF avec votre score et notre recommandation
                personnalisée.
              </p>
              <Link
                href="/audit-flash"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-primary-500 font-bold hover:bg-gray-100 transition"
              >
                Démarrer l'audit gratuit →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SIMULATEUR — gardé, branché sur la nouvelle grille
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
          - xl : 6 cols (1 ligne) — uniquement sur très grand écran
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-primary-500 mb-2">
            Choisis ton offre
          </h2>
          <p className="text-gray-600">
            Self-host libre ou cloud managé. Tu peux changer à tout moment, sans
            pénalité.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <PricingCard key={t.id} tier={t} />
          ))}
        </div>
        <p className="text-xs text-center text-gray-500 mt-6">
          Tous les prix sont HT. Facturation mensuelle ou annuelle au choix. Pas
          d'engagement minimum.
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
          POURQUOI HUMANIX — repositionné OSS souverain
          ===================================================================== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-primary-500 mb-2">
            Pourquoi Humanix ?
          </h2>
          <p className="text-gray-600">Notre positionnement face au marché.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <DiffCard
            emoji="🌐"
            title="Open source AGPLv3"
            text="Code complet sur GitHub. Audite-le, fork-le, héberge-le. Zéro boîte noire, transparence totale."
          />
          <DiffCard
            emoji="🇫🇷"
            title="Souverain par défaut"
            text="Conçu, hébergé et opéré en France. Conformité RGPD/NIS2 native. Pas de Patriot Act au menu."
          />
          <DiffCard
            emoji="🤝"
            title="Intégré à l'écosystème"
            text="Connecteur natif CISO Assistant (intuitem). Format OSCAL standard. Webhooks Sentinel/Splunk/Sekoia."
          />
          <DiffCard
            emoji="🎮"
            title="Ludique pour de vrai"
            text="Mascotte évolutive, boutique, challenges entre services, badges. Les collaborateurs reviennent par envie."
          />
          <DiffCard
            emoji="⚡"
            title="Déployable en 30 minutes"
            text="Pas de chef de projet, pas de SSO obligatoire, pas de 3 semaines de mise en place. Import CSV, c'est parti."
          />
          <DiffCard
            emoji="📊"
            title="Score de risque humain"
            text="Mesure objective, en temps réel, par collaborateur et par service. Ce que ton assureur cyber demande."
          />
          <DiffCard
            emoji="🛒"
            title="Marketplace communauté"
            text="Tes pairs RSSI publient leurs modules, modérés par notre équipe. Effet de levier collectif."
          />
          <DiffCard
            emoji="🦊"
            title="Une mascotte qui te parle"
            text="Hex t'accompagne, te coache, te félicite. Pas un chatbot froid. Un compagnon de progression."
          />
          <DiffCard
            emoji="💰"
            title="Volume plutôt que rente"
            text="3 €/user/mois en Essentielle. 5 à 10x moins cher que les acteurs US. Volume > 30 grosses boîtes."
          />
        </div>
      </section>

      {/* =====================================================================
          COMPARATIF DÉTAILLÉ — 6 paliers
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
                label="Phishing simulé"
                cells={["—", "—", "—", "—", "Illimité", "Illimité"]}
              />
              <FeatureRow
                label="Vishing IA souverain 🇫🇷 (Mistral + Piper)"
                cells={["—", "—", "—", "—", "✓", "✓"]}
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
      </section>

      {/* =====================================================================
          ROI — repositionné
          ===================================================================== */}
      <section className="mb-16">
        <div className="card bg-gradient-to-br from-emerald-50 to-cyan-50 border-2 border-emerald-300">
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
            <div className="text-6xl">💡</div>
            <div>
              <h2 className="text-2xl font-extrabold text-primary-500 mb-3">
                Le retour sur investissement, sans bullshit
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
                attaque évitée — qui statistiquement arrive en 18 mois sur une
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
          <Faq question="Y a-t-il un essai gratuit du cloud payant ?">
            Oui, 30 jours pour les paliers Starter, Essentielle et Pro. Pas de
            carte bancaire à fournir, accès complet aux fonctionnalités. Tu
            choisis ou non de continuer à la fin.
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
          CTA FINAL
          ===================================================================== */}
      <section className="text-center bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl p-12 text-white">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
          Prêt à commencer ?
        </h2>
        <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
          Self-host libre ou compte cloud gratuit en 2 minutes. Premier module
          jouable immédiatement.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/demo"
            className="bg-white text-primary-500 font-bold px-6 sm:px-8 py-4 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            🎮 Tester la démo publique
          </Link>
          <a
            href="https://github.com/humanix-cybersecurity/humanix-ce"
            target="_blank"
            rel="noreferrer"
            className="bg-white/10 backdrop-blur border-2 border-white text-white font-bold px-6 sm:px-8 py-4 rounded-2xl hover:bg-white/20 transition"
          >
            🌐 Voir le code (GitHub)
          </a>
          <a
            href="mailto:contact@humanix-cybersecurity.fr"
            className="bg-white/10 backdrop-blur border-2 border-white text-white font-bold px-6 sm:px-8 py-4 rounded-2xl hover:bg-white/20 transition"
          >
            📞 Échanger avec un expert
          </a>
        </div>
        <p className="text-xs opacity-70 mt-6">
          Une question ? Écris-nous à{" "}
          <strong>contact@humanix-cybersecurity.fr</strong> — on répond sous 4h
          ouvrées.
        </p>
      </section>
    </div>
  );
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function PricingCard({ tier: t }: { tier: PricingTier }) {
  // Détermine la couleur du badge selon le type de tier
  const badge = t.selfHostOnly
    ? { label: "Open Source", color: "bg-purple-100 text-purple-700" }
    : t.freeForever
      ? { label: "Forever Free", color: "bg-emerald-100 text-emerald-700" }
      : t.highlight
        ? { label: "⭐ Le plus populaire", color: "bg-accent-500 text-white" }
        : null;

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
        {t.pricing.monthly.amount === null ? (
          <p className="text-2xl font-extrabold text-primary-500">Sur devis</p>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-primary-500">
              {t.pricing.monthly.display}
            </p>
            {t.pricing.annual.saving && (
              <p className="text-xs text-success font-bold mt-1">
                ou {t.pricing.annual.display} ({t.pricing.annual.saving})
              </p>
            )}
          </>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {t.selfHostOnly
            ? "Pas de limite — votre infra"
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

      <CtaButton tier={t} />
    </article>
  );
}

function CtaButton({ tier: t }: { tier: PricingTier }) {
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
    return (
      <Link href="/signup?plan=decouverte" className={cls}>
        {t.cta.label}
      </Link>
    );
  }
  if (t.cta.type === "trial") {
    // Plans payants (Solo / Essentielle / Pro) : on redirige vers /signup
    // qui cree un tenant en plan trial, puis l'admin peut souscrire le
    // plan paye via Stripe depuis /profil/facturation.
    // Pour les utilisateurs deja loges admin, le CTA Stripe est ailleurs.
    return (
      <Link href={`/signup?plan=trial&target=${t.id}`} className={cls}>
        {t.cta.label}
      </Link>
    );
  }
  // contact (Enterprise)
  return (
    <a href="mailto:contact@humanix-cybersecurity.fr" className={cls}>
      {t.cta.label}
    </a>
  );
}

function Trust({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 font-medium text-gray-700">
      {children}
    </span>
  );
}

function DiffCard({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="card hover:scale-[1.02] hover:shadow-md transition-all">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-bold text-primary-500 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
    </div>
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
