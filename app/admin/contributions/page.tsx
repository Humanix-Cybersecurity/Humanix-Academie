// Mes contributions au marketplace
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

const STATUS_LEVEL: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  DRAFT:           "neutral",
  PENDING_REVIEW:  "warning",
  APPROVED:        "success",
  REJECTED:        "danger",
  DEPRECATED:      "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:          "Brouillon",
  PENDING_REVIEW: "En modération",
  APPROVED:       "Publié",
  REJECTED:       "Refusé",
  DEPRECATED:     "Déprécié",
};

export default async function ContributionsPage() {
  const session = await auth();
  const userId = session!.user.id as string;

  const modules = await db.marketplaceModule.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <AdminPageHeader
        title="Mes contributions"
        description="Crée et partage des modules pédagogiques avec la communauté Humanix."
        actions={
          <Link href="/admin/contributions/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2 text-sm transition">
            <span aria-hidden="true">➕</span> Nouveau module
          </Link>
        }
      />

      <div className="space-y-6 min-w-0">
        {/* Engagement contributeur */}
        <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
          <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
            <span aria-hidden="true">📜</span>
            Engagement contributeur
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 leading-relaxed">
            En soumettant un module, tu acceptes la <Link href="/marketplace/security" className="underline">charte de contribution</Link> :
            contenu original ou cité, pas de propos discriminatoires, pas de promotion produit, exactitude technique.
            Chaque module est <strong>modéré humainement</strong> avant publication. Maximum <strong>5 soumissions par 24h</strong>.
          </p>
        </article>

        {modules.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Tu n'as pas encore créé de module"
            description="Partage ton expertise avec la communauté Humanix."
            cta={
              <Link href="/admin/contributions/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2 text-sm transition">
                Créer mon premier module →
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2 list-none">
            {modules.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/contributions/${m.id}`}
                  className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-4 hover:shadow-sm hover:border-accent-500/50 transition"
                >
                  <span className="text-3xl shrink-0" aria-hidden="true">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{m.title}</h3>
                      <StatusBadge level={STATUS_LEVEL[m.status]} pill>{STATUS_LABEL[m.status]}</StatusBadge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">{m.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      v{m.version} · {m.category} · maj {m.updatedAt.toLocaleDateString("fr-FR")}
                    </p>
                    {m.status === "REJECTED" && m.rejectionReason && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 italic">Motif refus : {m.rejectionReason}</p>
                    )}
                  </div>
                  <span className="text-gray-400 shrink-0" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
