// SPDX-License-Identifier: AGPL-3.0-or-later
// /famille/enfants/[monde] - un parcours enfant jouable (public, sans compte).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMonde } from "@/lib/enfants/parcours";
import KidsParcoursPlayer from "@/components/enfants/KidsParcoursPlayer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ monde: string }>;
}): Promise<Metadata> {
  const { monde: slug } = await params;
  const monde = getMonde(slug);
  if (!monde) return { title: "L'école de Hex | Humanix" };
  return {
    title: `${monde.titre} - L'école de Hex | Humanix`,
    description: monde.sousTitre,
    alternates: { canonical: `/famille/enfants/${monde.slug}` },
  };
}

export default async function MondePage({
  params,
}: {
  params: Promise<{ monde: string }>;
}) {
  const { monde: slug } = await params;
  const monde = getMonde(slug);
  // Monde inconnu OU teaser pas encore prêt -> 404 (le hub gère l'affichage).
  if (!monde || !monde.disponible || monde.activites.length === 0) {
    notFound();
  }
  return <KidsParcoursPlayer monde={monde} />;
}
