// Module augmentation pour next-auth v5.
// Étend le type `Session.user` avec nos champs Humanix custom (id, tenantId, role).
//
// Ces champs sont peuplés dans le callback session() de lib/auth.ts à partir
// du token JWT (mode demo) ou du user en base (mode magic link / SSO).
//
// Conséquence : plus besoin de `session.user!.id` partout dans le code.
// On peut écrire directement `session.user.id`, `session.user.tenantId`, etc.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: "LEARNER" | "MANAGER" | "ADMIN" | "SUPERADMIN";
    } & DefaultSession["user"];
  }

  // User retourné par l'adapter Prisma + tous les providers
  interface User {
    id?: string;
    tenantId?: string;
    role?: "LEARNER" | "MANAGER" | "ADMIN" | "SUPERADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    tenantId?: string;
    role?: "LEARNER" | "MANAGER" | "ADMIN" | "SUPERADMIN";
    name?: string | null;
  }
}
