// Page Presse — kit journalistes pour le launch open source du 26 mai 2026.
// A11y RGAA AA. UI/UX différenciante : pitchs en 3 longueurs, faits clés,
// citation fondateur, screenshots, logos téléchargeables, FAQ journalistes.

import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Presse — Humanix Académie Community Edition",
  description:
    "Kit presse Humanix Académie : pitch, faits clés, citation fondateur, screenshots, logos téléchargeables, contact dédié journalistes. Launch OSS 26 mai 2026.",
};

const PITCH_30S = `Humanix Académie est la première plateforme française open source de cybersensibilisation pour PME. Distribuée sous licence AGPLv3, hébergée en France, conçue comme la brique humaine complémentaire de l'écosystème souverain (CISO Assistant, OpenCTI, Wazuh). Lancement le 26 mai 2026.`;

const PITCH_2MIN = `90 % des cyberattaques contre une PME française passent par un humain. 90 % des outils pour former cet humain viennent des États-Unis et coûtent 8 000 € à 30 000 € par an, hors de portée des TPE/PME.

Humanix Académie comble ce vide. C'est une plateforme de cybersensibilisation 100 % française, pensée pour les contraintes réelles des PME : modules de 5 minutes, gamification, mascotte évolutive, contenu en français, intégrations natives avec les outils français du quotidien (Lucca pour le HR, GLPI pour l'ITSM, Sekoia.io pour le SIEM, HarfangLab pour l'EDR, Mailinblack et Vade pour l'anti-phishing).

Le 26 mai 2026, Humanix-Cybersecurity ouvre l'intégralité du code source de la plateforme sous licence GNU AGPLv3, sur le modèle de CISO Assistant (intuitem) et OpenCTI (Filigran). La plateforme devient gratuite en self-host pour toute organisation qui souhaite l'héberger elle-même. Une offre cloud souveraine reste disponible à partir de 0 € par mois (forever-free, 5 utilisateurs), 19 € par mois (TPE 15 utilisateurs), ou 3 € par utilisateur par mois (PME standard) pour les organisations qui préfèrent que Humanix gère l'infrastructure.

Le modèle économique est inspiré des éditeurs OSS français rentables : la plateforme est libre, les revenus viennent des services à forte valeur ajoutée (audit cyber, formation Qualiopi, RSSI externalisé, hébergement managé, accompagnement NIS2). Cible 24 mois : 180 à 250 k€ de chiffre d'affaires en solo, 350 à 500 k€ avec un premier collaborateur.

Humanix Académie se positionne comme la brique humaine indispensable de l'écosystème open source cyber souverain français — un écosystème qui s'est déjà structuré autour de CISO Assistant pour la gouvernance, OpenCTI pour la threat intelligence, Wazuh pour la détection, mais où la sensibilisation des collaborateurs restait un trou béant.`;

const FAITS_CLES = [
  { label: "Date de lancement OSS", value: "Mardi 26 mai 2026" },
  { label: "Licence", value: "GNU AGPLv3" },
  {
    label: "Repo public",
    value: "github.com/humanix-cybersecurity/humanix-academie",
  },
  {
    label: "Tarif minimum cloud",
    value: "0 €/mois (forever-free, 5 utilisateurs)",
  },
  {
    label: "Tarif PME standard",
    value: "3 €/utilisateur/mois (Cloud Essentielle)",
  },
  { label: "Hébergement", value: "France garantie (Scaleway Paris)" },
  { label: "IA utilisée", value: "Mistral AI (souverain français)" },
  {
    label: "Connecteurs natifs livrés",
    value:
      "11 (CISO Assistant, OSCAL, SCIM v2, Sentinel, Splunk, Lucca, GLPI, Sekoia, HarfangLab, Mailinblack, Vade)",
  },
  {
    label: "Conformité",
    value: "RGPD, NIS2, ANSSI Hygiène, RGAA 4.1, audit sécurité public",
  },
  {
    label: "Fondateur",
    value: "Florian DURANO, Humanix-Cybersecurity SASU (Alès, Gard)",
  },
  { label: "Forme juridique", value: "SASU, SIREN 103 901 799" },
];

const QUOTES = [
  {
    author: "Florian DURANO, fondateur Humanix-Cybersecurity",
    text: "La cybersécurité ne doit pas être un luxe réservé aux grands comptes. Quand 90 % des attaques contre les PME passent par l'humain et que 90 % des outils pour former cet humain coûtent une fortune et viennent d'outre-Atlantique, il y a un problème politique. Notre réponse : un outil libre, souverain, accessible.",
  },
  {
    author: "Florian DURANO, fondateur Humanix-Cybersecurity",
    text: "L'open source est notre stratégie d'acquisition. Chaque téléchargement est un lead qualifié. Chaque audit est une preuve de valeur. La marge vient de l'expertise — l'audit, la formation, le RSSI externalisé — pas du hold-up sur les abonnements SaaS.",
  },
];

const FAQ_JOURNALISTES = [
  {
    q: "Pourquoi passer en open source maintenant ?",
    a: "Trois raisons convergentes : NIS2 entrée en application en octobre 2024 met les PME sous pression, le retour de Trump 2 et les tensions géopolitiques rendent la souveraineté numérique européenne stratégique, et le modèle SaaS pur place Humanix en concurrence directe avec KnowBe4 et consorts sur leur terrain. L'open source retourne la situation.",
  },
  {
    q: "Comment Humanix gagne sa vie si le code est gratuit ?",
    a: "C'est exactement le modèle de CISO Assistant (intuitem), OpenCTI (Filigran), Centreon, Wazuh : la plateforme est libre, les services experts sont payants. Audit cyber (2 800 à 4 500 €), formation intra (1 500 à 1 800 €), RSSI externalisé (800 à 1 500 €/mois), Pack NIS2 turnkey (4 800 à 7 200 €), hébergement cloud managé (199 à 800 €/mois). Cible 24 mois : 180 à 250 k€ de CA solo.",
  },
  {
    q: "Quelle différence avec CISO Assistant (intuitem) ?",
    a: "Aucune concurrence, complémentarité totale. CISO Assistant gère la conformité (registres ISO 27001, NIS2, contrôles, preuves d'audit). Humanix gère la sensibilisation humaine (modules pédagogiques, gamification, simulation phishing, certificats). Notre intégration native exporte les preuves Humanix vers CISO Assistant via l'API standard NIST OSCAL.",
  },
  {
    q: "Quelle est la cible utilisateur principale ?",
    a: "Les TPE et PME françaises de 5 à 250 collaborateurs (cible primaire), les ESN cyber qui cherchent à équiper leurs clients PME (cible secondaire), et les collectivités locales soumises à NIS2 (cible tertiaire). Total marché adressable : ~150 000 entreprises en France.",
  },
  {
    q: "Quels sont vos partenariats annoncés ?",
    a: "Une alliance stratégique avec intuitem (CISO Assistant) pour le co-marketing et l'intégration native. Des partenariats techniques avec les acteurs souverains français : Sekoia.io, HarfangLab, Mailinblack, Vade Secure, Lucca. Et un référencement officiel en cours auprès de CyberMalveillance.gouv.fr (GIP ACYMA).",
  },
  {
    q: "Combien de personnes derrière le projet ?",
    a: "Une seule personne aujourd'hui : Florian DURANO, fondateur, ancien Tech Lead avec une forte expertise en cybersécurité offensive. L'objectif est un premier recrutement (alternant ou freelance dev) en septembre 2026, après le pic de demande post-launch.",
  },
  {
    q: "Avez-vous reçu des financements publics ou privés ?",
    a: "Aucun à ce jour. Le projet est financé en bootstrap par les revenus d'audit et de conseil de Humanix-Cybersecurity. Des dossiers BPI Deeptech, France 2030 Cyber et NGI Zero (programme européen open source) sont à instruire après le launch.",
  },
];

export default function PressePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* HERO */}
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Kit presse · Launch 26 mai 2026
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Humanix Académie devient{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            open source
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          La première plateforme française de cybersensibilisation pour PME
          passe en AGPLv3 le mardi 26 mai 2026. Voici tout ce dont vous avez
          besoin pour en parler.
        </p>
      </header>

      {/* CONTACT EN HAUT */}
      <aside
        aria-labelledby="contact-presse-title"
        className="card mb-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 border-l-4 border-accent-500"
      >
        <h2
          id="contact-presse-title"
          className="text-xl font-extrabold text-primary-500 mb-2"
        >
          Contact presse
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
          <strong>Florian DURANO</strong>, fondateur Humanix-Cybersecurity
        </p>
        <p className="text-sm">
          <a
            href="mailto:presse@humanix-cybersecurity.fr"
            className="font-bold text-accent-500 hover:underline"
          >
            presse@humanix-cybersecurity.fr
          </a>
          {" · "}
          réponse sous 4 h ouvrées · entretiens téléphoniques et visio possibles
        </p>
      </aside>

      {/* PITCH 1 LIGNE */}
      <section aria-labelledby="pitch1-title" className="mb-10">
        <h2
          id="pitch1-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Pitch en une ligne
        </h2>
        <blockquote className="card border-l-4 border-primary-500 italic text-lg">
          Humanix Académie, c'est CISO Assistant pour le facteur humain : open
          source AGPLv3, souverain français, accessible aux PME.
        </blockquote>
      </section>

      {/* PITCH 30s */}
      <section aria-labelledby="pitch30-title" className="mb-10">
        <h2
          id="pitch30-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Pitch 30 secondes
        </h2>
        <div className="card text-gray-700 dark:text-gray-200 leading-relaxed">
          {PITCH_30S}
        </div>
      </section>

      {/* PITCH 2 min */}
      <section aria-labelledby="pitch2-title" className="mb-10">
        <h2
          id="pitch2-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Pitch 2 minutes
        </h2>
        <div className="card prose prose-sm prose-slate dark:prose-invert max-w-none whitespace-pre-line">
          {PITCH_2MIN}
        </div>
      </section>

      {/* FAITS CLÉS */}
      <section aria-labelledby="faits-title" className="mb-10">
        <h2
          id="faits-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Faits clés
        </h2>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Faits clés du lancement Humanix Académie Community Edition
            </caption>
            <tbody>
              {FAITS_CLES.map((f, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-slate-700 last:border-0"
                >
                  <th
                    scope="row"
                    className="p-3 text-left font-bold text-primary-500 align-top w-1/3"
                  >
                    {f.label}
                  </th>
                  <td className="p-3 text-gray-700 dark:text-gray-200">
                    {f.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CITATIONS */}
      <section aria-labelledby="citations-title" className="mb-10">
        <h2
          id="citations-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Citations utilisables (sourçables, droits cédés)
        </h2>
        <div className="space-y-4">
          {QUOTES.map((q, i) => (
            <blockquote
              key={i}
              className="card border-l-4 border-accent-500 relative"
            >
              <p className="text-gray-700 dark:text-gray-200 italic mb-2 leading-relaxed">
                « {q.text} »
              </p>
              <footer className="text-sm text-gray-500 dark:text-gray-400 not-italic">
                — {q.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* LOGOS TÉLÉCHARGEABLES */}
      <section aria-labelledby="logos-title" className="mb-10">
        <h2
          id="logos-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Logos téléchargeables
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          Tous les logos ci-dessous sont libres d'usage dans le cadre d'un
          article, d'un reportage ou d'une couverture éditoriale concernant
          Humanix. Cliquez pour télécharger en pleine résolution.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <LogoCard
            src="/logo-humanix-academie-512.png"
            label="Logo carré PNG (512×512)"
            href="/logo-humanix-academie-512.png"
          />
          <LogoCard
            src="/logo-humanix-horizontal-400.png"
            label="Logo horizontal PNG (400×120)"
            href="/logo-humanix-horizontal-400.png"
          />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Le logo et la marque Humanix sont des marques déposées. Voir{" "}
          <Link href="/CGU_SELFHOST" className="underline">
            politique d'usage de la marque
          </Link>
          .
        </p>
      </section>

      {/* FAQ JOURNALISTES */}
      <section aria-labelledby="faq-title" className="mb-10">
        <h2
          id="faq-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          FAQ journalistes
        </h2>
        <div className="space-y-3">
          {FAQ_JOURNALISTES.map((f, i) => (
            <details key={i} className="card">
              <summary className="cursor-pointer font-bold text-primary-500">
                {f.q}
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* RESSOURCES COMPLÉMENTAIRES */}
      <section aria-labelledby="ressources-title" className="mb-10">
        <h2
          id="ressources-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Ressources complémentaires
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/securite"
              className="font-bold text-accent-500 hover:underline"
            >
              Trust Center / Sécurité & Conformité →
            </Link>
          </li>
          <li>
            <Link
              href="/securite/rapport-audit"
              className="font-bold text-accent-500 hover:underline"
            >
              Rapport public d'audit sécurité (PDF) →
            </Link>
          </li>
          <li>
            <Link
              href="/comparatif"
              className="font-bold text-accent-500 hover:underline"
            >
              Comparatif honnête vs KnowBe4, Mantra, Hoxhunt, Phished →
            </Link>
          </li>
          <li>
            <Link
              href="/integrations"
              className="font-bold text-accent-500 hover:underline"
            >
              Hub des connecteurs (11 livrés, dont 9 souverains 🇫🇷) →
            </Link>
          </li>
          <li>
            <Link
              href="/tarifs"
              className="font-bold text-accent-500 hover:underline"
            >
              Grille tarifaire 6 paliers →
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/humanix-cybersecurity/humanix-academie"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent-500 hover:underline"
            >
              Repo GitHub officiel ↗
            </a>
          </li>
        </ul>
      </section>

      {/* CTA FINAL */}
      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          Une interview, un sujet, une exclu ?
        </h2>
        <p className="opacity-90 mb-5">
          Florian répond personnellement à toute sollicitation presse sous 4 h
          ouvrées.
        </p>
        <a
          href="mailto:presse@humanix-cybersecurity.fr?subject=Demande%20presse%20Humanix"
          className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg inline-block"
        >
          presse@humanix-cybersecurity.fr
        </a>
      </section>
    </div>
  );
}

function LogoCard({
  src,
  label,
  href,
}: {
  src: string;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      download
      className="card flex flex-col items-center text-center hover:scale-[1.02] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
    >
      <div className="bg-white dark:bg-slate-700 rounded-xl p-4 mb-3 w-full flex items-center justify-center">
        <Image
          src={src}
          alt=""
          width={120}
          height={120}
          className="h-20 w-auto object-contain"
        />
      </div>
      <p className="text-sm font-bold text-primary-500">{label}</p>
      <p className="text-xs text-accent-500 mt-1">Cliquer pour télécharger ↓</p>
    </a>
  );
}
