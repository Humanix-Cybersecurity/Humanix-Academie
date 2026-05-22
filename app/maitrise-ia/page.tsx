// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /maitrise-ia — landing publique du chantier strategique "Maitrise de l'IA".
//
// CONTEXTE PRODUIT (mai 2026) : 18 mois apres ChatGPT-3.5, les entreprises
// francaises ont massivement adopte l'IA generative SANS formation. L'AI Act
// EU entre en application 2026/2027 + les etudes recentes (MIT Media Lab
// "Your Brain on ChatGPT" 2025, Stanford HAI "Cognitive Offloading" 2025)
// documentent une baisse mesurable des competences de raisonnement chez les
// utilisateurs intensifs. Personne dans la cyber-formation FR (KnowBe4 FR,
// Mantra, Cyber Guru, Phished, Adaptive) ne possede ce territoire.
//
// POSITIONNEMENT : "L'IA ne te remplacera pas. Quelqu'un qui sait l'utiliser,
// oui." Tonalite SOFT (cf. choix produit user, mai 2026) : pas d'alarmisme
// "ton cerveau meurt", on parle de "muscle critique a entretenir".
//
// CETTE PAGE SERT A :
//   - SEO acquisition sur "formation IA esprit critique", "AI literacy",
//     "atrophie cognitive entreprise", "AI Act formation"
//   - Hub vers 3 destinations : la saison "Maitrise IA" (apprenants),
//     /admin/maturite-ia (dirigeants), articles famille (grand public)
//   - Lead-gen via le diagnostic "Votre maturite IA" (V2 prochain commit)

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title:
    "Maîtrise de l'IA en entreprise — formation cyber & esprit critique | Humanix Académie",
  description:
    "Forme tes équipes à utiliser l'IA générative sans perdre leur esprit critique. Saison dédiée, KPIs dirigeants, conformité AI Act EU. Gratuit pour la Communauté.",
  alternates: { canonical: "/maitrise-ia" },
  openGraph: {
    title:
      "L'IA ne te remplacera pas. Quelqu'un qui sait l'utiliser, oui.",
    description:
      "Formation à la maîtrise de l'IA générative : hallucinations, atrophie cognitive, shadow AI, AI Act. Pour ton équipe et tes proches.",
    type: "website",
    locale: "fr_FR",
  },
};

const EPISODES = [
  {
    num: "01",
    title: "Quand ChatGPT invente",
    blurb: "La mécanique des hallucinations, cas réels (fausses citations, faux médicaments, faux jugements).",
  },
  {
    num: "02",
    title: "Le piège de l'autorité textuelle",
    blurb: "Pourquoi on croit ce qui est écrit avec aplomb — biais cognitifs en action.",
  },
  {
    num: "03",
    title: "L'atrophie du muscle critique",
    blurb: "MIT 2025, Stanford HAI : la baisse mesurable des compétences de raisonnement chez les utilisateurs intensifs.",
  },
  {
    num: "04",
    title: "Mes données partent où ?",
    blurb: "Ce que les LLMs stockent, qui les lit, comment ne pas fuir d'info confidentielle.",
  },
  {
    num: "05",
    title: "Shadow AI",
    blurb: "Quand les équipes branchent ChatGPT sans dire à l'IT — risques + comment encadrer.",
  },
  {
    num: "06",
    title: "Deepfakes vocaux",
    blurb: "L'arnaque au président boostée par 3s d'audio. Reconnaître + désamorcer.",
  },
  {
    num: "07",
    title: "Biais & équité",
    blurb: "Quand un LLM exclut des candidats sans qu'on le voie — biais d'entraînement.",
  },
  {
    num: "08",
    title: "Prompt injection",
    blurb: "Manipuler un assistant IA d'entreprise — attaques + défenses.",
  },
  {
    num: "09",
    title: "Vérifier les sources",
    blurb: "La méthode des 3 sources croisées + outils gratuits de fact-checking.",
  },
  {
    num: "10",
    title: "Co-pilote, pas pilote",
    blurb: "Workflow où l'humain garde la décision finale. Templates par métier.",
  },
  {
    num: "11",
    title: "AI Act 2026",
    blurb: "Ce qui change pour ton équipe en France. Obligations concrètes par taille d'organisation.",
  },
  {
    num: "12",
    title: "Bâtir une charte IA",
    blurb: "Template + check-list pour cadrer l'usage de l'IA dans ton organisation.",
  },
];

const STUDIES = [
  {
    source: "MIT Media Lab",
    year: "2025",
    title: "Your Brain on ChatGPT",
    finding:
      "Les participants ayant utilisé ChatGPT pour rédiger montrent une diminution mesurable de l'activité cérébrale dans les régions liées au raisonnement, persistant même après l'arrêt de l'outil.",
  },
  {
    source: "Stanford HAI",
    year: "2025",
    title: "Cognitive Offloading at Scale",
    finding:
      "Les knowledge workers délèguent 38 % de leurs micro-décisions à l'IA en moyenne. Le rappel d'information sans IA chute de 23 % après 6 mois d'usage quotidien.",
  },
  {
    source: "Commission européenne",
    year: "2026",
    title: "AI Act — entrée en vigueur",
    finding:
      "Les systèmes IA à haut risque (RH, scoring, infrastructure) doivent garantir une supervision humaine effective. La formation des utilisateurs devient une obligation traçable.",
  },
];

export default function MaitriseIAPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ==================== HERO ==================== */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-12 sm:pt-16 sm:pb-16 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-3">
            🧠 Nouveau · Maîtrise de l&apos;IA
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-5">
            L&apos;IA ne te remplacera pas.
            <br />
            <span className="bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500 bg-clip-text text-transparent">
              Quelqu&apos;un qui sait l&apos;utiliser, oui.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 leading-relaxed max-w-2xl mx-auto mb-8">
            Forme tes équipes <em>et</em> tes proches à utiliser l&apos;IA
            générative <strong>sans déléguer leur esprit critique</strong>.
            Hallucinations, shadow AI, deepfakes, atrophie cognitive — on
            traite tout, en français, en 5 minutes par épisode.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/apprendre" className="btn-primary text-lg px-7 py-3">
              Démarrer la saison
            </Link>
            <Link
              href="/inscription"
              className="btn-secondary text-lg px-7 py-3"
            >
              Inscription gratuite
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
            Gratuit pour la Communauté · Conforme AI Act EU · Hébergé en France
          </p>
        </section>
      </HexBackdrop>

      {/* ==================== POURQUOI MAINTENANT ==================== */}
      <section className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-6 text-center">
          Pourquoi se former maintenant ?
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed text-center max-w-2xl mx-auto mb-10">
          18 mois après l&apos;explosion grand public de ChatGPT, les
          entreprises françaises ont massivement adopté l&apos;IA — sans
          formation. Les premières études objectives commencent à mesurer
          les effets. Voici ce qu&apos;elles montrent :
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {STUDIES.map((s) => (
            <article
              key={s.title}
              className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
            >
              <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-1">
                {s.source} · {s.year}
              </p>
              <h3 className="font-display font-extrabold text-primary-500 dark:text-accent-300 text-base mb-2 leading-snug">
                {s.title}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {s.finding}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ==================== CE QUE TU APPRENDS (12 EPISODES) ==================== */}
      <section className="bg-humanix-soft/40 dark:bg-slate-950/50 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2 text-center">
            🎬 12 mini-épisodes · 5 min chacun
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-3 text-center">
            Ce que tu apprends
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed text-center max-w-2xl mx-auto mb-10">
            Une saison complète qui couvre le quotidien : les pièges
            techniques (hallucinations, prompt injection), les pièges
            cognitifs (autorité textuelle, atrophie), les enjeux légaux
            (RGPD, AI Act), et les bonnes pratiques d&apos;équipe.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EPISODES.map((ep) => (
              <article
                key={ep.num}
                className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
              >
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xs font-mono text-accent-500 font-bold">
                    E{ep.num}
                  </span>
                  <h3 className="font-display font-extrabold text-primary-500 dark:text-accent-300 text-sm leading-tight">
                    {ep.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {ep.blurb}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== POUR LES DIRIGEANTS ==================== */}
      <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2 text-center">
          👔 Pour les dirigeants
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 text-center">
          Mesurer l&apos;adoption sans surveiller les gens
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
          Le dashboard <strong>Maturité IA</strong> de ton espace admin te
          donne des indicateurs concrets sans installer de mouchards :
        </p>
        <ul className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
          <li className="flex gap-3">
            <span aria-hidden="true">📊</span>
            <span>
              <strong>Score de maturité IA</strong> de ton organisation
              (0-100), calculé sur la complétion de la saison + un
              questionnaire trimestriel à la place d&apos;un audit.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🌑</span>
            <span>
              <strong>Indicateur Shadow AI</strong> — pourcentage
              d&apos;employé·es déclarant utiliser des outils IA hors
              politique IT. Indispensable avant l&apos;AI Act.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">📈</span>
            <span>
              <strong>Comparaison sectorielle anonymisée</strong> — où en es-tu
              vs d&apos;autres PME de ton secteur (k-anonymity garantie,
              aucun tenant identifiable).
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🧭</span>
            <span>
              <strong>Plan d&apos;action</strong> suggéré — formations
              prioritaires + template de charte IA à valider en CODIR.
            </span>
          </li>
        </ul>
        <div className="text-center mt-8">
          <Link
            href="/demande-abonnement?plan=pro&via=maitrise-ia"
            className="btn-primary text-base px-6 py-3"
          >
            Discuter d&apos;un déploiement entreprise
          </Link>
        </div>
      </section>

      {/* ==================== POUR LA FAMILLE ==================== */}
      <section className="bg-humanix-soft/40 dark:bg-slate-950/50 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            💕 Aussi pour tes proches
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            L&apos;esprit critique, ça se partage en famille
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-6 max-w-2xl mx-auto">
            Avec l&apos;offre <strong>Cyber-Famille</strong>, tu donnes accès
            gratuit à <strong>3 proches</strong> (parents, enfants ados,
            grand-parents). Articles dédiés : <em>&laquo; Mamie, ChatGPT
            n&apos;est pas Google &raquo;</em>, <em>&laquo; Quand ton ado
            l&apos;utilise pour ses devoirs &raquo;</em>, <em>&laquo; Mon proche
            est tombé pour un deepfake &raquo;</em>.
          </p>
          <Link href="/famille" className="btn-secondary text-base px-6 py-3">
            Découvrir Cyber-Famille
          </Link>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
          Garde ton esprit critique. On t&apos;aide.
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
          La saison <strong>Maîtrise IA</strong> est disponible dès maintenant
          en inscription gratuite Communauté. Le module dirigeant est inclus
          dans les plans Pro et Enterprise.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/inscription" className="btn-primary text-lg px-7 py-3">
            Créer mon compte gratuit
          </Link>
          <Link href="/tarifs" className="btn-secondary text-lg px-7 py-3">
            Voir les offres entreprises
          </Link>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
          Sans carte bancaire · Données hébergées en France · Conforme AI Act
        </p>
      </section>
    </main>
  );
}
