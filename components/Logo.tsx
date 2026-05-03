// Composant logo réutilisable.
// 3 variantes :
//  - "mark"     : icône seule (HeaderBar compact, favicon, mascotte UI)
//  - "full"     : icône + "Humanix-Cybersecurity"
//  - "academie" : icône + "Humanix Académie / par Humanix-Cybersecurity"
//
// Les SVG sont dans public/ et peuvent être remplacés par les exports
// définitifs du designer sans modifier ce composant.
import Image from "next/image";

type Variant = "mark" | "full" | "academie";
type Size = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<Size, number> = { sm: 28, md: 40, lg: 64, xl: 96 };

export default function Logo({
  variant = "mark",
  size = "md",
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const px = SIZE_PX[size];
  // Logo officiel Humanix Académie (PNG 1024×1024 d'origine + déclinaisons).
  // On choisit la taille la plus proche pour économiser la bande passante.
  const src = px <= 192 ? "/logo-humanix-academie-192.png" : "/logo-humanix-academie-512.png";

  if (variant === "mark") {
    return (
      <Image
        src={src}
        alt="Humanix-Cybersecurity"
        width={px}
        height={px}
        priority
        className={className}
      />
    );
  }

  if (variant === "full") {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <Image src={src} alt="" width={px} height={px} priority />
        <span className="flex flex-col leading-tight">
          <span className="font-extrabold text-primary-500">Humanix-Cybersecurity</span>
        </span>
      </span>
    );
  }

  // academie
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image src={src} alt="" width={px} height={px} priority />
      <span className="flex flex-col leading-tight">
        <span className="font-extrabold text-primary-500">Humanix Académie</span>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 -mt-0.5">
          par Humanix-Cybersecurity
        </span>
      </span>
    </span>
  );
}
