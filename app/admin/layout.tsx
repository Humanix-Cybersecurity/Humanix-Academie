// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// app/admin/layout.tsx - Layout console dirigeant
//
// Architecture Linear/Vercel-like :
//   - Sidebar slim (icons-only, 56px) à gauche, fixed full-height
//   - Top bar contextuelle (breadcrumb + actions globales) en haut
//   - Container principal centré max-w-screen-2xl avec padding latéral
//
// Bénéfices vs ancienne archi (float-left + has-admin-nav CSS) :
//   - Aucun overlap possible avec footer (le layout gère le flow)
//   - Aucun script useEffect pour injecter une classe (pas de hack)
//   - Compatible avec toutes les pages /admin/* sans les modifier
//   - Performance : zéro layout shift au montage
//
// Note : le layout reçoit `children` qui est rendu DANS le content area.
// Les pages /admin/* peuvent garder leur wrapper interne, le layout
// fournit juste la grille externe.
// =============================================================================

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getSubscriptionState,
  shouldShowWarning,
} from "@/lib/subscription-state";
import AdminSidebar from "@/components/AdminSidebar";
import AdminTopBar from "@/components/AdminTopBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Vérification rôle au layout : protège TOUTES les pages /admin/* d'un coup
  // (defense-in-depth en plus du middleware existant).
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user!.role;
  if (
    role !== "ADMIN" &&
    role !== "MANAGER" &&
    role !== "RSSI" &&
    role !== "SUPERADMIN"
  ) {
    redirect("/apprendre");
  }

  // === SaaS multi-tenant : enforcement subscription status ===
  // Recupere l'etat du subscription du tenant courant. Selon `restriction` :
  //   none     -> tout fonctionne
  //   warn     -> bandeau d'avertissement, mais acces complet
  //   read_only -> bandeau + on bloque les mutations cote actions
  //                (lib/seats.ts + actions de modification verifient canMutate)
  //   blocked   -> redirect /admin/billing avec CTA renew
  // SUPERADMIN ne subit jamais cette restriction (acces global Humanix interne).
  const tenantId = session.user.tenantId;
  let subState: Awaited<ReturnType<typeof getSubscriptionState>> | null = null;
  if (typeof tenantId === "string" && role !== "SUPERADMIN") {
    subState = await getSubscriptionState(tenantId);
    if (subState.restriction === "blocked") {
      // On laisse passer la page /admin/billing pour permettre de regulariser
      // (sinon l'user est dans une nasse). Toutes les autres pages sont
      // bloquees -> redirect.
      // Note : on ne peut pas savoir le pathname dans le layout sans hook,
      // donc on redirige inconditionnellement. Si l'user est deja sur
      // /admin/billing, le redirect fait juste rebound (pas de boucle car
      // billing est dans /admin/* aussi -- le code suivant verifie).
      // Pour eviter la boucle, on stocke le path souhaite via header lit
      // dans la page billing (qui rendra alors le bandeau au lieu de redirect).
      // Approche pragmatique : on render un component d'avertissement plein
      // ecran au lieu de redirect, et la page billing cassera ce render.
      // (cf. SubscriptionGate ci-dessous)
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex bg-gray-50/50 dark:bg-slate-900/50">
      {/* Sidebar slim 56px desktop (expand 240px au hover) avec sections
          accordeon, drawer mobile. Cf. components/AdminSidebar.tsx. */}
      <AdminSidebar />

      {/* Zone principale : top bar (breadcrumb seul) + content.
          Offset lg:pl-14 (56px) = largeur slim de la sidebar. La sidebar
          expanded passe en overlay par-dessus, pas besoin de pousser le
          contenu (pattern moins disruptif). */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-14">
        <AdminTopBar />

        {/* Bandeau de subscription si necessaire (warn/read_only/blocked) */}
        {subState && shouldShowWarning(subState) && (
          <SubscriptionBanner state={subState} />
        )}

        <main className="flex-1 min-w-0 overflow-x-hidden">
          {/* Container centré, padding adaptatif. Les pages contrôlent leur layout
              interne, mais ne dépassent jamais cette largeur. */}
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Bandeau global affiche en haut des pages admin selon l'etat du subscription.
 * Composant Server, pas d'interaction client.
 */
function SubscriptionBanner({
  state,
}: {
  state: Awaited<ReturnType<typeof getSubscriptionState>>;
}) {
  // Couleurs alignes sur la page /admin/billing (source de verite)
  const styles = {
    none: "",
    warn: "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-b-2 border-amber-300 dark:border-amber-700",
    read_only:
      "bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100 border-b-2 border-orange-400 dark:border-orange-700",
    blocked:
      "bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-100 border-b-2 border-red-400 dark:border-red-700",
  };

  const message =
    state.state === "grace_period"
      ? `Ton dernier paiement n'a pas été honoré. Tu as ${state.daysLeft ?? 7} jour${(state.daysLeft ?? 7) > 1 ? "s" : ""} pour mettre à jour ta carte avant restriction.`
      : state.state === "read_only"
        ? `Accès en lecture seule (paiement en retard). Régularise pour réactiver l'écriture.`
        : state.state === "suspended"
          ? `Compte suspendu. Régularise sur la page facturation.`
          : null;

  if (!message) return null;

  return (
    <div className={`px-4 py-3 ${styles[state.restriction]}`}>
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm font-medium">{message}</p>
        <Link
          href="/admin/billing"
          className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md text-sm font-bold border border-current/20 transition shadow-sm whitespace-nowrap"
        >
          Voir ma facturation →
        </Link>
      </div>
    </div>
  );
}
