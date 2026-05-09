// SPDX-License-Identifier: AGPL-3.0-or-later
// Badge auteur reutilisable. A poser sur :
//  - cartes marketplace
//  - vue saison clonee (rappelle la signature même après installation)
//  - vue episode si l'auteur a un profil expert (lien direct vers son profil)

import Link from "next/link";

type Props = {
  name: string;
  organization?: string | null;
  isOfficial?: boolean;
  expertSlug?: string | null;
  avatarUrl?: string | null;
  // Variante visuelle
  size?: "sm" | "md";
};

export default function AuthorBadge({
  name,
  organization,
  isOfficial,
  expertSlug,
  avatarUrl,
  size = "sm",
}: Props) {
  const inner = (
    <span className="flex items-center gap-2 group">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className={
            size === "md"
              ? "w-8 h-8 rounded-full object-cover border border-accent-200"
              : "w-6 h-6 rounded-full object-cover border border-accent-200"
          }
        />
      ) : (
        <span
          className={
            (size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]") +
            " rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold flex items-center justify-center shrink-0"
          }
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      )}
      <span className={size === "md" ? "text-sm" : "text-xs"}>
        <span className="text-gray-500">Signé par </span>
        <span
          className={
            "font-bold " +
            (expertSlug
              ? "text-accent-500 group-hover:underline"
              : "text-primary-500")
          }
        >
          {name}
        </span>
        {organization && (
          <span className="text-gray-500"> - {organization}</span>
        )}
        {isOfficial && (
          <span className="ml-1.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-1 py-0.5 rounded">
            Officiel
          </span>
        )}
      </span>
    </span>
  );

  if (expertSlug) {
    return (
      <Link
        href={`/experts/${expertSlug}`}
        className="inline-flex items-center"
        aria-label={`Voir le profil de ${name}`}
      >
        {inner}
      </Link>
    );
  }
  return <span className="inline-flex items-center">{inner}</span>;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
