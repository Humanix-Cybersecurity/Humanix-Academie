// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions pour le signup self-service du plan "decouverte" (gratuit
// 5 sieges). Cree un Tenant + un User ADMIN + les groupes systeme par defaut.
//
// Securite :
//  - Rate limit par IP : 5 signups / heure / IP
//  - Honeypot field (champ "website" qui doit rester vide)
//  - Validation Zod-like manuelle (pas d'ajout de dep)
//  - Email unique : on verifie qu'il n'existe pas deja en BDD
//  - Slug tenant unique (collision-safe via suffix random si besoin)
//  - Pas de creation si DEMO_MODE=true (les comptes seedes prennent la place)
//
// Limites V1 (assumees) :
//  - Pas de double opt-in email (trust on signup, comme la plupart des SaaS
//    en B2B). L'utilisateur peut reset son mdp s'il s'est trompe d'email.
//  - Plans autorises a l'ouverture de compte : "decouverte" et "trial".
//    Les autres plans (solo, essentielle, pro, premium) passent par
//    le funnel commercial / paiement, hors scope de ce signup gratuit.
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/password-reset";
import { signIn } from "@/lib/auth";
import type { PlanId } from "@/lib/plans";
import {
  sendWelcomeEmail,
  hasReceivedWelcome,
  logWelcomeSent,
} from "@/lib/welcome-email";
import { auditLog, AuditActions } from "@/lib/audit";

const ALLOWED_SIGNUP_PLANS: PlanId[] = ["decouverte", "trial"];

const ORG_NAME_MIN = 2;
const ORG_NAME_MAX = 100;
const PERSON_NAME_MAX = 100;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

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

export type SignupResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createDecouverteAccount(
  formData: FormData,
): Promise<SignupResult> {
  if (process.env.DEMO_MODE === "true") {
    return {
      ok: false,
      error:
        "Inscription désactivée en mode démo. Utilisez /demo pour explorer.",
    };
  }

  // VERROU PHASE 3 — modèle d'accès 3-layer : un tenant n'est créé QUE
  // pour une organisation qui souscrit un abonnement payant. Les apprenants
  // gratuits passent par /inscription (tenant Communauté, role LEARNER).
  // Les organisations qui veulent un tenant payant passent par
  // /demande-abonnement (manuel pour l'instant, Payplug auto en Phase 3b).
  // Cf. docs/DEPLOYMENT_RUNBOOK.md
  if (process.env.SIGNUP_ALLOW_SELF_SERVICE !== "true") {
    return {
      ok: false,
      error:
        "L'inscription self-service avec création de tenant est désactivée. " +
        "Pour apprendre gratuitement : /inscription. Pour un abonnement entreprise : /demande-abonnement.",
    };
  }

  // ----------------------------
  // 1. Honeypot anti-bot
  // ----------------------------
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot.length > 0) {
    // Bot detecte. On retourne ok=true sans rien creer pour ne pas signaler
    // au bot que son comportement a ete reconnu.
    return { ok: true };
  }

  // ----------------------------
  // 2. Rate limit par IP
  // ----------------------------
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  const rl = checkRateLimit(`signup:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.retryAfter / 60)} minute(s).`,
    };
  }

  // ----------------------------
  // 3. Validation des champs
  // ----------------------------
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const orgName = String(formData.get("orgName") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const consent = formData.get("consent");
  const planRaw = String(formData.get("plan") ?? "decouverte");
  const plan: PlanId = ALLOWED_SIGNUP_PLANS.includes(planRaw as PlanId)
    ? (planRaw as PlanId)
    : "decouverte";

  if (!email || !email.includes("@") || email.length > 200) {
    return { ok: false, error: "Email invalide." };
  }
  if (!orgName || orgName.length < ORG_NAME_MIN) {
    return {
      ok: false,
      error: `Nom de l'organisation requis (min ${ORG_NAME_MIN} caractères).`,
    };
  }
  if (orgName.length > ORG_NAME_MAX) {
    return {
      ok: false,
      error: `Nom de l'organisation trop long (max ${ORG_NAME_MAX} caractères).`,
    };
  }
  if (adminName.length > PERSON_NAME_MAX) {
    return {
      ok: false,
      error: `Nom trop long (max ${PERSON_NAME_MAX} caractères).`,
    };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: "Les deux mots de passe ne correspondent pas." };
  }
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    return { ok: false, error: policy.reason ?? "Mot de passe trop faible." };
  }
  if (!consent) {
    return {
      ok: false,
      error:
        "Vous devez accepter les CGU et la politique de confidentialité pour créer un compte.",
    };
  }

  // ----------------------------
  // 4. Email deja pris ?
  // ----------------------------
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error:
        "Un compte avec cet email existe déjà. Essayez de vous connecter ou de réinitialiser votre mot de passe.",
    };
  }

  // ----------------------------
  // 5. Creation tenant + admin + groupes systeme
  // ----------------------------
  let baseSlug = slugify(orgName);
  if (!baseSlug) baseSlug = "org";
  // Cherche un slug libre (max 5 essais avec suffixe random)
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await db.tenant.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const passwordHash = hashPassword(password);
  const ipHash = hashIp(ip);

  const created = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: orgName, slug, plan },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name: adminName || null,
        role: Role.ADMIN,
        passwordHash,
        passwordUpdatedAt: new Date(),
        emailVerified: new Date(),
        lastLoginIpHash: ipHash,
      },
    });
    await tx.group.createMany({
      data: SYSTEM_GROUPS.map((g) => ({
        tenantId: tenant.id,
        slug: g.slug,
        name: g.name,
        emoji: g.emoji,
        color: g.color,
        isSystem: true,
      })),
      skipDuplicates: true,
    });
    return { tenant, user };
  });

  // ----------------------------
  // 5a. Audit log
  // ----------------------------
  await auditLog({
    action: AuditActions.TENANT_CREATED,
    actor: { userId: created.user.id, email, role: "ADMIN" },
    tenantId: created.tenant.id,
    target: { type: "tenant", id: created.tenant.id, label: orgName },
    metadata: { plan, source: "self_service_signup" },
    ip,
  });
  await auditLog({
    action: AuditActions.USER_CREATED,
    actor: { userId: created.user.id, email, role: "ADMIN" },
    tenantId: created.tenant.id,
    target: { type: "user", id: created.user.id, label: email },
    message: "Premier admin du tenant (signup self-service)",
    ip,
  });
  await auditLog({
    action: AuditActions.CONSENT_GIVEN,
    actor: { userId: created.user.id, email, role: "ADMIN" },
    tenantId: created.tenant.id,
    message: "CGU + politique de confidentialite acceptees au signup",
    ip,
  });

  // ----------------------------
  // 5b. Welcome email (best-effort, non bloquant)
  // ----------------------------
  const appUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!(await hasReceivedWelcome(created.user.id))) {
    const res = await sendWelcomeEmail({
      toEmail: email,
      toName: adminName || null,
      tenantName: orgName,
      plan,
      appUrl,
    });
    await logWelcomeSent(
      created.tenant.id,
      created.user.id,
      res.ok ? "sent" : `skipped:${res.reason ?? "unknown"}`,
    );
  }

  // ----------------------------
  // 6. Connexion automatique
  // ----------------------------
  // signIn en provider "password" avec redirect vers /admin (l'user est
  // ADMIN). Le rate limit est deja consume, donc cette connexion ne sera
  // pas freinee par les anti-bruteforce.
  await signIn("password", {
    email,
    password,
    redirectTo: "/admin",
  });

  // signIn redirige : ce return est defensif (jamais atteint en pratique).
  redirect("/admin");
}
