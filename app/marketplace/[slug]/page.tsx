// SPDX-License-Identifier: AGPL-3.0-or-later
// Page detail d'un module marketplace
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shortHash } from "@/lib/marketplace/integrity";
import type { ModulePayload } from "@/lib/marketplace/schema";
import InstallButton from "@/components/marketplace/InstallButton";

export const dynamic = "force-dynamic";

const LICENSE_LABEL: Record<string, string> = {
  CC_BY: "CC-BY (Attribution)",
  CC_BY_SA: "CC-BY-SA (Attribution + Partage)",
  PROPRIETARY: "Propriétaire Humanix",
};

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = session.user!.tenantId as string;

  const { slug } = await params;
  const module_ = await db.marketplaceModule.findUnique({
    where: { slug },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!module_ || module_.status !== "APPROVED") notFound();

  const installation = await db.marketplaceInstallation.findUnique({
    where: { tenantId_moduleId: { tenantId, moduleId: module_.id } },
  });
  const isInstalled = installation?.isActive ?? false;

  const payload = module_.payload as unknown as ModulePayload;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fadeIn">
      <Link
        href="/marketplace"
        className="text-sm text-gray-500 hover:text-primary-500 mb-4 inline-block"
      >
        ← Retour au catalogue
      </Link>

      <div className="card mb-6">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="text-7xl">{module_.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {module_.isOfficial ? (
                <span className="text-xs font-bold bg-primary-500 text-white px-2 py-1 rounded-full">
                  ✓ OFFICIEL HUMANIX
                </span>
              ) : (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  🌍 CONTRIBUTION COMMUNAUTÉ
                </span>
              )}
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                {module_.category}
              </span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                {module_.difficulty}
              </span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                {module_.language.toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-primary-500 mb-2">
              {module_.title}
            </h1>
            <p className="text-gray-700 leading-relaxed">
              {module_.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="card mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold text-primary-500">
              {payload.episodes.length} épisode
              {payload.episodes.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-gray-500">
              ~{payload.episodes.reduce((s, e) => s + e.durationMinutes, 0)}{" "}
              minutes au total
            </p>
          </div>
          <InstallButton moduleId={module_.id} isInstalled={isInstalled} />
        </div>
      </div>

      {/* Liste des episodes */}
      <h2 className="text-xl font-bold text-primary-500 mb-3">
        📚 Aperçu des épisodes
      </h2>
      <div className="space-y-3 mb-8">
        {payload.episodes.map((ep, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-accent-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <h3 className="font-bold text-primary-500 flex-1">{ep.title}</h3>
              <span className="text-xs text-gray-500">
                ~{ep.durationMinutes} min
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {ep.scenario.slice(0, 200)}…
            </p>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>{ep.choices.length} choix</span>
              <span>•</span>
              <span>{ep.quiz.length} questions de quiz</span>
              <span>•</span>
              <span className="text-accent-500 font-bold">
                +{ep.xpReward} XP
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Auteur + integrite */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold text-primary-500 text-sm uppercase tracking-wide mb-3">
            Auteur
          </h3>
          <p className="font-bold">
            {module_.author.name ?? module_.author.email.split("@")[0]}
          </p>
          {module_.authorOrgName && (
            <p className="text-sm text-gray-600">{module_.authorOrgName}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Soumis le {module_.submittedAt?.toLocaleDateString("fr-FR")}
            <br />
            Approuvé le {module_.reviewedAt?.toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="card">
          <h3 className="font-bold text-primary-500 text-sm uppercase tracking-wide mb-3">
            Intégrité & licence
          </h3>
          <p className="text-sm">
            Version <strong>{module_.version}</strong>
          </p>
          <p className="text-xs font-mono text-gray-600 break-all">
            SHA-256 : {shortHash(module_.contentHash)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {LICENSE_LABEL[module_.license] ?? module_.license}
          </p>
          <p className="text-xs text-gray-500">
            📥 Installé par {module_.installCount} organisation
            {module_.installCount > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
