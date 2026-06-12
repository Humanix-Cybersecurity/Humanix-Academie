// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /profil/infos — Edition des informations personnelles (nom + service).
//
// Email NON modifiable : c'est l'identifiant unique pour Auth.js (pas de
// password, magic link sur l'email) + protection anti-piratage. Si un user
// veut changer d'email, il doit créer un nouveau compte (les progress ne
// suivent pas, c'est par design).

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import HexBackdrop from "@/components/HexBackdrop";
import ProfileInfoForm from "./ProfileInfoForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mes infos — Humanix Académie",
  description: "Modifier ton nom et ton service.",
  robots: { index: false, follow: false },
};

export default async function ProfileInfosPage() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const userId = session!.user!.id as string;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      service: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!user) redirect(getSignInPath());

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="infos-title"
          className="max-w-2xl mx-auto px-4 pt-12 pb-8 sm:pt-16"
        >
          <Link
            href="/profil"
            className="inline-flex items-center gap-1 text-sm text-accent-700 dark:text-accent-300 hover:underline mb-4"
          >
            <span aria-hidden="true">←</span> Retour à mon profil
          </Link>
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Mes informations
          </p>
          <h1
            id="infos-title"
            className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3"
          >
            Modifier mes infos
          </h1>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            Ces informations sont visibles dans ton espace, par les admins de
            ton organisation, et apparaissent sur tes certificats PDF.
          </p>
        </section>
      </HexBackdrop>

      <section className="max-w-2xl mx-auto px-4 pb-16 -mt-2">
        <ProfileInfoForm
          initialName={user.name ?? ""}
          initialFirstName={user.firstName ?? ""}
          initialLastName={user.lastName ?? ""}
          initialService={user.service ?? ""}
          email={user.email}
          emailVerified={!!user.emailVerified}
        />

        {/* Liens vers les autres pages de gestion du compte */}
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <SettingsLink
            href="/profil/securite"
            emoji="🔐"
            title="Sécurité"
            tagline="Mot de passe, 2FA, clés FIDO2"
          />
          <SettingsLink
            href="/profil/mascotte"
            emoji="🦊"
            title="Mascotte"
            tagline="Espèce, emoji custom, équipement"
          />
          <SettingsLink
            href="/profil/donnees"
            emoji="📂"
            title="Mes données"
            tagline="Export RGPD, suppression du compte"
          />
          <SettingsLink
            href="/profil/facturation"
            emoji="💳"
            title="Facturation"
            tagline="Abonnement, factures, paiement"
          />
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/60 px-4 py-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              ℹ️ À propos de l&apos;email :
            </span>{" "}
            ton email est l&apos;identifiant unique de ton compte (utilisé
            pour la connexion par lien magique ou SSO). Il ne peut pas être
            modifié pour des raisons de sécurité (anti-piratage). Si tu dois
            changer d&apos;email, contacte le support ou crée un nouveau
            compte.
          </p>
        </div>
      </section>
    </main>
  );
}

function SettingsLink({
  href,
  emoji,
  title,
  tagline,
}: {
  href: string;
  emoji: string;
  title: string;
  tagline: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-accent-400 hover:shadow-md hover:-translate-y-px transition-all"
    >
      <span className="text-2xl shrink-0" aria-hidden="true">
        {emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-primary-500 dark:text-accent-300 leading-tight">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
          {tagline}
        </p>
      </div>
      <span className="text-accent-500 shrink-0" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
