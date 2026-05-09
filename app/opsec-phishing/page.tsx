// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /opsec-phishing - Page publique d'awareness OPSEC pour les phishing
// simulés.
//
// OBJECTIF EDITORIAL :
// Aider le prospect/client à se rendre compte de TOUT le travail necessaire
// pour mener une vraie campagne de phishing simule. Pas un tutoriel
// (chaque sous-sujet meriterait un livre), mais un cadrage honnete qui :
//   - permet a l'admin DSI/RSSI d'estimer la charge de travail
//   - qualifie naturellement les prospects ("ah ok, je prends le forfait")
//   - sert de page SEO long-form (contenu de fond, sourcable, partagepable)
//
// La conclusion donne 2 CTAs clairs :
//   1. Je gere -> /admin/smtp (config technique)
//   2. Je prefere deleguer -> /demande-abonnement?type=opsec (forfait)

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascot from "@/components/HexMascot";

export const metadata: Metadata = {
  title:
    "OPSEC du phishing simulé : ce que tu prends à ta charge — Humanix Académie",
  description:
    "Cadrage honnête du travail OPSEC pour une campagne de phishing simulé efficace : DNS, réputation IP, légalité, communication, mesure. Tout ce que ton DSI/RSSI doit cocher avant le premier envoi.",
  alternates: { canonical: "/opsec-phishing" },
  openGraph: {
    title: "OPSEC du phishing simulé : checklist honnête",
    description:
      "Tout le travail nécessaire pour une vraie campagne de phishing simulé. Sans bullshit.",
    type: "article",
  },
};

export default function OpsecPhishingPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ==================== HERO ==================== */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-10 sm:pt-20 sm:pb-12 text-center">
          <div className="mb-4 flex justify-center">
            <HexMascot mood="thinking" size="lg" animated />
          </div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            🎣 Cadrage OPSEC · Phishing simulé
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4">
            Le phishing simulé&nbsp;:
            <br className="hidden sm:block" />
            ce que tu prends à ta charge.
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed max-w-2xl mx-auto">
            Humanix génère les templates pédagogiques. Mais une vraie
            campagne, c&apos;est <strong>10 % de templates</strong> et{" "}
            <strong>90 % d&apos;OPSEC</strong>. Voici les 8 chantiers à
            cocher pour ne pas rater ta première campagne.
          </p>
        </section>
      </HexBackdrop>

      {/* ==================== TL;DR ==================== */}
      <section className="max-w-3xl mx-auto px-4 mt-6 mb-10">
        <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold text-amber-900 dark:text-amber-100 mb-2">
            ⏱️ TL;DR — Combien de temps&nbsp;?
          </h2>
          <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed mb-3">
            Pour une <strong>première campagne propre</strong> sur 50–250
            collaborateurs avec un domaine et un SMTP qui n&apos;ont jamais
            servi à du phishing :
          </p>
          <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside leading-relaxed">
            <li>
              <strong>Setup initial</strong> : 4 à 8 jours·homme (DSI + RSSI
              + DPO + RH)
            </li>
            <li>
              <strong>Par campagne récurrente</strong> : 1 à 2 jours·homme
              (préparation + envoi + débrief)
            </li>
            <li>
              <strong>Surveillance continue</strong> : ~½ jour·semaine
              (réputation IP, blacklists, taux de plainte)
            </li>
          </ul>
          <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed mt-3">
            Si tu n&apos;as pas cette capacité en interne,{" "}
            <Link
              href="/demande-abonnement?type=opsec"
              className="underline font-bold"
            >
              parlons d&apos;un forfait Humanix
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ==================== LES 8 CHANTIERS ==================== */}
      <section className="max-w-3xl mx-auto px-4 pb-12 space-y-8">
        <Chapter
          n={1}
          emoji="🌐"
          title="Choix du domaine d'envoi"
          summary="Le domaine décide de la crédibilité ET de la réputation. Choisis-le bien : tu vas vivre avec longtemps."
          points={[
            "Domaine de typosquat propre (acme-securite.fr quand ton vrai domaine est acme.fr) — ni trop éloigné (ne trompe personne), ni trop proche (ton anti-phishing va le bloquer).",
            "Réservé chez un registrar européen sérieux (OVH, Gandi, Scaleway). Pas de Namecheap / Hostinger pour du phishing même simulé.",
            "Whois public ou privé selon ta politique. Public = traçable légalement, privé = plus crédible si l'attaquant simulé est externe.",
            "Privilégie un domaine NEUF (>14 jours d'âge). Les SPAM filters Microsoft/Google pénalisent les domaines de moins de 7 jours.",
            "Évite les TLD à mauvaise réputation (.top, .xyz, .icu, .work, .click). Reste sur .fr / .com / .eu.",
          ]}
        />

        <Chapter
          n={2}
          emoji="📜"
          title="Authentification email (SPF, DKIM, DMARC)"
          summary="Sans ces 3 enregistrements DNS configurés correctement, ton mail finit en spam dans 80 % des cas. C'est non négociable."
          points={[
            "SPF (TXT @ ou domaine racine) : autorise ton SMTP à envoyer pour ce domaine. Format `v=spf1 include:_spf.scaleway.com -all`.",
            "DKIM : signature cryptographique du contenu. Génère une paire clé publique/privée, mets la clé publique en DNS, configure ton SMTP pour signer.",
            "DMARC (TXT _dmarc) : politique de quarantaine + reporting. Démarre en `p=none rua=mailto:dmarc@...` pour observer pendant 2 semaines, puis passe en `p=quarantine`.",
            "Vérifie sur mxtoolbox.com / mail-tester.com : score 10/10 attendu avant le premier envoi réel.",
            "Surveille les rapports DMARC (DMARC Aggregate Reports). C'est là que tu détectes que quelqu'un d'autre essaie de spoofer ton domaine.",
          ]}
        />

        <Chapter
          n={3}
          emoji="🔥"
          title="Warm-up de l'IP / du domaine"
          summary="Une nouvelle IP qui envoie 500 mails d'un coup = blacklist immédiate. Il faut chauffer progressivement."
          points={[
            "Jour 1 à 3 : 50 mails/jour vers des boîtes amies (toi, tes proches, des comptes test).",
            "Jour 4 à 10 : 200 mails/jour vers un échantillon plus large.",
            "Jour 11 à 20 : 500 mails/jour, monitoring serré (taux d'ouverture, taux de plainte).",
            "Au-delà : volume normal de campagne. Si plainte > 0,1 %, on stoppe et on enquête.",
            "Pour un provider managé (Brevo, Mailjet) : une IP partagée chauffée. Plus rapide, mais réputation collective avec d'autres clients.",
          ]}
        />

        <Chapter
          n={4}
          emoji="⚖️"
          title="Cadrage légal et conformité RGPD"
          summary="Une campagne de phishing simulé est un traitement de données personnelles avec finalité 'sécurité'. Sans cadrage, tu prends un risque CNIL et CSE."
          points={[
            "Charte cybersécurité signée par chaque collaborateur, mentionnant explicitement 'tests de sensibilisation par phishing simulé'.",
            "Information préalable du CSE/CSE-S (Comité Social et Économique) — réunion + procès-verbal. Pas une simple note.",
            "Avis du DPO (interne ou externe). À documenter dans le registre des traitements (RGPD article 30).",
            "Aucun usage disciplinaire des résultats. Le clic d'un employé ne doit JAMAIS apparaître dans son entretien annuel ou sa fiche RH.",
            "Conservation limitée : 12 mois max pour les résultats individuels nominatifs, agrégation au-delà. Cf. CNIL recommandation 2022.",
            "Procédure de droit d'accès RGPD (article 15) prête : un collaborateur peut demander 'qu'avez-vous sur moi côté phishing ?' et tu dois pouvoir répondre.",
          ]}
        />

        <Chapter
          n={5}
          emoji="🏗️"
          title="Landing page de débrief"
          summary="Quand le collaborateur clique, il atterrit OÙ ? La landing fait toute la différence entre humiliation et apprentissage."
          points={[
            "Hébergée sur ton domaine OU sur un domaine pédagogique signé Humanix (cf. /phishing/[token]) — jamais sur un domaine douteux.",
            "Certificat HTTPS valide (Let's Encrypt, gratuit). Sans HTTPS, le navigateur affiche un warning qui casse l'effet pédagogique.",
            "Ton chaleureux, jamais culpabilisant. 'Tu viens de tomber dans un piège, c'est NORMAL — voici les 4 indices à repérer la prochaine fois.'",
            "3 à 5 markers pédagogiques (le domaine expéditeur faux, l'urgence artificielle, etc.). Pas plus, sinon on perd l'attention.",
            "CTA vers une formation courte (5 min) sur le sujet du phishing. Le moment du clic est le moment où l'apprentissage est maximum.",
          ]}
        />

        <Chapter
          n={6}
          emoji="📣"
          title="Communication interne avant/pendant/après"
          summary="Le pire scénario : un employé crie 'on est attaqués !' sur Slack en plein milieu de ta campagne. Comm = 50 % du succès."
          points={[
            "AVANT (T-30j) : annonce générale 'des tests vont avoir lieu dans les semaines à venir, leur but est pédagogique, voici comment signaler'.",
            "AVANT (T-7j) : rappel canal RH/IT 'la fenêtre de test approche, gardez votre vigilance habituelle'.",
            "PENDANT : le helpdesk IT EST briefé. Procédure : si un employé signale le mail comme phishing, on le félicite + on lui dit 'super réflexe, c'était un test'.",
            "APRÈS : retour aux équipes en agrégé (jamais nominatif). 'Notre service Compta a été le plus vigilant avec 87 % de signalements. Bravo !'",
            "Inclus le RSSI et la DG dans la liste de diffusion des résultats agrégés. C'est aussi un outil de pilotage budgétaire.",
          ]}
        />

        <Chapter
          n={7}
          emoji="🎯"
          title="Ciblage, calendrier, fréquence"
          summary="Trop de campagnes = saturation. Pas assez = pas d'effet. Trouve le bon rythme pour TON organisation."
          points={[
            "Première campagne : 100 % des collaborateurs concernés, template moyen (difficulté 3/5). Tu prends une mesure de base.",
            "Récurrence cible : 1 campagne tous les 2 mois (6/an). Variations de templates pour éviter l'habituation.",
            "Difficulté progressive : sur 12 mois, tu passes de 'easy' (signaux gros) à 'hard' (deepfake voix, contexte interne).",
            "Évite les périodes critiques : pas de campagne pendant les clôtures comptables (la Compta est sous tension), pas en pleine semaine de partiels d'écoles, etc.",
            "Évite aussi les jours sensibles : un lundi matin 9h envoie un signal. Mardi/jeudi 14h-16h sont les créneaux 'attention disponible' optimaux.",
          ]}
        />

        <Chapter
          n={8}
          emoji="📊"
          title="Mesure, suivi, amélioration"
          summary="Sans KPI, ton programme phishing devient du folklore. Voici les 5 indicateurs à suivre."
          points={[
            "Taux de clic : pourcentage de cibles qui ont cliqué sur le lien. Cible nationale : <15 %, excellent : <5 %.",
            "Taux de signalement : pourcentage qui ont signalé (via 'Signaler comme phishing' dans Outlook ou bouton interne). Cible : >40 %, excellent : >70 %.",
            "Délai moyen de signalement : combien de temps entre l'envoi et le premier signalement. Cible : <30 min sur les heures ouvrées.",
            "Évolution sur 12 mois : la courbe doit baisser le clic et monter le signalement. Si ça stagne, change de templates / de fréquence.",
            "Délai 'temps depuis le clic à l'action de remédiation IT' : si un employé clique vraiment sur un vrai phishing, combien de temps avant que le SI bloque ? Test ça aussi.",
          ]}
        />
      </section>

      {/* ==================== CONCLUSION & CTAs ==================== */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950/30 dark:via-slate-900 dark:to-cyan-950/20 p-6 sm:p-8">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            Tu fais quoi maintenant&nbsp;?
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
            Tu viens de découvrir 8 chantiers. Selon ton équipe et ton
            budget, deux voies s&apos;ouvrent à toi&nbsp;:
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Option self-service */}
            <div className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <div className="text-3xl mb-2" aria-hidden="true">
                🛠️
              </div>
              <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
                Je gère moi-même
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
                Tu as une équipe DSI/RSSI capable. Tu maîtrises DNS,
                SMTP, RGPD. Tu vas configurer ton SMTP dédié et lancer
                tes campagnes en autonomie.
              </p>
              <Link
                href="/admin/smtp"
                className="btn-secondary inline-flex items-center justify-center gap-2 w-full"
              >
                <span aria-hidden="true">⚙️</span>
                Configurer mon SMTP →
              </Link>
            </div>

            {/* Option forfait Humanix */}
            <div className="rounded-2xl border-2 border-accent-500 bg-gradient-to-br from-accent-50 to-cyan-50 dark:from-accent-950/30 dark:to-cyan-950/20 p-5 relative">
              <span className="absolute -top-3 right-4 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
                Recommandé
              </span>
              <div className="text-3xl mb-2" aria-hidden="true">
                💼
              </div>
              <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
                Prestation Humanix au forfait
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
                Tu nous délègues l&apos;OPSEC&nbsp;: domaine, SMTP, DNS,
                réputation, calendrier, débrief. Tu reçois les résultats
                consolidés. Forfait mensuel, sans engagement long.
              </p>
              <Link
                href="/demande-abonnement?type=opsec"
                className="btn-primary inline-flex items-center justify-center gap-2 w-full"
              >
                <span aria-hidden="true">📞</span>
                Parlons-en →
              </Link>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 italic leading-relaxed">
            ⚠️ Cette page est un cadrage, pas un manuel exhaustif. Chaque
            chapitre mérite un livre. Si tu veux entrer dans le détail
            technique, on a des partenaires audit qui peuvent intervenir
            sur des missions ciblées (audit DNS, configuration SMTP,
            rédaction charte, formation DPO).
          </p>
        </div>
      </section>

      {/* ==================== FOOTER LIENS UTILES ==================== */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-4">
          Pour aller plus loin (sans payer)
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li>
            🔗{" "}
            <a
              href="https://www.cnil.fr/fr/cybersecurite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 dark:text-accent-300 underline"
            >
              CNIL — Recommandations cybersécurité
            </a>{" "}
            (cadre légal RGPD)
          </li>
          <li>
            🔗{" "}
            <a
              href="https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 dark:text-accent-300 underline"
            >
              CyberMalveillance.gouv.fr — Bonnes pratiques
            </a>{" "}
            (référentiel français officiel)
          </li>
          <li>
            🔗{" "}
            <a
              href="https://www.ssi.gouv.fr/guide/recommandations-de-securite-relatives-a-la-mise-en-uvre-du-protocole-tls/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 dark:text-accent-300 underline"
            >
              ANSSI — Guide TLS
            </a>{" "}
            (HTTPS landing pages)
          </li>
          <li>
            🔗{" "}
            <a
              href="https://www.mxtoolbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 dark:text-accent-300 underline"
            >
              MxToolbox
            </a>{" "}
            (vérification SPF/DKIM/DMARC, blacklists)
          </li>
          <li>
            🔗{" "}
            <a
              href="https://www.mail-tester.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 dark:text-accent-300 underline"
            >
              Mail-tester
            </a>{" "}
            (score deliverability avant envoi)
          </li>
        </ul>
      </section>
    </main>
  );
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function Chapter({
  n,
  emoji,
  title,
  summary,
  points,
}: {
  n: number;
  emoji: string;
  title: string;
  summary: string;
  points: string[];
}) {
  return (
    <article
      aria-labelledby={`chapter-${n}-title`}
      className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <header className="flex items-start gap-4 mb-3">
        <div className="shrink-0 flex flex-col items-center">
          <span
            className="text-3xl"
            aria-hidden="true"
            title={`Chantier ${n}`}
          >
            {emoji}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
            #{String(n).padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id={`chapter-${n}-title`}
            className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1 leading-relaxed">
            {summary}
          </p>
        </div>
      </header>
      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="text-accent-500 mt-1 shrink-0"
            >
              →
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
