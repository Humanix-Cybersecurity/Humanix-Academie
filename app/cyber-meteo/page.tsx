// Page publique Cyber-météo France — accessible à tous (pas d'auth requise).
// Sert de landing pour le badge en bandeau home, et de page éducative
// "comprendre les niveaux d'alerte cyber".

import Link from "next/link";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import { CyberMeteoCard } from "@/components/CyberMeteoBadge";

export const dynamic = "force-dynamic";
// Revalidation côté serveur (Next.js) : toutes les heures
export const revalidate = 3600;

export const metadata = {
  title:
    "Cyber-météo France — niveau d'alerte cyber national | Humanix Académie",
  description:
    "Niveau d'alerte cyber national en temps réel, calculé à partir du flux officiel CERT-FR. Souverain, gratuit, hébergé en France.",
};

export default async function CyberMeteoPage() {
  const meteo = await getCyberMeteo();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          🇫🇷 Cyber-météo France
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Le niveau d'alerte cyber national,
          <br />
          <span className="text-accent-500">en temps réel</span>.
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
          Données officielles CERT-FR (cert.ssi.gouv.fr) agrégées toutes les
          heures. Aucune télémétrie chez vous, aucune dépendance hors UE.
        </p>
      </div>

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
            <strong>Volume sur 7 jours</strong> — un nombre élevé d'alertes
            signe une période chaude
          </li>
          <li>
            <strong>Pic sur 24h</strong> — déclenche un saut de niveau plus
            agressif (signal d'événement en cours)
          </li>
          <li>
            <strong>Thèmes dominants</strong> — extraits des titres pour
            contextualiser le résumé en cas d'alerte
          </li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 mt-3">
          Les seuils sont calibrés sur les observations CERT-FR 2023-2025 : ~5
          alertes/semaine en steady state, 10+ = vague, 15+ ou 4+ en 24h =
          critique.
        </p>
      </section>

      <section className="card mt-6 bg-gradient-to-br from-primary-500 to-accent-500 text-white text-center">
        <h2 className="text-2xl font-extrabold mb-2">Aller plus loin</h2>
        <p className="opacity-90 mb-4 max-w-xl mx-auto">
          Cette météo est notre engagement public de transparence. Pour aller
          au-delà : audit cyber gratuit en 5 minutes, ou démarrage d'un
          programme de sensibilisation pour vos équipes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/audit-flash"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            🎯 Audit flash gratuit (5 min)
          </Link>
          <Link
            href="/connexion"
            className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
          >
            Démarrer 14 j gratuits
          </Link>
        </div>
      </section>
    </div>
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
