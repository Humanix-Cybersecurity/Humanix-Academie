// Console SUPERADMIN : gestion des anecdotes hebdomadaires.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import AnecdoteAdminTable from "@/components/AnecdoteAdminTable";
import { seedAnecdotesFormAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAnecdotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500 dark:text-accent-300">
        📅 Cyber-Anecdote du Lundi
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Pilotage de la newsletter hebdomadaire. Réservé SUPERADMIN.
      </p>

      <AdminNav />

      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Kpi label="Abonnés actifs" value={subscribersCount} emoji="📬" />
        <Kpi label="Anecdotes en file d'attente" value={draftCount} emoji="📝" />
        <Kpi
          label="Total publiées"
          value={anecdotes.filter((a) => a.publishedAt).length}
          emoji="✅"
        />
      </div>

      {/* Pre-seed action */}
      {anecdotes.length === 0 && (
        <div className="card mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-300">
          <h2 className="font-bold text-amber-800 dark:text-amber-200 mb-2">
            🚀 Aucune anecdote n'existe encore
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            Importez les 6 anecdotes pré-rédigées (incidents français 2018-2024)
            pour démarrer la newsletter immédiatement.
          </p>
          <form action={seedAnecdotesFormAction}>
            <button type="submit" className="btn-primary text-sm">
              📥 Importer 6 anecdotes pré-rédigées
            </button>
          </form>
        </div>
      )}

      {/* Actions globales */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link href="/admin/anecdotes/new" className="btn-primary text-sm">
          ➕ Nouvelle anecdote
        </Link>
        <Link href="/anecdotes" target="_blank" className="btn-secondary text-sm">
          🔗 Voir la page publique
        </Link>
      </div>

      {/* Liste */}
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
  );
}

function Kpi({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="card text-center">
      <div className="text-3xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <div className="text-3xl font-extrabold text-primary-500 dark:text-accent-300">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
