// Mes contributions au marketplace
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-700" },
  PENDING_REVIEW: { label: "En attente de modération", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "✓ Publié", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Refusé", className: "bg-red-100 text-red-700" },
  DEPRECATED: { label: "Déprécié", className: "bg-gray-200 text-gray-500" },
};

export default async function ContributionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const userId = (session.user as any).id as string;

  const modules = await db.marketplaceModule.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
      <AdminNav />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-500">✍️ Mes contributions</h2>
          <p className="text-gray-600 text-sm">Crée et partage des modules avec la communauté Humanix.</p>
        </div>
        <Link href="/admin/contributions/new" className="btn-primary text-sm py-2 px-4">
          + Nouveau module
        </Link>
      </div>

      <div className="card mb-6 bg-amber-50 border-amber-300">
        <h3 className="font-bold text-amber-900 mb-2">📜 Engagement contributeur</h3>
        <p className="text-sm text-amber-800 leading-relaxed">
          En soumettant un module, tu acceptes la <Link href="/marketplace/security" className="underline">charte de contribution</Link> :
          contenu original ou cité, pas de propos discriminatoires, pas de promotion produit, exactitude technique.
          Chaque module est <strong>modéré humainement</strong> avant publication.
          Maximum <strong>5 soumissions par 24h</strong>.
        </p>
      </div>

      {modules.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-5xl mb-3">📝</p>
          <p className="text-gray-500 mb-4">Tu n'as pas encore créé de module.</p>
          <Link href="/admin/contributions/new" className="btn-primary">Créer mon premier module →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => {
            const badge = STATUS_BADGE[m.status];
            return (
              <Link
                key={m.id}
                href={`/admin/contributions/${m.id}`}
                className="card hover:shadow-md transition flex items-center gap-4"
              >
                <div className="text-4xl">{m.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-primary-500">{m.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{m.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    v{m.version} · {m.category} · maj {m.updatedAt.toLocaleDateString("fr-FR")}
                  </p>
                  {m.status === "REJECTED" && m.rejectionReason && (
                    <p className="text-xs text-warn mt-1 italic">Motif refus : {m.rejectionReason}</p>
                  )}
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
