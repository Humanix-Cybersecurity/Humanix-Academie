// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique Cyber-météo France - accessible à tous (pas d'auth requise).
// Sert de landing pour le badge en bandeau home, et de page éducative
// "comprendre les niveaux d'alerte cyber".

import Link from "next/link";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import { CyberMeteoCard } from "@/components/CyberMeteoBadge";
import HexBackdrop from "@/components/HexBackdrop";

export const dynamic = "force-dynamic";
// Revalidation côté serveur (Next.js) : toutes les heures
export const revalidate = 3600;

export const metadata = {
  title:
    "Cyber-météo France — niveau d'alerte cyber national | Humanix Académie",
  description:
    "Niveau d'alerte cyber national en temps réel, calculé à partir du flux officiel CERT-FR. Souverain, gratuit, hébergé en France.",
  alternates: { canonical: "/cyber-meteo" },
  openGraph: {
    title: "Cyber-météo France — Le niveau d'alerte cyber, en clair",
    description:
      "Données officielles CERT-FR, agrégées toutes les heures. Aucune télémétrie, aucune dépendance hors UE, aucun alarmisme.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyber-météo France — niveau d'alerte cyber",
    description:
      "🟢 Calme · 🟡 Vigilance · 🔴 Critique. Données CERT-FR temps réel.",
  },
};

export default async function CyberMeteoPage() {
  const meteo = await getCyberMeteo();

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ================================================================
          1. HERO - invitation a la lecture, pas alarme
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-4xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            🇫🇷 Cyber-meteo France · CERT-FR temps reel
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Le niveau d'alerte,{" "}
            <span className="text-accent-500">en clair.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Donnees officielles CERT-FR (cert.ssi.gouv.fr) agregees toutes les
            heures. Aucune telemetrie chez vous, aucune dependance hors UE,
            aucune alarmisme - juste la lecture honnete du moment.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-4xl mx-auto px-4 py-10">
      <CyberMeteoCard meteo={meteo} />

      <section className="card mt-10">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          Comprendre les niveaux
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <LevelRow
            emoji="🟢"
            title="Calme"
            desc="Activité cyber nationale en steady state. Continuer ses bonnes pratiques sans alerte particulière."
          />
          <LevelRow
            emoji="🟡"
            title="Vigilance"
            desc="Légère hausse de l'activité. Sensibiliser les équipes, vérifier la fraîcheur des sauvegardes."
          />
          <LevelRow
            emoji="🟠"
            title="Élevée"
            desc="Vague d'attaques en cours. Renforcer la vigilance phishing, reporter les opérations sensibles si possible."
          />
          <LevelRow
            emoji="🔴"
            title="Critique"
            desc="Crise cyber nationale. Activer la cellule de crise, prioriser la défense, communiquer en interne."
          />
        </div>
      </section>

      <section className="card mt-6 bg-gray-50 dark:bg-slate-800 text-sm">
        <h3 className="font-bold text-primary-500 mb-2">
          Comment c'est calculé ?
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Nous interrogeons toutes les heures les flux RSS officiels CERT-FR
          (alertes + avis). Le niveau est déduit de :
        </p>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
          <li>
            <strong>Volume sur 7 jours</strong> - un nombre élevé d'alertes
            signe une période chaude
          </li>
          <li>
            <strong>Pic sur 24h</strong> - déclenche un saut de niveau plus
            agressif (signal d'événement en cours)
          </li>
          <li>
            <strong>Thèmes dominants</strong> - extraits des titres pour
            contextualiser le résumé en cas d'alerte
          </li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 mt-3">
          Les seuils sont calibrés sur les observations CERT-FR 2023-2025 : ~5
          alertes/semaine en steady state, 10+ = vague, 15+ ou 4+ en 24h =
          critique.
        </p>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white text-center p-6 sm:p-10 mt-6 shadow-xl relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-8 text-[160px] opacity-10 select-none pointer-events-none rotate-12"
        >
          🌤
        </div>
        <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-80 mb-2 relative">
          Aller plus loin
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-3 relative leading-tight">
          Cette meteo est notre engagement de transparence.
        </h2>
        <p className="opacity-90 mb-6 max-w-xl mx-auto leading-relaxed relative">
          Pour aller au-dela : photo claire de la maturite humaine de ton
          organisation en 5 minutes, ou demarrage d'un programme de
          sensibilisation pour tes equipes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
          <Link
            href="/audit-flash"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            🎯 Photo claire de la maturite (5 min)
          </Link>
          <Link
            href="/demo"
            className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
          >
            Ouvrir une demo (sans carte)
          </Link>
        </div>
      </section>

      {/* ================================================================
          CITATION FINALE - signature cosy "Hex veille"
          ================================================================ */}
      <section className="text-center pt-10 pb-4">
        <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « La meteo cyber n'est pas une alarme - c'est une lecture du ciel.
          On observe, on prepare, on n'angoisse pas. La vigilance se cultive,
          la peur s'epuise. »
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

function LevelRow({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
      <div className="text-2xl shrink-0" aria-hidden="true">
        {emoji}
      </div>
      <div>
        <p className="font-bold text-primary-500">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
      </div>
    </div>
  );
}
