// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue marketplace public — visible par tout admin connecte
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALLOWED_CATEGORIES } from "@/lib/marketplace/schema";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = session.user!.tenantId as string;

  const { source, category } = await searchParams;

  const modules = await db.marketplaceModule.findMany({
    where: {
      status: "APPROVED",
      ...(source === "official" ? { isOfficial: true } : {}),
      ...(source === "community" ? { isOfficial: false } : {}),
      ...(category ? { category } : {}),
    },
    include: {
      author: { select: { name: true, email: true } },
    },
    orderBy: [
      { isOfficial: "desc" },
      { installCount: "desc" },
      { createdAt: "desc" },
    ],
  });

  const installations = await db.marketplaceInstallation.findMany({
    where: { tenantId, isActive: true },
    select: { moduleId: true },
  });
  const installedSet = new Set(installations.map((i) => i.moduleId));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fadeIn">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500">
            🛒 Marketplace
          </h1>
          <p className="text-gray-600 mt-1">
            Catalogue de modules de sensibilisation cyber — éditeur officiel +
            contributions communauté.
          </p>
        </div>
        <Link
          href="/admin/contributions"
          className="btn-secondary text-sm py-2 px-4"
        >
          ✍️ Mes contributions
        </Link>
      </div>

      {/* Bandeau securite */}
      <div className="card mb-6 bg-primary-50 border-primary-500/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🛡️</span>
          <div className="text-sm text-gray-700">
            <p className="font-bold text-primary-500 mb-1">
              Engagement de sécurité
            </p>
            <p>
              Chaque module est <strong>modéré humainement</strong> avant
              publication, avec une signature SHA-256 du contenu pour garantir
              son intégrité. Les modules ne contiennent{" "}
              <strong>aucun code exécutable</strong>, uniquement du texte
              structuré validé.{" "}
              <Link
                href="/marketplace/security"
                className="text-accent-500 underline"
              >
                En savoir plus
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterTab
          label="Tous"
          href="/marketplace"
          active={!source && !category}
        />
        <FilterTab
          label="🏢 Officiels Humanix"
          href="/marketplace?source=official"
          active={source === "official"}
        />
        <FilterTab
          label="🌍 Communauté"
          href="/marketplace?source=community"
          active={source === "community"}
        />
      </div>
      <div className="flex flex-wrap gap-2 mb-8 text-xs">
        {ALLOWED_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/marketplace?category=${c}`}
            className={`px-3 py-1 rounded-full border ${
              category === c
                ? "bg-accent-500 text-white border-accent-500"
                : "bg-white border-gray-200 hover:border-accent-500"
            }`}
          >
            {c}
          </Link>
        ))}
        {category && (
          <Link
            href="/marketplace"
            className="px-3 py-1 rounded-full text-gray-500 hover:text-warn"
          >
            ✕ retirer
          </Link>
        )}
      </div>

      {modules.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-gray-500">
            Aucun module ne correspond à ces filtres.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => {
            const installed = installedSet.has(m.id);
            return (
              <Link
                key={m.id}
                href={`/marketplace/${m.slug}`}
                className="card hover:scale-[1.02] hover:shadow-lg transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-5xl">{m.emoji}</span>
                  <div className="flex flex-col items-end gap-1">
                    {m.isOfficial ? (
                      <span className="text-[10px] font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full">
                        ✓ OFFICIEL
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        🌍 COMMUNAUTÉ
                      </span>
                    )}
                    {installed && (
                      <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full">
                        INSTALLÉ
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-primary-500 text-lg mb-1">
                  {m.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-2">
                  {m.description}
                </p>
                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    <span className="font-medium text-gray-700">
                      {m.author.name ?? m.author.email.split("@")[0]}
                    </span>
                    {m.authorOrgName && <span> · {m.authorOrgName}</span>}
                  </span>
                  <span>📥 {m.installCount}</span>
                </div>
                <div className="flex gap-2 mt-2 text-[10px]">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                    {m.category}
                  </span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                    {m.difficulty}
                  </span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                    {m.language.toUpperCase()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
        active
          ? "bg-primary-500 text-white border-primary-500"
          : "bg-white border-gray-200 hover:border-primary-500"
      }`}
    >
      {label}
    </Link>
  );
}
