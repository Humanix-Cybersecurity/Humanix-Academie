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

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/phishing";
import { fireWebhook } from "@/lib/webhooks/dispatcher";
import AskHexExplain from "@/components/AskHexExplain";

export const dynamic = "force-dynamic";

export default async function PhishingLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await db.phishingResult.findUnique({
    where: { trackToken: token },
    include: { campaign: true, user: true },
  });
  if (!result) notFound();

  const tpl = getTemplate(result.campaign.template);

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
    // Si elle existe deja (re-clic ou autre), on ne touche pas (preserve
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
    // Permet l'alerte RSSI en quelques secondes apres le clic, et le
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
      // best-effort (cf. fireWebhook deja fail-safe en interne)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 animate-fadeIn">
      <div className="card border-2 border-warn">
        <div className="text-center mb-6">
          <div className="text-7xl mb-4">⚠️</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-warn mb-2">
            Tu viens de cliquer sur un mail piégé
          </h1>
          <p className="text-gray-600">
            Heureusement, c'était un test de sensibilisation Humanix. <br />
            <strong>Aucune donnée n'a été compromise</strong> - mais la
            prochaine fois pourrait être réelle.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-warn rounded-r-xl p-5 mb-6">
          <p className="font-bold text-amber-900 mb-2">
            Si ce mail avait été réel, tu aurais peut-être :
          </p>
          <ul className="text-sm text-amber-800 space-y-1.5 list-disc pl-5">
            <li>Donné ton mot de passe à un attaquant</li>
            <li>Installé un malware sur ton poste</li>
            <li>Effectué un virement à un faux fournisseur</li>
            <li>Compromis toute l'entreprise via ta session</li>
          </ul>
        </div>

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

      <p className="text-xs text-center text-gray-400 italic mt-6">
        Test effectué dans le cadre du programme de sensibilisation cyber de ton
        entreprise.
        <br />
        Aucun usage disciplinaire de ce résultat - c'est un exercice
        pédagogique.
      </p>
    </div>
  );
}
