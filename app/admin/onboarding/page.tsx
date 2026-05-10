// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/onboarding - Quick Setup Wizard.
//
// Refonte mai 2026 (Sprint 1 simplicite) : la page passe d'une checklist
// statique 3 etapes a un vrai wizard interactif 4 ecrans qui :
//   1. Profil tenant (taille / secteur / niveau cyber)
//   2. Suggestions automatiques de modules (active + obligatoires)
//   3. Invitation d'equipe en bulk (CSV-light, optionnel)
//   4. Rituel hebdomadaire + simulation phishing optionnelle
//
// Apres completion, on affiche un resume "tout est pret" avec liens vers
// les sections cles. Si l'admin a deja invite des users + active des
// saisons (= setup deja fait), on lui propose directement le resume +
// option de re-lancer le wizard.
// =============================================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import QuickSetupWizard from "@/components/admin/QuickSetupWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;
  const userId = session.user.id as string;

  // Etat actuel du tenant : a-t-il deja amorce le setup ?
  // Heuristique : 1 user invite + 1 saison active suffit a considerer
  // que le tenant est "demarre". On affiche alors le resume + lien wizard.
  const [tenant, otherUsersCount, activatedSaisonCount, currentUser] =
    await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, plan: true, createdAt: true },
      }),
      db.user.count({
        where: {
          tenantId,
          id: { not: userId },
          isActive: true,
        },
      }),
      db.tenantSaisonConfig.count({
        where: { tenantId, isActive: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true, name: true },
      }),
    ]);

  if (!tenant) redirect("/admin");

  const isFreshTenant = otherUsersCount === 0 && activatedSaisonCount === 0;

  return (
    <>
      <AdminPageHeader
        title={isFreshTenant ? "Bienvenue !" : "Premiers pas"}
        description={
          isFreshTenant
            ? `Activons votre programme dans ${tenant.name} en 4 minutes.`
            : `Suivi de configuration de ${tenant.name}. Tout peut etre relance a tout moment.`
        }
      />

      <div className="space-y-6 min-w-0 max-w-3xl">
        {isFreshTenant ? (
          <QuickSetupWizard />
        ) : (
          <>
            {/* Resume si tenant deja demarre */}
            <article className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-5">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🎉</div>
                <div>
                  <p className="font-display font-extrabold text-primary-500 dark:text-accent-300 text-xl">
                    Votre tenant est en route
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {otherUsersCount} collaborateur
                    {otherUsersCount > 1 ? "s" : ""} actif
                    {otherUsersCount > 1 ? "s" : ""} ·{" "}
                    {activatedSaisonCount} module
                    {activatedSaisonCount > 1 ? "s" : ""} active
                    {activatedSaisonCount > 1 ? "s" : ""}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition"
                >
                  Aller au tableau de bord →
                </Link>
                <Link
                  href="/admin/onboarding?reset=1"
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-medium hover:border-accent-500 transition"
                >
                  Re-lancer le wizard
                </Link>
              </div>
            </article>

            <AdminSection
              title="Etapes recommandees"
              description="Suivez ces 3 actions pour passer en mode plein."
            >
              <ol className="space-y-3">
                <ChecklistItem
                  done={otherUsersCount > 0}
                  title="Inviter votre equipe"
                  description={
                    otherUsersCount > 0
                      ? `${otherUsersCount} collaborateur${otherUsersCount > 1 ? "s" : ""} invite${otherUsersCount > 1 ? "s" : ""}.`
                      : "Au moins 1 collaborateur a inviter."
                  }
                  href="/admin/utilisateurs"
                  ctaLabel={
                    otherUsersCount > 0
                      ? "Ajouter d'autres"
                      : "Inviter le premier"
                  }
                />
                <ChecklistItem
                  done={activatedSaisonCount > 0}
                  title="Activer les modules adaptes"
                  description={
                    activatedSaisonCount > 0
                      ? `${activatedSaisonCount} module${activatedSaisonCount > 1 ? "s" : ""} active${activatedSaisonCount > 1 ? "s" : ""}. Filtres et bulk actions disponibles.`
                      : "Choisir les saisons pertinentes pour vos equipes."
                  }
                  href="/admin/modules"
                  ctaLabel={
                    activatedSaisonCount > 0
                      ? "Ajuster"
                      : "Aller au catalogue"
                  }
                />
                <ChecklistItem
                  done={!!currentUser?.mfaEnabled}
                  title="Activer la 2FA admin"
                  description="Compte admin = cle du tenant. La 2FA TOTP reduit drastiquement le risque de compromission."
                  href="/profil/securite"
                  ctaLabel={
                    currentUser?.mfaEnabled
                      ? "Gerer la 2FA"
                      : "Activer maintenant"
                  }
                />
              </ol>
            </AdminSection>

            <AdminSection
              title="Besoin d'aide ?"
              description="On accompagne tous les nouveaux tenants la premiere semaine."
            >
              <ul className="text-sm space-y-2">
                <li>
                  📚{" "}
                  <Link href="/securite" className="text-accent-700 hover:underline">
                    Trust Center / docs securite
                  </Link>
                </li>
                <li>
                  💬{" "}
                  <a
                    href="mailto:contact@humanix-cybersecurity.fr"
                    className="text-accent-700 hover:underline"
                  >
                    contact@humanix-cybersecurity.fr
                  </a>
                </li>
              </ul>
            </AdminSection>
          </>
        )}
      </div>
    </>
  );
}

// =============================================================================
// Sous-composants
// =============================================================================

function ChecklistItem({
  done,
  title,
  description,
  href,
  ctaLabel,
}: {
  done: boolean;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <li
      className={`rounded-xl border-2 p-4 flex items-start gap-4 ${
        done
          ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/15"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
        }`}
      >
        {done ? "✓" : "·"}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-primary-500 dark:text-accent-300">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {description}
        </p>
        <Link
          href={href}
          className="inline-block mt-2 text-sm text-accent-700 dark:text-accent-300 hover:underline font-medium"
        >
          {ctaLabel} →
        </Link>
      </div>
    </li>
  );
}
