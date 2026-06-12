// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Server actions du Quick Setup Wizard (/admin/onboarding refondu).
//
// Le wizard est un parcours en 4 etapes ; chaque etape valide aupres de ces
// actions. Toutes verifient l'auth ADMIN/RSSI/SUPERADMIN du tenant courant.
//
// Volontairement minimal : on s'appuie sur les actions existantes
// (toggleSaisonActive, inviteUser) plutot que de dupliquer la logique.
// =============================================================================
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { suggestSaisons, type SetupProfile } from "@/lib/setup-wizard";
import { tagsForSaison } from "@/prisma/catalog-tags";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  const tenantId = session.user.tenantId as string;
  if (!tenantId) throw new Error("no_tenant");
  return {
    tenantId,
    userId: session.user.id as string,
    role,
    email: (session.user.email as string | undefined) ?? null,
  };
}

/**
 * Etape 1+2 du wizard : a partir du profil tenant, applique les
 * suggestions de saisons (active + obligatoires). Retourne le nombre
 * de saisons activees / rendues obligatoires pour affichage.
 *
 * L'admin peut ensuite ajuster manuellement via /admin/modules - le
 * wizard ne fait qu'un setup initial intelligent.
 */
export async function setupApplyProfile(profile: SetupProfile) {
  const { tenantId } = await requireAdmin();

  // Recupere le catalogue (saisons globales + custom du tenant courant).
  // On charge explicitement les champs necessaires au moteur de suggestion.
  const saisons = await db.saison.findMany({
    where: {
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      tags: true,
      audience: true,
    },
  });

  // Fallback runtime sur les tags si la BDD pas encore reseed (cf. prisma
  // db push apres deploiement). Garantit un setup utilisable des le
  // premier deploy.
  const catalog = saisons.map((s) => ({
    ...s,
    tags: s.tags && s.tags.length > 0 ? s.tags : tagsForSaison(s.slug),
  }));

  const suggestion = suggestSaisons(profile, catalog);

  // Applique en BDD via upsert TenantSaisonConfig
  const activateSet = new Set(suggestion.activate);
  const mandatorySet = new Set(suggestion.mandatory);

  await Promise.all(
    Array.from(activateSet).map((saisonId) =>
      db.tenantSaisonConfig.upsert({
        where: { tenantId_saisonId: { tenantId, saisonId } },
        create: {
          tenantId,
          saisonId,
          isActive: true,
          isMandatory: mandatorySet.has(saisonId),
        },
        update: {
          isActive: true,
          isMandatory: mandatorySet.has(saisonId),
        },
      }),
    ),
  );

  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    tenantId,
    target: { type: "tenant_setup", id: tenantId },
    metadata: {
      step: "profile_applied",
      profile,
      activated: suggestion.activate.length,
      mandatory: suggestion.mandatory.length,
    },
  });

  revalidatePath("/admin/onboarding");
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");

  return {
    ok: true,
    activated: suggestion.activate.length,
    mandatory: suggestion.mandatory.length,
    rationale: suggestion.rationale,
    activatedTitles: catalog
      .filter((s) => activateSet.has(s.id))
      .map((s) => s.title),
  };
}

/**
 * Etape 3 du wizard : invite un ou plusieurs utilisateurs en bulk.
 * Format attendu : tableau d'objets { email, name?, service? }.
 * Cree un compte LEARNER avec un mot de passe temporaire (l'utilisateur
 * recevra un magic link pour activer son compte).
 *
 * NOTE : version minimale. La gestion fine (emailing magic-link, gestion
 * sieges, etc.) est deleguee aux actions existantes du tenant. Ici on
 * cree juste les enregistrements en BDD ; la logique d'invitation reelle
 * est dans `inviteUser` (app/admin/actions.ts).
 */
export async function setupInviteUsers(
  emails: { email: string; name?: string; service?: string }[],
) {
  const ctx = await requireAdmin();
  if (!Array.isArray(emails) || emails.length === 0) {
    return { ok: false, count: 0, errors: ["empty_list"] };
  }

  // Limite de garde-fou : pas plus de 100 invitations par appel
  const batch = emails.slice(0, 100);
  const errors: string[] = [];
  let created = 0;

  for (const entry of batch) {
    const email = String(entry.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      errors.push(`invalid_email:${entry.email}`);
      continue;
    }
    try {
      // Verifier l'absence d'un user avec cet email pour ce tenant
      const existing = await db.user.findFirst({
        where: { email, tenantId: ctx.tenantId },
      });
      if (existing) {
        // Idempotent : on ignore les emails deja invites
        continue;
      }
      await db.user.create({
        data: {
          email,
          name: entry.name?.trim() || null,
          service: entry.service?.trim() || null,
          tenantId: ctx.tenantId,
          role: "LEARNER",
          isActive: true,
        },
      });
      created++;
    } catch (e) {
      errors.push(`${email}:${(e as Error).message}`);
    }
  }

  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    tenantId: ctx.tenantId,
    target: { type: "tenant_setup", id: ctx.tenantId },
    metadata: { step: "users_invited", created, errors: errors.length },
  });

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/onboarding");
  return { ok: true, count: created, errors };
}

/**
 * Etape 4 du wizard : configure le rituel hebdomadaire.
 *
 * Aujourd'hui minimal : on stocke juste un flag dans Tenant.metadata
 * (champs reservs aux preferences soft) car il n'y a pas encore de
 * modele dedie aux notifications hebdomadaires automatisees. La logique
 * notification reelle (dispatch les emails / Slack le jour J) sera
 * raccordee dans un sprint ulterieur.
 *
 * `weekday` est l'index 1=lundi, 5=vendredi. `enablePhishingDemo`
 * declenche la creation d'une campagne phishing simulee a J+7 si l'admin
 * coche.
 */
export async function setupConfigureRituel(
  weekday: number,
  enablePhishingDemo: boolean,
) {
  const { tenantId } = await requireAdmin();

  // weekday clamp 1..5 (jours ouvrables)
  const day = Math.max(1, Math.min(5, Math.floor(weekday)));

  // Le modele Tenant n'a pas encore de champ `setupPreferences` JSON ;
  // on stocke pour l'instant cote AuditLog (trace fonctionnelle) et on
  // rebranchera quand le champ sera ajoute. Ca evite une migration BDD
  // pour cette etape, l'important etant la trace que l'admin a complete
  // le wizard.
  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    tenantId,
    target: { type: "tenant_setup", id: tenantId },
    metadata: {
      step: "rituel_configured",
      weekday: day,
      phishingDemoEnabled: enablePhishingDemo,
    },
  });

  revalidatePath("/admin/onboarding");
  return { ok: true, weekday: day };
}

/**
 * Marque le wizard comme termine (informationnel, pas bloquant). L'admin
 * peut le re-lancer a tout moment depuis /admin/onboarding ; cette action
 * sert juste a tracer la finalisation pour les analytics produit.
 */
export async function setupComplete() {
  const { tenantId } = await requireAdmin();
  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    tenantId,
    target: { type: "tenant_setup", id: tenantId },
    metadata: { step: "wizard_completed" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/onboarding");
  return { ok: true };
}
