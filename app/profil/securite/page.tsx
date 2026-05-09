// SPDX-License-Identifier: AGPL-3.0-or-later
// /profil/sécurité - gestion mdp, 2FA, codes de secours.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import SecurityPanel from "@/components/SecurityPanel";
import WebAuthnPanel from "@/components/WebAuthnPanel";

export const dynamic = "force-dynamic";

export default async function SecuritePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const userId = session.user!.id as string;

  const [user, credentials] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        passwordUpdatedAt: true,
        mfaEnabled: true,
        mfaEnabledAt: true,
        mfaForced: true,
        mfaBackupCodesHash: true,
        lastLoginAt: true,
      },
    }),
    db.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        deviceName: true,
        transports: true,
        backedUp: true,
        userVerified: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  ]);
  if (!user) redirect("/connexion");

  const backupCount = user.mfaBackupCodesHash
    ? (() => {
        try {
          const arr = JSON.parse(user.mfaBackupCodesHash);
          return Array.isArray(arr) ? arr.length : 0;
        } catch {
          return 0;
        }
      })()
    : 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Mon compte
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Sécurité
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Mot de passe et authentification à deux facteurs.
        </p>
      </header>

      <SecurityPanel
        email={user.email}
        hasPassword={!!user.passwordHash}
        passwordUpdatedAt={
          user.passwordUpdatedAt ? user.passwordUpdatedAt.toISOString() : null
        }
        mfaEnabled={user.mfaEnabled}
        mfaEnabledAt={
          user.mfaEnabledAt ? user.mfaEnabledAt.toISOString() : null
        }
        mfaForced={user.mfaForced}
        backupCodesRemaining={backupCount}
        lastLoginAt={user.lastLoginAt ? user.lastLoginAt.toISOString() : null}
      />

      <WebAuthnPanel
        credentials={credentials.map((c) => ({
          id: c.id,
          deviceName: c.deviceName,
          transports: c.transports,
          backedUp: c.backedUp,
          userVerified: c.userVerified,
          createdAt: c.createdAt.toISOString(),
          lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
        }))}
        isSuperAdmin={user.role === "SUPERADMIN"}
      />
    </main>
  );
}
