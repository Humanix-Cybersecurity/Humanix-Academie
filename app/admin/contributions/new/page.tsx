// Creation d'un nouveau module marketplace
import Link from "next/link";
import ModuleEditor from "@/components/marketplace/ModuleEditor";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function NewContributionPage() {
  return (
    <>
      <AdminPageHeader
        title="Nouveau module"
        description="Construis ton module pas à pas. Tu peux sauvegarder en brouillon à tout moment."
        actions={
          <Link
            href="/admin/contributions"
            className="text-sm text-gray-500 hover:text-primary-500 dark:hover:text-accent-300"
          >
            ← Retour aux contributions
          </Link>
        }
      />
      <ModuleEditor mode="create" />
    </>
  );
}
