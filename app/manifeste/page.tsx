// SPDX-License-Identifier: AGPL-3.0-or-later
// Page Manifeste - l'expérience immersive d'identité Humanix.
//
// Pourquoi cette page existe : la landing / est utilitaire (CTA inscription).
// Le /comparatif est analytique. Le /tarifs est commercial. Mais aucune page
// ne raconte QUI on est et POURQUOI on existe - un manque comble en amont
// du launch OSS du 26 mai.
//
// Cette page est un voyage narratif en 8 chapitres, conçu pour qu'un
// visiteur RSSI / dirigeant PME / journaliste / contributeur curieux
// ressorte avec une émotion claire : "ces gens-là pensent comme moi".
//
// Design tokens utilisés (cf. globals.css, tailwind.config.ts) :
// - Couleurs : primary (#0B3D91 navy), accent (#00A3A1 teal), success, warn
// - Polices : Inter / Atkinson Hyperlegible
// - Composants : .card, .card-hero, .card-feature, .card-alert, .card-stat
// - Gradients : .bg-humanix-hero, .bg-humanix-soft, .bg-humanix-warm
// - Hex pattern : .bg-hex-pattern + composant <HexBackdrop>
// - Animations : fadeIn, slide-up, bounce-slow, wiggle, gradient, float, glow,
//   hex-drift (ces 3 dernières ajoutées spécifiquement pour cette page)
//
// A11y :
// - 1 seul h1, hiérarchie h2/h3 propre
// - Tous les emojis aria-hidden (lus comme décoration)
// - Liens externes avec rel="noopener noreferrer" + sr-only "(nouvel onglet)"
// - Focus visible (CSS dans globals.css)
// - prefers-reduced-motion respecté (CSS @media déjà global)
// - Contraste vérifié AA+ sur fonds clairs ET dark mode
// - Skip link automatique via le layout

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascotEvolved from "@/components/HexMascotEvolved";

const MANIFESTE_TITLE = "Manifeste - La cybersécurité humaine, française, libre | Humanix Académie";
const MANIFESTE_DESC =
  "Pourquoi Humanix existe. La cybersécurité humaine, française, libre. Une plateforme open source AGPLv3 pour que personne - particulier, équipe, association, organisation - ne soit plus le maillon faible.";

export const metadata = {
  title: MANIFESTE_TITLE,
  description: MANIFESTE_DESC,
  alternates: { canonical: "/manifeste" },
  openGraph: {
    title: MANIFESTE_TITLE,
    description: MANIFESTE_DESC,
    type: "article",
    url: "/manifeste",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manifeste - La cybersécurité humaine, française, libre",
    description: MANIFESTE_DESC,
    images: ["/logo-humanix-academie-512.png"],
  },
};

export default function ManifestePage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      {/* ============================================================
          CHAPITRE 1 - HERO IMMERSIF
          Hex drift en fond, mascotte qui flotte, titre qui respire.
          ============================================================ */}
      <section
        aria-labelledby="manifeste-hero"
        className="relative isolate min-h-[88vh] flex items-center bg-humanix-soft"
      >
        {/* Hex pattern qui drifte lentement (24s/cycle, 1px par seconde -
            quasi-imperceptible mais donne vie à la page) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-hex-pattern animate-hex-drift -z-10 pointer-events-none"
        />

        {/* Halo radial bleu/teal en fond pour profondeur */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,163,161,0.08), transparent 70%)",
          }}
        />

        <div className="max-w-5xl mx-auto px-4 py-24 sm:py-32 text-center w-full">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-bold text-accent-500 mb-6 animate-fadeIn">
            Manifeste · Humanix Académie · Mai 2026
          </p>

          <h1
            id="manifeste-hero"
            className="font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[1.05] mb-8 text-primary-500 dark:text-accent-300 animate-slide-up"
            style={{ animationDelay: "120ms" }}
          >
            La cybersécurité,
            <br />
            <span className="bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500 bg-clip-text text-transparent animate-gradient">
              ça commence par l'humain.
            </span>
          </h1>

          <p
            className="text-lg sm:text-2xl text-gray-700 dark:text-gray-200 max-w-3xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "240ms" }}
          >
            On a passé deux ans à construire la brique manquante de
            l'écosystème cyber français. Aujourd'hui, on te la donne.
            <br />
            <span className="font-semibold text-primary-500 dark:text-accent-300">
              Code libre. AGPLv3. Souverain. Sans condition.
            </span>
          </p>

          <div
            className="mt-12 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
            style={{ animationDelay: "360ms" }}
          >
            <Link
              href="#chapitre-2"
              className="btn-primary text-lg px-8 py-4 animate-glow"
            >
              Lire l'histoire <span aria-hidden="true">↓</span>
            </Link>
            <Link
              href="https://github.com/humanix-cybersecurity/humanix-academie"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-lg px-8 py-4"
            >
              <span aria-hidden="true">⭐</span> Voir le code
              <span className="sr-only"> (nouvel onglet)</span>
            </Link>
          </div>

          {/* Mascotte Hex qui flotte en bas, signe la page */}
          <div
            className="mt-16 flex justify-center animate-slide-up"
            style={{ animationDelay: "480ms" }}
          >
            <div className="animate-float">
              <HexMascotEvolved
                species="fox"
                xp={500}
                size="md"
                mood="celebrate"
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic animate-fadeIn">
            Hex t'accompagne. C'est notre mascotte - et bientôt, peut-être,
            celle de tes équipes.
          </p>
        </div>

        {/* Indicateur scroll discret */}
        <div
          aria-hidden="true"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-2xl text-accent-500 animate-bounce-slow"
        >
          ↓
        </div>
      </section>

      {/* ============================================================
          CHAPITRE 2 - LE PROBLÈME
          Trois scènes courtes, en cascade. Style romanesque court.
          ============================================================ */}
      <section
        id="chapitre-2"
        aria-labelledby="ch2-title"
        className="py-24 sm:py-32 bg-white dark:bg-slate-900"
      >
        <div className="max-w-5xl mx-auto px-4">
          <ChapterHeader number="01" title="Le problème" eyebrow="On a tous vu ces scènes" id="ch2-title" />

          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 leading-relaxed max-w-3xl mb-16 mx-auto text-center">
            Dix ans en pentest. À chaque mission - entreprise, collectivité,
            association, particulier piégé - c'est la même histoire qui se
            rejoue. Trois scènes, trois personnes, le même point commun :{" "}
            <strong>personne ne les a formés</strong>.
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            <SceneCard
              delay={0}
              emoji="🧾"
              who="Marie, comptable"
              what="Elle clique sur un faux RIB envoyé en pleine charge de fin de mois. Le mail vient de « son fournisseur habituel » - sauf que le domaine a une lettre déplacée."
              loss="32 400 €"
            />
            <SceneCard
              delay={120}
              emoji="🔑"
              who="Stéphane, commercial"
              what="Il recycle son mot de passe d'agence sur trois sites perso. Quand l'un d'eux fuit, l'attaquant teste - et entre dans le CRM en 4 secondes."
              loss="Fichier client de 8 ans"
            />
            <SceneCard
              delay={240}
              emoji="🌙"
              who="Le dirigeant, 23h"
              what="Pièce jointe « Relevé URSSAF », ouverte fatigué après une journée de 12h. Macro Office, ransomware, tout le réseau chiffré le lendemain matin."
              loss="3 jours d'arrêt total"
            />
          </div>

          <div className="mt-16 max-w-3xl mx-auto text-center">
            <p className="text-2xl sm:text-3xl font-display font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
              On ne casse pas un firewall.
              <br />
              <span className="text-accent-500">On casse un humain pas formé.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          CHAPITRE 3 - LE CONSTAT
          Stat 90% géante + écosystème français. Fond gradient soft.
          ============================================================ */}
      <HexBackdrop intensity="medium" className="bg-humanix-soft">
        <section
          aria-labelledby="ch3-title"
          className="py-24 sm:py-32"
        >
          <div className="max-w-5xl mx-auto px-4">
            <ChapterHeader number="02" title="Le constat" eyebrow="Une brique manquait" id="ch3-title" />

            <div className="grid sm:grid-cols-2 gap-8 items-center mb-16">
              <div className="text-center sm:text-left animate-slide-up">
                <p
                  className="font-display font-extrabold text-9xl sm:text-[12rem] leading-none bg-gradient-to-br from-warn to-primary-500 bg-clip-text text-transparent tabular-nums"
                  aria-label="Quatre-vingt-dix pour cent"
                >
                  90<span className="text-7xl sm:text-9xl">%</span>
                </p>
                <p className="text-lg text-gray-700 dark:text-gray-200 mt-4">
                  des cyberattaques - toutes structures confondues, du
                  particulier au grand groupe - passent par un humain.
                </p>
              </div>
              <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
                <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
                  Et 90 % des outils pour former cet humain viennent des
                  États-Unis, sont fermés, et coûtent <strong>8 000 €/an</strong> et plus.
                </p>
                <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 leading-relaxed">
                  Pendant ce temps, l'open source cyber français s'est
                  structuré. Mais il manquait toujours <em>la brique
                  humaine</em>.
                </p>
              </div>
            </div>

            {/* Mini-tableau écosystème */}
            <div className="card border-2 border-accent-500/20 dark:border-accent-500/30 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "240ms" }}>
              <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-4">
                L'écosystème open source cyber français
              </p>
              <ul className="space-y-3 text-base">
                <EcoRow brand="CISO Assistant (intuitem)" role="Gouvernance, Risque, Conformité" status="✓" />
                <EcoRow brand="OpenCTI (Filigran)" role="Threat intelligence" status="✓" />
                <EcoRow brand="Wazuh" role="SIEM, détection, réponse" status="✓" />
                <EcoRow brand="TheHive (StrangeBee)" role="Réponse à incident" status="✓" />
                <EcoRow brand="MISP" role="Partage de threat intel" status="✓" />
                <li className="pt-3 mt-3 border-t-2 border-dashed border-accent-500/30">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-primary-500 dark:text-accent-300">
                        Brique humaine
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Sensibilisation, formation, simulation
                      </p>
                    </div>
                    <span className="text-warn font-bold text-lg" aria-label="Manquant">
                      <span aria-hidden="true">○</span> Trou béant
                    </span>
                  </div>
                </li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 italic">
                C'est exactement là que les attaques passent. Et c'est
                exactement ce qu'on construit.
              </p>
            </div>
          </div>
        </section>
      </HexBackdrop>

      {/* ============================================================
          CHAPITRE 4 - CE QU'ON CONSTRUIT
          Card-hero gradient avec promesse. Cinq piliers en card-feature.
          ============================================================ */}
      <section
        aria-labelledby="ch4-title"
        className="py-24 sm:py-32 bg-white dark:bg-slate-900"
      >
        <div className="max-w-5xl mx-auto px-4">
          <ChapterHeader number="03" title="Ce qu'on construit" eyebrow="La brique humaine, libre" id="ch4-title" />

          <div className="card-hero text-center max-w-3xl mx-auto mb-16 animate-slide-up animate-glow">
            <p className="text-2xl sm:text-3xl font-display font-extrabold leading-tight">
              Une plateforme qui apprend la cyber comme on apprend une langue
              sur Duolingo.
            </p>
            <p className="text-base sm:text-lg opacity-90 mt-4">
              Cinq minutes par semaine. Mascotte évolutive. Histoires
              concrètes. Quiz courts. Badges. Et zéro jargon RSSI.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Pilier
              delay={0}
              emoji="🎮"
              title="Ludique pour de vrai"
              text="Hex, ta mascotte, évolue avec toi. Niveau 1 : un renard timide. Niveau 5 : un compagnon expert. Les collaborateurs reviennent par envie, pas par contrainte."
            />
            <Pilier
              delay={80}
              emoji="🇫🇷"
              title="Souverain par défaut"
              text="Scaleway Paris. Mistral Voxtral. Scaleway TEM UE. Aucune dépendance Cloud Act US. Conforme RGPD, NIS2 et Loi Sapin II Art. 17 (formation anti-corruption obligatoire) nativement."
            />
            <Pilier
              delay={160}
              emoji="📖"
              title="Code ouvert AGPLv3"
              text="Le code complet, sur GitHub. Audite-le, fork-le, héberge-le. Aucune boîte noire. C'est l'inverse du marché."
            />
            <Pilier
              delay={240}
              emoji="🤝"
              title="Branché à l'écosystème"
              text="Connecteur natif CISO Assistant. Format OSCAL standard. Webhooks Sentinel/Splunk/Sekoia. Premier MCP server pour agents IA du marché SAT."
            />
            <Pilier
              delay={320}
              emoji="❤️"
              title="Cyber Famille"
              text="Trois proches invités gratuitement par collaborateur. Personne ne fait ça. Parce que la cyber au bureau commence par la cyber à la maison."
            />
            <Pilier
              delay={400}
              emoji="🎓"
              title="Volume plutôt que rente"
              text="3 € par utilisateur par mois, gratuit pour les particuliers. 5 à 10 fois moins cher que les acteurs US. Pour ouvrir l'accès à toutes celles et ceux qui sont aujourd'hui sans solution."
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          CHAPITRE 5 - LE CODE PARLE
          3 captures conceptuelles : MCP, vishing souverain, OSCAL.
          ============================================================ */}
      <HexBackdrop className="bg-gray-50 dark:bg-slate-950/50">
        <section
          aria-labelledby="ch5-title"
          className="py-24 sm:py-32"
        >
          <div className="max-w-5xl mx-auto px-4">
            <ChapterHeader number="04" title="Le code parle" eyebrow="Trois choses qu'on est seul à faire" id="ch5-title" />

            <p className="text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto text-center mb-16">
              On n'est pas le moins cher pour rien. On est aussi le plus
              audacieux techniquement. Trois exemples vérifiables sur GitHub.
            </p>

            <div className="space-y-8">
              {/* MCP Server */}
              <div className="card overflow-hidden animate-slide-up">
                <div className="grid sm:grid-cols-3 gap-6 items-start">
                  <div className="sm:col-span-1">
                    <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-2">
                      Premier au monde
                    </p>
                    <h3 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
                      MCP Server pour agents IA
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Aucun acteur SAT/HRM ne le propose. Ni KnowBe4, ni
                      Hoxhunt, ni Phished, ni même Adaptive Security. On l'a
                      fait, on l'a documenté, on l'a publié sous MIT.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <pre className="text-xs sm:text-sm bg-slate-900 text-slate-100 dark:bg-black dark:text-emerald-300 rounded-xl p-5 overflow-x-auto font-mono leading-relaxed">
{`> "Donne-moi le score NIS2 et les 5 utilisateurs
   les plus à risque ce mois-ci."

🤖 Claude Desktop appelle :
   ➜ humanix_compliance_score(framework="NIS2")
   ➜ humanix_users_at_risk(limit=5)

✓ Réponse en 2 secondes. Pas de copier-coller.
  Pas de connexion VPN. Read-only par design.`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Vishing souverain */}
              <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "120ms" }}>
                <div className="grid sm:grid-cols-3 gap-6 items-start">
                  <div className="sm:col-span-1">
                    <p className="text-xs uppercase tracking-widest font-bold text-warn mb-2">
                      Vishing +442 % H2 2024
                    </p>
                    <h3 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
                      Vishing souverain Mistral + Piper
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Adaptive Security le fait avec OpenAI. Hoxhunt avec
                      OpenAI. Nous : Mistral à Paris pour générer le
                      script, Piper TTS local pour la voix. <strong>Aucun
                      audio ne quitte ton infrastructure</strong>.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <pre className="text-xs sm:text-sm bg-slate-900 text-slate-100 dark:bg-black dark:text-amber-200 rounded-xl p-5 overflow-x-auto font-mono leading-relaxed">
{`📞 Bonjour, ici Olivier du support technique
   externalisé mandaté par votre DSI.

   Activité suspecte sur votre poste à 11h47.
   Pour éviter le blocage, ouvrez ce lien
   et donnez-moi le code à 6 chiffres...

🇫🇷 Script Mistral · Voix Piper local · 0 ms US`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* OSCAL + CISO Assistant */}
              <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "240ms" }}>
                <div className="grid sm:grid-cols-3 gap-6 items-start">
                  <div className="sm:col-span-1">
                    <p className="text-xs uppercase tracking-widest font-bold text-success mb-2">
                      Standard NIST OSCAL
                    </p>
                    <h3 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
                      Preuves portables vers ta GRC
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Format OSCAL v1.1.2 du NIST exporté sur un endpoint
                      simple. Compatible CISO Assistant, Eramba, RegScale.
                      Plus jamais de copier-coller manuel pour ton audit
                      ISO 27001, NIS2 ou Sapin II (1 M€ d'amende encourue
                      en cas de défaut de formation anti-corruption).
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <pre className="text-xs sm:text-sm bg-slate-900 text-slate-100 dark:bg-black dark:text-cyan-300 rounded-xl p-5 overflow-x-auto font-mono leading-relaxed">
{`$ curl -H "Authorization: Bearer $KEY" \\
    "https://academie.acme.fr/api/v1/\\
    evidence-export?framework=NIS2&format=oscal-v1"

→ assessment-results.json (NIST OSCAL v1.1.2)
→ Import direct CISO Assistant en 1 clic.`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center mt-12 text-base text-gray-600 dark:text-gray-300">
              <span aria-hidden="true">⭐</span>{" "}
              <Link
                href="https://github.com/humanix-cybersecurity/humanix-academie"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline font-semibold"
              >
                github.com/humanix-cybersecurity/humanix-academie
              </Link>
            </p>
          </div>
        </section>
      </HexBackdrop>

      {/* ============================================================
          CHAPITRE 6 - LE MODÈLE
          Comment on gagne notre vie sans trahir l'open source.
          ============================================================ */}
      <section
        aria-labelledby="ch6-title"
        className="py-24 sm:py-32 bg-white dark:bg-slate-900"
      >
        <div className="max-w-4xl mx-auto px-4">
          <ChapterHeader number="05" title="Le modèle" eyebrow="Open core, service-led" id="ch6-title" />

          <div className="space-y-6 text-lg text-gray-700 dark:text-gray-200 leading-relaxed">
            <p className="animate-slide-up">
              <em>« Et tu vis comment, alors ? »</em> - c'est la question qu'on
              nous pose dix fois par jour depuis qu'on a annoncé la bascule
              open source. Voici la réponse, sans détour.
            </p>

            <p className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <strong className="text-primary-500 dark:text-accent-300">
                La plateforme est libre. L'expertise se monnaie.
              </strong>{" "}
              Audit de maturité cyber humaine, formation Qualiopi
              certifiante, RSSI externalisé pour les organisations qui
              n'en ont pas, hosting cloud managé sur Scaleway Paris, et le
              Pack NIS2 turnkey pour les structures qui ont 30 jours pour
              passer la directive.
            </p>

            <p className="animate-slide-up" style={{ animationDelay: "200ms" }}>
              C'est exactement ce qu'a fait{" "}
              <strong>intuitem avec CISO Assistant</strong>. Ce qu'a fait{" "}
              <strong>Filigran avec OpenCTI</strong>. Ce qu'a fait{" "}
              <strong>Centreon</strong> avant tout le monde. Le SaaS US a
              prospéré avec la rente. La France a inventé l'autre voie : la
              prospérité par l'expertise. Plus juste. Plus durable. Plus
              utile.
            </p>

            <p className="animate-slide-up" style={{ animationDelay: "300ms" }}>
              La cible 24 mois est honnête :{" "}
              <strong>180 à 250 k€ en solo bootstrap</strong>. Pas une
              licorne, pas une IPO. Une activité qui paie ses factures, fait
              vivre son fondateur, et accompagne <strong>tout le monde</strong>{" "}
              - particuliers, équipes, organisations de toute taille - plutôt
              que de courir après 30 grosses boîtes.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          CHAPITRE 7 - LA SIGNATURE
          Le vrai manifeste. Italique. Solennel. Court.
          ============================================================ */}
      <section
        aria-labelledby="ch7-title"
        className="py-24 sm:py-32 bg-humanix-hero text-white relative overflow-hidden"
      >
        {/* Hex pattern blanc en overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10 animate-hex-drift pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'><path d='M28 2L52 16v32L28 62L4 48V16z' fill='none' stroke='white' stroke-width='1.4'/><path d='M28 52L52 66v32L28 112L4 98V66z' fill='none' stroke='white' stroke-width='1.4'/></svg>\")",
            backgroundSize: "56px 100px",
          }}
        />

        <div className="max-w-3xl mx-auto px-4 relative">
          <h2 id="ch7-title" className="sr-only">
            Notre engagement
          </h2>
          <blockquote className="font-display italic text-2xl sm:text-3xl lg:text-4xl leading-snug">
            <p className="animate-slide-up">
              « En 2026, en France, la cybersécurité du quotidien ne se
              gagnera pas avec un éditeur de plus.
            </p>
            <p className="mt-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
              Elle se gagnera avec un <strong className="not-italic text-accent-300">écosystème souverain</strong>,
              libre, auditable, où chacun - du particulier au RSSI - peut
              savoir exactement ce qui tourne dans son outil. »
            </p>
          </blockquote>
          <p
            className="mt-12 text-sm uppercase tracking-[0.3em] font-bold opacity-80 animate-fadeIn"
            style={{ animationDelay: "400ms" }}
          >
            - Florian Durano · Fondateur Humanix Cybersecurity · 26 mai 2026
          </p>
        </div>
      </section>

      {/* ============================================================
          CHAPITRE 8 - LE VOYAGE
          3 portes : tester, self-host, discuter. Tone "tu".
          ============================================================ */}
      <section
        aria-labelledby="ch8-title"
        className="py-24 sm:py-32 bg-humanix-soft"
      >
        <div className="max-w-5xl mx-auto px-4">
          <ChapterHeader number="06" title="Le voyage commence" eyebrow="Trois portes pour entrer" id="ch8-title" />

          <div className="grid md:grid-cols-3 gap-6">
            <Door
              delay={0}
              emoji="🌱"
              title="Je teste"
              text="Démo en ligne sans inscription, 5 sièges gratuits forever sur le cloud souverain. Tu te connectes, tu cliques, tu vois."
              cta="Lancer la démo"
              href="/demo"
              tone="accent"
            />
            <Door
              delay={120}
              emoji="🛠"
              title="J'héberge"
              text="Self-host AGPLv3 gratuit à vie. Docker Compose en 10 minutes. Le code complet, l'audit de licences, la doc. Aucune condition."
              cta="Cloner le repo"
              href="https://github.com/humanix-cybersecurity/humanix-academie"
              tone="primary"
              external
            />
            <Door
              delay={240}
              emoji="☎"
              title="On en parle"
              text="Tu es RSSI, dirigeant, journaliste, contributeur. Écris-moi. Je réponds personnellement. Vraiment."
              cta="Me contacter"
              href="mailto:contact@humanix-cybersecurity.fr"
              tone="warm"
            />
          </div>

          <div className="mt-16 text-center">
            <p className="text-base text-gray-600 dark:text-gray-300 italic max-w-2xl mx-auto">
              Et si tu connais un dirigeant, un RSSI, un journaliste, ou
              simplement quelqu'un qui se sent dépassé par la cyber : partage
              cette page. C'est comme ça qu'on construit une cyber souveraine
              - un humain à la fois.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          PIED DE PAGE - Hex qui veille
          ============================================================ */}
      <section
        aria-hidden="true"
        className="py-12 bg-humanix-soft border-t-2 border-dashed border-accent-500/20 text-center"
      >
        <div className="inline-block animate-bounce-slow">
          <HexMascotEvolved
            species="fox"
            xp={30}
            size="sm"
            mood="happy"
          />
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
          Hex veille · Made with <span className="text-warn">❤</span> in France
        </p>
      </section>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// On les laisse dans le même fichier pour garder la page lisible bout-en-bout.
// Si la page grandit, on les déplacera dans components/manifeste/.
// ===========================================================================

function ChapterHeader({
  number,
  title,
  eyebrow,
  id,
}: {
  number: string;
  title: string;
  eyebrow: string;
  id: string;
}) {
  return (
    <div className="text-center mb-16">
      <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-bold text-accent-500 mb-3">
        Chapitre {number}
      </p>
      <h2
        id={id}
        className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
      >
        {title}
      </h2>
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 italic">
        {eyebrow}
      </p>
      <div
        className="mt-6 mx-auto w-16 h-1 rounded-full bg-gradient-to-r from-accent-500 to-primary-500"
        aria-hidden="true"
      />
    </div>
  );
}

function SceneCard({
  emoji,
  who,
  what,
  loss,
  delay,
}: {
  emoji: string;
  who: string;
  what: string;
  loss: string;
  delay: number;
}) {
  return (
    <article
      className="card-feature h-full animate-slide-up flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-4xl mb-4" aria-hidden="true">
        {emoji}
      </span>
      <h3 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
        {who}
      </h3>
      <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-4 flex-1">
        {what}
      </p>
      <div className="pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
        <p className="text-xs uppercase tracking-widest font-bold text-warn">
          Coût
        </p>
        <p className="font-display text-2xl font-extrabold text-warn tabular-nums">
          {loss}
        </p>
      </div>
    </article>
  );
}

function EcoRow({
  brand,
  role,
  status,
}: {
  brand: string;
  role: string;
  status: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="font-bold text-primary-500 dark:text-accent-300">
          {brand}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{role}</p>
      </div>
      <span
        className="text-success font-bold text-lg"
        aria-label="Disponible"
      >
        <span aria-hidden="true">{status}</span> Couvert
      </span>
    </li>
  );
}

function Pilier({
  emoji,
  title,
  text,
  delay,
}: {
  emoji: string;
  title: string;
  text: string;
  delay: number;
}) {
  return (
    <article
      className="card hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-slide-up h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-4xl mb-3 block" aria-hidden="true">
        {emoji}
      </span>
      <h3 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {text}
      </p>
    </article>
  );
}

function Door({
  emoji,
  title,
  text,
  cta,
  href,
  tone,
  external,
  delay,
}: {
  emoji: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  tone: "accent" | "primary" | "warm";
  external?: boolean;
  delay: number;
}) {
  const toneClass =
    tone === "accent"
      ? "border-accent-500 hover:bg-accent-500/5"
      : tone === "primary"
        ? "border-primary-500 hover:bg-primary-50 dark:hover:bg-slate-800"
        : "border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20";

  const ctaClass =
    tone === "accent"
      ? "btn-primary"
      : tone === "primary"
        ? "btn-secondary"
        : "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-amber-700 dark:text-amber-200 border-2 border-amber-500 transition-all hover:bg-amber-500 hover:text-white hover:-translate-y-0.5";

  return (
    <article
      className={`bg-white dark:bg-slate-800 border-2 ${toneClass} rounded-3xl p-8 transition-all hover:-translate-y-1 hover:shadow-xl animate-slide-up h-full flex flex-col`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-5xl mb-4 animate-float" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-6 flex-1">
        {text}
      </p>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${ctaClass} w-full text-center`}
        >
          {cta} <span aria-hidden="true">↗</span>
          <span className="sr-only">(nouvel onglet)</span>
        </a>
      ) : (
        <Link href={href} className={`${ctaClass} w-full text-center`}>
          {cta} <span aria-hidden="true">→</span>
        </Link>
      )}
    </article>
  );
}
