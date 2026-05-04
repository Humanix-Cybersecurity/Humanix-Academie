"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTransition, useState } from "react";
import { buyItem, equipItem, unequipItem } from "@/app/boutique/actions";
import { RARITY_STYLE } from "@/lib/shop";
import clsx from "clsx";

type Item = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  category: string;
  price: number;
  minLevel: number;
  description: string | null;
  rarity: string;
};

export default function ShopGrid({
  items,
  ownedIds,
  equippedIds,
  userCoins,
  userLevel,
}: {
  items: Item[];
  ownedIds: string[];
  equippedIds: string[];
  userCoins: number;
  userLevel: number;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    id: string;
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const owned = new Set(ownedIds);
  const equipped = new Set(equippedIds);

  const onBuy = (item: Item) => {
    setBusy(item.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await buyItem(item.id);
        setFeedback({
          id: item.id,
          type: "ok",
          msg: `🎉 ${item.name} acheté !`,
        });
      } catch (e: any) {
        const msg = mapError(e?.message);
        setFeedback({ id: item.id, type: "err", msg });
      }
      setBusy(null);
    });
  };

  const onEquip = (item: Item) => {
    setBusy(item.id);
    startTransition(async () => {
      try {
        await equipItem(item.id);
      } catch {
        setFeedback({ id: item.id, type: "err", msg: "Action impossible" });
      }
      setBusy(null);
    });
  };

  const onUnequip = (item: Item) => {
    setBusy(item.id);
    startTransition(async () => {
      try {
        await unequipItem(item.id);
      } catch {}
      setBusy(null);
    });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const isOwned = owned.has(item.id);
        const isEquipped = equipped.has(item.id);
        const canAfford = userCoins >= item.price;
        const canLevel = userLevel >= item.minLevel;
        const rarity = RARITY_STYLE[item.rarity];
        const fb = feedback?.id === item.id ? feedback : null;
        const isBusy = busy === item.id;

        return (
          <div
            key={item.id}
            className={clsx(
              "rounded-2xl p-4 border-2 transition-all relative",
              isEquipped
                ? "border-accent-500 bg-accent-50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300",
              !isOwned && !canLevel ? "opacity-60" : "",
              isBusy ? "animate-pulse" : "",
            )}
          >
            {/* Rarity badge */}
            <span
              className={clsx(
                "absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                rarity.bg,
                "text-gray-700",
              )}
            >
              {rarity.label}
            </span>

            {/* Item visual */}
            <div
              className={clsx(
                "aspect-square rounded-xl flex items-center justify-center mb-3 ring-2",
                rarity.ring,
                rarity.bg,
              )}
            >
              <span className="text-5xl">{item.emoji}</span>
            </div>

            {/* Info */}
            <h3 className="font-bold text-primary-500 text-sm mb-0.5 truncate">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-[11px] text-gray-500 mb-3 leading-tight line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Statut + action */}
            {isOwned ? (
              isEquipped ? (
                <button
                  onClick={() => onUnequip(item)}
                  disabled={pending}
                  className="w-full text-xs font-bold border-2 border-accent-500 text-accent-500 rounded-xl py-2 hover:bg-accent-50 transition disabled:opacity-50"
                >
                  ✓ Équipé · Retirer
                </button>
              ) : (
                <button
                  onClick={() => onEquip(item)}
                  disabled={pending}
                  className="w-full text-xs font-bold bg-primary-500 text-white rounded-xl py-2 hover:bg-primary-600 transition disabled:opacity-50"
                >
                  Équiper
                </button>
              )
            ) : !canLevel ? (
              <button
                disabled
                className="w-full text-xs font-bold bg-gray-100 text-gray-400 rounded-xl py-2 cursor-not-allowed"
              >
                🔒 Niveau {item.minLevel} requis
              </button>
            ) : (
              <button
                onClick={() => onBuy(item)}
                disabled={pending || !canAfford}
                className={clsx(
                  "w-full text-xs font-bold rounded-xl py-2 transition disabled:cursor-not-allowed",
                  canAfford
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-gray-100 text-gray-400",
                )}
              >
                🪙 {item.price} {canAfford ? "" : "(insuffisant)"}
              </button>
            )}

            {fb && (
              <p
                className={clsx(
                  "text-[10px] text-center mt-2 font-medium",
                  fb.type === "ok" ? "text-success" : "text-warn",
                )}
              >
                {fb.msg}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function mapError(code?: string): string {
  if (!code) return "Erreur inconnue";
  if (code === "insufficient_coins") return "Pas assez de coins";
  if (code === "already_owned") return "Déjà possédé";
  if (code.startsWith("level_required"))
    return `Niveau ${code.split(":")[1]} requis`;
  return "Achat impossible";
}
