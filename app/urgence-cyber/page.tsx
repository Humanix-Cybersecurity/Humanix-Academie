// SPDX-License-Identifier: AGPL-3.0-or-later
// Hub d'urgence cyber - page publique mai 2026.
//
// CONTEXTE
// ========
// Cette page nait de deux objectifs convergents :
//
// 1. Reponse aux 5 points souleves par CyberMalveillance.gouv.fr lors
//    de notre demande de referencement officiel (mai 2026) :
//    - Activite curative explicite
//    - Liste des services curatifs valorises
//    - Sources d'actualisation des connaissances
//    - Procedure de conservation de la preuve forensic
//    - 2e numero de telephone (action manuelle, hors page)
//
// 2. Differenciant marketing : aucun acteur SAT/HRM (KnowBe4, Hoxhunt,
//    Phished, Adaptive Security, Cyber Guru) ne propose un hub d'urgence
//    public. Coherent avec /famille : "cyber accessible a tous".
//
// ACCESSIBILITE PUBLIQUE
// ======================
// Page sans login. Un dirigeant en panique a 23h ne va pas créer un
// compte - il va googler "que faire si je suis pirate" et atterrir ici.
//
// REGISTRE
// ========
// Maitrise sobre comme /sécurité (RSSI), pas chaleur cosy comme
// /famille. Un incident cyber est serieux. On rassure par la clarte
// d'action, pas par la tendresse.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import { INCIDENTS } from "@/lib/urgence-cyber/incidents";
import {
  SOURCES_BY_CATEGORY,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  type SourceCategory,
} from "@/lib/urgence-cyber/sources";
import { BreadcrumbJsonLd, ServiceJsonLd } from "@/lib/seo/jsonld";

const URG_TITLE = "Urgence cyber — Que faire en cas d'incident | Humanix";
const URG_DESC =
  "Hub d'urgence cyber gratuit, accessible à tous (particuliers, équipes, organisations de toute taille). Procédures pour rançongiciel, fuite de données, fraude au président, compte compromis, vol de matériel. Outils souverains, sources officielles, intervention curative par Humanix Cybersecurity.";

export const metadata = {
  title: URG_TITLE,
  description: URG_DESC,
  alternates: { canonical: "/urgence-cyber" },
  openGraph: {
    title: URG_TITLE,
    description: URG_DESC,
    type: "website",
    url: "/urgence-cyber",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Urgence cyber — Que faire en cas d'incident",
    description: URG_DESC,
    images: ["/logo-humanix-academie-512.png"],
  },
};

const CATEGORIES_ORDER: SourceCategory[] = [
  "etat",
  "europe",
  "magazine",
  "associatif",
];

export default function UrgenceCyberPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <ServiceJsonLd
        name="Hub d'urgence cyber gratuit"
        description="Procédures publiques pour rançongiciel, fuite de données, fraude au président, compte compromis, vol de matériel. Sources officielles, intervention curative par Humanix Cybersecurity."
        url="/urgence-cyber"
        serviceType="Cyber incident response guidance"
        offers={{ price: "0", priceCurrency: "EUR", description: "Hub gratuit, sans inscription" }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Urgence cyber", path: "/urgence-cyber" },
        ]}
      />
      {/* ============================================================
          1. HERO - gravité technique, ton clair
          ============================================================ */}
      <HexBackdrop
        intensity="soft"
        className="bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900"
      >
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-14 text-center"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-amber-300 dark:border-amber-900/50 px-4 py-2 rounded-full mb-8 shadow-sm">
            <span aria-hidden="true">🚨</span> Hub d'urgence · Public ·
            Sans inscription
          </p>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-amber-200 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Vous suspectez un incident&nbsp;?
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient">
              Voici quoi faire - maintenant.
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Pas de panique. Cinq scénarios, cinq fiches courtes : les{" "}
            <strong>réflexes des 60 premières minutes</strong>, les erreurs
            à éviter, et qui appeler ensuite. Conçu pour être lu vite,
            même paniqué.
          </p>

          <div
            className="mt-10 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto animate-slide-up"
            style={{ animationDelay: "340ms" }}
          >
            <a
              href="#incidents"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white font-bold px-5 py-4 rounded-2xl shadow-md hover:scale-105 transition-transform animate-glow"
            >
              <span aria-hidden="true">⚡</span> Diagnostic rapide
            </a>
            <a
              href="#preuve"
              className="inline-flex items-center justify-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-bold px-5 py-4 rounded-2xl shadow-sm hover:scale-105 transition-transform"
            >
              <span aria-hidden="true">🔍</span> Conserver les preuves
            </a>
            <a
              href="#humanix"
              className="inline-flex items-center justify-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-primary-500/40 text-primary-700 dark:text-accent-300 font-bold px-5 py-4 rounded-2xl shadow-sm hover:scale-105 transition-transform"
            >
              <span aria-hidden="true">📞</span> Appeler Humanix
            </a>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-16">
        {/* ============================================================
            2. PRÉAMBULE - 3 messages clés avant tout
            ============================================================ */}
        <section aria-labelledby="preamble-title">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/40 p-8 sm:p-10">
            <h2
              id="preamble-title"
              className="sr-only"
            >
              À lire en premier
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <PreambleItem
                emoji="⏱"
                title="La 1ère heure compte"
                text="Plus on agit tôt, plus la fenêtre de remédiation est grande. Cinq minutes de réflexion claire valent une heure de panique."
              />
              <PreambleItem
                emoji="📸"
                title="Conservez les preuves"
                text="Photos, captures, mails, logs. Avant tout reformatage, tout reset, toute extinction. Cf. § Conserver les preuves."
              />
              <PreambleItem
                emoji="🤝"
                title="Vous n'êtes pas seul·e"
                text="CyberMalveillance.gouv.fr, votre cyber-assurance, l'ANSSI, votre prestataire - appelez. Personne n'est jugé."
              />
            </div>
          </div>
        </section>

        {/* ============================================================
            3. INCIDENTS - les 5 fiches en cards
            ============================================================ */}
        <section
          aria-labelledby="incidents-title"
          id="incidents"
          className="scroll-mt-20"
        >
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
              Diagnostic rapide
            </p>
            <h2
              id="incidents-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-amber-200"
            >
              Choisissez votre scénario
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-300 italic mt-2 max-w-2xl mx-auto">
              Chaque fiche : 5 réflexes immédiats · 5 erreurs à éviter ·
              5 actions sous 24 h · outils & quand appeler Humanix.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {INCIDENTS.map((incident, idx) => (
              <article
                key={incident.slug}
                className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/40 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 animate-slide-up h-full"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-4 text-8xl opacity-10 select-none"
                >
                  {incident.emoji}
                </span>
                <div className="relative">
                  <div className="text-5xl mb-3" aria-hidden="true">
                    {incident.emoji}
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-amber-200 mb-2 leading-tight">
                    {incident.title}
                  </h3>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3 italic">
                    {incident.subtitle}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-5">
                    {incident.shortDesc}
                  </p>

                  {/* Aperçu : 3 premiers réflexes immédiats */}
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 mb-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-300 mb-2">
                      Réflexes immédiats (extrait)
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-200">
                      {incident.immediate.slice(0, 3).map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            aria-hidden="true"
                            className="text-amber-600 dark:text-amber-400 font-bold shrink-0"
                          >
                            {i + 1}.
                          </span>
                          <span>{a.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/urgence-cyber/${incident.slug}`}
                    className="btn-primary w-full"
                  >
                    Fiche complète <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================
            4. CONSERVATION DE LA PREUVE - réponse au point 4 CyberMalveillance
            ============================================================ */}
        <section
          aria-labelledby="preuve-title"
          id="preuve"
          className="scroll-mt-20"
        >
          <div className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-900/40 p-8 sm:p-10">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-700 dark:text-cyan-300 mb-2">
                Forensic
              </p>
              <h2
                id="preuve-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-cyan-200"
              >
                Préserver l'intégrité des preuves
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-2">
                Avant toute intervention curative, on protège la chaîne de
                preuves. Recevabilité juridique + analyse forensic ultérieure.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-display text-lg font-extrabold text-cyan-800 dark:text-cyan-200 mb-3 flex items-center gap-2">
                  <span aria-hidden="true">💾</span> Sur disque physique
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <ProofStep n="1">
                    <strong>Ne jamais éteindre brutalement.</strong> Si possible,
                    laisser sous tension pour préserver la mémoire vive (RAM dump
                    si forensic engagé).
                  </ProofStep>
                  <ProofStep n="2">
                    <strong>Photographier l'écran et la machine</strong> avec
                    horodatage (téléphone perso, hors infrastructure compromise).
                  </ProofStep>
                  <ProofStep n="3">
                    <strong>Calculer le hash SHA-256</strong> du disque ou de
                    l'image avant toute manipulation. Documenter le hash dans le
                    rapport d'incident.
                  </ProofStep>
                  <ProofStep n="4">
                    <strong>Utiliser un write-blocker matériel</strong> avant
                    toute lecture. Garantit que le disque source n'est jamais
                    modifié.
                  </ProofStep>
                  <ProofStep n="5">
                    <strong>Travailler sur une copie bit-à-bit</strong> (image
                    raw via dd, FTK Imager, ou Guymager). Le hash de l'image
                    doit correspondre à celui de la source.
                  </ProofStep>
                </ol>
              </div>

              <div>
                <h3 className="font-display text-lg font-extrabold text-cyan-800 dark:text-cyan-200 mb-3 flex items-center gap-2">
                  <span aria-hidden="true">🖥</span> Sur machine virtuelle
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <ProofStep n="1">
                    <strong>Snapshot immédiat</strong> de la VM (mémoire +
                    disque). Le snapshot fige l'état pour analyse ultérieure
                    sans toucher la prod.
                  </ProofStep>
                  <ProofStep n="2">
                    <strong>Exporter au format OVA/VMDK</strong> avec hash
                    SHA-256 du fichier exporté, conservé dans la chaîne de
                    preuve.
                  </ProofStep>
                  <ProofStep n="3">
                    <strong>Sauvegarder les logs de l'hyperviseur</strong>{" "}
                    (vmware.log, libvirt journal) - souvent oubliés mais
                    précieux.
                  </ProofStep>
                  <ProofStep n="4">
                    <strong>Documenter le contexte</strong> : qui a accès à la
                    VM, quels comptes, quels services hébergés, IP/réseaux.
                  </ProofStep>
                  <ProofStep n="5">
                    <strong>Isoler la VM du réseau</strong> via la console
                    hyperviseur, sans la stopper. Permet l'analyse mémoire en
                    cours d'exécution.
                  </ProofStep>
                </ol>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-dashed border-cyan-300 dark:border-cyan-800/50 text-sm text-cyan-900 dark:text-cyan-100">
              <p className="italic">
                <strong>Règle d'or</strong> : tout acte sur les preuves doit
                être tracé (qui, quand, pourquoi, hash avant/après). En cas de
                doute, on n'agit pas - on appelle.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            5. SOURCES - réponse au point 3 CyberMalveillance
            ============================================================ */}
        <section aria-labelledby="sources-title">
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              Veille permanente
            </p>
            <h2
              id="sources-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              Nos sources d'actualisation
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-300 italic mt-2 max-w-2xl mx-auto">
              Les organismes que nous lisons quotidiennement. Tous publics,
              gratuits, indépendants.
            </p>
          </div>

          <div className="space-y-8">
            {CATEGORIES_ORDER.map((cat) => {
              const items = SOURCES_BY_CATEGORY[cat];
              return (
                <div key={cat}>
                  <h3 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 flex items-center gap-2">
                    <span aria-hidden="true">{CATEGORY_EMOJI[cat]}</span>
                    {CATEGORY_LABEL[cat]}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 tabular-nums">
                      ({items.length})
                    </span>
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {items.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-4 hover:border-accent-500 dark:hover:border-accent-500 hover:shadow-md transition-all group"
                      >
                        <p className="font-bold text-primary-500 dark:text-accent-300 group-hover:underline underline-offset-4 mb-1 flex items-center gap-1.5">
                          {s.name}
                          <span
                            aria-hidden="true"
                            className="text-xs text-gray-500 group-hover:text-accent-500"
                          >
                            ↗
                          </span>
                          <span className="sr-only"> (nouvel onglet)</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {s.description}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================
            6. SERVICES CURATIFS HUMANIX - réponse aux points 1+2
            ============================================================ */}
        <section
          aria-labelledby="humanix-title"
          id="humanix"
          className="scroll-mt-20"
        >
          <div className="card-hero relative overflow-hidden animate-glow">
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 text-9xl opacity-15"
            >
              🤝
            </div>
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-90 mb-3">
                Intervention curative · Sans sous-traitance
              </p>
              <h2
                id="humanix-title"
                className="font-display text-2xl sm:text-3xl font-extrabold mb-5"
              >
                L'accompagnement Humanix Cybersecurity
              </h2>
              <p className="text-base sm:text-lg opacity-95 mb-8 max-w-3xl leading-relaxed">
                Notre équipe intervient <strong>directement</strong> sur site
                en métropole, sans sous-traitance. De la qualification
                d'incident à la remédiation complète - humain, francophone,
                souverain.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <ServiceCard
                  emoji="🔍"
                  title="Diagnostic & qualification"
                  text="Analyse du périmètre, identification du vecteur d'entrée, évaluation du risque RGPD et métier. Réponse sous 4 h ouvrées."
                />
                <ServiceCard
                  emoji="🧹"
                  title="Remédiation curative sur site"
                  text="Nettoyage du système d'information, restauration sécurisée, durcissement post-incident. Déplacement métropole."
                />
                <ServiceCard
                  emoji="📋"
                  title="Investigation forensic"
                  text="Capture et préservation de la chaîne de preuves, analyse timeline, rapport d'investigation pour assurance et plainte."
                />
                <ServiceCard
                  emoji="📜"
                  title="Accompagnement administratif"
                  text="Notification CNIL, dépôt de plainte, signalement CyberMalveillance, dossier cyber-assurance - on rédige avec vous."
                />
                <ServiceCard
                  emoji="🛡"
                  title="Plan de remédiation 30 jours"
                  text="Audit post-incident, hardening, formation flash de l'équipe, mise en conformité NIS2/RGPD si applicable."
                />
                <ServiceCard
                  emoji="🎓"
                  title="Formation post-incident"
                  text="Session de 2 h pour l'équipe : retour sur l'incident, réflexes nouveaux, kit de prévention. Inclus dans toute intervention."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="tel:+33000000000"
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary-500 font-bold px-6 py-4 rounded-2xl shadow-md hover:scale-105 transition-transform"
                >
                  <span aria-hidden="true">📞</span> Appeler maintenant
                </a>
                <a
                  href="mailto:incident@humanix-cybersecurity.fr"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur border-2 border-white/40 text-white font-bold px-6 py-4 rounded-2xl hover:bg-white/20 transition"
                >
                  <span aria-hidden="true">✉</span> Email d'urgence
                </a>
              </div>

              <p className="text-xs opacity-80 italic mt-6 text-center">
                Remplace le numéro `+33 0 00 00 00 00` par le numéro pro réel
                avant publication. Cf. action manuelle A19 du dossier
                pré-launch.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            7. PRESTATAIRES OFFICIELS - orientation neutre
            ============================================================ */}
        <section aria-labelledby="other-title">
          <div className="rounded-3xl bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50 border-2 border-gray-200 dark:border-slate-700 p-8 sm:p-10">
            <h2
              id="other-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-3"
            >
              Vous préférez un autre prestataire&nbsp;? On vous oriente.
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-200 mb-6 max-w-3xl leading-relaxed">
              Notre conviction : la cybersécurité ne doit pas être un piège
              commercial. Si Humanix n'est pas le bon choix pour vous, voici
              les portes officielles d'orientation gratuites.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <OfficialPortal
                emoji="🆘"
                name="CyberMalveillance.gouv.fr"
                url="https://www.cybermalveillance.gouv.fr/diagnostic"
                detail="Diagnostic gratuit en ligne + mise en relation avec prestataires labellisés ExpertCyber."
              />
              <OfficialPortal
                emoji="🛡"
                name="ANSSI - qualifiés PASSI"
                url="https://cyber.gouv.fr/produits-et-services-qualifies"
                detail="Liste officielle des prestataires qualifiés ANSSI pour audit et réponse à incident (grandes structures)."
              />
              <OfficialPortal
                emoji="📞"
                name="ANSSI hotline 17 ou 3018"
                url="https://www.cybermalveillance.gouv.fr/tous-nos-contenus/articles/contacter-la-police-ou-la-gendarmerie-nationale-en-cas-de-cybermalveillance"
                detail="Pour signaler en urgence : 17 (police), 3018 (mineurs harcelés/cyberviolence)."
              />
            </div>
          </div>
        </section>

        {/* ============================================================
            8. RESPIRATION - citation finale technique sobre
            ============================================================ */}
        <section className="text-center pt-4">
          <blockquote className="font-display italic text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Un incident bien géré est invisible un an plus tard. Un
            incident mal géré laisse des traces dix ans. La différence&nbsp;:
            la première heure. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-amber-700/70 dark:text-amber-300/70 font-bold"
          >
            - Hex veille
          </p>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8 italic">
            Page publique, gratuite, sans inscription, sans cookies de
            tracking. C'est notre engagement.
          </p>
        </section>
      </div>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function PreambleItem({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-4xl mb-2 inline-block animate-float" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-lg font-extrabold text-emerald-800 dark:text-emerald-200 mb-2">
        {title}
      </h3>
      <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80 leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function ProofStep({
  n,
  children,
}: {
  n: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 w-7 h-7 rounded-full bg-cyan-200 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-800 dark:text-cyan-200 font-bold text-sm tabular-nums"
      >
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function ServiceCard({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
      <div className="text-3xl mb-2" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-base font-extrabold mb-2">{title}</h3>
      <p className="text-sm opacity-90 leading-relaxed">{text}</p>
    </div>
  );
}

function OfficialPortal({
  emoji,
  name,
  url,
  detail,
}: {
  emoji: string;
  name: string;
  url: string;
  detail: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-5 hover:border-primary-500 dark:hover:border-accent-500 hover:shadow-md transition-all group h-full"
    >
      <div className="text-3xl mb-2" aria-hidden="true">
        {emoji}
      </div>
      <p className="font-display text-base font-extrabold text-primary-500 dark:text-accent-300 mb-1 group-hover:underline underline-offset-4">
        {name}
        <span aria-hidden="true" className="text-xs ml-1">
          ↗
        </span>
        <span className="sr-only"> (nouvel onglet)</span>
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {detail}
      </p>
    </a>
  );
}
