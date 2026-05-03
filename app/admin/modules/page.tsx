// Admin > Modules : activer/desactiver, reordonner, marquer obligatoire
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import ModulesTable from "@/components/ModulesTable";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;

  // Multi-tenant : saisons globales + custom du tenant courant
  const [saisons, configs] = await Promise.all([
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
      orderBy: { order: "asc" },
      include: { episodes: { where: { isPublished: true } } },
    }),
    db.tenantSaisonConfig.findMany({ where: { tenantId } }),
  ]);

  const configBySaison = new Map(configs.map((c) => [c.saisonId, c]));

  // Enrichi avec config tenant + tri par ordre effectif
  const enriched = saisons
    .map((s) => {
      const cfg = configBySaison.get(s.id);
      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        coverEmoji: s.coverEmoji,
        baseOrder: s.order,
        episodesCount: s.episodes.length,
        isActive: cfg?.isActive ?? true,
        isMandatory: cfg?.isMandatory ?? false,
        customOrder: cfg?.customOrder ?? null,
      };
    })
    .sort((a, b) => (a.customOrder ?? a.baseOrder) - (b.customOrder ?? b.baseOrder));

  const activeCount = enriched.filter((s) => s.isActive).length;
  const mandatoryCount = enriched.filter((s) => s.isMandatory).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>

      <AdminNav />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Modules totaux" value={enriched.length.toString()} />
        <Stat label="Actifs pour mes équipes" value={activeCount.toString()} />
        <Stat label="Obligatoires" value={mandatoryCount.toString()} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-primary-500 text-lg">Catalogue des modules</h2>
            <p className="text-sm text-gray-500">
              Active uniquement ce qui est pertinent pour ta PME. L'ordre détermine la séquence d'apprentissage proposée à tes équipes.
            </p>
          </div>
        </div>

        <ModulesTable saisons={enriched} />
      </div>

      <div className="mt-6 card bg-primary-50 border-primary-500/20">
        <h3 className="font-bold text-primary-500 mb-2">💡 Bonnes pratiques</h3>
        <ul className="text-sm text-gray-700 space-y-1.5 list-disc pl-5">
          <li>Active 2 à 3 modules au démarrage pour éviter la surcharge cognitive.</li>
          <li>Marque comme <strong>obligatoires</strong> les modules critiques (phishing, mots de passe).</li>
          <li>Réorganise l'ordre selon tes priorités : commence par ce qui rapporte le plus vite (phishing).</li>
          <li>Tu peux désactiver un module à tout moment sans perdre la progression des collaborateurs (elle est conservée).</li>
        </ul>
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
