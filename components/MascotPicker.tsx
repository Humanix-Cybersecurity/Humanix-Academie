"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import HexMascotEvolved from "@/components/HexMascotEvolved";
import { chooseMascot } from "@/app/profil/mascotte/actions";
import type { MascotSpecies } from "@/lib/mascots";

export default function MascotPicker({
  currentMascotId,
  currentLevel,
  currentXP,
  allSpecies,
}: {
  currentMascotId: string;
  currentLevel: number;
  currentXP: number;
  allSpecies: MascotSpecies[];
}) {
  const [pending, startTransition] = useTransition();
  const [pickedId, setPickedId] = useState(currentMascotId);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const router = useRouter();

  const onChoose = (id: string, locked: boolean) => {
    if (locked) {
      setFeedback({
        type: "err",
        msg: "Cette mascotte se débloque à un niveau supérieur.",
      });
      return;
    }
    setFeedback(null);
    setPickedId(id);
  };

  const onSave = () => {
    if (pickedId === currentMascotId) {
      setFeedback({ type: "err", msg: "Cette mascotte est déjà la tienne." });
      return;
    }
    startTransition(async () => {
      try {
        await chooseMascot(pickedId);
        setFeedback({
          type: "ok",
          msg: "✓ Ta mascotte a changé. Bienvenue à elle !",
        });
        setTimeout(() => router.push("/profil"), 1200);
      } catch (e: any) {
        const msg = e?.message?.startsWith("locked:")
          ? `Niveau ${e.message.split(":")[1]} requis pour cette mascotte.`
          : "Impossible de changer de mascotte.";
        setFeedback({ type: "err", msg });
      }
    });
  };

  const picked = allSpecies.find((s) => s.id === pickedId) ?? allSpecies[0];

  return (
    <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
      {/* Aperçu */}
      <div className="card sticky top-20 self-start">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-3">
          Aperçu
        </p>
        <div className="flex justify-center mb-4">
          <HexMascotEvolved
            xp={currentXP}
            species={pickedId}
            size="hero"
            mood="happy"
            showLevel
            animated
          />
        </div>
        <p className="text-center font-bold text-primary-500 text-lg">
          {picked.name}
        </p>
        <p className="text-center text-sm text-gray-600 italic mb-4">
          {picked.tagline}
        </p>
        <button
          onClick={onSave}
          disabled={pending || pickedId === currentMascotId}
          className="btn-primary w-full"
        >
          {pickedId === currentMascotId
            ? "Mascotte actuelle"
            : pending
              ? "Sauvegarde…"
              : "✓ Adopter cette mascotte"}
        </button>
        {feedback && (
          <p
            className={`text-sm text-center mt-3 font-medium ${feedback.type === "ok" ? "text-success" : "text-warn"}`}
          >
            {feedback.msg}
          </p>
        )}
      </div>

      {/* Grille de choix */}
      <div>
        <h2 className="text-xl font-bold text-primary-500 mb-4">
          Toutes les mascottes ({allSpecies.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allSpecies.map((m) => {
            const locked = currentLevel < m.unlockLevel;
            const isSelected = pickedId === m.id;
            const isCurrent = currentMascotId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChoose(m.id, locked)}
                disabled={locked}
                className={`rounded-2xl p-3 text-center transition-all border-2 relative ${
                  locked
                    ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    : isSelected
                      ? "border-accent-500 bg-accent-50 scale-105 shadow-md"
                      : "border-gray-200 bg-white hover:border-primary-500 hover:scale-[1.02]"
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-1 right-1 text-[10px] font-bold bg-success text-white px-1.5 py-0.5 rounded-full">
                    ✓
                  </span>
                )}
                {locked && (
                  <span className="absolute top-1 right-1 text-sm">🔒</span>
                )}
                <div className="text-5xl mb-2">{m.emoji}</div>
                <p className="text-sm font-bold text-primary-500 truncate">
                  {m.name}
                </p>
                {locked && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Niv. {m.unlockLevel} requis
                  </p>
                )}
                {!locked && m.unlockLevel > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Débloqué Niv. {m.unlockLevel}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
