// SPDX-License-Identifier: AGPL-3.0-or-later
// Landing publique — refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur — celle qui sent bon la maitrise et la confiance".
//
// Cette landing est le 1er contact. Avant, le ton etait commercial classique
// ("14 jours gratuits", "effet realisme garanti", "argument marque
// employeur beton"). On reformule en langage de maitrise tranquille,
// coherent avec /manifeste, /apprendre, /audit-flash, /famille, /securite,
// /urgence-cyber.
//
// Logique metier preservee : getCyberMeteo, AnecdoteSubscribeForm.
// Aucune migration, aucune query supplementaire.

import Image from "next/image";
import Link from "next/link";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";
import HexBackdrop from "@/components/HexBackdrop";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import { CyberMeteoCompact } from "@/components/CyberMeteoBadge";

export const revalidate = 3600;

export default async function HomePage() {
  const meteo = await getCyberMeteo();

  return (
    <main id="main-content" className="overflow-x-hidden">
      {/* ============================================================
          1. HERO — accueil chaleureux, gradient text anime
          ============================================================ */}
      <HexBackdrop intensity="medium" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-20 sm:pt-16 sm:pb-28"
        >
          <div className="flex justify-center mb-6 animate-fadeIn">
            <CyberMeteoCompact meteo={meteo} />
          </div>

          <div className="text-center">
            <div
              className="flex justify-center mb-8 animate-slide-up"
              style={{ animationDelay: "60ms" }}
            >
              <Image
                src="/logo-humanix-academie-512.png"
                alt="Humanix Académie"
                width={240}
                height={363}
                priority
                className="h-auto w-auto max-h-56 sm:max-h-64 animate-float"
              />
            </div>

            <h1
              id="hero-title"
              className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
              style={{ animationDelay: "180ms" }}
            >
              La cybersécurité de votre PME,
              <br />
              <span className="bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500 bg-clip-text text-transparent animate-gradient">
                en cinq minutes par semaine.
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up"
              style={{ animationDelay: "300ms" }}
            >
              Pas un cours d'expert. Pas un kit anti-peur. Une habitude
              tranquille. Conçue pour vos collaborateurs — y compris ceux qui ne
              sont pas à l'aise avec l'informatique.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
              style={{ animationDelay: "420ms" }}
            >
              <Link
                href="/signup?plan=decouverte"
                className="btn-primary text-lg px-8 py-4 animate-glow"
              >
                Créer mon compte gratuit
              </Link>
              <Link
                href="/signup?plan=trial"
                className="btn-secondary text-lg px-8 py-4"
              >
                Essai 14 jours, sans CB
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic text-center">
              Déjà inscrit ?{" "}
              <Link
                href="/connexion"
                className="underline text-accent-700 hover:text-accent-600"
              >
                Se connecter
              </Link>
            </p>

            <p
              className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic animate-fadeIn"
              style={{ animationDelay: "540ms" }}
            >
              Sans carte bancaire · Déploiement en moins de 30 minutes ·
              Hébergé en France
            </p>

            <div
              className="mt-12 inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-accent-500/30 shadow-sm animate-fadeIn"
              style={{ animationDelay: "660ms" }}
            >
              <span className="text-2xl" aria-hidden="true">
                🌿
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-200 text-left">
                Pas encore prêt·e ? Faites une{" "}
                <Link
                  href="/audit-flash"
                  className="font-bold text-accent-700 dark:text-accent-300 underline-offset-4 hover:underline"
                >
                  photo bienveillante de votre maturité cyber
                </Link>{" "}
                en 5 minutes — gratuit, sans email obligatoire.
              </p>
            </div>
          </div>
        </section>
      </HexBackdrop>

      {/* ============================================================
          2. CHIFFRES MARQUANTS — KPIs en cards-stat
          ============================================================ */}
      <section
        aria-labelledby="numbers-title"
        className="max-w-6xl mx-auto px-4 -mt-12 mb-20 relative z-10"
      >
        <h2 id="numbers-title" className="sr-only">
          Chiffres clés
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            value="180+"
            label="modules cyber"
            emoji="📚"
            delay={0}
          />
          <StatCard
            value="5 min"
            label="par semaine, par employé"
            emoji="⏱"
            delay={80}
          />
          <StatCard
            value="0 €"
            label="self-host AGPLv3"
            emoji="🌐"
            delay={160}
          />
          <StatCard
            value="100 %"
            label="hébergé en France"
            emoji="🇫🇷"
            delay={240}
          />
        </div>
      </section>

      {/* ============================================================
          3. COMMENT CA SE PASSE — voyage en 3 etapes
          ============================================================ */}
      <section
        id="voyage"
        aria-labelledby="voyage-title"
        className="max-w-5xl mx-auto px-4 mb-24 scroll-mt-20"
      >
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Le voyage en 3 étapes
          </p>
          <h2
            id="voyage-title"
            className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300"
          >
            Comment ça se passe
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 italic mt-2">
            Du déploiement à la mesure, sans bla-bla.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {VOYAGE_STEPS.map((step, idx) => (
            <VoyageStep
              key={step.title}
              n={idx + 1}
              emoji={step.emoji}
              title={step.title}
              text={step.text}
              delay={idx * 120}
            />
          ))}
        </div>
      </section>

      {/* ============================================================
          4. CE QU'ON CONSTRUIT — 6 features avec ton de maitrise
          ============================================================ */}
      <section
        aria-labelledby="get-titre"
        className="max-w-6xl mx-auto px-4 mb-24"
      >
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            L'écosystème
          </p>
          <h2
            id="get-titre"
            className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300"
          >
            Ce que vous emportez
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mt-3 leading-relaxed">
            Pas que de la formation. Un écosystème pensé pour faire monter en
            compétence vos équipes ET prouver votre démarche aux assureurs,
            OPCO, clients.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeaturePreview
            emoji="📷"
            title="Audit flash"
            text="Quiz 5 min, photo bienveillante de votre maturité cyber, leviers prioritaires, feuille de route."
            href="/audit-flash"
            cta="Faire l'audit"
            delay={0}
          />
          <FeaturePreview
            emoji="💼"
            title="Console dirigeant"
            text="Score risque humain, coût attendu, ROI mesurable, top 3 actions. Pour le COMEX, pas pour la décoration."
            href="/demo"
            cta="Voir la démo"
            delay={80}
          />
          <FeaturePreview
            emoji="🎮"
            title="Hub apprenant"
            text="Mascotte qui évolue, niveaux, badges, boutique. Vos équipes redemandent leurs 5 minutes — sans qu'on les supplie."
            href="/demo"
            cta="Tester en démo"
            delay={160}
          />
          <FeaturePreview
            emoji="🚨"
            title="Cyber-Réflexe"
            text="Workflow ANSSI/RGPD/NIS2 guidé en cas d'incident, brouillons CNIL/ANSSI prêts. Sans drama, sans paniquer."
            href="/urgence-cyber"
            cta="Voir le hub d'urgence"
            delay={240}
          />
          <FeaturePreview
            emoji="🤖"
            title="IA souveraine Mistral"
            text="Phishing ciblé personnalisé, vishing voix générée localement par Piper TTS. Stack 100 % FR — pas de Cloud Act."
            href="/manifeste"
            cta="Lire le manifeste"
            delay={320}
          />
          <FeaturePreview
            emoji="❤️"
            title="Cyber Famille"
            text="Vos employés offrent un parcours cyber gratuit à 3 proches. Personne ne fait ça. C'est notre signature."
            href="/famille"
            cta="Découvrir"
            delay={400}
          />
        </div>
      </section>

      {/* ============================================================
          5. POURQUOI NOUS — bandeau confiance, ton sobre
          ============================================================ */}
      <section
        aria-labelledby="trust-title"
        className="max-w-5xl mx-auto px-4 mb-24"
      >
        <div className="card-hero text-white text-center p-8 sm:p-12 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-12 text-9xl opacity-15"
          >
            🛡
          </div>
          <div className="relative">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold opacity-90 mb-3">
              Notre engagement
            </p>
            <h2
              id="trust-title"
              className="font-display text-2xl sm:text-3xl font-extrabold mb-4"
            >
              La cybersécurité ne devrait pas être un piège commercial.
            </h2>
            <p className="opacity-95 mb-8 max-w-2xl mx-auto leading-relaxed">
              Humanix Académie est conçue, hébergée et opérée en France par
              une équipe spécialiste cyber depuis plus de 10 ans. Code AGPLv3
              public, audit de sécurité publié, gaps assumés. La transparence
              radicale plutôt que le marketing.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <TrustBadge emoji="🇫🇷" label="100 % hébergé en France" />
              <TrustBadge emoji="🛡" label="RGPD-compliant + NIS2" />
              <TrustBadge emoji="♿" label="Accessibilité RGAA AA" />
              <TrustBadge emoji="🔓" label="Code public, audit vérifiable" />
            </div>
            <p className="mt-8 text-sm opacity-80">
              <Link
                href="/comparatif"
                className="underline-offset-4 underline hover:no-underline"
              >
                Comparatif honnête vs concurrents
              </Link>
              {" · "}
              <Link
                href="/securite"
                className="underline-offset-4 underline hover:no-underline"
              >
                Trust Center
              </Link>
              {" · "}
              <Link
                href="/manifeste"
                className="underline-offset-4 underline hover:no-underline"
              >
                Lire le manifeste
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          6. NEWSLETTER — Cyber-Anecdote, ton chaleureux
          ============================================================ */}
      <section
        aria-labelledby="anecdote-cta-title"
        className="max-w-6xl mx-auto px-4 mb-24"
      >
        <div className="rounded-3xl bg-humanix-warm text-white p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -bottom-10 -right-10 text-9xl opacity-15"
          >
            ☕
          </div>
          <div className="relative grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] opacity-90 font-bold mb-2">
                Newsletter gratuite · Tous les lundis
              </p>
              <h2
                id="anecdote-cta-title"
                className="font-display text-2xl sm:text-3xl font-extrabold mb-3"
              >
                La Cyber-Anecdote du Lundi
              </h2>
              <p className="opacity-95 mb-2 leading-relaxed">
                Chaque lundi matin avec votre café :{" "}
                <strong>1 incident cyber réel</strong>,{" "}
                <strong>1 leçon en 3 lignes</strong>, et{" "}
                <strong>1 mini-action</strong> à essayer dans la semaine.
              </p>
              <p className="text-sm opacity-85 italic">
                Aucun spam, désinscription en 1 clic. Hébergé en France.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md">
              <AnecdoteSubscribeForm source="homepage" variant="block" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          7. TARIFS — invitation tranquille
          ============================================================ */}
      <section className="max-w-4xl mx-auto px-4 mb-20">
        <div className="text-center bg-white dark:bg-slate-900 rounded-3xl p-10 border-2 border-accent-500/30 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-3">
            Tarifs transparents
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            Self-host gratuit ou cloud à partir de{" "}
            <span className="tabular-nums">0 €</span>.
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto leading-relaxed">
            Pas de tarif à 4 chiffres. Pas d'engagement piège. Pas de jargon.
            Six paliers limpides — Community, Découverte, Starter, Essentielle,
            Pro, Enterprise.
          </p>
          <Link
            href="/tarifs"
            className="btn-primary inline-flex items-center gap-2"
          >
            Voir les tarifs détaillés <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ============================================================
          8. RESPIRATION — citation finale signature
          ============================================================ */}
      <section className="text-center max-w-3xl mx-auto px-4 pb-20">
        <blockquote className="font-display italic text-lg sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed">
          « La cybersécurité d'une PME, c'est moins une affaire d'expert qu'une
          habitude tranquille. »
        </blockquote>
        <p
          aria-hidden="true"
          className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        >
          — Hex veille
        </p>
      </section>
    </main>
  );
}

// ===========================================================================
// DONNEES STATIQUES
// ===========================================================================

const VOYAGE_STEPS = [
  {
    emoji: "🌱",
    title: "Vous invitez votre équipe",
    text: "Import CSV ou un par un. Chaque collaborateur reçoit un mail avec un lien magique : pas de mot de passe à créer, pas de SSO obligatoire.",
  },
  {
    emoji: "🎮",
    title: "Ils jouent 5 min/semaine",
    text: "Mises en situation, choix multiples, conséquences. On apprend par l'erreur, sans humiliation. Hex la mascotte les accompagne.",
  },
  {
    emoji: "📊",
    title: "Vous mesurez la progression",
    text: "Console claire pour le dirigeant. Preuves de conformité exportables pour l'assureur, l'auditeur, l'ANSSI. Pas un dashboard de vanity metrics.",
  },
];

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function StatCard({
  value,
  label,
  emoji,
  delay,
}: {
  value: string;
  label: string;
  emoji: string;
  delay: number;
}) {
  return (
    <div
      className="card-stat text-center animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-2xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <p className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums leading-none">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider font-medium">
        {label}
      </p>
    </div>
  );
}

function VoyageStep({
  n,
  emoji,
  title,
  text,
  delay,
}: {
  n: number;
  emoji: string;
  title: string;
  text: string;
  delay: number;
}) {
  return (
    <article
      className="relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-gray-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all animate-slide-up h-full"
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

function FeaturePreview({
  emoji,
  title,
  text,
  href,
  cta,
  delay,
}: {
  emoji: string;
  title: string;
  text: string;
  href: string;
  cta?: string;
  delay: number;
}) {
  return (
    <article
      className="card-feature animate-slide-up h-full flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4 flex-1">
        {text}
      </p>
      <Link
        href={href}
        className="text-sm font-bold text-accent-700 dark:text-accent-300 hover:text-accent-600 inline-flex items-center gap-1 underline-offset-4 hover:underline"
      >
        {cta ?? "En savoir plus"} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

function TrustBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-3 border border-white/30">
      <div className="text-2xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <p className="text-xs font-medium leading-tight">{label}</p>
    </div>
  );
}
