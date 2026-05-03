// Creation d'un nouveau module marketplace
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import ModuleEditor from "@/components/marketplace/ModuleEditor";

export const dynamic = "force-dynamic";

export default async function NewContributionPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
      <AdminNav />

      <h2 className="text-2xl font-bold text-primary-500 mb-2">✍️ Nouveau module</h2>
      <p className="text-gray-600 text-sm mb-6">
        Construis ton module pas à pas. Tu peux sauvegarder en brouillon à tout moment.
      </p>

      <ModuleEditor mode="create" />
    </div>
  );
}
