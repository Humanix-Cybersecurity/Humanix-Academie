// Edition d'une anecdote existante (SUPERADMIN).
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AnecdoteEditor from "@/components/AnecdoteEditor";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

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
  const role = session!.user.role;
  if (role !== "SUPERADMIN") redirect("/admin");

  const { id } = await params;
  const a = await db.weeklyAnecdote.findUnique({ where: { id } });
  if (!a) notFound();

  const description = a.publishedAt
    ? `Envoyée le ${a.publishedAt.toLocaleDateString("fr-FR")} — les modifications n'affecteront pas l'email déjà envoyé.`
    : "Brouillon non envoyé.";

  return (
    <>
      <AdminPageHeader
        title={`Édition : ${a.title}`}
        description={description}
        actions={
          <Link
            href="/admin/anecdotes"
            className="text-sm text-gray-500 hover:text-primary-500 dark:hover:text-accent-300"
          >
            ← Retour aux anecdotes
          </Link>
        }
      />
      <AdminSection>
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
      </AdminSection>
    </>
  );
}
