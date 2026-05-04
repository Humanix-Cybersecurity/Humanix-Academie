"use server";

// Server actions pour la generation phishing personnalisee.
// Tenant-scope strict + plan-gating Pro+.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import {
  generateBatch,
  type EmployeeTarget,
  type CampaignContext,
  type PersonalizedPhishing,
} from "@/lib/phishing/personalized";

const TEMPLATES = [
  "fake-microsoft",
  "fake-fournisseur",
  "fake-rh",
  "fake-banque",
  "fake-livreur",
  "free",
] as const;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const STYLES = ["urgent", "amical", "autoritaire", "discret"] as const;

const Schema = z.object({
  targetIds: z.array(z.string()).min(1, "Sélectionnez au moins 1 employé.").max(50, "Maximum 50 employés par batch."),
  template: z.enum(TEMPLATES),
  difficulty: z.enum(DIFFICULTIES),
  attackerStyle: z.enum(STYLES).optional(),
  recentEvent: z.string().max(200).optional(),
});

export type GenerateState = {
  ok: boolean;
  error?: string;
  results?: PersonalizedPhishing[];
  errorDetails?: { email: string; message: string }[];
};

async function requireAdminWithPlan() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") throw new Error("forbidden");
  const tenantId = (session.user as any).tenantId as string;
  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "phishing_ia")) throw new Error("plan_required");
  return { tenantId };
}

export async function generatePersonalizedBatch(
  input: unknown,
): Promise<GenerateState> {
  const ctx = await requireAdminWithPlan();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  const data = parsed.data;

  // Recuperation des cibles (tenant-scope)
  const employees = await db.user.findMany({
    where: {
      id: { in: data.targetIds },
      tenantId: ctx.tenantId,
      isActive: true,
    },
    select: { id: true, name: true, email: true, service: true },
  });

  if (employees.length === 0) {
    return { ok: false, error: "Aucun employé valide trouvé." };
  }

  const targets: EmployeeTarget[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    service: e.service,
  }));

  const campaign: CampaignContext = {
    template: data.template,
    difficulty: data.difficulty,
    attackerStyle: data.attackerStyle,
    recentEvent: data.recentEvent,
  };

  // Generation sequentielle (1/sec). UI fera un timer cote client pour montrer
  // une progression estimative — la version SSE-streaming est en TODO V2.
  const { results, errors } = await generateBatch(targets, campaign);

  return {
    ok: true,
    results,
    errorDetails: errors.map((e) => ({
      email: e.target.email,
      message: e.message,
    })),
  };
}

export async function listEmployeeTargets(): Promise<EmployeeTarget[]> {
  const ctx = await requireAdminWithPlan();
  const employees = await db.user.findMany({
    where: { tenantId: ctx.tenantId, isActive: true, role: { in: ["LEARNER", "MANAGER"] } },
    select: { id: true, name: true, email: true, service: true },
    orderBy: { name: "asc" },
  });
  return employees;
}
