// SPDX-License-Identifier: AGPL-3.0-or-later
// Landing pedagogique : "Tu as cliqué sur un mail piège - voici pourquoi"
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/phishing";

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

  // Marque comme cliqué (idempotent)
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
  }

  const tpl = getTemplate(result.campaign.template);

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

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Ne te culpabilise pas - <strong>1 personne sur 3 clique</strong> sur
            ce type de mail. C'est exactement pour ça qu'on s'entraîne.
          </p>
          <Link href="/apprendre" className="btn-primary">
            Aller renforcer mes réflexes →
          </Link>
        </div>
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
