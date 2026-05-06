// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/groupes - gestion des groupes metier (Compta, RH, Dev, etc.)
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import GroupsManager from "@/components/GroupsManager";

export const dynamic = "force-dynamic";

export default async function AdminGroupesPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const groups = await db.group.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { members: true } },
    },
  });

  const data = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    emoji: g.emoji,
    color: g.color,
    description: g.description,
    isSystem: g.isSystem,
    isActive: g.isActive,
    memberCount: g._count.members,
  }));

  return (
    <>
      <AdminPageHeader
        title="Groupes"
        description="Services et équipes pour cibler les campagnes phishing, la formation obligatoire et le reporting."
      />

      <div className="space-y-6 min-w-0">
        <AdminSection
          title="Tous les groupes"
          description={`${data.length} groupe${data.length > 1 ? "s" : ""} configuré${data.length > 1 ? "s" : ""}.`}
        >
          <GroupsManager groups={data} />
        </AdminSection>

        <article className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/15 p-4">
          <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm flex items-center gap-2">
            <span aria-hidden="true">💡</span>
            À quoi servent les groupes ?
          </h3>
          <ul className="text-xs text-blue-900/80 dark:text-blue-200/80 mt-2 leading-relaxed space-y-1 list-disc list-inside">
            <li>
              Cibler une campagne de phishing simulé sur un service précis (ex:
              comptabilité fraude au président).
            </li>
            <li>
              Imposer un module obligatoire à un groupe seulement (ex: RGPD pour
              RH).
            </li>
            <li>
              Segmenter le reporting RSSI / NIS2 par direction.
            </li>
            <li>
              Un utilisateur peut appartenir à plusieurs groupes.
            </li>
          </ul>
        </article>
      </div>
    </>
  );
}
