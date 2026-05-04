// Creation d'une nouvelle anecdote (SUPERADMIN).
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AnecdoteEditor from "@/components/AnecdoteEditor";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function NewAnecdotePage() {
  const session = await auth();
  const role = session!.user.role;
  if (role !== "SUPERADMIN") redirect("/admin");

  return (
    <>
      <AdminPageHeader
        title="Nouvelle anecdote"
        description="Une bonne anecdote = un fait, une leçon, une action concrète."
        actions={
          <Link href="/admin/anecdotes" className="text-sm text-gray-500 hover:text-primary-500 dark:hover:text-accent-300">
            ← Retour aux anecdotes
          </Link>
        }
      />
      <AdminSection>
        <AnecdoteEditor initial={{}} isEdit={false} />
      </AdminSection>
    </>
  );
}
