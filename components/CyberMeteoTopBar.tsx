// Bandeau fin (4px) tout en haut du site, couleur dynamique selon la
// cyber-meteo France. Aucun concurrent ne fait ca - c'est une signature
// visuelle qui rend la cyber-meteo presente partout dans l'UI.
//
// A11y : aria-hidden="true" car purement decoratif, l'info textuelle reste
// disponible via /cyber-meteo et le composant CyberMeteoBadge.
//
// Server component pour eviter un fetch cote client a chaque page.

import { getCyberMeteo } from "@/lib/cyber-meteo";

const COLOR_BY_LEVEL: Record<string, string> = {
  green: "#10B981",
  amber: "#F59E0B",
  orange: "#E67E22",
  red: "#C0392B",
};

export default async function CyberMeteoTopBar() {
  let level: string = "green";
  try {
    const meteo = await getCyberMeteo();
    // Normalise la cle 'level' qui peut varier selon l'implementation
    level = (meteo as any)?.level ?? (meteo as any)?.alertLevel ?? "green";
  } catch {
    level = "green";
  }
  const color = COLOR_BY_LEVEL[level] ?? COLOR_BY_LEVEL.green;

  return (
    <div
      aria-hidden="true"
      className="h-1 w-full"
      style={{
        background: `linear-gradient(90deg, ${color} 0%, ${color}dd 50%, ${color} 100%)`,
        backgroundSize: "200% 100%",
        animation: "gradientShift 8s ease infinite",
      }}
      title={`Cyber-météo France : ${level}`}
    />
  );
}
