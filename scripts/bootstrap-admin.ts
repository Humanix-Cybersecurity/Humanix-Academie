// SPDX-License-Identifier: AGPL-3.0-or-later
// Bootstrap du premier administrateur.
//
// Pourquoi ce script :
// Le système refuse les inscriptions ouvertes par design (SSO et magic link
// exigent un compte pré-existant). Sans seed ni bootstrap, une instance fraîche
// serait inaccessible. Ce script crée un tenant + un user SUPERADMIN au
// premier boot SI la base est vierge ET que les variables d'env sont fournies.
//
// Variables d'env :
//   BOOTSTRAP_ADMIN_EMAIL     (requis) email du premier administrateur
//   BOOTSTRAP_ADMIN_PASSWORD  (optionnel) mot de passe initial
//                             si absent, l'admin se connectera par magic link
//   BOOTSTRAP_ADMIN_NAME      (optionnel) nom affiché, défaut "Administrateur"
//   BOOTSTRAP_ADMIN_ROLE      (optionnel) rôle assigné au premier user.
//                             Valeurs : SUPERADMIN | ADMIN | RSSI | MANAGER.
//                             Défaut : SUPERADMIN (le tout-premier compte d'une
//                             instance fraîche doit pouvoir tout administrer,
//                             y compris cross-tenant pour les exploitants
//                             SaaS).
//   BOOTSTRAP_TENANT_NAME     (optionnel) nom de l'organisation, défaut "Mon organisation"
//   BOOTSTRAP_TENANT_SLUG     (optionnel) slug, défaut "default"
//
// Idempotence :
// Le script ne fait rien si :
//   - BOOTSTRAP_ADMIN_EMAIL n'est pas fourni
//   - DEMO_MODE=true (le seed se charge des comptes de démo)
//
// Si la base contient déjà des utilisateurs MAIS qu'un user avec l'email
// BOOTSTRAP_ADMIN_EMAIL existe avec un rôle INFÉRIEUR à BOOTSTRAP_ADMIN_ROLE,
// le script le PROMEUT au rôle demandé. Ça permet de corriger après-coup un
// déploiement qui aurait initialement provisionné un ADMIN au lieu d'un
// SUPERADMIN, ou de promouvoir manuellement sans toucher à la DB.

import { PrismaClient } from "@prisma/client";
import {
  hashPassword,
  validatePasswordPolicy,
} from "../lib/password";
import {
  parseBootstrapRole,
  shouldPromote,
} from "../lib/admin/bootstrap-role";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? "Administrateur";
  const role = parseBootstrapRole(process.env.BOOTSTRAP_ADMIN_ROLE);
  const tenantName = process.env.BOOTSTRAP_TENANT_NAME ?? "Mon organisation";
  const tenantSlug = (
    process.env.BOOTSTRAP_TENANT_SLUG ?? "default"
  )
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  if (process.env.DEMO_MODE === "true") {
    console.log(
      "  bootstrap-admin: DEMO_MODE=true, skip (le seed gère les comptes démo)",
    );
    return;
  }
  if (!email) {
    console.log(
      "  bootstrap-admin: BOOTSTRAP_ADMIN_EMAIL absent, skip (la base reste vierge tant qu'un admin n'est pas défini)",
    );
    return;
  }
  if (!email.includes("@")) {
    throw new Error(
      `BOOTSTRAP_ADMIN_EMAIL invalide : "${email}". Attendu : un email valide.`,
    );
  }

  // 1) Cas "user déjà présent avec cet email" : on PROMEUT son rôle si
  //    nécessaire. C'est la voie de réparation pour les déploiements
  //    initialement provisionnés en ADMIN qui doivent passer en SUPERADMIN.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true },
  });
  if (existing) {
    if (shouldPromote(existing.role, role)) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role },
      });
      console.log(
        `  bootstrap-admin: ${email} promu de ${existing.role} → ${role}`,
      );
    } else {
      console.log(
        `  bootstrap-admin: ${email} existe déjà avec rôle ${existing.role} (>= ${role}), skip`,
      );
    }
    return;
  }

  // 2) Cas "base non vierge mais email inconnu" : on ne crée rien (le
  //    bootstrap ne doit pas injecter un user dans un environnement déjà
  //    administré).
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(
      `  bootstrap-admin: ${userCount} utilisateur(s) déjà en base et ${email} introuvable, skip (utilise la console admin pour ajouter ce compte)`,
    );
    return;
  }

  // 3) Cas nominal : base vierge, on crée tenant + user.
  let passwordHash: string | null = null;
  if (password) {
    const policy = validatePasswordPolicy(password);
    if (!policy.ok) {
      throw new Error(
        `BOOTSTRAP_ADMIN_PASSWORD trop faible : ${policy.reason}`,
      );
    }
    passwordHash = hashPassword(password);
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { slug: tenantSlug, name: tenantName, plan: "pro" },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      tenantId: tenant.id,
      passwordHash,
      passwordUpdatedAt: passwordHash ? new Date() : null,
      // Les admins bootstrap sont considérés pré-vérifiés (l'opérateur a la
      // main sur l'env, on ne va pas exiger qu'il clique un magic link en plus).
      emailVerified: new Date(),
    },
  });

  // Groupes système par défaut pour ce tenant tout neuf
  const SYSTEM_GROUPS = [
    { slug: "direction", name: "Direction", emoji: "🎯", color: "#0B3D91" },
    { slug: "compta", name: "Comptabilité", emoji: "🧮", color: "#10B981" },
    { slug: "rh", name: "Ressources humaines", emoji: "👥", color: "#F59E0B" },
    { slug: "dev", name: "Développement", emoji: "💻", color: "#6366F1" },
    { slug: "commercial", name: "Commercial", emoji: "💼", color: "#EC4899" },
    { slug: "it", name: "IT / SI", emoji: "⚙️", color: "#0EA5E9" },
    { slug: "atelier", name: "Atelier / Production", emoji: "🏭", color: "#A855F7" },
    { slug: "communication", name: "Communication", emoji: "🎨", color: "#EF4444" },
    { slug: "agents", name: "Agents", emoji: "👤", color: "#64748B" },
  ];
  for (const g of SYSTEM_GROUPS) {
    await prisma.group.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: g.slug } },
      update: {},
      create: { tenantId: tenant.id, isSystem: true, ...g },
    });
  }

  console.log(`  bootstrap-admin: créé ${email} (${role}) pour ${tenant.name}`);
  if (!passwordHash) {
    console.log(
      "  bootstrap-admin: aucun mot de passe défini, l'admin doit se connecter par magic link (Scaleway TEM) ou SSO",
    );
  } else {
    console.log(
      "  bootstrap-admin: mot de passe initial défini, recommandation : le changer immédiatement après première connexion",
    );
  }
  void user;
}

main()
  .catch((err) => {
    console.error("bootstrap-admin a échoué :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
