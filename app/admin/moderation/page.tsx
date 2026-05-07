// SPDX-License-Identifier: AGPL-3.0-or-later
// File de moderation SUPERADMIN
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ModerationActions from "@/components/marketplace/ModerationActions";
import { shortHash } from "@/lib/marketplace/integrity";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const session = await auth();
  const role = session!.user.role;
  if (role !== "SUPERADMIN") redirect("/admin");

  const queue = await db.marketplaceModule.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { author: { select: { name: true, email: true } } },
    orderBy: { submittedAt: "asc" },
  });
  const recent = await db.marketplaceModule.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { reviewedAt: "desc" },
    take: 10,
    include: {
      author: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return (
    <>
      <AdminPageHeader
        title="Modération marketplace"
        description="En tant que SUPERADMIN, tu valides ou rejettes les soumissions communauté avant publication."
      />

      <div className="space-y-6 min-w-0">
        <article className="rounded-xl border border-primary-500/20 bg-primary-50/40 dark:bg-blue-900/10 p-5">
          <h3 className="font-bold text-primary-500 mb-2">
            📋 Critères d'approbation
          </h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
            <li>
              Exactitude technique : pas d'information cyber erronée ou
              dangereuse
            </li>
            <li>
              Pédagogie : scénario crédible, choix clairs, débrief apportant de
              la valeur
            </li>
            <li>
              Pas de marketing produit déguisé / pas de promotion de marque
            </li>
            <li>Pas de propos discriminatoires, biaisés ou caricaturaux</li>
            <li>
              Respect du format : longueurs respectées, pas de contenu hors
              sujet
            </li>
            <li>
              Originalité : contenu original ou cité avec référence claire
            </li>
          </ul>
        </article>

        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          🕒 En attente ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <div className="card text-center py-8 text-gray-400 italic">
            Aucun module en attente. Bonne tasse de café ☕.
          </div>
        ) : (
          <div className="space-y-3 mb-10">
            {queue.map((m) => (
              <div key={m.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-primary-500">{m.title}</h4>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {m.category}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {m.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {m.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      Par <strong>{m.author.name ?? m.author.email}</strong>
                      {m.authorOrgName && <> · {m.authorOrgName}</>}
                      <br />
                      Soumis {m.submittedAt?.toLocaleDateString("fr-FR")} ·{" "}
                      {m.submittedAt?.toLocaleTimeString("fr-FR")}
                      <br />
                      SHA-256 :{" "}
                      <code className="font-mono">
                        {shortHash(m.contentHash)}
                      </code>
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center">
                  <Link
                    href={`/admin/moderation/${m.id}`}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    📖 Examiner le contenu complet
                  </Link>
                  <ModerationActions moduleId={m.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-xl font-bold text-primary-500 mb-3">
          🗄️ Historique récent
        </h3>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Historique recent des modules marketplace moderes : nom,
              auteur, statut (publie/refuse/en attente), moderateur ayant
              traite, date de la decision
            </caption>
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="pb-3">Module</th>
                <th className="pb-3">Auteur</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3">Modéré par</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">
                    {m.emoji} {m.title}
                  </td>
                  <td className="py-3 text-gray-600 text-xs">
                    {m.author.name ?? m.author.email}
                  </td>
                  <td className="py-3">
                    {m.status === "APPROVED" ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        APPROUVÉ
                      </span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                        REFUSÉ
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {m.reviewedBy?.name ?? "—"}
                  </td>
                  <td className="py-3 text-gray-400 text-xs">
                    {m.reviewedAt?.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && (
            <p className="text-center text-gray-400 italic py-4">
              Pas encore d'historique.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
