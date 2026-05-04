// Landing publique — refonte UX.3.
// Sections : hero + chiffres marquants + comment ca marche + ce que vous obtenez
//          + temoignages-types + cyber-anecdote + audit flash + tarifs.
// Identite visuelle : motif Hex en arriere-plan, gradient officiel humanix-hero,
// chiffres en tabular-nums, micro-animations sur les CTAs.
import Image from "next/image";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";
import HexBackdrop from "@/components/HexBackdrop";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import { CyberMeteoCompact } from "@/components/CyberMeteoBadge";

export const revalidate = 3600;

export default async function HomePage() {
  const meteo = await getCyberMeteo();

  return (
    <>
      {/* ============== HERO ============== */}
      <HexBackdrop intensity="medium" className="bg-humanix-soft">
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-20 sm:pt-16 sm:pb-24">
          <div className="flex justify-center mb-6">
            <CyberMeteoCompact meteo={meteo} />
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-6 animate-fadeIn">
              <Image
                src="/logo-humanix-academie-512.png"
                alt="HumaniX Académie"
                width={240}
                height={363}
                priority
                className="h-auto w-auto max-h-64"
              />
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-6">
              La cybersécurité,
              <br />
              <span className="text-accent-500">simple et ludique</span>,<br />
              pour ta PME.
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-10">
              Forme tes équipes en 5 minutes par semaine. Mises en situation,
              mini-jeux, badges. Pensé pour ceux qui ne sont pas à l'aise avec
              l'informatique.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/connexion" className="btn-primary text-lg">
                Démarrer mes 14 jours gratuits
              </a>
              <a href="#comment-ca-marche" className="btn-secondary text-lg">
                Voir comment ça marche
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Sans carte bancaire · Déploiement en moins de 30 minutes
            </p>

            <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-accent-50 dark:bg-accent-900/20 border border-accent-300 dark:border-accent-700">
              <span className="text-2xl" aria-hidden="true">
                🎯
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-200 text-left">
                Pas encore prêt ?{" "}
                <a
                  href="/audit-flash"
                  className="font-bold text-accent-600 dark:text-accent-300 hover:underline"
                >
                  Faites un audit cyber gratuit en 5 minutes →
                </a>
              </p>
            </div>
          </div>
        </div>
      </HexBackdrop>

      {/* ============== CHIFFRES MARQUANTS ============== */}
      <section
        aria-labelledby="numbers-title"
        className="max-w-6xl mx-auto px-4 -mt-10 mb-20 relative z-10"
      >
        <h2 id="numbers-title" className="sr-only">
          Chiffres clés
        </h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <StatCard value="180+" label="modules cyber prêts" emoji="📚" />
          <StatCard
            value="5 min"
            label="par semaine et par employé"
            emoji="⏱"
          />
          <StatCard
            value="49 €"
            label="par mois pour 15 personnes"
            emoji="💶"
          />
          <StatCard value="100 %" label="hébergé en France" emoji="🇫🇷" />
        </div>
      </section>

      {/* ============== COMMENT ÇA MARCHE ============== */}
      <section
        id="comment-ca-marche"
        aria-labelledby="comment-titre"
        className="max-w-5xl mx-auto px-4 mb-24"
      >
        <h2
          id="comment-titre"
          className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 text-center mb-12"
        >
          Comment ça marche ?
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              emoji: "🎯",
              title: "Tu invites ton équipe",
              text: "Import CSV ou un par un. Chaque collaborateur reçoit un mail avec un lien magique : pas de mot de passe à créer.",
            },
            {
              emoji: "🎮",
              title: "Ils jouent 5 min/semaine",
              text: "Mises en situation, choix multiples, conséquences. On apprend par l'erreur, sans humiliation.",
            },
            {
              emoji: "📊",
              title: "Tu mesures la progression",
              text: "Console claire pour le dirigeant. Preuve de conformité exportable pour assureur ou auditeur.",
            },
          ].map((c, i) => (
            <article key={c.title} className="card-feature relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-accent-500 text-white font-extrabold flex items-center justify-center shadow-md text-sm">
                {i + 1}
              </div>
              <div className="text-4xl mb-4" aria-hidden="true">
                {c.emoji}
              </div>
              <h3 className="font-bold text-primary-500 dark:text-accent-300 mb-2 text-lg">
                {c.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                {c.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ============== VOICI CE QUE VOUS OBTENEZ ============== */}
      <section
        aria-labelledby="get-titre"
        className="max-w-6xl mx-auto px-4 mb-24"
      >
        <h2
          id="get-titre"
          className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 text-center mb-3"
        >
          Voici ce que vous obtenez
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Pas que de la formation. Un écosystème complet pensé pour faire monter
          en compétence vos équipes ET prouver votre démarche aux assureurs,
          OPCO, clients.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeaturePreview
            emoji="📄"
            title="Audit Cyber Flash"
            text="Quiz 5 min → rapport PDF brandé avec score, top 3 risques, recommandation personnalisée."
            href="/audit-flash"
            cta="Faire l'audit"
          />
          <FeaturePreview
            emoji="💼"
            title="Dashboard Business"
            text="Score risque · Coût attendu · ROI HumaniX · Top 3 actions. Pour le COMEX."
            href="/demo"
            cta="Voir la démo"
          />
          <FeaturePreview
            emoji="🎮"
            title="Hub apprenant ludique"
            text="Mascotte évolutive, niveaux, badges, boutique. Mes équipes redemandent leurs 5 min."
            href="/demo"
            cta="Tester en démo"
          />
          <FeaturePreview
            emoji="🚨"
            title="Cyber-Réflexe (incidents)"
            text="Workflow ANSSI/RGPD/NIS2 guidé + brouillons CNIL/ANSSI prêts en cas d'incident."
            href="/tarifs#pro"
          />
          <FeaturePreview
            emoji="🤖"
            title="Phishing IA personnalisé"
            text="L'IA souveraine Mistral génère 1 phishing UNIQUE par employé. Effet réalisme garanti."
            href="/tarifs#pro"
          />
          <FeaturePreview
            emoji="❤️"
            title="Cyber Famille"
            text="Vos employés offrent un compte gratuit à 3 proches. Argument marque employeur béton."
            href="/famille"
            cta="Découvrir"
          />
        </div>
      </section>

      {/* ============== BANDEAU CONFIANCE ============== */}
      <section
        aria-labelledby="trust-title"
        className="max-w-6xl mx-auto px-4 mb-24"
      >
        <div className="card-hero bg-humanix-hero text-white text-center p-10">
          <h2
            id="trust-title"
            className="text-2xl sm:text-3xl font-extrabold mb-4"
          >
            Pourquoi nous faire confiance ?
          </h2>
          <p className="opacity-90 mb-8 max-w-2xl mx-auto">
            Pas un nouveau player anonyme. HumaniX est conçu, hébergé et opéré
            en France par <strong>Humanix-Cybersecurity SASU</strong>, par un
            Tech Lead spécialiste cyber offensive depuis plus de 10 ans.
          </p>
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            <TrustBadge emoji="🇫🇷" label="100 % hébergé en France" />
            <TrustBadge emoji="🛡" label="RGPD-compliant + NIS2" />
            <TrustBadge emoji="♿" label="Accessibilité RGAA AA" />
            <TrustBadge emoji="🔓" label="Code transparent, audit public" />
          </div>
          <p className="mt-8 text-sm opacity-80">
            <a href="/comparatif" className="underline hover:no-underline">
              Voir le comparatif honnête vs concurrents
            </a>
            {" · "}
            <a
              href="/securite/rapport-audit"
              className="underline hover:no-underline"
            >
              Lire notre rapport d'audit public
            </a>
          </p>
        </div>
      </section>

      {/* ============== NEWSLETTER CYBER-ANECDOTE ============== */}
      <section
        aria-labelledby="anecdote-cta-title"
        className="max-w-6xl mx-auto px-4 mb-24"
      >
        <div className="rounded-3xl bg-humanix-warm text-white p-8 sm:p-12 shadow-xl">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-90 font-bold mb-2">
                📅 Newsletter gratuite
              </p>
              <h2
                id="anecdote-cta-title"
                className="text-3xl font-extrabold mb-3"
              >
                La Cyber-Anecdote du Lundi
              </h2>
              <p className="opacity-95 mb-2">
                Chaque lundi matin : <strong>1 incident cyber réel</strong>,{" "}
                <strong>1 leçon en 3 lignes</strong>, et{" "}
                <strong>1 mini-action</strong> à faire dans la semaine.
              </p>
              <p className="text-sm opacity-85">
                Aucun spam, désinscription en 1 clic. Hébergé en France.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5">
              <AnecdoteSubscribeForm source="homepage" variant="block" />
            </div>
          </div>
        </div>
      </section>

      {/* ============== TARIFS ============== */}
      <section className="max-w-4xl mx-auto px-4 mb-24">
        <div className="text-center bg-white dark:bg-slate-900 rounded-3xl p-10 border-2 border-accent-500/30 shadow-sm">
          <h2 className="text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            Self-host gratuit ou cloud à partir de{" "}
            <span className="tabular-nums">0 €</span>.
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto">
            Pas de tarif à 4 chiffres. Pas d'engagement. Pas de jargon. 6
            paliers limpides — Community, Découverte, Starter, Essentielle, Pro,
            Enterprise.
          </p>
          <a href="/tarifs" className="btn-primary">
            Voir les tarifs détaillés
          </a>
        </div>
      </section>
    </>
  );
}

function StatCard({
  value,
  label,
  emoji,
}: {
  value: string;
  label: string;
  emoji: string;
}) {
  return (
    <div className="card-stat text-center">
      <div className="text-2xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <p className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums leading-none">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider font-medium">
        {label}
      </p>
    </div>
  );
}

function FeaturePreview({
  emoji,
  title,
  text,
  href,
  cta,
}: {
  emoji: string;
  title: string;
  text: string;
  href: string;
  cta?: string;
}) {
  return (
    <article className="card-feature">
      <div className="text-3xl mb-3" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-bold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{text}</p>
      <a
        href={href}
        className="text-xs font-bold text-accent-500 dark:text-accent-300 hover:text-accent-600 inline-flex items-center gap-1"
      >
        {cta ?? "En savoir plus"} →
      </a>
    </article>
  );
}

function TrustBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-3 border border-white/30">
      <div className="text-2xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <p className="text-xs font-medium leading-tight">{label}</p>
    </div>
  );
}
