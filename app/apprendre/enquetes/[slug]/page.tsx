// SPDX-License-Identifier: AGPL-3.0-or-later
// Page player du Mode Enqueteur — `/apprendre/enquetes/[slug]`.
//
// Server component qui charge l'enquete depuis le MDX, puis monte le
// composant client InvestigationPlayer avec la server action injectee.

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth, getSignInPath } from "@/lib/auth";
import { getInvestigationBySlug } from "@/lib/investigations/loader";
import { submitInvestigation } from "@/lib/investigations/actions";
import InvestigationPlayer from "@/components/investigations/InvestigationPlayer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const inv = getInvestigationBySlug(slug);
  if (!inv) {
    return { title: "Enquête introuvable | Humanix Académie" };
  }
  return {
    title: `${inv.title} — Mode Enquêteur | Humanix Académie`,
    description: inv.brief.slice(0, 160),
    alternates: { canonical: `/apprendre/enquetes/${inv.slug}` },
  };
}

export default async function EnquetePage({ params }: Props) {
  const { slug } = await params;
  const inv = getInvestigationBySlug(slug);
  if (!inv) notFound();

  // Auth obligatoire pour jouer (le scoring est sauve cote serveur).
  const session = await auth();
  if (!session?.user?.id) {
    const signIn = getSignInPath();
    redirect(
      `${signIn}?callbackUrl=${encodeURIComponent(`/apprendre/enquetes/${slug}`)}`,
    );
  }

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <InvestigationPlayer
          investigation={inv}
          submitAction={submitInvestigation}
        />
      </section>
    </main>
  );
}
