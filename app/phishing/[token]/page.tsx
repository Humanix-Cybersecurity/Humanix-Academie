// SPDX-License-Identifier: AGPL-3.0-or-later
// Landing pedagogique : "Tu as cliqué sur un mail piège - voici pourquoi"
//
// AUTOMATION (mai 2026) - le PHARE produit :
//   Quand l'user clique, on ne se contente plus d'expliquer. On ENROLE
//   automatiquement dans un mini-module de remediation de 2 minutes
//   (saison "remediation-flash") choisi en fonction du template clique.
//   Le user enchaine sur le module via un CTA proeminent. C'est ce qui
//   transforme un "test de vigilance" en "formation cyber qui apprend
//   vraiment".
//
//   En parallele, on dispatch un webhook phishing.user_clicked aux
//   abonnes du tenant (Slack/Teams admin) pour alerte temps reel.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/phishing";
import { fireWebhook } from "@/lib/webhooks/dispatcher";
import { triggerCisoLiveSync } from "@/lib/ciso-assistant/live-mode";
import AskHexExplain from "@/components/AskHexExplain";
import {
  QUISHING_TEMPLATES,
  parseQuishingCampaignToken,
  type QuishingTemplate,
} from "@/lib/phishing/qr-code";

export const dynamic = "force-dynamic";

export default async function PhishingLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  // Flag affichage du bandeau debrief "tu viens de soumettre tes credentials".
  // Provient du redirect 303 emis par /api/phishing/submit/[token].
  const isSubmittedDebrief = sp.submitted === "1";

  // Branche A : token niveau campagne (poster quishing partage par N personnes).
  // Format `qhc_<campaignId>` — un seul PDF, un seul QR.
  const campaignIdFromPoster = parseQuishingCampaignToken(token);
  if (campaignIdFromPoster) {
    return renderQuishingPosterScan(campaignIdFromPoster);
  }

  // Branche B (existante) : trackToken par destinataire (format `phx_<hex>`).
  const result = await db.phishingResult.findUnique({
    where: { trackToken: token },
    include: {
      campaign: {
        include: {
          tenant: {
            select: {
              autoForce2FAAfterPhishingClick: true,
              autoRevokeSessionAfterPhishingClick: true,
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true, mfaEnabled: true } },
    },
  });
  if (!result) notFound();

  // Le canal de la campagne change le ton de la landing : email, SMS ou
  // QR physique (quishing). On charge le template adapte.
  const channel = result.campaign.channel;
  const tpl =
    channel === "QUISHING"
      ? null // quishing utilise QUISHING_TEMPLATES, pas le getTemplate email
      : getTemplate(result.campaign.template);
  const quishingTpl =
    channel === "QUISHING"
      ? QUISHING_TEMPLATES[
          result.campaign.template as keyof typeof QUISHING_TEMPLATES
        ] ?? null
      : null;

  // Trace les remediations auto declenchees pour pouvoir afficher un
  // bandeau d'information honnete a l'user (transparence > surprise).
  const remediationTriggered: string[] = [];

  // -------------------------------------------------------------------
  // Marquage CLICKED + automation (idempotent : on ne fait ca qu'une fois)
  // -------------------------------------------------------------------
  if (result.status === "SENT") {
    await db.phishingResult.update({
      where: { id: result.id },
      data: { status: "CLICKED", clickedAt: new Date() },
    });
    await db.event.create({
      data: {
        tenantId: result.campaign.tenantId,
        userId: result.userId,
        type: "phishing_click",
        payload: { campaignId: result.campaignId },
      },
    });

    // 1) Auto-enrolement dans le mini-module flash adapte au template.
    // On cree une row Progress IN_PROGRESS (si l'episode existe en BDD).
    // Si elle existe déjà (re-clic ou autre), on ne touche pas (preserve
    // un eventuel COMPLETED). Best-effort : un echec ici ne bloque pas
    // l'affichage de la landing.
    if (tpl?.remediationEpisode) {
      try {
        const ep = await db.episode.findFirst({
          where: {
            slug: tpl.remediationEpisode.episodeSlug,
            saison: {
              tenantId: result.campaign.tenantId,
              slug: tpl.remediationEpisode.saisonSlug,
            },
          },
          select: { id: true, saisonId: true },
        });
        if (ep) {
          await db.progress.upsert({
            where: {
              userId_episodeId: { userId: result.userId, episodeId: ep.id },
            },
            update: {}, // ne pas ecraser un COMPLETED existant
            create: {
              tenantId: result.campaign.tenantId,
              userId: result.userId,
              saisonId: ep.saisonId,
              episodeId: ep.id,
              status: "IN_PROGRESS",
              score: 0,
            },
          });
        }
      } catch {
        // best-effort : ne casse pas le flow utilisateur
      }
    }

    // 2) Dispatch webhook temps reel (Slack/Teams admin)
    // Permet l'alerte RSSI en quelques secondes après le clic, et le
    // declenchement de procedures externes (SOAR, ticketing, etc.).
    try {
      await fireWebhook(result.campaign.tenantId, "phishing.user_clicked", {
        userName: result.user.name ?? result.user.email,
        userEmail: result.user.email,
        campaignTitle: result.campaign.title,
        template: result.campaign.template,
        clickedAt: new Date().toISOString(),
        remediationEpisode: tpl?.remediationEpisode
          ? `${tpl.remediationEpisode.saisonSlug}/${tpl.remediationEpisode.episodeSlug}`
          : null,
      });
    } catch {
      // best-effort (cf. fireWebhook déjà fail-safe en interne)
    }

    // Live Mode (v2.0) : trigger une mini-sync CISO Assistant debouncee (5s).
    // Fire-and-forget : ne bloque pas la landing utilisateur.
    triggerCisoLiveSync(result.campaign.tenantId, "phishing.user_clicked");

    // 3) Remediations auto opt-in (configurables /admin/automations).
    // On agit sur l'user pour limiter les degats d'un futur clic reel :
    //   - Force 2FA : marque mfaForced=true si pas déjà configure
    //   - Revoke sessions : deconnecte tous les devices
    // Best-effort : un echec ici ne bloque pas la landing.
    const tenantPolicy = result.campaign.tenant;
    if (tenantPolicy.autoForce2FAAfterPhishingClick && !result.user.mfaEnabled) {
      try {
        await db.user.update({
          where: { id: result.userId },
          data: { mfaForced: true },
        });
        remediationTriggered.push("force_2fa");
      } catch {
        // best-effort
      }
    }
    if (tenantPolicy.autoRevokeSessionAfterPhishingClick) {
      try {
        // Revoque toutes les sessions actives. Au prochain accès,
        // l'user devra se reconnecter (et configurer 2FA si force_2fa
        // est aussi actif).
        await db.session.deleteMany({ where: { userId: result.userId } });
        remediationTriggered.push("revoke_sessions");
      } catch {
        // best-effort
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 animate-fadeIn">
      <div className="card border-2 border-warn">
        <div className="text-center mb-6">
          <div className="text-7xl mb-4">
            {channel === "QUISHING" ? "🔳" : channel === "SMS" ? "📱" : "⚠️"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-warn mb-2">
            {channel === "QUISHING"
              ? "Tu viens de scanner un QR code piégé"
              : channel === "SMS"
                ? "Tu viens de cliquer sur un SMS piégé"
                : "Tu viens de cliquer sur un mail piégé"}
          </h1>
          <p className="text-gray-600">
            Heureusement, c'était un test de sensibilisation Humanix. <br />
            <strong>Aucune donnée n'a été compromise</strong> - mais la
            prochaine fois pourrait être réelle.
          </p>
        </div>

        {/* Bandeau debrief "tu as soumis" : affiche apres redirect 303 du
            endpoint /api/phishing/submit/[token]. Conseille tres explicite
            de changer le vrai mot de passe + active 2FA. */}
        {isSubmittedDebrief && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-5 mb-6"
          >
            <p className="font-bold text-red-900 dark:text-red-200 text-base mb-2 flex items-center gap-2">
              <span aria-hidden="true">🚨</span>
              Tu viens de soumettre tes credentials sur un faux site
            </p>
            <p className="text-sm text-red-800 dark:text-red-300 mb-3 leading-relaxed">
              Pas de panique : c&apos;etait un test, AUCUNE valeur n&apos;a ete
              enregistree (on stocke uniquement les metadonnees : tu as soumis
              X champs dont un mot de passe). Mais si ca avait ete un vrai site
              de phishing, ton mot de passe serait deja entre les mains d&apos;un
              attaquant.
            </p>
            <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-2">
              Reflexes a appliquer maintenant si ce piege etait reel :
            </p>
            <ol className="text-sm text-red-800 dark:text-red-300 list-decimal pl-5 space-y-1">
              <li>Changer ce mot de passe sur le vrai site immediatement</li>
              <li>Le changer aussi sur tout autre site ou il etait reutilise</li>
              <li>Activer la 2FA partout ou c&apos;est possible</li>
              <li>Verifier les connexions recentes / sessions actives</li>
            </ol>
          </div>
        )}

        {/* Bandeau de transparence : si des remediations auto ont ete
            declenchees, on previent honnetement l'user (pas de surprise
            au prochain login). */}
        {remediationTriggered.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 rounded-r-xl p-4 mb-6">
            <p className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-2 flex items-center gap-2">
              <span aria-hidden="true">🔒</span>
              Mesures de protection automatiques appliquées
            </p>
            <ul className="text-xs text-blue-900/85 dark:text-blue-100/85 space-y-1 list-disc pl-5">
              {remediationTriggered.includes("force_2fa") && (
                <li>
                  À ta prochaine connexion, tu devras configurer le{" "}
                  <strong>2FA</strong> (2 minutes, on te guide).
                </li>
              )}
              {remediationTriggered.includes("revoke_sessions") && (
                <li>
                  Tes sessions actives ont été{" "}
                  <strong>déconnectées sur tous tes devices</strong>. Tu
                  devras te reconnecter.
                </li>
              )}
            </ul>
            <p className="text-[11px] text-blue-900/60 dark:text-blue-100/60 italic mt-2">
              Politique de sécurité de ton entreprise — pas une sanction,
              une protection.
            </p>
          </div>
        )}

        <div className="bg-amber-50 border-l-4 border-warn rounded-r-xl p-5 mb-6">
          <p className="font-bold text-amber-900 mb-2">
            {channel === "QUISHING"
              ? "Si ce QR avait été réel, tu aurais peut-être :"
              : channel === "SMS"
                ? "Si ce SMS avait été réel, tu aurais peut-être :"
                : "Si ce mail avait été réel, tu aurais peut-être :"}
          </p>
          <ul className="text-sm text-amber-800 space-y-1.5 list-disc pl-5">
            {channel === "QUISHING" ? (
              <>
                <li>Donné ton login d&apos;entreprise à un attaquant</li>
                <li>Installé un malware via une fausse app proposée</li>
                <li>Saisi tes coordonnées bancaires sur un faux site</li>
                <li>Connecté ton smartphone à un réseau hostile</li>
              </>
            ) : (
              <>
                <li>Donné ton mot de passe à un attaquant</li>
                <li>Installé un malware sur ton poste</li>
                <li>Effectué un virement à un faux fournisseur</li>
                <li>Compromis toute l&apos;entreprise via ta session</li>
              </>
            )}
          </ul>
        </div>

        {/* Bloc pedagogique adapte au canal QUISHING (le bloc tpl email
            est plus bas et ne s'affiche que pour les phishings classiques) */}
        {quishingTpl && (
          <div className="bg-primary-50 border-l-4 border-accent-500 rounded-r-xl p-5 mb-6">
            <h2 className="font-bold text-primary-500 text-lg mb-3">
              💡 Comment tu aurais pu détecter le piège ?
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              Voici les{" "}
              <strong>
                {quishingTpl.pedagogicalMarkers.length} indices
              </strong>{" "}
              que ce QR aurait dû te mettre la puce à l&apos;oreille :
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              {quishingTpl.pedagogicalMarkers.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="bg-accent-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mt-3">
              Contexte de l&apos;attaque : {quishingTpl.context}
            </p>
          </div>
        )}

        {tpl && (
          <>
            <div className="bg-primary-50 border-l-4 border-accent-500 rounded-r-xl p-5 mb-6">
              <h2 className="font-bold text-primary-500 text-lg mb-3">
                💡 Comment tu aurais pu détecter le piège ?
              </h2>
              <p className="text-sm text-gray-700 mb-3">
                Voici les <strong>{tpl.markers.length} indices</strong> que ce
                mail contenait :
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                {tpl.markers.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="bg-accent-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* IA pedagogique : bouton "Demande a Hex" qui appelle Mistral
                pour expliquer un point precis (domaine / spoofing / IOC...)
                adapte au persona de l'user. */}
            <div className="mb-6">
              <AskHexExplain
                topic="phishing_email"
                title="Une question sur ce piège ?"
                suggestions={[
                  "Pourquoi le domaine était suspect ?",
                  "C'est quoi le spoofing ?",
                  "Comment je vérifie un mail à l'avenir ?",
                  "Ça aurait été grave si j'avais saisi mon mot de passe ?",
                ]}
                context={{
                  templateName: tpl.name,
                  redFlags: tpl.markers,
                  fromDomain: tpl.emailFrom,
                }}
              />
            </div>
          </>
        )}

        <div className="bg-success/10 border-l-4 border-success rounded-r-xl p-5 mb-6">
          <h2 className="font-bold text-success text-lg mb-2">
            ✅ Le bon réflexe à adopter
          </h2>
          <p className="text-sm text-gray-700">
            Devant un mail suspect, ne clique jamais. Fais un{" "}
            <strong>signalement</strong> (à ton DSI, à un collègue, ou
            simplement en utilisant la fonction "Signaler" de ta messagerie).
            Mieux vaut signaler 10 mails légitimes par excès que rater 1 vrai
            phishing.
          </p>
        </div>

        {/* FAKE LOGIN FORM : ce que l'apprenant aurait vu sur un VRAI site
            de phishing apres le clic. Affiche uniquement si :
              - pas deja soumis (sinon redondant avec le bandeau debrief en haut)
              - canal email (pas pour QUISHING / SMS qui ont une UX differente)
            Le form POST vers /api/phishing/submit/[token] qui :
              - Capture les METADONNEES (nom/type/longueur) JAMAIS les valeurs
              - Marque PhishingResult.submittedAt + status=SUBMITTED
              - Redirige 303 vers ?submitted=1 (bandeau debrief en haut). */}
        {!isSubmittedDebrief &&
          result.submittedAt === null &&
          channel === "EMAIL" && (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 p-5 mb-6 bg-gray-50 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2">
                🪤 Ce que tu aurais vu apres le clic
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                Sur un vrai site de phishing, tu serais arrive sur une fausse
                page de login (souvent une copie pixel-perfect de Microsoft,
                Google, ta banque...). Tu peux essayer de la soumettre ci-dessous
                pour vivre l&apos;experience -- on capture seulement le geste,
                jamais les valeurs.
              </p>
              <form
                action={`/api/phishing/submit/${token}`}
                method="POST"
                className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 max-w-md mx-auto"
                autoComplete="off"
              >
                <p className="text-center text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">
                  🔐 Connexion securisee
                </p>
                <label
                  htmlFor="fake-email"
                  className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                >
                  Email professionnel
                </label>
                <input
                  type="email"
                  id="fake-email"
                  name="email"
                  required
                  placeholder="prenom.nom@entreprise.fr"
                  autoComplete="off"
                  className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <label
                  htmlFor="fake-password"
                  className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                >
                  Mot de passe
                </label>
                <input
                  type="password"
                  id="fake-password"
                  name="password"
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-2.5 rounded-lg transition"
                >
                  Se connecter
                </button>
                <p className="text-[11px] text-center text-gray-500 mt-3 italic">
                  Aucune valeur n&apos;est enregistree -- on stocke uniquement
                  le geste (nom et longueur du champ, jamais le contenu).
                </p>
              </form>
            </div>
          )}

        {/* CTA PHARE : module flash de remediation auto-assigne.
            On le met en TRES gros pour que l'user clique tout de suite.
            C'est ce qui transforme un "test" en "formation". */}
        {tpl?.remediationEpisode ? (
          <div className="rounded-2xl bg-gradient-to-br from-accent-500 to-primary-500 text-white p-6 mb-6 text-center shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] font-bold mb-2 opacity-90">
              🎯 Module flash {tpl.remediationEpisode.durationMinutes} min
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-2 leading-tight">
              {tpl.remediationEpisode.label}
            </h2>
            <p className="text-sm opacity-90 mb-5 max-w-xl mx-auto">
              On profite que c&apos;est encore frais pour ancrer le bon
              réflexe. {tpl.remediationEpisode.durationMinutes} minutes
              chrono, {tpl.remediationEpisode.label.toLowerCase().includes("éviter") ? "" : "et"} c&apos;est gravé pour la prochaine fois.
            </p>
            <Link
              href={`/apprendre/${tpl.remediationEpisode.saisonSlug}/${tpl.remediationEpisode.episodeSlug}?from=remediation`}
              className="inline-block bg-white text-primary-500 hover:bg-gray-50 font-extrabold px-6 py-3 rounded-xl text-base shadow-lg transition hover:scale-105"
            >
              Faire le module flash maintenant →
            </Link>
            <p className="text-xs opacity-75 mt-3">
              On a déjà ouvert ton parcours, il t&apos;attend.
            </p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Ne te culpabilise pas - <strong>1 personne sur 3 clique</strong>{" "}
              sur ce type de mail. C&apos;est exactement pour ça qu&apos;on
              s&apos;entraîne.
            </p>
            <Link href="/apprendre" className="btn-primary">
              Aller renforcer mes réflexes →
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 italic">
          Tu peux aussi explorer{" "}
          <Link href="/apprendre" className="underline hover:text-accent-500">
            l&apos;ensemble du parcours
          </Link>{" "}
          quand tu veux. 1 personne sur 3 clique sur ce type de mail — c&apos;est
          exactement pour ça qu&apos;on s&apos;entraîne.
        </p>
      </div>

      <p className="text-xs text-center text-gray-500 italic mt-6">
        Test effectué dans le cadre du programme de sensibilisation cyber de ton
        entreprise.
        <br />
        Aucun usage disciplinaire de ce résultat - c'est un exercice
        pédagogique.
      </p>
    </div>
  );
}

// ===========================================================================
// QUISHING POSTER SCAN (token niveau campagne, format qhc_<campaignId>)
// ===========================================================================

/**
 * Rendu de la landing quand le QR scanne provient d'un POSTER PHYSIQUE
 * (1 seul QR pour toute la campagne). 3 cas :
 *
 *   1. Scanneur authentifie ET cible de la campagne (a une PhishingResult)
 *      → redirect vers /phishing/<son_trackToken> pour avoir le flow
 *        complet personnalise (auto-enrollement remediation, webhook, etc.)
 *
 *   2. Scanneur authentifie mais PAS cible (collegue curieux, RSSI qui
 *      teste)
 *      → on log un event "anonymous_scan" et on affiche le debrief
 *        pedagogique generique du template, sans attribution
 *
 *   3. Scanneur non authentifie
 *      → idem cas 2 : debrief pedagogique generique + CTA connexion pour
 *        qui veut faire le module de remediation associe
 */
async function renderQuishingPosterScan(campaignId: string) {
  const campaign = await db.phishingCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      tenantId: true,
      template: true,
      channel: true,
      isActive: true,
    },
  });
  if (!campaign || campaign.channel !== "QUISHING") notFound();

  const session = await auth();
  const userId = session?.user?.id;

  // Cas 1 : utilisateur authentifie + il a une PhishingResult sur cette
  // campagne → on redirige vers son trackToken pour le flow complet.
  if (userId) {
    const userResult = await db.phishingResult.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { trackToken: true },
    });
    if (userResult) {
      redirect(`/phishing/${userResult.trackToken}`);
    }
  }

  // Cas 2 + 3 : scan anonyme (ou utilisateur non-cible).
  // On log l'evenement pour les stats campagne + on affiche le debrief.
  await db.event
    .create({
      data: {
        tenantId: campaign.tenantId,
        userId: userId ?? null,
        type: "quishing_poster_scan_anonymous",
        payload: { campaignId },
      },
    })
    .catch(() => {
      /* best-effort */
    });

  const quishingTpl =
    QUISHING_TEMPLATES[campaign.template as QuishingTemplate] ?? null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      <div className="text-center mb-8">
        <p className="text-5xl mb-3" aria-hidden="true">
          🔳
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-3">
          Tu viens de scanner une affiche piège
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
          Pas de panique : c&apos;est un exercice de sensibilisation interne.
          Aucune donnée n&apos;a été collectée, aucun fichier téléchargé.
        </p>
      </div>

      {quishingTpl && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/50 p-5 mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-300 mb-2">
            Pourquoi ce piège fonctionne
          </p>
          <h2 className="font-display text-lg font-extrabold text-amber-900 dark:text-amber-200 mb-3">
            {quishingTpl.name}
          </h2>
          <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
            {quishingTpl.pedagogicalMarkers.map((m, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-300 shrink-0">
                  •
                </span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/50 p-5 mb-6">
        <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
          <strong>La règle d&apos;or :</strong> ne scanne jamais un QR code que
          tu n&apos;attendais pas, surtout s&apos;il est imprimé sur papier
          dans un lieu public. Vérifie la source par un autre canal avant
          d&apos;agir.
        </p>
      </div>

      {!userId && (
        <div className="text-center">
          <Link
            href="/connexion"
            className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl"
          >
            Me connecter pour suivre le module dédié →
          </Link>
        </div>
      )}

      <p className="text-xs text-center text-gray-500 italic mt-6">
        Test effectué dans le cadre du programme de sensibilisation cyber de
        ton entreprise.
        <br />
        Aucun usage disciplinaire de ce résultat — c&apos;est un exercice
        pédagogique.
      </p>
    </div>
  );
}
