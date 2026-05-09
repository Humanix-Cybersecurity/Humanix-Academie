"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  return { userId: session.user!.id as string };
}

export async function buyItem(itemId: string) {
  const { userId } = await requireUser();
  const item = await db.shopItem.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive) throw new Error("item_not_found");

  // Tout dans une transaction interactive avec check atomique du solde.
  // updateMany conditionnel = "decrement only if enough coins" en une seule
  // commande SQL, immune aux races (deux clics simultanés).
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("user_not_found");

    if (user.level < item.minLevel) {
      throw new Error(`level_required:${item.minLevel}`);
    }

    const owned = await tx.userInventory.findUnique({
      where: { userId_itemId: { userId, itemId: item.id } },
    });
    if (owned) throw new Error("already_owned");

    // Décrément conditionnel : SQL "UPDATE ... WHERE coins >= price"
    // Si concurrence, un seul des updates passera (count = 1), l'autre count = 0.
    const debit = await tx.user.updateMany({
      where: { id: userId, coins: { gte: item.price } },
      data: { coins: { decrement: item.price } },
    });
    if (debit.count === 0) throw new Error("insufficient_coins");

    await tx.userInventory.create({
      data: { userId, itemId: item.id, isEquipped: false },
    });

    await tx.event.create({
      data: {
        tenantId: user.tenantId,
        userId,
        type: "shop_purchase",
        payload: { itemSlug: item.slug, price: item.price },
      },
    });
  });

  revalidatePath("/boutique");
  revalidatePath("/profil");
  revalidatePath("/apprendre");
  return { ok: true };
}

export async function equipItem(itemId: string) {
  const { userId } = await requireUser();

  const inventory = await db.userInventory.findUnique({
    where: { userId_itemId: { userId, itemId } },
    include: { item: true },
  });
  if (!inventory) throw new Error("not_owned");

  // Desequipe les autres items de même catégorie
  await db.userInventory.updateMany({
    where: {
      userId,
      isEquipped: true,
      item: { category: inventory.item.category },
    },
    data: { isEquipped: false },
  });

  // Équipe celui-ci
  await db.userInventory.update({
    where: { id: inventory.id },
    data: { isEquipped: true },
  });

  revalidatePath("/boutique");
  revalidatePath("/profil");
  revalidatePath("/apprendre");
  return { ok: true };
}

export async function unequipItem(itemId: string) {
  const { userId } = await requireUser();
  await db.userInventory.updateMany({
    where: { userId, itemId, isEquipped: true },
    data: { isEquipped: false },
  });
  revalidatePath("/boutique");
  revalidatePath("/profil");
  revalidatePath("/apprendre");
  return { ok: true };
}
