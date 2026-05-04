// Carte IA Coach Hex affichee sur le hub apprenant et /profil
import Link from "next/link";
import HexMascotEvolved from "@/components/HexMascotEvolved";
import { getMascotById } from "@/lib/mascots";
import type { CoachAdvice } from "@/lib/coach";

const MOOD_BG: Record<CoachAdvice["mood"], string> = {
  happy: "from-cyan-50 to-blue-50 border-cyan-300",
  encouraging: "from-emerald-50 to-teal-50 border-emerald-300",
  urgent: "from-amber-50 to-orange-50 border-amber-400",
  celebrate: "from-purple-50 via-pink-50 to-amber-50 border-purple-300",
};

const REC_EMOJI: Record<string, string> = {
  module: "🎯",
  library: "📚",
  phishing: "🎣",
  rest: "💤",
};

export default function CoachCard({
  advice,
  xp,
  species = "fox",
}: {
  advice: CoachAdvice;
  xp: number;
  species?: string;
}) {
  const mascot = getMascotById(species);
  return (
    <div className={`card bg-gradient-to-br ${MOOD_BG[advice.mood]} border-2`}>
      <div className="flex items-start gap-4 mb-4">
        <HexMascotEvolved
          xp={xp}
          size="lg"
          mood={
            advice.mood === "urgent"
              ? "thinking"
              : advice.mood === "celebrate"
                ? "celebrate"
                : "happy"
          }
          animated
          species={species}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-600 font-bold mb-1">
            {mascot.emoji} {mascot.name} te coache
          </p>
          <p className="font-bold text-primary-500 mb-1">{advice.greeting}</p>
          <p className="text-gray-700 leading-relaxed">
            {advice.primaryMessage}
          </p>
        </div>
      </div>

      {advice.recommendation && (
        <Link
          href={advice.recommendation.href}
          className="card mb-3 hover:scale-[1.01] transition-all bg-white border-accent-500/30 flex items-center gap-3"
        >
          <span className="text-3xl">
            {REC_EMOJI[advice.recommendation.type]}
          </span>
          <div className="flex-1">
            <p className="font-bold text-primary-500 text-sm">
              {advice.recommendation.label}
            </p>
            <p className="text-xs text-gray-500 italic">
              {advice.recommendation.reason}
            </p>
          </div>
          <span className="text-accent-500">→</span>
        </Link>
      )}

      <div className="border-t border-white/50 pt-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
          Le saviez-vous
        </p>
        <ul className="space-y-1 text-xs text-gray-700">
          {advice.microTips.map((tip, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-accent-500 mt-0.5">·</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
