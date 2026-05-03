// Mascotte Hex — emoji + reactions avec petite animation
type Mood = "neutral" | "happy" | "sad" | "curious" | "celebrate" | "thinking";
type Size = "sm" | "md" | "lg" | "xl";

const MOOD_EMOJI: Record<Mood, string> = {
  neutral: "🦊",
  happy: "🦊",
  sad: "🦊",
  curious: "🦊",
  celebrate: "🦊",
  thinking: "🦊",
};

const MOOD_BUBBLE: Record<Mood, string> = {
  neutral: "·",
  happy: "✨",
  sad: "💧",
  curious: "?",
  celebrate: "🎉",
  thinking: "...",
};

const SIZES: Record<Size, string> = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-6xl",
  xl: "text-8xl",
};

export default function HexMascot({
  mood = "neutral",
  size = "md",
  animated = false,
}: {
  mood?: Mood;
  size?: Size;
  animated?: boolean;
}) {
  const animClass = animated
    ? mood === "celebrate"
      ? "animate-bounce-once"
      : mood === "happy"
      ? "animate-wiggle"
      : "animate-pulse-once"
    : "";
  return (
    <div className={`relative inline-block ${SIZES[size]} ${animClass}`}>
      <span aria-label="Hex la mascotte" role="img">
        {MOOD_EMOJI[mood]}
      </span>
      {mood !== "neutral" && (
        <span className="absolute -top-1 -right-2 text-base animate-fadeIn">
          {MOOD_BUBBLE[mood]}
        </span>
      )}
    </div>
  );
}
