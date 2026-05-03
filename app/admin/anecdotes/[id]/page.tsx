// Edition d'une anecdote existante (SUPERADMIN).

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import AnecdoteEditor from "@/components/AnecdoteEditor";

export const dynamic = "force-dynamic";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditAnecdotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "SUPERADMIN") redirect("/admin");

  const { id } = await params;
  const a = await db.weeklyAnecdote.findUnique({ where: { id } });
  if (!a) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Link href="/admin/anecdotes" className="hover:underline">
          ← Retour aux anecdotes
        </Link>
      </div>
      <h1 className="text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
        ✏ Édition : {a.title}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {a.publishedAt
          ? `Déjà envoyée le ${a.publishedAt.toLocaleDateString("fr-FR")}. Les modifications n'affecteront pas l'email déjà envoyé.`
          : "Brouillon non envoyé."}
      </p>

      <AdminNav />

      <div className="card mt-8">
        <AnecdoteEditor
          initial={{
            id: a.id,
            slug: a.slug,
            title: a.title,
            summary: a.summary,
            lesson: a.lesson,
            miniAction: a.miniAction,
            sourceUrl: a.sourceUrl,
            sourceLabel: a.sourceLabel,
            category: a.category,
            incidentDate: toDateInput(a.incidentDate),
            scheduledFor: a.scheduledFor ? toDateInput(a.scheduledFor) : null,
            isActive: a.isActive,
          }}
          isEdit={true}
        />
      </div>
    </div>
  );
}
