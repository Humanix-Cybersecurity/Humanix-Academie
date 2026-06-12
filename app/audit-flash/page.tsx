// SPDX-License-Identifier: AGPL-3.0-or-later
// Landing publique de l'audit flash cyber - refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// Cette page est notre 1er contact public sans authentification - c'est
// notre machine a leads. La version anterieure etait correcte mais
// utilisait du vocabulaire anxiogene ("score", "risques", "failles a
// corriger"). On reformule en langage de **maitrise tranquille** :
//   "score" → "photo claire de votre maturite"
//   "risques prioritaires" → "leviers prioritaires"
//   "plan d'action chiffre" → "feuille de route accessible"
//
// Le wizard interactif (./AuditWizard) reste inchange - c'est le
// composant client qui fait la mecanique du quiz.
//
// SEO-friendly (server component) + a11y respectee (skip-link cible
// main-content, hierarchie h1/h2/h3, emojis aria-hidden).

import type { Metadata } from "next";
import HexBackdrop from "@/components/HexBackdrop";
import AuditWizard from "./AuditWizard";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Audit Cyber Flash gratuit en 5 minutes | Humanix Académie",
  description:
    "Faites le point sur votre cybersécurité en 5 minutes. 15 questions, un rapport PDF avec vos forces, vos 3 leviers prioritaires et une feuille de route concrète. Pour particuliers, équipes et organisations de toute taille. 100 % gratuit, sans relance commerciale.",
  alternates: { canonical: "/audit-flash" },
  openGraph: {
    title: "Audit Cyber Flash gratuit en 5 minutes - Humanix",
    description:
      "Une photo bienveillante de votre maturité cyber. Score, leviers, feuille de route, conformité NIS2. En 5 minutes. Made in France.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Audit Cyber Flash gratuit en 5 minutes - Humanix",
    description:
      "Pas un examen. Une photo bienveillante de votre maturité cyber, avec un PDF reçu par mail.",
  },
};

export default function AuditFlashPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <ServiceJsonLd
        name="Audit Cyber Flash gratuit"
        description="Auto-évaluation de la maturité cyber en 5 minutes, 15 questions, rapport PDF envoyé par email. 100 % gratuit, sans relance commerciale, RGPD-compliant."
        url="/audit-flash"
        serviceType="Cybersecurity self-assessment"
        offers={{ price: "0", priceCurrency: "EUR", description: "Gratuit, rapport PDF envoyé par email" }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Audit Cyber Flash", path: "/audit-flash" },
        ]}
      />
      {/* ============================================================
          1. HERO - chaleureux, anti-pression
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          className="max-w-5xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center"
          aria-labelledby="hero-title"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-accent-500 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-accent-500/30 px-4 py-2 rounded-full mb-8 shadow-sm">
            <span aria-hidden="true">🌿</span> Diagnostic offert · 5 minutes ·
            rapport PDF par email
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Faisons le point.
            <br />
            <span className="bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500 bg-clip-text text-transparent animate-gradient">
              Tranquillement.
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-8 leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Pas un examen. Une <strong>photo bienveillante</strong> de votre
            cybersécurité actuelle, pour savoir par où commencer - sans
            jargon, sans pression.
          </p>

          <div
            className="flex flex-wrap justify-center gap-3 text-sm animate-slide-up"
            style={{ animationDelay: "340ms" }}
          >
            <ConfidenceBadge>⏱ 5 minutes</ConfidenceBadge>
            <ConfidenceBadge>📄 PDF immédiat</ConfidenceBadge>
            <ConfidenceBadge>🇫🇷 100 % français</ConfidenceBadge>
            <ConfidenceBadge>🛡 RGPD-compliant</ConfidenceBadge>
            <ConfidenceBadge>🤝 Aucune relance auto</ConfidenceBadge>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-16">
        {/* ============================================================
            2. COMMENT ÇA MARCHE - 3 étapes pour rassurer
            ============================================================ */}
        <section aria-labelledby="how-title">
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              Le voyage en 3 étapes
            </p>
            <h2
              id="how-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              Comment ça se passe
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <StepCard
              n="1"
              emoji="✏️"
              title="Vous cochez ce qui vous parle"
              text="15 questions simples, formulées comme on parle à un ami. Pas de jargon RSSI. Si vous ne savez pas, c'est aussi une réponse - et c'est OK."
              delay={0}
            />
            <StepCard
              n="2"
              emoji="🧮"
              title="Notre moteur fait le point"
              text="En quelques secondes, on assemble votre photo cyber sur 5 domaines clés (identités, données, humain, infra, conformité)."
              delay={120}
            />
            <StepCard
              n="3"
              emoji="📬"
              title="Vous repartez avec un PDF"
              text="Vos forces, vos 3 leviers prioritaires, une feuille de route accessible pour les 30 prochains jours. À garder, à partager, à classer."
              delay={240}
            />
          </div>
        </section>

        {/* ============================================================
            3. WIZARD - composant client, garde tel quel
            ============================================================ */}
        <section aria-label="Quiz audit cyber" className="scroll-mt-20" id="quiz">
          <AuditWizard />
        </section>

        {/* ============================================================
            4. CE QUE VOUS EMPORTEZ - reformulé sans peur
            ============================================================ */}
        <section aria-labelledby="value-title">
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              Ce que vous emportez
            </p>
            <h2
              id="value-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              Trois choses concrètes, sans surplus
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <ValueCard
              icon="📷"
              title="Une photo claire"
              text="Note globale de maturité cyber, calculée sur 5 domaines clés. Pas une note d'examen - un repère, pour savoir où vous en êtes."
              delay={0}
            />
            <ValueCard
              icon="🎯"
              title="Vos 3 leviers prioritaires"
              text="Pas des « risques » à craindre - des actions à votre portée. Classés du plus impactant au plus accessoire, avec une recommandation actionnable."
              delay={120}
            />
            <ValueCard
              icon="🗺"
              title="Une feuille de route accessible"
              text="Adaptée à votre taille et budget, avec des étapes concrètes pour les 30 prochains jours. Vous décidez du rythme."
              delay={240}
            />
          </div>
        </section>

        {/* ============================================================
            5. POURQUOI DIFFÉRENT - confiance, pas pression
            ============================================================ */}
        <section aria-labelledby="trust-title">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/40 p-8 sm:p-12 shadow-sm">
            <div className="text-center mb-8">
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                Notre pacte avec vous
              </p>
              <h2
                id="trust-title"
                className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300"
              >
                Pourquoi cet audit est différent
              </h2>
            </div>

            <ul className="space-y-5 text-gray-700 dark:text-gray-200 max-w-3xl mx-auto">
              <TrustItem title="Conçu pour la réalité française">
                Pas un copier-coller d'un questionnaire ISO 27001 inadapté à
                votre réalité. Chaque question vise un sujet concret -
                quelle que soit la taille de votre structure (du
                particulier au grand groupe).
              </TrustItem>
              <TrustItem title="Aligné sur la réalité 2026">
                Inclut la conformité NIS2, les obligations RGPD et les
                situations courantes (rançongiciel, fraude au président,
                phishing ciblé) - formulées comme on les vit, pas comme on les
                lit dans un audit officiel.
              </TrustItem>
              <TrustItem title="Aucun commercial ne vous appellera">
                Vous recevez le rapport, vous décidez. Si vous voulez parler à
                un humain, c'est <em>vous</em> qui nous écrivez. Notre métier,
                c'est de vous accompagner - pas de vous harceler.
              </TrustItem>
              <TrustItem title="Vos données sont en sécurité">
                Hébergées en France (Scaleway Paris), jamais revendues,
                supprimables sur simple demande à{" "}
                <a
                  href="mailto:rgpd@humanix-cybersecurity.fr"
                  className="text-accent-700 dark:text-emerald-300 underline-offset-4 hover:underline font-semibold"
                >
                  rgpd@humanix-cybersecurity.fr
                </a>
                .
              </TrustItem>
            </ul>
          </div>
        </section>

        {/* ============================================================
            6. ET APRÈS - projection rassurante
            ============================================================ */}
        <section aria-labelledby="after-title">
          <div className="card-hero relative overflow-hidden animate-glow text-center">
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 text-9xl opacity-15"
            >
              🌅
            </div>
            <div className="relative max-w-2xl mx-auto">
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold opacity-90 mb-3">
                Et après l'audit ?
              </p>
              <h2
                id="after-title"
                className="font-display text-3xl sm:text-4xl font-extrabold mb-5"
              >
                Pas de jugement. Pas de peur. Juste de la maîtrise progressive.
              </h2>
              <ul className="space-y-3 text-base sm:text-lg opacity-90 leading-relaxed">
                <li>
                  <strong>Score solide ?</strong> Continuez ce qui marche. On
                  vous donnera 1 ou 2 raffinements pour aller plus loin.
                </li>
                <li>
                  <strong>Score fragile ?</strong> Pas de panique. Vous saurez
                  par où commencer. Et c'est exactement ce dont vous avez besoin.
                </li>
                <li>
                  <strong>Score moyen ?</strong> C'est la majorité des
                  organisations françaises. Bienvenue dans la normalité -
                  et dans le chemin vers la maîtrise.
                </li>
              </ul>
              <p className="text-sm italic opacity-80 mt-6">
                Votre photo cyber n'est pas un verdict. C'est un point de
                départ.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            7. MÉTHODOLOGIE - pour les RSSI / curieux
            ============================================================ */}
        <section aria-labelledby="method-title">
          <details className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 overflow-hidden group">
            <summary className="cursor-pointer font-display font-bold text-lg sm:text-xl text-primary-500 dark:text-accent-300 p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <span id="method-title">
                Comment on calcule (pour les curieux et les RSSI)
              </span>
              <span
                aria-hidden="true"
                className="text-2xl text-accent-500 transition-transform group-open:rotate-90"
              >
                →
              </span>
            </summary>
            <div className="px-6 pb-6 text-sm text-gray-700 dark:text-gray-200 space-y-3 leading-relaxed">
              <p>
                Les 15 questions couvrent 5 domaines :{" "}
                <strong>identités</strong> (MFA, mots de passe),{" "}
                <strong>protection des données</strong> (sauvegardes, RGPD),{" "}
                <strong>facteur humain</strong> (formation, phishing),{" "}
                <strong>infrastructure</strong> (mises à jour, antivirus) et{" "}
                <strong>conformité</strong> (NIS2, plan de réponse, assurance
                cyber).
              </p>
              <p>
                Chaque question est pondérée selon sa criticité (1 à 3 points).
                Une réponse "OUI" rapporte les points, "NON" et "Je ne sais
                pas" ne rapportent rien - en cybersécurité, ne pas savoir
                équivaut à ne pas faire (ce n'est pas un jugement, juste une
                réalité opérationnelle).
              </p>
              <p>
                Le score final est un pourcentage entre 0 et 100. Verdict
                automatique : <strong>Excellent</strong> (≥ 80),{" "}
                <strong>Solide</strong> (60-79), <strong>Fragile</strong>{" "}
                (40-59), <strong>À renforcer</strong> (&lt; 40).
              </p>
              <p className="italic text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-slate-700">
                Cet audit est un diagnostic indicatif et bienveillant. Pour une
                évaluation certifiée, consultez un prestataire qualifié PASSI
                (référentiel ANSSI). On peut aussi vous y accompagner - c'est
                notre métier.
              </p>
            </div>
          </details>
        </section>

        {/* ============================================================
            8. RESPIRATION - citation finale chaleureuse
            ============================================================ */}
        <section className="text-center pt-4">
          <blockquote className="font-display italic text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La cybersécurité, c'est moins une affaire d'expert qu'une
            habitude tranquille. »
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

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function ConfidenceBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full font-medium shadow-sm">
      {children}
    </span>
  );
}

function StepCard({
  n,
  emoji,
  title,
  text,
  delay,
}: {
  n: string;
  emoji: string;
  title: string;
  text: string;
  delay: number;
}) {
  return (
    <article
      className="relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-gray-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-slide-up h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 -left-3 bg-gradient-to-br from-accent-500 to-primary-500 text-white font-display font-extrabold text-xl w-10 h-10 rounded-full flex items-center justify-center shadow-md"
      >
        {n}
      </span>
      <div className="text-4xl mb-3 mt-2" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {text}
      </p>
    </article>
  );
}

function ValueCard({
  icon,
  title,
  text,
  delay,
}: {
  icon: string;
  title: string;
  text: string;
  delay: number;
}) {
  return (
    <article
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-l-4 border-l-accent-500 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {text}
      </p>
    </article>
  );
}

function TrustItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-200 font-bold mt-0.5"
      >
        ✓
      </span>
      <div>
        <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
          {title}
        </p>
        <p className="leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
