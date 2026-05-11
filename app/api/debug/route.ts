// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint /api/debug — DIAGNOSTIC TEMPORAIRE.
//
// Pourquoi ce fichier existe :
// app/layout.tsx crash en production (rend global-error.tsx). Les
// stacktraces server-side sont masquees par Next.js en mode production
// (seul un `digest` est expose au client). Cet endpoint reproduit les
// appels que fait le layout, chacun isole dans un try/catch, et retourne
// le resultat en JSON visible au navigateur. Permet de pinpointer
// exactement quel call throw sans dependre des logs serveur.
//
// SECURITE : on n'expose AUCUN secret. Seul l'identifiant du provider IA,
// le shape de la session, et les messages d'erreur sont retournes.
//
// A SUPPRIMER une fois le bug identifie et corrige.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Probe = {
  name: string;
  ok: boolean;
  detail?: string;
  error?: { name: string; message: string; stack?: string };
};

async function probe(
  name: string,
  fn: () => Promise<unknown>,
): Promise<Probe> {
  try {
    const result = await fn();
    let detail = "";
    if (result === null) detail = "null";
    else if (result === undefined) detail = "undefined";
    else if (typeof result === "object") {
      // Snapshot leger sans exposer de secrets
      try {
        const keys = Object.keys(result as Record<string, unknown>);
        detail = `object with keys: ${keys.slice(0, 10).join(", ")}`;
      } catch {
        detail = "object (introspection failed)";
      }
    } else {
      detail = String(result).slice(0, 200);
    }
    return { name, ok: true, detail };
  } catch (e: unknown) {
    const err =
      e instanceof Error
        ? { name: e.name, message: e.message, stack: e.stack?.slice(0, 4000) }
        : { name: "non-error", message: String(e).slice(0, 500) };
    return { name, ok: false, error: err };
  }
}

export async function GET() {
  const probes: Probe[] = [];

  // 1) Import + appel de auth() — le suspect numero 1 du crash layout
  probes.push(
    await probe("auth()", async () => {
      const { auth } = await import("@/lib/auth");
      return await auth();
    }),
  );

  // 2) Import + appel de isHexChatAvailable()
  probes.push(
    await probe("isHexChatAvailable()", async () => {
      const { isHexChatAvailable } = await import("@/lib/ai/provider");
      return isHexChatAvailable();
    }),
  );

  // 3) headers() depuis next/headers
  probes.push(
    await probe("headers()", async () => {
      const { headers } = await import("next/headers");
      const h = await headers();
      return { host: h.get("host"), userAgent: h.get("user-agent")?.slice(0, 60) };
    }),
  );

  // 4) Connection DB minimaliste
  probes.push(
    await probe("db.$queryRaw SELECT 1", async () => {
      const { db } = await import("@/lib/db");
      return await db.$queryRaw`SELECT 1 AS one`;
    }),
  );

  // 5) Lecture d'un tenant (test du Prisma client + adapter)
  probes.push(
    await probe("db.tenant.findFirst", async () => {
      const { db } = await import("@/lib/db");
      return await db.tenant.findFirst({ select: { id: true, slug: true } });
    }),
  );

  // 6) Lecture User (test du modele avec MFA fields, recent additions)
  probes.push(
    await probe("db.user.findFirst (mfa fields)", async () => {
      const { db } = await import("@/lib/db");
      return await db.user.findFirst({
        select: {
          id: true,
          email: true,
          mfaEnabled: true,
          mfaSecret: true,
          mfaForced: true,
        },
      });
    }),
  );

  // 7) Provider IA configure
  const env = {
    HEX_AI_PROVIDER: process.env.HEX_AI_PROVIDER || "(unset)",
    HAS_MISTRAL_KEY: Boolean(process.env.MISTRAL_API_KEY),
    HAS_AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    HAS_DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    AUTH_URL: process.env.AUTH_URL,
    DEMO_MODE: process.env.DEMO_MODE,
  };

  const allOk = probes.every((p) => p.ok);

  return NextResponse.json(
    {
      ok: allOk,
      env,
      probes,
      help:
        "Si une probe a ok:false, son `error` te dit ce qui throw. " +
        "Le suspect du crash layout est presque toujours auth().",
    },
    {
      status: 200,
      headers: { "cache-control": "no-store, no-cache" },
    },
  );
}
