// SPDX-License-Identifier: AGPL-3.0-or-later
// Layout super-admin : reserve aux operateurs Humanix Cybersecurity
// (role=SUPERADMIN). Tout autre role est redirige vers son admin metier.
//
// Cette section est cross-tenant : un SUPERADMIN voit tous les tenants
// de la plateforme, contrairement a /admin qui est scope au tenant courant.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "SUPERADMIN") {
    // Un admin metier ne doit pas voir cette section.
    redirect(role === "ADMIN" || role === "MANAGER" || role === "RSSI" ? "/admin" : "/apprendre");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50/50 dark:bg-slate-900/50">
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-lg" aria-hidden="true">⭐</span>
            <p className="font-display font-bold text-primary-500 dark:text-accent-300">
              Console super-admin Humanix
            </p>
            <span className="text-[10px] uppercase tracking-widest font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 rounded-full">
              cross-tenant
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/superadmin"
              className="text-gray-700 dark:text-gray-200 hover:text-accent-500 font-medium"
            >
              Vue d'ensemble
            </Link>
            <Link
              href="/superadmin/tenants"
              className="text-gray-700 dark:text-gray-200 hover:text-accent-500 font-medium"
            >
              Tenants
            </Link>
            <Link
              href="/admin"
              className="text-xs text-gray-500 hover:text-accent-500 underline"
            >
              ← Console admin métier
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
