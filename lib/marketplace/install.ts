// Logique d'installation d'un module marketplace pour un tenant.
// Cree une Saison "tenant-scopee" + ses Episodes a partir du payload.
// SERVER-ONLY (utilise db).
import { db } from "@/lib/db";
import type { ModulePayload } from "@/lib/marketplace/schema";

/**
 * Installe un module sur un tenant donne.
 * - Verifie que le module est APPROVED
 * - Verifie que le tenant ne l'a pas deja installe
 * - Cree une Saison scope au tenant + ses Episodes
 * - Cree une Installation
 * - Cree un TenantSaisonConfig actif
 * - Loggue l'operation dans Event
 *
 * Idempotent : si deja installe, retourne l'installation existante.
 */
export async function installModule(opts: {
  tenantId: string;
  moduleId: string;
  installedById: string;
}) {
  const { tenantId, moduleId, installedById } = opts;

  const module_ = await db.marketplaceModule.findUnique({
    where: { id: moduleId },
  });
  if (!module_) throw new Error("module_not_found");
  if (module_.status !== "APPROVED") throw new Error("module_not_approved");

  const existing = await db.marketplaceInstallation.findUnique({
    where: { tenantId_moduleId: { tenantId, moduleId } },
  });
  if (existing && existing.isActive) {
    return { ok: true, installationId: existing.id, alreadyInstalled: true };
  }

  const payload = module_.payload as unknown as ModulePayload;
  const saisonSlug = `mkt-${module_.slug}-${tenantId.slice(-6)}`;

  // Transaction : tout ou rien
  const result = await db.$transaction(async (tx) => {
    // Saison clonee (tenant-scope)
    const saison = await tx.saison.create({
      data: {
        slug: saisonSlug,
        title: module_.title,
        description: module_.description,
        coverEmoji: module_.emoji,
        order: 100, // Modules marketplace apres les saisons officielles par defaut
        isPublished: true,
        tenantId,
        sourceModuleId: module_.id,
      },
    });

    // Episodes cloines
    for (let i = 0; i < payload.episodes.length; i++) {
      const ep = payload.episodes[i];
      await tx.episode.create({
        data: {
          saisonId: saison.id,
          slug: `ep-${i + 1}`,
          title: ep.title,
          durationMinutes: ep.durationMinutes,
          order: i + 1,
          xpReward: ep.xpReward ?? 50,
          coinsReward: 10,
          isPublished: true,
        },
      });
    }

    // Installation
    const installation = await tx.marketplaceInstallation.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      update: { saisonId: saison.id, installedById, isActive: true },
      create: { tenantId, moduleId, saisonId: saison.id, installedById, isActive: true },
    });

    // TenantSaisonConfig actif
    await tx.tenantSaisonConfig.create({
      data: { tenantId, saisonId: saison.id, isActive: true },
    });

    // Compteur global
    await tx.marketplaceModule.update({
      where: { id: moduleId },
      data: { installCount: { increment: 1 } },
    });

    // Audit
    await tx.event.create({
      data: {
        tenantId,
        userId: installedById,
        type: "marketplace_install",
        payload: {
          moduleId,
          moduleSlug: module_.slug,
          saisonId: saison.id,
          contentHash: module_.contentHash,
        },
      },
    });

    return { saison, installation };
  });

  return { ok: true, installationId: result.installation.id, saisonId: result.saison.id };
}

/**
 * Desinstalle un module : desactive la saison clonee.
 * On NE supprime PAS la saison ni les progressions des apprenants
 * (preuve de formation conservee, conformite RGPD).
 */
export async function uninstallModule(opts: {
  tenantId: string;
  moduleId: string;
  uninstalledById: string;
}) {
  const { tenantId, moduleId, uninstalledById } = opts;

  const installation = await db.marketplaceInstallation.findUnique({
    where: { tenantId_moduleId: { tenantId, moduleId } },
  });
  if (!installation) throw new Error("not_installed");

  await db.$transaction([
    // Marque l'installation inactive
    db.marketplaceInstallation.update({
      where: { id: installation.id },
      data: { isActive: false },
    }),
    // Desactive la saison via la config tenant
    ...(installation.saisonId
      ? [
          db.tenantSaisonConfig.upsert({
            where: { tenantId_saisonId: { tenantId, saisonId: installation.saisonId } },
            create: { tenantId, saisonId: installation.saisonId, isActive: false },
            update: { isActive: false },
          }),
        ]
      : []),
    // Audit
    db.event.create({
      data: {
        tenantId,
        userId: uninstalledById,
        type: "marketplace_uninstall",
        payload: { moduleId, installationId: installation.id },
      },
    }),
  ]);

  return { ok: true };
}
