// Admin > Utilisateurs : activer/desactiver, role, suppression RGPD, invitation
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import UsersTable from "@/components/UsersTable";
import InviteUserForm from "@/components/InviteUserForm";
import CsvImporter from "@/components/CsvImporter";
import RemindersButton from "@/components/RemindersButton";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;
  const currentUserId = (session.user as any).id as string;

  const users = await db.user.findMany({
    where: { tenantId },
    include: {
      progress: { select: { score: true, status: true, completedAt: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const totalEpisodes = await db.episode.count({ where: { isPublished: true } });

  const enriched = users.map((u) => {
    const completed = u.progress.filter((p) => p.status === "COMPLETED").length;
    const xp = u.progress.reduce((s, p) => s + (p.score || 0), 0);
    const lastActivity = u.progress
      .map((p) => p.completedAt)
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
    return {
      id: u.id,
      name: u.name ?? u.email.split("@")[0],
      email: u.email,
      role: u.role,
      service: u.service,
      isActive: u.isActive,
      isCurrent: u.id === currentUserId,
      coins: u.coins,
      completed,
      totalEpisodes,
      xp,
      lastActivity: lastActivity ? formatRelative(lastActivity) : null,
    };
  });

  const activeCount = enriched.filter((u) => u.isActive).length;
  const adminCount = enriched.filter((u) => u.role === "ADMIN" || u.role === "SUPERADMIN").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>

      <AdminNav />

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Utilisateurs" value={enriched.length.toString()} />
        <Stat label="Actifs" value={activeCount.toString()} />
        <Stat label="Suspendus" value={(enriched.length - activeCount).toString()} />
        <Stat label="Admins" value={adminCount.toString()} />
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="card">
          <h2 className="font-bold text-primary-500 text-lg mb-4">Tous mes collaborateurs</h2>
          <UsersTable users={enriched} />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-bold text-primary-500 text-lg mb-2">Inviter un collaborateur</h2>
            <p className="text-sm text-gray-500 mb-4">
              Le nouvel utilisateur pourra se connecter via magic link (mode prod) ou via la console démo.
            </p>
            <InviteUserForm />
          </div>

          <div className="card">
            <h2 className="font-bold text-primary-500 text-lg mb-2">📥 Import CSV en masse</h2>
            <p className="text-sm text-gray-500 mb-4">
              Onboarde toute ton équipe en 30 secondes : importe un CSV d'emails, le système crée tous les comptes d'un coup.
            </p>
            <CsvImporter />
          </div>

          <div className="card">
            <h2 className="font-bold text-primary-500 text-lg mb-2">✉️ Rappels aux inactifs</h2>
            <RemindersButton />
          </div>

          <div className="card bg-amber-50 border-amber-200">
            <h3 className="font-bold text-amber-900 mb-2">⚖️ Conformité RGPD</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              La suppression d'un utilisateur efface toutes ses données (progression, événements). Une trace agrégée et anonymisée est conservée pour la conformité (preuve de formation suivie).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-extrabold text-primary-500 mt-1">{value}</p>
    </div>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - new Date(date).getTime()) / 3600_000;
  if (diffH < 1) return "il y a < 1h";
  if (diffH < 24) return `il y a ${Math.round(diffH)}h`;
  const diffD = diffH / 24;
  if (diffD < 7) return `il y a ${Math.round(diffD)}j`;
  return new Date(date).toLocaleDateString("fr-FR");
}
