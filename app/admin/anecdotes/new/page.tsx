// Creation d'une nouvelle anecdote (SUPERADMIN).

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import AnecdoteEditor from "@/components/AnecdoteEditor";

export const dynamic = "force-dynamic";

export default async function NewAnecdotePage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "SUPERADMIN") redirect("/admin");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Link href="/admin/anecdotes" className="hover:underline">
          ← Retour aux anecdotes
        </Link>
      </div>
      <h1 className="text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
        ➕ Nouvelle anecdote
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Une bonne anecdote = un fait, une leçon, une action concrète.
      </p>

      <AdminNav />

      <div className="card mt-8">
        <AnecdoteEditor initial={{}} isEdit={false} />
      </div>
    </div>
  );
}
