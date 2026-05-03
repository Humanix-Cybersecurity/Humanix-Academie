// Page boutique : Hex se relooke avec les coins
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import HexMascotEvolved from "@/components/HexMascotEvolved";
import { getLevel } from "@/lib/levels";
import { buildEquippedFromInventory, CATEGORY_LABEL } from "@/lib/shop";
import ShopGrid from "@/components/ShopGrid";

export const dynamic = "force-dynamic";

export default async function BoutiquePage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const userId = (session.user as any).id as string;

  const [user, items, inventory] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        coins: true,
        level: true,
        mascotSpecies: true,
        mascotEmojiCustom: true,
        mood: true,
        progress: { select: { score: true } },
      },
    }),
    db.shopItem.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.userInventory.findMany({
      where: { userId },
      include: { item: true },
    }),
  ]);
  if (!user) redirect("/demo");

  const totalXP = user.progress.reduce((s, p) => s + (p.score || 0), 0);
  const equipped = buildEquippedFromInventory(
    inventory.map((i) => ({ item: i.item, isEquipped: i.isEquipped })),
  );
  const ownedIds = new Set(inventory.map((i) => i.itemId));
  const equippedIds = new Set(inventory.filter((i) => i.isEquipped).map((i) => i.itemId));

  // Group items par categorie
  const grouped = {
    HAT: items.filter((i) => i.category === "HAT"),
    GLASSES: items.filter((i) => i.category === "GLASSES"),
    ACCESSORY: items.filter((i) => i.category === "ACCESSORY"),
    BACKGROUND: items.filter((i) => i.category === "BACKGROUND"),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-2">
        🛒 Boutique
      </h1>
      <p className="text-gray-600 mb-8">
        Personnalise ta mascotte avec tes coins durement gagnés. Plus tu progresses, plus tu débloques d'options !
      </p>

      {/* Hero : aperçu de Hex avec les items équipés */}
      <div className="card mb-8 bg-gradient-to-br from-primary-50 to-cyan-50 border-2 border-accent-500/30">
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex justify-center">
            <HexMascotEvolved
              xp={totalXP}
              size="hero"
              mood={(user.mood ?? "neutral") as any}
              showLevel
              animated
              equipped={equipped}
              species={user.mascotSpecies}
              customEmoji={user.mascotEmojiCustom}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-500 mb-2">
              Salut {user.name?.split(" ")[0] ?? "👋"}, c'est ta vitrine !
            </h2>
            <p className="text-gray-600 mb-4">
              Voici ta mascotte actuelle. Achète et équipe des items dans les sections ci-dessous.
            </p>
            <div className="flex flex-wrap gap-3">
              <Stat emoji="🪙" value={user.coins.toString()} label="Coins disponibles" highlight />
              <Stat emoji="🎁" value={ownedIds.size.toString()} label="Items possédés" />
              <Stat emoji="✨" value={equippedIds.size.toString()} label="Équipés" />
            </div>
          </div>
        </div>
      </div>

      {/* Sections par categorie */}
      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat} className="mb-10">
          <h2 className="text-2xl font-bold text-primary-500 mb-4 flex items-center gap-2">
            <span>{CATEGORY_LABEL[cat].emoji}</span>
            {CATEGORY_LABEL[cat].label}
            <span className="text-sm font-normal text-gray-500">
              ({list.filter((i) => ownedIds.has(i.id)).length}/{list.length} possédés)
            </span>
          </h2>
          <ShopGrid
            items={list.map((i) => ({
              id: i.id,
              slug: i.slug,
              name: i.name,
              emoji: i.emoji,
              category: i.category,
              price: i.price,
              minLevel: i.minLevel,
              description: i.description,
              rarity: i.rarity,
            }))}
            ownedIds={[...ownedIds]}
            equippedIds={[...equippedIds]}
            userCoins={user.coins}
            userLevel={user.level}
          />
        </section>
      ))}

      {/* Info shop */}
      <div className="card bg-amber-50 border-amber-200">
        <h3 className="font-bold text-amber-900 mb-2">💡 Comment gagner plus de coins ?</h3>
        <ul className="text-sm text-amber-800 space-y-1 list-disc pl-5">
          <li>10 coins de base à chaque épisode complété</li>
          <li>+1 coin par 10 points de score</li>
          <li>+15 coins bonus si tu réussis le quiz sans-faute</li>
          <li>Coins exclusifs au passage de niveau (10/25/50)</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ emoji, value, label, highlight }: { emoji: string; value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${highlight ? "bg-amber-500 text-white shadow-md" : "bg-white border border-gray-200"}`}>
      <p className="text-lg">{emoji} <span className="font-extrabold">{value}</span></p>
      <p className={`text-[10px] uppercase ${highlight ? "text-white/80" : "text-gray-500"}`}>
        {label}
      </p>
    </div>
  );
}
