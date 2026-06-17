// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page d'aiguillage « Comment rejoindre Humanix Académie ? ».
//
// Sert d'entonnoir clair pour 6 personas, chacune pointant vers le
// bon flow. Evite la confusion entre /inscription (LEARNER) et
// /signup (ADMIN) qui a deja piege des prospects RSSI.
//
// Architecture : 6 cards visuelles, chacune avec :
//  - Une icone / emoji distinctive
//  - Un titre court « Je suis... »
//  - Une description du contexte
//  - Un CTA direct vers la bonne URL
//
// Accessibilite RGAA : titres hierarchiques, semantique <section>,
// focus visible, contraste suffisant, role="navigation" sur la liste
// des choix.

import Link from "next/link";

export const metadata = {
  title: "Comment rejoindre Humanix Académie ? - Choisissez votre profil",
  description:
    "Particulier, RSSI, DSI, DAF ou DPO ? Découvrez la bonne façon de rejoindre Humanix Académie en fonction de votre besoin. Inscription gratuite, espace pro 5 sièges offerts ou abonnement Enterprise.",
  alternates: { canonical: "/rejoindre" },
  openGraph: {
    title: "Comment rejoindre Humanix Académie ?",
    description:
      "Particulier, RSSI, DSI, DAF ou DPO ? Trouvez le bon point d'entrée. Inscription gratuite, 5 sièges offerts en pro, ou Enterprise.",
    type: "website",
    url: "/rejoindre",
  },
};

type Persona = {
  slug: string;
  icon: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  ctaHref: string;
  ctaLabel: string;
  accent: "primary" | "accent" | "emerald" | "amber" | "purple" | "rose";
  badge?: string;
};

const PERSONAS: Persona[] = [
  {
    slug: "curieux",
    icon: "🦊",
    title: "Je suis simple curieux ou particulier",
    shortDescription:
      "Je veux apprendre la cybersécurité pour moi, à mon rythme, sans engagement.",
    longDescription:
      "Inscription publique gratuite. Vous rejoignez la communauté d'apprenants Humanix. Accès libre aux saisons et enquêtes gratuites. Pas d'admin à gérer, pas de carte bancaire, pas de mot de passe à retenir (connexion par magic link ou compte Google/Apple/Microsoft).",
    ctaHref: "/inscription",
    ctaLabel: "Créer mon compte apprenant gratuit →",
    accent: "primary",
    badge: "Le plus simple",
  },
  {
    slug: "invitation",
    icon: "📨",
    title: "On m'a envoyé une invitation",
    shortDescription:
      "Mon employeur, mon RSSI ou un proche m'a envoyé un lien pour rejoindre son espace.",
    longDescription:
      "Cliquez simplement sur le lien que vous avez reçu par mail. Si vous avez déjà un compte Humanix, on vous proposera de rejoindre l'espace de l'expéditeur avec votre consentement explicite. Vos progrès actuels restent les vôtres.",
    ctaHref: "/connexion",
    ctaLabel: "Me connecter pour accepter →",
    accent: "emerald",
  },
  {
    slug: "rssi-petite-equipe",
    icon: "👔",
    title: "Je suis RSSI / DSI / DAF / DPO d'une équipe de 1 à 5 personnes",
    shortDescription:
      "Je veux créer mon espace pour ma TPE / ma petite équipe, en self-service.",
    longDescription:
      "Plan Starter : gratuit jusqu'à 5 sièges, sans carte bancaire, sans engagement. Vous créez votre tenant (espace dédié) en 2 minutes, vous êtes ADMIN, vous pouvez inviter vos collaborateurs. 4 saisons cyber incluses, console dirigeant complète, hébergement France.",
    ctaHref: "/signup?plan=starter",
    ctaLabel: "Créer mon espace gratuit →",
    accent: "accent",
    badge: "Recommandé pour démarrer",
  },
  {
    slug: "rssi-pme",
    icon: "🏢",
    title: "Je suis RSSI / DSI d'une PME de 16 à 250 personnes",
    shortDescription:
      "Mon équipe dépasse les 5 sièges gratuits, j'ai besoin du standard PME.",
    longDescription:
      "Plan Pro : 3 €/utilisateur/mois (2,50 € en annuel). Tout le catalogue cyber, SSO Microsoft 365 + Google + SCIM, IA souveraine incluse, certificats PDF signés Ed25519, connecteur GRC (CISO Assistant). Résiliable à tout moment, hébergement France.",
    ctaHref: "/tarifs",
    ctaLabel: "Découvrir le plan Pro →",
    accent: "purple",
  },
  {
    slug: "rssi-enterprise",
    icon: "👑",
    title: "Je gère plus de 250 personnes ou j'ai des besoins spécifiques",
    shortDescription:
      "Instance dédiée, SecNumCloud, white-label, intégrations sur-mesure.",
    longDescription:
      "Plan Enterprise sur devis. Instance dédiée, SLA renforcé, SCIM/SAML, hébergement souverain SecNumCloud disponible. Accompagnement projet par notre équipe, intégrations sur-mesure (Splunk, ServiceNow, etc.). Contractuel : annuel ou pluriannuel.",
    ctaHref: "/demande-abonnement",
    ctaLabel: "Demander un devis →",
    accent: "amber",
  },
  {
    slug: "deja-inscrit",
    icon: "🔑",
    title: "J'ai déjà un compte, je veux changer d'espace",
    shortDescription:
      "Je me suis inscrit en solo, mon employeur ouvre un espace, je veux le rejoindre.",
    longDescription:
      "Demandez à l'administrateur de l'espace cible (votre RSSI, votre conjoint, votre employeur) d'envoyer une demande de rattachement à votre email. Vous recevrez un mail clair décrivant la demande et pourrez accepter ou refuser en un clic. Vos progrès, certificats et badges sont conservés.",
    ctaHref: "/connexion",
    ctaLabel: "Me connecter à mon compte →",
    accent: "rose",
  },
];

const ACCENT_CLASSES: Record<Persona["accent"], string> = {
  primary:
    "border-primary-500/40 hover:border-primary-500 bg-primary-50/30 dark:bg-primary-950/20",
  accent:
    "border-accent-500/40 hover:border-accent-500 bg-accent-50/30 dark:bg-accent-950/20",
  emerald:
    "border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20",
  amber:
    "border-amber-500/40 hover:border-amber-500 bg-amber-50/30 dark:bg-amber-950/20",
  purple:
    "border-purple-500/40 hover:border-purple-500 bg-purple-50/30 dark:bg-purple-950/20",
  rose: "border-rose-500/40 hover:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20",
};

const ACCENT_BUTTON: Record<Persona["accent"], string> = {
  primary: "bg-primary-500 hover:bg-primary-600 text-white",
  accent: "bg-accent-500 hover:bg-accent-600 text-white",
  emerald: "bg-emerald-500 hover:bg-emerald-600 text-white",
  amber: "bg-amber-500 hover:bg-amber-600 text-white",
  purple: "bg-purple-500 hover:bg-purple-600 text-white",
  rose: "bg-rose-500 hover:bg-rose-600 text-white",
};

const BADGE_CLASSES: Record<Persona["accent"], string> = {
  primary:
    "bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200",
  accent:
    "bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-200",
  emerald:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200",
  amber:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
  purple:
    "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200",
  rose: "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200",
};

export default function RejoindrePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* ===== HERO ===== */}
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Aiguillage
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
          Comment souhaitez-vous{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            rejoindre Humanix Académie
          </span>{" "}
          ?
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Six profils, six parcours. Choisissez celui qui correspond le mieux
          à votre situation - vous serez orienté vers la bonne formule, en
          quelques secondes.
        </p>
      </header>

      {/* ===== GRILLE PERSONAS ===== */}
      <section
        aria-label="Choix du profil"
        className="grid sm:grid-cols-2 gap-5 mb-12"
      >
        {PERSONAS.map((p) => (
          <article
            key={p.slug}
            className={`rounded-2xl border-2 p-6 transition-all flex flex-col ${ACCENT_CLASSES[p.accent]}`}
          >
            <div className="flex items-start gap-4 mb-3">
              <div
                className="text-4xl shrink-0 leading-none"
                aria-hidden="true"
              >
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white leading-snug">
                    {p.title}
                  </h2>
                  {p.badge && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${BADGE_CLASSES[p.accent]}`}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                  {p.shortDescription}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5 flex-1">
              {p.longDescription}
            </p>

            <Link
              href={p.ctaHref}
              className={`inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm transition shadow-sm ${ACCENT_BUTTON[p.accent]}`}
            >
              {p.ctaLabel}
            </Link>
          </article>
        ))}
      </section>

      {/* ===== FAQ / CAS PARTICULIERS ===== */}
      <section
        aria-labelledby="faq-title"
        className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-6 mb-12"
      >
        <h2
          id="faq-title"
          className="text-xl font-extrabold text-gray-900 dark:text-white mb-5"
        >
          Cas particuliers
        </h2>
        <div className="space-y-3">
          <details className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-primary-500 dark:text-accent-300">
              Je me suis inscrit comme particulier, je devais en fait
              créer un espace pour mon équipe
            </summary>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Pas de panique. Connectez-vous à votre compte actuel et
              contactez-nous à{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr"
                className="text-primary-500 underline"
              >
                contact@humanix-cybersecurity.fr
              </a>{" "}
              en précisant votre email et le nom de votre organisation.
              Nous basculerons votre compte en mode ADMIN avec un nouvel
              espace dédié, en conservant vos progrès.
            </p>
          </details>

          <details className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-primary-500 dark:text-accent-300">
              Ma conjointe / mon conjoint s'est inscrit, je veux qu'elle
              ou il rejoigne mon espace
            </summary>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Depuis votre console admin (
              <code className="text-xs bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                /admin/utilisateurs
              </code>
              ), utilisez le formulaire « Inviter un collaborateur ». Si
              l'email de votre proche existe déjà, le système enverra
              automatiquement une demande de rattachement RGPD-safe. Votre
              proche recevra un mail clair et pourra accepter en un clic
              avec son consentement explicite.
            </p>
          </details>

          <details className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-primary-500 dark:text-accent-300">
              Je veux juste tester avant de m'engager
            </summary>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Deux options :
              <br />
              <strong>1.</strong> La{" "}
              <Link href="/demo" className="text-primary-500 underline">
                démo en ligne
              </Link>{" "}
              avec des comptes pré-remplis et des données fictives (pas
              d'inscription requise).
              <br />
              <strong>2.</strong> Le plan{" "}
              <Link
                href="/signup?plan=starter"
                className="text-primary-500 underline"
              >
                Starter gratuit jusqu'à 5 sièges
              </Link>{" "}
              : créez votre espace, invitez votre équipe, testez en
              conditions réelles. Sans carte bancaire, sans engagement.
            </p>
          </details>

          <details className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-primary-500 dark:text-accent-300">
              Je veux héberger Humanix Académie chez moi (Community
              Edition)
            </summary>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Humanix Académie est{" "}
              <strong>open source sous licence AGPLv3</strong>. Vous
              pouvez télécharger le code, l'installer chez vous, sans
              limite ni dépendance Humanix. Documentation et code sur{" "}
              <a
                href="https://github.com/Humanix-Cybersecurity/Humanix-Academie"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 underline"
              >
                GitHub
              </a>
              . Cette page se trouve aussi dans{" "}
              <Link href="/tarifs" className="text-primary-500 underline">
                /tarifs
              </Link>{" "}
              sous le palier Community Edition.
            </p>
          </details>

          <details className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-primary-500 dark:text-accent-300">
              Je suis indépendant / consultant, je gère plusieurs
              clients
            </summary>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Le plan{" "}
              <strong>RSSI externalisé</strong> (cf.{" "}
              <Link href="/tarifs" className="text-primary-500 underline">
                /tarifs
              </Link>
              ) vous permet de gérer plusieurs tenants depuis une console
              centrale. Chaque client a son propre espace, ses propres
              utilisateurs, ses propres données. Une seule passerelle
              cyber consolide les preuves de sensibilisation pour tous
              vos clients. Contactez-nous à{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr?subject=Plan%20RSSI%20externalis%C3%A9"
                className="text-primary-500 underline"
              >
                contact@humanix-cybersecurity.fr
              </a>
              .
            </p>
          </details>
        </div>
      </section>

      {/* ===== CTA SECONDAIRE ===== */}
      <section className="text-center mb-8">
        <p className="text-gray-600 dark:text-gray-300 mb-3">
          Vous hésitez encore ? Comparez les formules ou parlez à un
          conseiller.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/tarifs" className="btn-secondary">
            Comparer les formules
          </Link>
          <Link href="/demo" className="btn-secondary">
            Voir la démo en ligne
          </Link>
          <a
            href="mailto:contact@humanix-cybersecurity.fr"
            className="btn-secondary"
          >
            Contacter un conseiller
          </a>
        </div>
      </section>
    </div>
  );
}
