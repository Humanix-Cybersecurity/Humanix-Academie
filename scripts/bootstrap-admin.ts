// SPDX-License-Identifier: AGPL-3.0-or-later
// Bootstrap du premier administrateur.
//
// Pourquoi ce script :
// Le systeme refuse les inscriptions ouvertes par design (SSO et magic link
// exigent un compte pre-existant). Sans seed ni bootstrap, une instance fraiche
// serait inaccessible. Ce script cree un tenant + un user ADMIN au premier
// boot SI la base est vierge ET que les variables d'env sont fournies.
//
// Variables d'env :
//   BOOTSTRAP_ADMIN_EMAIL     (requis) email du premier administrateur
//   BOOTSTRAP_ADMIN_PASSWORD  (optionnel) mot de passe initial
//                             si absent, l'admin se connectera par magic link
//   BOOTSTRAP_ADMIN_NAME      (optionnel) nom affiche, defaut "Administrateur"
//   BOOTSTRAP_TENANT_NAME     (optionnel) nom de l'organisation, defaut "Mon organisation"
//   BOOTSTRAP_TENANT_SLUG     (optionnel) slug, defaut "default"
//
// Idempotence :
// Le script ne fait rien si :
//   - la table User contient deja >=1 entree (la base n'est pas vierge)
//   - BOOTSTRAP_ADMIN_EMAIL n'est pas fourni
//   - DEMO_MODE=true (le seed se charge des comptes de demo)

import { PrismaClient, Role } from "@prisma/client";
import {
  hashPassword,
  validatePasswordPolicy,
} from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? "Administrateur";
  const tenantName = process.env.BOOTSTRAP_TENANT_NAME ?? "Mon organisation";
  const tenantSlug = (
    process.env.BOOTSTRAP_TENANT_SLUG ?? "default"
  )
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  if (process.env.DEMO_MODE === "true") {
    console.log(
      "  bootstrap-admin: DEMO_MODE=true, skip (le seed gere les comptes demo)",
    );
    return;
  }
  if (!email) {
    console.log(
      "  bootstrap-admin: BOOTSTRAP_ADMIN_EMAIL absent, skip (la base reste vierge tant qu'un admin n'est pas defini)",
    );
    return;
  }
  if (!email.includes("@")) {
    throw new Error(
      `BOOTSTRAP_ADMIN_EMAIL invalide : "${email}". Attendu : un email valide.`,
    );
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(
      `  bootstrap-admin: ${userCount} utilisateur(s) deja en base, skip (le bootstrap ne joue qu'une fois)`,
    );
    return;
  }

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
      role: Role.ADMIN,
      tenantId: tenant.id,
      passwordHash,
      passwordUpdatedAt: passwordHash ? new Date() : null,
      // Les admins bootstrap sont consideres pre-verifies (l'operateur a la
      // main sur l'env, on ne va pas exiger qu'il clique un magic link en plus).
      emailVerified: new Date(),
    },
  });

  // Groupes systeme par defaut pour ce tenant tout neuf
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

  console.log(`  bootstrap-admin: cree ${email} (ADMIN) pour ${tenant.name}`);
  if (!passwordHash) {
    console.log(
      "  bootstrap-admin: aucun mot de passe defini, l'admin doit se connecter par magic link (Scaleway TEM) ou SSO",
    );
  } else {
    console.log(
      "  bootstrap-admin: mot de passe initial defini, recommandation : le changer immediatement apres premiere connexion",
    );
  }
  void user;
}

main()
  .catch((err) => {
    console.error("bootstrap-admin a echoue :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
