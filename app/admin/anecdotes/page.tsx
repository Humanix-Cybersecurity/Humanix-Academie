// =============================================================================
// /admin/anecdotes — Pilotage de la Cyber-Anecdote du Lundi (SUPERADMIN).
// REFONTE MAI 2026 : design system Linear (PageHeader, Section).
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AnecdoteAdminTable from "@/components/AnecdoteAdminTable";
import { seedAnecdotesFormAction } from "./actions";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminAnecdotesPage() {
  // Auth garantie par layout, mais SUPERADMIN-only -> check spécifique
  const session = await auth();
  const role = session!.user.role;
  if (role !== "SUPERADMIN") redirect("/admin");

  const [anecdotes, subscribersCount, draftCount] = await Promise.all([
    db.weeklyAnecdote.findMany({
      orderBy: [
        { publishedAt: "desc" },
        { scheduledFor: "asc" },
        { incidentDate: "desc" },
      ],
      take: 50,
    }),
    db.anecdoteSubscription.count({ where: { isActive: true } }),
    db.weeklyAnecdote.count({
      where: { isActive: true, publishedAt: null },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Cyber-Anecdote du Lundi"
        description="Pilotage de la newsletter hebdomadaire (incidents français commentés)."
        actions={
          <>
            <Link
              href="/admin/anecdotes/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2 text-sm transition"
            >
              <span aria-hidden="true">➕</span> Nouvelle anecdote
            </Link>
            <Link
              href="/anecdotes"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-accent-500 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 text-sm transition"
            >
              <span aria-hidden="true">🔗</span> Voir la page publique
            </Link>
          </>
        }
      />

      <div className="space-y-6 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Kpi label="Abonnés actifs" value={subscribersCount} icon="📬" />
          <Kpi label="En file d'attente" value={draftCount} icon="📝" />
          <Kpi
            label="Total publiées"
            value={anecdotes.filter((a) => a.publishedAt).length}
            icon="✅"
            accent="emerald"
          />
        </div>

        {anecdotes.length === 0 && (
          <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-5">
            <h2 className="font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <span aria-hidden="true">🚀</span>
              Aucune anecdote n'existe encore
            </h2>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mb-3 leading-relaxed">
              Importez les 6 anecdotes pré-rédigées (incidents français
              2018-2024) pour démarrer la newsletter immédiatement.
            </p>
            <form action={seedAnecdotesFormAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 text-sm transition"
              >
                <span aria-hidden="true">📥</span> Importer 6 anecdotes
                pré-rédigées
              </button>
            </form>
          </article>
        )}

        <AnecdoteAdminTable
          anecdotes={anecdotes.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            category: a.category,
            isActive: a.isActive,
            publishedAt: a.publishedAt?.toISOString() ?? null,
            scheduledFor: a.scheduledFor?.toISOString() ?? null,
            sentCount: a.sentCount,
            incidentDate: a.incidentDate.toISOString(),
          }))}
        />
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: string;
  accent?: "emerald" | "amber";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-gray-900 dark:text-gray-100";
  return (
    <article className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0 flex items-center gap-3">
      <span
        className="shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-base"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
          {label}
        </p>
        <p className={`text-2xl font-extrabold tabular-nums ${accentClass}`}>
          {value}
        </p>
      </div>
    </article>
  );
}
