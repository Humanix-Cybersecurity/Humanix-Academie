// SPDX-License-Identifier: AGPL-3.0-or-later
// Landing pedagogique smishing : "Tu as clique sur un SMS piege - voici pourquoi"
// Equivalent de /phishing/[token] mais cible smishing (canal SMS).
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SmishingLandingPage({
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
  // Sécurité : on n'affiche cette landing que pour les campagnes SMS.
  // Si quelqu'un essaie de re-utiliser un token email phishing ici, on
  // renvoie sur la landing email (route /phishing/[token]).
  if (result.campaign.channel !== "SMS") notFound();

  // Marque comme clique (idempotent)
  if (result.status === "SENT") {
    await db.phishingResult.update({
      where: { id: result.id },
      data: { status: "CLICKED", clickedAt: new Date() },
    });
    await db.event.create({
      data: {
        tenantId: result.campaign.tenantId,
        userId: result.userId,
        type: "smishing_click",
        payload: { campaignId: result.campaignId },
      },
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 animate-fadeIn">
      <div className="card border-2 border-warn">
        <div className="text-center mb-6">
          <div className="text-7xl mb-4">📱</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-warn mb-2">
            Tu viens de cliquer sur un SMS piégé
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Heureusement, c&apos;était un test de sensibilisation Humanix.
            <br />
            <strong>Aucune donnée n&apos;a été compromise.</strong>
          </p>
        </div>

        <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-amber-900 dark:text-amber-200 mb-2">
            ⚠️ Ce qui aurait pu arriver
          </h2>
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Sur un vrai SMS frauduleux, le lien aurait pu :
          </p>
          <ul className="text-sm text-amber-900 dark:text-amber-100 mt-2 space-y-1 list-disc list-inside">
            <li>
              T&apos;emmener vers un faux portail (banque, livreur, impôts…)
              imitant à la perfection le vrai
            </li>
            <li>
              Te demander tes identifiants ou ton numéro de carte sous prétexte
              de « validation »
            </li>
            <li>
              Installer un malware si tu as téléchargé un fichier (ex: faux APK
              de mise à jour)
            </li>
            <li>
              Initier un appel vishing en parallèle pour récupérer ton code 2FA
            </li>
          </ul>
        </section>

        <section className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">
            ✓ Les bons réflexes face à un SMS douteux
          </h2>
          <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1 list-disc list-inside">
            <li>
              <strong>Ne clique jamais</strong> sur un lien dans un SMS, même
              s&apos;il semble venir d&apos;un service que tu connais
            </li>
            <li>
              Vérifie en passant par l&apos;application officielle (banque,
              Chronopost, impots.gouv.fr) ou en tapant directement l&apos;URL
              dans ton navigateur
            </li>
            <li>
              Si le SMS demande une action urgente, méfie-toi : c&apos;est
              presque toujours un signal d&apos;arnaque
            </li>
            <li>
              Signale les SMS suspects au <strong>33700</strong> (numéro
              gratuit Signal Spam) en transférant le SMS et le numéro
              expéditeur
            </li>
          </ul>
        </section>

        <div className="text-center">
          <Link
            href="/apprendre"
            className="btn-primary inline-block text-sm"
          >
            Approfondir avec un module Humanix →
          </Link>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center mt-6">
          Test envoyé le{" "}
          {result.sentAt
            ? new Date(result.sentAt).toLocaleDateString("fr-FR")
            : "—"}{" "}
          dans le cadre du programme Humanix Académie de votre organisation.
        </p>
      </div>
    </div>
  );
}
