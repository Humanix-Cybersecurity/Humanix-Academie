// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /maitrise-ia - landing publique du chantier strategique "Maitrise de l'IA".
//
// CONTEXTE PRODUIT (mai 2026, revu en novembre 2026) : l'IA generative est
// entree dans le travail quotidien plus vite que la formation a son usage.
// Le reglement europeen sur l'IA demande aux organisations de favoriser la
// maitrise de l'IA par leur personnel (article 4, applicable depuis fevrier
// 2025, reecrit en juillet 2026), et les premieres etudes (prepublication du
// MIT Media Lab "Your Brain on ChatGPT" 2025, enquete de Microsoft Research
// et Carnegie Mellon a CHI 2025) decrivent des effets sur l'esprit critique,
// avec leurs limites. Personne dans la cyber-formation FR (KnowBe4 FR,
// Mantra, Cyber Guru, Phished, Adaptive) ne possede ce territoire.
//
// REGLE : chaque etude ou date citee ici a ete lue a sa source (references
// dans les modules de la saison). Ne rien ajouter qui ne l'ait pas ete.
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
    "Maîtrise de l'IA en entreprise - formation cyber & esprit critique | Humanix Académie",
  description:
    "Forme tes équipes à utiliser l'IA générative sans perdre leur esprit critique. Saison dédiée, auto-évaluation pour la direction, règlement européen sur l'IA expliqué. Gratuit pour la Communauté.",
  alternates: { canonical: "/maitrise-ia" },
  openGraph: {
    title: "L'IA ne te remplacera pas. Quelqu'un qui sait l'utiliser, oui.",
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
    blurb:
      "La mécanique des hallucinations, et trois affaires réelles : jugements inventés, promesse d'un agent conversationnel, rapport aux références inexistantes.",
  },
  {
    num: "02",
    title: "Le piège de l'autorité textuelle",
    blurb:
      "Pourquoi on croit ce qui est écrit avec aplomb - biais cognitifs en action.",
  },
  {
    num: "03",
    title: "L'atrophie du muscle critique",
    blurb:
      "Ce que disent vraiment les premières études (MIT, Microsoft Research et Carnegie Mellon, 2025), avec leurs limites.",
  },
  {
    num: "04",
    title: "Mes données partent où ?",
    blurb:
      "Ce que les assistants gardent, qui peut le lire, comment ne pas laisser fuiter d'info confidentielle.",
  },
  {
    num: "05",
    title: "Shadow AI",
    blurb:
      "Quand les équipes branchent ChatGPT sans dire à l'IT - risques + comment encadrer.",
  },
  {
    num: "06",
    title: "Deepfakes vocaux",
    blurb:
      "L'arnaque au président avec une voix clonée : quelques secondes d'audio peuvent suffire. Reconnaître + désamorcer.",
  },
  {
    num: "07",
    title: "Biais & équité",
    blurb:
      "Quand un LLM exclut des candidats sans qu'on le voie - biais d'entraînement.",
  },
  {
    num: "08",
    title: "Prompt injection",
    blurb: "Manipuler un assistant IA d'entreprise - attaques + défenses.",
  },
  {
    num: "09",
    title: "Vérifier les sources",
    blurb:
      "La méthode des 3 sources croisées + outils gratuits de fact-checking.",
  },
  {
    num: "10",
    title: "Co-pilote, pas pilote",
    blurb:
      "Workflow où l'humain garde la décision finale. Exemples par métier.",
  },
  {
    num: "11",
    title: "AI Act 2026",
    blurb:
      "Ce qui s'applique déjà, ce qui a été reporté à 2027 et 2028, et ce que ton équipe doit faire. Le règlement raisonne par rôle et par risque ; la taille ne joue qu'à la marge.",
  },
  {
    num: "12",
    title: "Bâtir une charte IA",
    blurb:
      "Les cinq rubriques d'une charte et la démarche pour qu'elle soit suivie dans ton organisation.",
  },
];

const STUDIES = [
  {
    source: "MIT Media Lab",
    year: "2025",
    title: "Your Brain on ChatGPT",
    finding:
      "Prépublication, 54 personnes : celles qui rédigent avec ChatGPT montrent la connectivité cérébrale la plus faible des trois groupes et citent moins bien leur propre texte. Des résultats préliminaires, sans mesure après la fin de l'expérience.",
  },
  {
    source: "Microsoft Research · Carnegie Mellon",
    year: "2025",
    title: "The Impact of Generative AI on Critical Thinking",
    finding:
      "Enquête auprès de 319 personnes qui utilisent l'IA générative au travail : plus la confiance dans l'outil est grande, moins elles déclarent exercer leur esprit critique. Une association, pas une cause.",
  },
  {
    source: "Union européenne",
    year: "2024-2026",
    title: "Règlement sur l'IA",
    finding:
      "L'article 4 demande aux organisations de favoriser la maîtrise de l'IA par leur personnel : il s'applique depuis février 2025. Les règles du haut risque, dont le contrôle humain, ont été reportées au 2 décembre 2027, et au 2 août 2028 pour l'IA intégrée à des produits.",
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
            Hallucinations, shadow AI, deepfakes, atrophie cognitive - on traite
            tout, en français, en quelques minutes par épisode.
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
            Gratuit pour la Communauté · Hébergé en France
          </p>
        </section>
      </HexBackdrop>

      {/* ==================== POURQUOI MAINTENANT ==================== */}
      <section className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-6 text-center">
          Pourquoi se former maintenant ?
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed text-center max-w-2xl mx-auto mb-10">
          L&apos;IA générative est entrée dans le travail quotidien, souvent
          avant toute formation. Les premières études commencent à en décrire
          les effets, avec leurs limites, et le règlement européen demande aux
          organisations de s&apos;en occuper. Voici ce qu&apos;ils disent :
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
            🎬 12 mini-épisodes · 5 à 8 min chacun
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-3 text-center">
            Ce que tu apprends
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed text-center max-w-2xl mx-auto mb-10">
            Une saison complète qui couvre le quotidien : les pièges techniques
            (hallucinations, prompt injection), les pièges cognitifs (autorité
            textuelle, atrophie), les enjeux légaux (RGPD, AI Act), et les
            bonnes pratiques d&apos;équipe.
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
          🏢 Pour la direction
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 text-center">
          Faire le point sans surveiller les gens
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
          L&apos;auto-évaluation <strong>Maturité IA</strong> de ton espace
          admin te donne un point de départ en huit questions, sans installer de
          mouchards. Elle ne mesure pas l&apos;usage réel de l&apos;IA dans tes
          équipes et ne te compare à aucune autre organisation.
        </p>
        <ul className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
          <li className="flex gap-3">
            <span aria-hidden="true">📊</span>
            <span>
              <strong>Un score sur 100</strong>, calculé à partir de tes huit
              réponses : charte, formation, outils utilisés, données sensibles,
              décision humaine, voix clonées, systèmes à haut risque,
              traçabilité.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🧭</span>
            <span>
              <strong>Un plan d&apos;action</strong> tiré de tes réponses : les
              points à traiter et, quand il y en a un, l&apos;épisode de la
              saison qui s&apos;y rapporte.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🔒</span>
            <span>
              <strong>Des réponses qui restent chez toi</strong> : elles sont
              enregistrées dans ton navigateur, pas sur nos serveurs. Tu peux
              les exporter.
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
            grand-parents). Articles dédiés :{" "}
            <em>&laquo; Mamie, ChatGPT n&apos;est pas Google &raquo;</em>,{" "}
            <em>
              &laquo; Quand ton ado l&apos;utilise pour ses devoirs &raquo;
            </em>
            , <em>&laquo; Mon proche est tombé pour un deepfake &raquo;</em>.
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
          Sans carte bancaire · Données hébergées en France
        </p>
      </section>
    </main>
  );
}
