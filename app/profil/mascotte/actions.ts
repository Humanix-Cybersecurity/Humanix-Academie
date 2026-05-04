"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMascotById } from "@/lib/mascots";

const VALID_MOODS = [
  "neutral",
  "happy",
  "sad",
  "curious",
  "celebrate",
  "thinking",
] as const;
type Mood = (typeof VALID_MOODS)[number];

function refreshMascotPaths() {
  // Toutes les pages qui affichent la mascotte
  revalidatePath("/profil");
  revalidatePath("/profil/mascotte");
  revalidatePath("/apprendre");
  revalidatePath("/boutique");
  revalidatePath("/");
}

export async function chooseMascot(mascotId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const userId = session.user!.id as string;

  const mascot = getMascotById(mascotId);
  if (!mascot) throw new Error("invalid_mascot");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { level: true },
  });
  if (!user) throw new Error("user_not_found");

  if (user.level < mascot.unlockLevel) {
    throw new Error(`locked:${mascot.unlockLevel}`);
  }

  await db.user.update({
    where: { id: userId },
    data: { mascotSpecies: mascotId },
  });
  refreshMascotPaths();
  return { ok: true };
}

/**
 * Met a jour l'humeur affichee de la mascotte. Validation stricte cote
 * server : seules les valeurs du Mood union sont acceptees (RGAA + securite).
 */
export async function chooseMood(mood: string): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const userId = session.user!.id as string;

  if (!VALID_MOODS.includes(mood as Mood)) {
    throw new Error("invalid_mood");
  }

  await db.user.update({
    where: { id: userId },
    data: { mood },
  });
  refreshMascotPaths();
  return { ok: true };
}

/**
 * Definit ou efface l'emoji custom de la mascotte. Validation stricte cote
 * server : 0 a 8 caracteres (assez pour les ZWJ sequences type 👨‍🚀).
 * On accepte n'importe quel caractere unicode visible — c'est le but.
 */
export async function setCustomMascotEmoji(
  emoji: string | null,
): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const userId = session.user!.id as string;

  let toStore: string | null = null;
  if (emoji && emoji.trim().length > 0) {
    const trimmed = emoji.trim();
    // Limite stricte de longueur pour eviter le cas ou l'utilisateur colle
    // tout un texte. 8 caracteres suffisent pour les emojis composites.
    if (trimmed.length > 8) {
      throw new Error("emoji_trop_long");
    }
    toStore = trimmed;
  }

  await db.user.update({
    where: { id: userId },
    data: { mascotEmojiCustom: toStore },
  });
  refreshMascotPaths();
  return { ok: true };
}
