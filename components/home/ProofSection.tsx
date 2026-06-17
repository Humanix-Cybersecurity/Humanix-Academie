// SPDX-License-Identifier: AGPL-3.0-or-later
// Section "preuve sociale" : chiffres cles + bandeau confiance.
// Fusion des sections 2 (chiffres) et 5 (trust) du brouillon precedent
// pour rester sous 5 sections sur la home.

import Link from "next/link";

const STATS = [
  { value: "344", label: "modules cyber", emoji: "📚" },
  { value: "5 min", label: "par semaine, par employé", emoji: "⏱" },
  { value: "0 €", label: "self-host AGPLv3", emoji: "🌐" },
  { value: "100 %", label: "hébergé en France", emoji: "🇫🇷" },
];

const TRUST_BADGES = [
  { emoji: "🇫🇷", label: "100 % hébergé en France" },
  { emoji: "🛡", label: "RGPD by design · aligné NIS2" },
  { emoji: "♿", label: "Accessibilité RGAA (~91 %)" },
  { emoji: "🔓", label: "Code public, audit vérifiable" },
];

export default function ProofSection() {
  return (
    <>
      {/* Chiffres cles - cards stat */}
      <section
        aria-labelledby="numbers-title"
        className="max-w-6xl mx-auto px-4 -mt-12 mb-20 relative z-10"
      >
        <h2 id="numbers-title" className="sr-only">
          Chiffres clés
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="card-stat text-center animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-2xl mb-1" aria-hidden="true">
                {s.emoji}
              </div>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums leading-none">
                {s.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider font-medium">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bandeau confiance - engagement + trust badges */}
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
              {TRUST_BADGES.map((b) => (
                <div
                  key={b.label}
                  className="bg-white/15 backdrop-blur rounded-xl px-3 py-3 border border-white/30"
                >
                  <div className="text-2xl mb-1" aria-hidden="true">
                    {b.emoji}
                  </div>
                  <p className="text-xs font-medium leading-tight">{b.label}</p>
                </div>
              ))}
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
    </>
  );
}
