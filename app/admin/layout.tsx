// =============================================================================
// app/admin/layout.tsx — Layout console dirigeant
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
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/AdminSidebar";
import AdminTopBar from "@/components/AdminTopBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Vérification rôle au layout : protège TOUTES les pages /admin/* d'un coup
  // (defense-in-depth en plus du middleware existant).
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    redirect("/apprendre");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex bg-gray-50/50 dark:bg-slate-900/50">
      {/* Sidebar slim — icons-only desktop, drawer mobile */}
      <AdminSidebar />

      {/* Zone principale : top bar (breadcrumb seul) + content */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-14">
        <AdminTopBar />

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
