// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /exercice/[code] - ecran participant d'un exercice de crise en direct.
// Necessite d'etre connecte et membre du tenant qui heberge la session.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMascotById } from "@/lib/mascots";
import DrillPlayer from "@/components/drill/DrillPlayer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exercice de crise en direct - Humanix Académie",
  robots: { index: false, follow: false },
};

export default async function ExerciceParticipantPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(
      `/connexion?callbackUrl=${encodeURIComponent(`/exercice/${code}`)}`,
    );
  }
  const tenantId = session.user.tenantId as string;

  const ex = await db.crisisExercise.findFirst({
    where: { code: code.toUpperCase(), tenantId },
    select: { id: true },
  });
  const mascotEmoji = getMascotById("fox").emoji;

  return (
    <main id="main-content" className="min-h-[60vh] px-4 py-8 animate-fadeIn">
      {ex ? (
        <DrillPlayer exerciseId={ex.id} mascotEmoji={mascotEmoji} />
      ) : (
        <div className="max-w-md mx-auto text-center py-16">
          <div className="text-5xl mb-3" aria-hidden="true">
            🦊
          </div>
          <h1 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-2">
            Code introuvable
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Vérifie le code, ou demande le lien à l&apos;organisateur.
            L&apos;exercice doit appartenir à ton organisation.
          </p>
        </div>
      )}
    </main>
  );
}
