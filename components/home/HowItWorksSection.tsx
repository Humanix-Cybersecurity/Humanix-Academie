// SPDX-License-Identifier: AGPL-3.0-or-later
// Section "Comment ca se passe" : voyage en 3 etapes (invitation, jeu, mesure).

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

export default function HowItWorksSection() {
  return (
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
          <article
            key={step.title}
            className="relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-gray-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all animate-slide-up h-full"
            style={{ animationDelay: `${idx * 120}ms` }}
          >
            <span
              aria-hidden="true"
              className="absolute -top-3 -left-3 bg-gradient-to-br from-accent-500 to-primary-500 text-white font-display font-extrabold text-xl w-10 h-10 rounded-full flex items-center justify-center shadow-md"
            >
              {idx + 1}
            </span>
            <div className="text-4xl mb-3 mt-2" aria-hidden="true">
              {step.emoji}
            </div>
            <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {step.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
