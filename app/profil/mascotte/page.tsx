// Page choix de mascotte + humeur + emoji custom.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MASCOT_SPECIES } from "@/lib/mascots";
import { getLevel } from "@/lib/levels";
import MascotPicker from "@/components/MascotPicker";
import MoodPicker from "@/components/MoodPicker";
import CustomEmojiPicker from "@/components/CustomEmojiPicker";

export const dynamic = "force-dynamic";

export default async function MascotChoosePage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const userId = session.user!.id as string;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      mascotSpecies: true,
      mascotEmojiCustom: true,
      mood: true,
      level: true,
      progress: { select: { score: true } },
    },
  });
  if (!user) redirect("/demo");

  const totalXP = user.progress.reduce((s, p) => s + (p.score || 0), 0);
  const level = getLevel(totalXP);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fadeIn">
      <Link href="/profil" className="text-sm text-gray-500 hover:text-primary-500 mb-3 inline-block">
        ← Retour à mon profil
      </Link>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-2">
        🎭 Personnaliser ma mascotte
      </h1>
      <p className="text-gray-600 mb-8">
        Choisis ton animal totem, ton humeur du jour, et même un emoji
        complètement custom. Ta mascotte t'accompagne partout sur la
        plateforme — qu'elle te ressemble.
      </p>

      {/* Choix de l'espece */}
      <section className="mb-12" aria-labelledby="species-title">
        <h2 id="species-title" className="text-2xl font-bold text-primary-500 mb-3">
          1. L'animal
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          16 mascottes disponibles. Plus tu progresses, plus tu débloques les rares.
        </p>
        <MascotPicker
          currentMascotId={user.mascotSpecies}
          currentLevel={level.id}
          currentXP={totalXP}
          allSpecies={MASCOT_SPECIES}
        />
      </section>

      {/* Humeur */}
      <section className="mb-12" aria-labelledby="mood-title">
        <h2 id="mood-title" className="text-2xl font-bold text-primary-500 mb-3">
          2. L'humeur du moment
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Choisis comment ta mascotte se sent aujourd'hui. Le changement est
          appliqué partout dans l'app immédiatement.
        </p>
        <MoodPicker currentMood={user.mood} />
      </section>

      {/* Emoji custom */}
      <section className="mb-12" aria-labelledby="custom-title">
        <h2 id="custom-title" className="text-2xl font-bold text-primary-500 mb-3">
          3. Emoji custom (optionnel)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Pas convaincu·e par les 16 animaux ? Mets l'emoji que tu veux : 🚀,
          🌈, ☕, 🌵, ce que tu veux. Laisse vide pour revenir à l'animal choisi
          ci-dessus.
        </p>
        <CustomEmojiPicker
          currentEmoji={user.mascotEmojiCustom}
          fallbackSpecies={user.mascotSpecies}
        />
      </section>
    </div>
  );
}
