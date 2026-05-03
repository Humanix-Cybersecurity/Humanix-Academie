// Admin > API Keys : gestion des cles d'acces public
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import ApiKeysManager from "@/components/ApiKeysManager";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;

  const plan = await getTenantPlan(tenantId);

  // Gate : API REST = Essentielle+
  if (!planHasFeature(plan, "api")) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
        <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
        <AdminNav />
        <div className="mt-8">
          <PlanGate feature="api" currentPlan={plan} requiredPlan={FEATURE_MIN_PLAN.api} />
        </div>
      </div>
    );
  }

  const keys = await db.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>

      <AdminNav />

      <h2 className="text-2xl font-bold text-primary-500 mb-4">🔑 Clés d'API publique</h2>
      <p className="text-gray-600 mb-6">
        Permets à ton MSP, ton RSSI externalisé, ou ton tableau de bord interne de récupérer les données Humanix en lecture seule via l'API REST.
      </p>

      <ApiKeysManager
        keys={keys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          scopes: k.scopes,
          isActive: k.isActive,
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          expiresAt: k.expiresAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }))}
      />

      <div className="card mt-8 bg-primary-50 border-primary-500/20">
        <h3 className="font-bold text-primary-500 mb-3">📚 Endpoints disponibles</h3>
        <p className="text-sm text-gray-700 mb-4">
          Tous les endpoints nécessitent l'en-tête{" "}
          <code className="bg-white px-2 py-0.5 rounded">Authorization: Bearer hxa_...</code>
        </p>
        <div className="space-y-2 text-sm font-mono">
          <Endpoint method="GET" path="/api/v1/users" desc="Liste des collaborateurs (id, email, nom, service, niveau...)" />
          <Endpoint method="GET" path="/api/v1/progress" desc="Progressions (filtres optionnels : userId, status)" />
          <Endpoint method="GET" path="/api/v1/saisons" desc="Catalogue actif pour ton tenant" />
          <Endpoint method="GET" path="/api/v1/conformity-score" desc="Score de conformité agrégé en temps réel" />
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-primary-500">Exemple cURL</summary>
          <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
{`curl -H "Authorization: Bearer hxa_xxxxxxxx" \\
  http://localhost:3000/api/v1/conformity-score`}
          </pre>
        </details>
      </div>

      <div className="card mt-4 bg-amber-50 border-amber-200">
        <h3 className="font-bold text-amber-900 mb-2">🔒 Sécurité</h3>
        <ul className="text-sm text-amber-800 space-y-1 list-disc pl-5">
          <li>Les clés sont hashées en SHA-256 dans la BDD — la valeur en clair n'est affichée qu'une seule fois.</li>
          <li>Mode lecture seule par défaut — pas de risque de modification accidentelle.</li>
          <li>Révoque immédiatement une clé compromise via le bouton "Révoquer".</li>
          <li>Recommandation : 1 clé par intégration externe, expiration 90 jours.</li>
        </ul>
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-lg p-2">
      <span className="text-xs font-bold bg-success text-white px-2 py-0.5 rounded">{method}</span>
      <span className="text-primary-500 font-medium">{path}</span>
      <span className="text-gray-600 font-sans flex-1">— {desc}</span>
    </div>
  );
}
