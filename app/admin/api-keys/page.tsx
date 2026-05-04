// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/api-keys — Gestion des clés API publiques (Essentielle+).
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ApiKeysManager from "@/components/ApiKeysManager";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "api")) {
    return (
      <>
        <AdminPageHeader
          title="Clés d'API"
          description="Permets à ton MSP, RSSI externalisé ou tableau de bord interne de récupérer les données Humanix en lecture via l'API REST."
        />
        <PlanGate
          feature="api"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.api}
        />
      </>
    );
  }

  const keys = await db.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminPageHeader
        title="Clés d'API"
        description="Permets à ton MSP, RSSI externalisé ou tableau de bord interne de récupérer les données Humanix en lecture via l'API REST."
      />

      <div className="space-y-6 min-w-0">
        <AdminSection
          title="Mes clés"
          description="Mode lecture seule par défaut. Révoque immédiatement toute clé compromise."
        >
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
        </AdminSection>

        {/* Endpoints disponibles */}
        <AdminSection
          title="Endpoints disponibles"
          description="Tous nécessitent l'en-tête Authorization: Bearer hxa_..."
        >
          <div className="space-y-2 text-sm font-mono">
            <Endpoint
              method="GET"
              path="/api/v1/users"
              desc="Liste des collaborateurs (id, email, nom, service, niveau)"
            />
            <Endpoint
              method="GET"
              path="/api/v1/progress"
              desc="Progressions (filtres optionnels : userId, status)"
            />
            <Endpoint
              method="GET"
              path="/api/v1/saisons"
              desc="Catalogue actif pour ton tenant"
            />
            <Endpoint
              method="GET"
              path="/api/v1/conformity-score"
              desc="Score de conformité agrégé en temps réel"
            />
          </div>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-primary-500 dark:text-accent-300">
              Exemple cURL
            </summary>
            <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
              {`curl -H "Authorization: Bearer hxa_xxxxxxxx" \\
  http://localhost:3000/api/v1/conformity-score`}
            </pre>
          </details>
        </AdminSection>

        {/* Sécurité — variant warning */}
        <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
          <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
            <span aria-hidden="true">🔒</span>
            Bonnes pratiques sécurité
          </h3>
          <ul className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 space-y-1 list-disc pl-5 leading-relaxed">
            <li>
              Les clés sont hashées en SHA-256 — la valeur en clair n'est
              affichée qu'une seule fois à la création.
            </li>
            <li>
              Mode lecture seule par défaut — pas de risque de modification
              accidentelle.
            </li>
            <li>Révoque immédiatement toute clé compromise.</li>
            <li>
              Recommandation&nbsp;: 1 clé par intégration externe, expiration 90
              jours.
            </li>
          </ul>
        </article>
      </div>
    </>
  );
}

function Endpoint({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2 bg-gray-50/60 dark:bg-slate-800/40 rounded-lg p-2">
      <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded shrink-0">
        {method}
      </span>
      <span className="text-primary-500 dark:text-accent-300 font-medium">
        {path}
      </span>
      <span className="text-gray-600 dark:text-gray-400 font-sans flex-1">
        — {desc}
      </span>
    </div>
  );
}
