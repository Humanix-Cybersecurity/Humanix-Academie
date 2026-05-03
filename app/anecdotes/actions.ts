"use server";

// Server actions cote public : inscription a la newsletter.
// Securite : Zod + hash IP + rate-limit IP basique (1 inscription / IP / minute).

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { subscribe } from "@/lib/anecdotes/subscriptions";

const InputSchema = z.object({
  email: z.string().email().max(200),
  source: z.string().max(40).optional(),
});

export type SubscribeState = {
  ok: boolean;
  message: string;
};

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(ip + "|humanix-anecdote-salt-v1")
    .digest("hex")
    .slice(0, 32);
}

export async function subscribeToAnecdote(formData: FormData): Promise<SubscribeState> {
  const parsed = InputSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Email invalide." };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const ipHash = hashIp(ip);

  // Rate-limit : 1 inscription par IP par minute (anti-spam basique)
  if (ipHash) {
    const recent = await db.anecdoteSubscription.findFirst({
      where: { ipHash, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (recent) {
      return {
        ok: false,
        message: "Une inscription récente a déjà été enregistrée. Merci de patienter un instant.",
      };
    }
  }

  const res = await subscribe({
    email: parsed.data.email,
    source: parsed.data.source ?? "form",
    ipHash,
  });

  if (!res.ok) {
    return { ok: false, message: "ok" in res ? "Erreur." : "Erreur." };
  }
  return {
    ok: true,
    message: "Inscription confirmée ! Vous recevrez la prochaine Cyber-Anecdote ce lundi matin.",
  };
}
