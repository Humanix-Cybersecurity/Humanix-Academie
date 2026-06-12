// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page publique /pour-les-daf - landing dediee aux Directeurs Administratifs
// et Financiers.
//
// POURQUOI cette page :
//   - Le DAF est un persona très spécifique : il combine finance + risque +
//     conformité + reporting. Aucune plateforme SAT française ne lui parle
//     directement.
//   - La promesse Humanix pour le DAF : (1) éviter le FOVI / deepfake qui
//     coute en moyenne 200 k€, (2) reporting compliance NIS2/RGPD pret pour
//     COMEX, (3) ROI calcule en € pas en metriques cyber-jargon.
//   - C'est souvent le declencheur d'achat dans les PMEs après NIS2.
//
// CONTENU :
//   - Hero : "Le risque humain en € - pas en jargon cyber"
//   - 5 promesses ciblees DAF (FOVI, NIS2 reporting, ROI €, audit trail,
//     procedures pretes)
//   - Cas d'usage concret "DAF de PME 80 personnes après NIS2"
//   - Liens vers /admin/business (ROI €), /admin/impact (KPIs benefices),
//     saisons fraude-president + ransomware + deepfakes
//   - Citation finale "Hex veille"

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import { BreadcrumbJsonLd } from "@/lib/seo/jsonld";

const DAF_TITLE = "Pour les DAF - Éviter FOVI, reporting NIS2 prêt COMEX | Humanix Académie";
const DAF_DESC =
  "Pour les Directeurs Administratifs et Financiers : éviter les FOVI / deepfakes qui coûtent 200 k€ en moyenne, reporting NIS2/RGPD prêt pour COMEX, ROI calculé en €. La cybersécurité humaine en langage de directeur financier.";

export const metadata = {
  title: DAF_TITLE,
  description: DAF_DESC,
  alternates: { canonical: "/pour-les-daf" },
  openGraph: {
    title: DAF_TITLE,
    description: DAF_DESC,
    type: "website",
    url: "/pour-les-daf",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyber pour DAF - Éviter FOVI, reporting NIS2",
    description: DAF_DESC,
    images: ["/logo-humanix-academie-512.png"],
  },
};

const PROMESSES = [
  {
    emoji: "🛡",
    title: "Éviter le FOVI / deepfake",
    palette: {
      bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
      ring: "border-rose-200 dark:border-rose-900/40",
      accent: "text-rose-700 dark:text-rose-300",
    },
    body: "La fraude au président coûte en moyenne 200 k€ à une PME française. Le deepfake video amplifie : 25 M$ chez Arup en janvier 2024. Trois saisons MDX expert + un protocole de re-validation 3 niveaux livré clé-en-main.",
    cta: { label: "Voir saison fraude-président", href: "/apprendre/fraude-president/01-mecanisme" },
  },
  {
    emoji: "📋",
    title: "Reporting NIS2 prêt pour COMEX",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
    body: "Pack NIS2 turnkey : politique signable en 1 minute, registre des traitements pré-rempli, procédure 72h fuite, exports OSCAL pour ton GRC, score conformité humaine par framework. Tu présentes au COMEX, le COMEX comprend.",
    cta: { label: "Voir Pack NIS2", href: "/tarifs#pack-nis2" },
  },
  {
    emoji: "💰",
    title: "ROI calculé en € pas en jargon",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
    body: "Console dirigeant : coût moyen incident estimé en €, probabilité 12 mois, espérance de perte annuelle, économie attendue avec Humanix, ROI multiplier. Sources : Tracfin, ANSSI, baromètre Hiscox. Pas de score sur 100, des chiffres en €.",
    cta: { label: "Voir Impact business", href: "/admin/business" },
  },
  {
    emoji: "📈",
    title: "KPIs bénéfices observés",
    palette: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
      ring: "border-amber-200 dark:border-amber-900/40",
      accent: "text-amber-700 dark:text-amber-300",
    },
    body: "Heures de formation cumulées, modules complétés, couverture sujets critiques (phishing, ransomware, fraude-président, NIS2), delta avant/après mesuré sur ton tenant. Tu vois ce que la plateforme a fait évoluer chez toi, pas une projection théorique.",
    cta: { label: "Voir Impact mesuré", href: "/admin/impact" },
  },
  {
    emoji: "🇫🇷",
    title: "Souverain par défaut",
    palette: {
      bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
      ring: "border-indigo-200 dark:border-indigo-900/40",
      accent: "text-indigo-700 dark:text-indigo-300",
    },
    body: "Hébergement Scaleway Paris, paiement Mollie UE (Amsterdam, régulé DNB), email Scaleway TEM, IA Mistral Paris. Aucune dépendance Cloud Act US par défaut. Tu réponds à ta DGCCRF / CNIL sans avoir à expliquer pourquoi tes données passent par Virginia.",
    cta: { label: "Voir Trust Center", href: "/securite" },
  },
  {
    emoji: "📜",
    title: "Audit trail complet (RGPD article 30)",
    palette: {
      bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
      ring: "border-purple-200 dark:border-purple-900/40",
      accent: "text-purple-700 dark:text-purple-300",
    },
    body: "Toutes les actions sensibles tracées (login, gestion users, billing, droits RGPD, export preuves). Append-only, conservation 13 mois, IP hashée RGPD-safe. Côté COMEX : tu peux prouver tout, à n'importe quel moment.",
    cta: { label: "Voir Journal d'audit", href: "/admin/audit" },
  },
  {
    emoji: "⚖️",
    title: "Loi Sapin II Art. 17 - formation anti-corruption",
    palette: {
      bg: "from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40",
      ring: "border-blue-300 dark:border-blue-900/40",
      accent: "text-blue-800 dark:text-blue-300",
    },
    body: "Si ta boîte fait >500 salariés ou >100 M€ de CA, tu es directement exposé à un contrôle AFA. Défaut de formation = 1 M€ d'amende personne morale. La saison Fraude au Président (6 modules : FOVI, RIB, deepfake vocal, cas Pathé, double validation) est exactement ce que l'AFA cherche en preuve. Export OSCAL framework=SAPIN2 dans CISO Assistant en 1 clic.",
    cta: { label: "Voir mapping Sapin II", href: "/securite/sapin2" },
  },
];

export default function DafLandingPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Pour les DAF", path: "/pour-les-daf" },
        ]}
      />
      {/* ================================================================
          1. HERO
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Pour les DAF · finance + risque + conformité
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Le risque humain{" "}
            <span className="text-accent-500">en €, pas en jargon.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Une fraude au président coûte 200 k€ à une PME française. Un
            ransomware, 250 k€. Humanix transforme la cybersécurité humaine en
            langage que ton COMEX comprend : exposition financière calculée,
            ROI en €, reporting NIS2 turnkey, audit trail complet.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. PROMESSES - 6 cards palette saisons
            ============================================================ */}
        <section aria-labelledby="promesses-title" className="space-y-1">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              6 promesses ciblées DAF
            </p>
            <h2
              id="promesses-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
            >
              Ce qu'un DAF trouve dans Humanix.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 pt-4">
            {PROMESSES.map((p, idx) => (
              <article
                key={p.title}
                className={`rounded-3xl border-2 ${p.palette.ring} bg-gradient-to-br ${p.palette.bg} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="text-4xl mb-3" aria-hidden="true">
                  {p.emoji}
                </div>
                <h3
                  className={`font-display text-xl font-extrabold ${p.palette.accent} mb-2 leading-tight`}
                >
                  {p.title}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
                  {p.body}
                </p>
                <Link
                  href={p.cta.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold ${p.palette.accent} hover:underline`}
                >
                  {p.cta.label} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================
            3. CAS D'USAGE TYPIQUE
            ============================================================ */}
        <section
          aria-labelledby="usecase-title"
          className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Cas d'usage typique
          </p>
          <h2
            id="usecase-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 leading-tight"
          >
            DAF de PME, 80 personnes, post-NIS2.
          </h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                La situation :
              </strong>{" "}
              tu es DAF d'une PME française. NIS2 est entrée en application en
              octobre 2024, ton dirigeant te demande de prouver que les
              collaborateurs sont sensibilisés. Ton commissaire aux comptes te
              questionne sur le risque cyber chiffré. Ton assureur veut une
              preuve de formation continue avant la prochaine cotation.
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Ce qu'apporte Humanix :
              </strong>{" "}
              tu déploies le tenant en 30 minutes. Le Pack NIS2 turnkey te donne
              la politique de sensibilisation prête à signer, le registre des
              traitements pré-rempli, la procédure 72h en cas de fuite. La
              console{" "}
              <Link
                href="/admin/business"
                className="text-accent-500 underline font-medium"
              >
                Impact business
              </Link>{" "}
              calcule l'espérance de perte annuelle (~70 k€ pour ta taille) vs
              le coût de la plateforme (~3 k€/an). Le ROI est x23.
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Le bonus :
              </strong>{" "}
              les saisons MDX{" "}
              <Link
                href="/apprendre/fraude-president/01-mecanisme"
                className="text-accent-500 underline font-medium"
              >
                fraude-président
              </Link>
              {", "}
              <Link
                href="/apprendre/ransomware/01-comprendre"
                className="text-accent-500 underline font-medium"
              >
                ransomware
              </Link>{" "}
              et{" "}
              <Link
                href="/apprendre/deepfakes/02-cas-arup"
                className="text-accent-500 underline font-medium"
              >
                deepfakes
              </Link>{" "}
              forment ton équipe finance directement sur les attaques qui te
              coûtent le plus. Cas réels français (Pathé, CHU de Brest, Arup
              Hong Kong), procédures opérationnelles immédiatement applicables.
              Tu économises 4 à 6 heures de réunion COMEX par an pour expliquer
              "où on en est sur la cyber".
            </p>
          </div>
        </section>

        {/* ============================================================
            4. CHIFFRES CLE QUE TU PEUX REPETER AU COMEX
            ============================================================ */}
        <section
          aria-labelledby="chiffres-title"
          className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-2">
            Chiffres pour le COMEX
          </p>
          <h2
            id="chiffres-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 leading-tight"
          >
            Quelques nombres pour planter le décor.
          </h2>
          <ul className="space-y-3 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <Number
              value="90 %"
              label="des cyberattaques contre une organisation française passent par un humain"
              source="ANSSI 2024"
            />
            <Number
              value="200 k€"
              label="coût moyen d'une fraude au président (toutes tailles confondues)"
              source="Tracfin 2024"
            />
            <Number
              value="250 k€"
              label="coût médian d'un ransomware (paiement + paralysie + remediation)"
              source="Cybermalveillance 2024"
            />
            <Number
              value="+442 %"
              label="surge des vishing avec deepfake voix au H2 2024 vs H1 2024"
              source="Hoxhunt threat report"
            />
            <Number
              value="25 M$"
              label="perte Arup Hong Kong (janvier 2024) par deepfake video en visio"
              source="Cas d'école mondial"
            />
            <Number
              value="3 €"
              unit="/user/mois"
              label="tarif Humanix Académie (Cloud Pro standard)"
              source="vs 30 €/user/mois acteurs anglo-saxons"
            />
          </ul>
        </section>

        {/* ============================================================
            5. CTA FINAL
            ============================================================ */}
        <section
          aria-labelledby="cta-title"
          className="relative rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white text-center p-8 sm:p-12 shadow-xl overflow-hidden animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-8 text-[180px] opacity-10 select-none pointer-events-none rotate-12"
          >
            💼
          </div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-80 mb-2 relative">
            Discutons en termes de DAF
          </p>
          <h2
            id="cta-title"
            className="font-display text-3xl sm:text-4xl font-extrabold mb-3 relative leading-tight"
          >
            Tu es DAF ? On parle ROI, NIS2, et fraude.
          </h2>
          <p className="opacity-90 mb-6 max-w-xl mx-auto text-base sm:text-lg leading-relaxed relative">
            Démo dédiée 30 min. On regarde ensemble ton exposition financière
            calculée, le Pack NIS2, et un cas concret de fraude évitée. Sans
            jargon cyber.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Demo+DAF+%E2%80%94+ROI+et+conformite"
              className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
            >
              📧 Demander une démo DAF
            </a>
            <Link
              href="/audit-flash"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              🎯 Audit cyber gratuit (5 min)
            </Link>
            <Link
              href="/tarifs"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              💶 Voir les tarifs
            </Link>
          </div>
        </section>

        {/* ============================================================
            6. CITATION FINALE
            ============================================================ */}
        <section className="text-center pt-8 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La cybersécurité, pour un DAF, c'est une ligne de bilan latente.
            Notre boulot : la rendre visible avant l'incident, pas après. »
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

function Number({
  value,
  label,
  source,
  unit,
}: {
  value: string;
  label: string;
  source: string;
  /** Unite optionnelle affichee plus petite a cote de la valeur (ex: "/user/mois") */
  unit?: string;
}) {
  return (
    <li className="flex items-baseline gap-4 border-b border-emerald-200/60 dark:border-emerald-900/40 last:border-0 pb-2 last:pb-0">
      <span className="shrink-0 w-32 text-emerald-700 dark:text-emerald-300 tabular-nums">
        <span className="font-display text-2xl sm:text-3xl font-extrabold">
          {value}
        </span>
        {unit ? (
          <span className="block text-xs font-semibold opacity-80">
            {unit}
          </span>
        ) : null}
      </span>
      <span className="flex-1">
        <span className="block">{label}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">
          {source}
        </span>
      </span>
    </li>
  );
}
