// SPDX-License-Identifier: AGPL-3.0-or-later
// Edition / detail d'un module en brouillon
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ModuleEditor from "@/components/marketplace/ModuleEditor";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function EditContributionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id as string;

  const { id } = await params;
  const module_ = await db.marketplaceModule.findUnique({ where: { id } });
  if (!module_ || module_.authorId !== userId) notFound();

  // L'édition est ouverte sur tous les statuts SAUF PENDING_REVIEW
  // (verrou pendant la modération pour éviter les conflits avec le modérateur).
  // Pour APPROVED : éditer crée une nouvelle version qui retourne en DRAFT
  // puis devra repasser en validation (cf. server action saveDraft).
  const isEditable =
    module_.status === "DRAFT" ||
    module_.status === "REJECTED" ||
    module_.status === "APPROVED";

  return (
    <>
      <AdminPageHeader
        title={module_.title}
        description={`v${module_.version} · ${module_.category}`}
        actions={
          <Link
            href="/admin/contributions"
            className="text-sm text-gray-500 hover:text-primary-500 dark:hover:text-accent-300"
          >
            ← Mes contributions
          </Link>
        }
      />

      <div className="space-y-4 min-w-0">
        {module_.status === "PENDING_REVIEW" && (
          <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>En attente de modération</strong> - l'édition est
              temporairement verrouillée pour éviter les conflits avec le
              modérateur. Tu reçois une notification dès qu'un modérateur a
              tranché.
            </p>
          </article>
        )}

        {module_.status === "APPROVED" && (
          <article className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/15 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
              <strong>Module publié - édition autorisée</strong>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Tes modifications créeront une nouvelle version (le numéro de
              patch sera incrémenté automatiquement) qui devra repasser en
              validation par un modérateur. Pendant ce temps, le module sera
              temporairement retiré du marketplace public, mais les
              organisations qui l'ont déjà installé gardent leur copie en cours.
            </p>
          </article>
        )}

        {module_.status === "REJECTED" && module_.rejectionReason && (
          <article className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/15 p-4">
            <p className="text-sm text-rose-800 dark:text-rose-200 mb-1">
              <strong>Module refusé.</strong> Motif&nbsp;:{" "}
              {module_.rejectionReason}
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              Tu peux corriger et resoumettre.
            </p>
          </article>
        )}

        <ModuleEditor
          mode={isEditable ? "edit" : "view"}
          moduleId={module_.id}
          initialData={{
            slug: module_.slug,
            title: module_.title,
            description: module_.description,
            emoji: module_.emoji,
            category: module_.category,
            difficulty: module_.difficulty as "easy" | "medium" | "hard",
            language: module_.language as "fr",
            authorOrgName: module_.authorOrgName ?? "",
            license: module_.license as "CC_BY" | "CC_BY_SA",
            payload: module_.payload as any,
          }}
          currentStatus={module_.status}
        />
      </div>
    </>
  );
}
