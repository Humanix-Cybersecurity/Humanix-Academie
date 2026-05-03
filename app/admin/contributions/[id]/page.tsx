// Edition / detail d'un module en brouillon
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import ModuleEditor from "@/components/marketplace/ModuleEditor";

export const dynamic = "force-dynamic";

export default async function EditContributionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const userId = (session.user as any).id as string;

  const { id } = await params;
  const module_ = await db.marketplaceModule.findUnique({ where: { id } });
  if (!module_ || module_.authorId !== userId) notFound();

  const isEditable = module_.status === "DRAFT" || module_.status === "REJECTED";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
      <AdminNav />

      <Link href="/admin/contributions" className="text-sm text-gray-500 hover:text-primary-500 mb-3 inline-block">
        ← Mes contributions
      </Link>

      {!isEditable && (
        <div className="card mb-4 bg-amber-50 border-amber-300">
          <p className="text-sm text-amber-900">
            <strong>{module_.status === "PENDING_REVIEW" ? "En attente de modération" : "Module publié"}</strong> —
            l'édition est verrouillée.
            {module_.status === "PENDING_REVIEW" && " Tu reçois une notification dès qu'un modérateur a tranché."}
          </p>
        </div>
      )}

      {module_.status === "REJECTED" && module_.rejectionReason && (
        <div className="card mb-4 bg-red-50 border-red-300">
          <p className="text-sm text-red-900 mb-2">
            <strong>Module refusé.</strong> Motif : {module_.rejectionReason}
          </p>
          <p className="text-xs text-red-700">Tu peux corriger et resoumettre.</p>
        </div>
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
  );
}
