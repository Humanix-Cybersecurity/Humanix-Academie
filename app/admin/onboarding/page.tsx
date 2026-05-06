// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/onboarding - checklist guidee pour les nouveaux tenants.
//
// Affiche les etapes restantes a un nouvel admin pour passer "actif" :
//  1. Inviter au moins 1 utilisateur
//  2. Choisir une saison obligatoire
//  3. Activer la 2FA admin
//
// Chaque etape est cliquable -> redirige vers la page concernee.
// Une fois toutes faites, la page propose de marquer l'onboarding comme
// termine (et le menu n'affiche plus de notification "Onboarding 2/3").
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

type StepStatus = "done" | "todo";
type Step = {
  id: string;
  status: StepStatus;
  title: string;
  description: string;
  cta: { label: string; href: string };
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;
  const userId = session.user.id as string;

  const [tenant, otherUsersCount, mandatorySaisonCount, currentUser] =
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
        where: { tenantId, isMandatory: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true, name: true },
      }),
    ]);

  if (!tenant) redirect("/admin");

  const steps: Step[] = [
    {
      id: "invite-users",
      status: otherUsersCount > 0 ? "done" : "todo",
      title: "Inviter votre équipe",
      description:
        "Au moins 1 collaborateur doit être invité pour commencer la sensibilisation.",
      cta: {
        label:
          otherUsersCount > 0
            ? `${otherUsersCount} utilisateur(s) - ajouter d'autres`
            : "Inviter le premier collaborateur",
        href: "/admin/utilisateurs",
      },
    },
    {
      id: "mandatory-saison",
      status: mandatorySaisonCount > 0 ? "done" : "todo",
      title: "Choisir une saison obligatoire",
      description:
        "Une saison cochée comme obligatoire devient prioritaire dans le parcours de chaque collaborateur.",
      cta: {
        label:
          mandatorySaisonCount > 0
            ? `${mandatorySaisonCount} saison(s) - ajuster`
            : "Aller au catalogue",
        href: "/admin/modules",
      },
    },
    {
      id: "admin-mfa",
      status: currentUser?.mfaEnabled ? "done" : "todo",
      title: "Activer la 2FA sur votre compte admin",
      description:
        "Compte admin = clé du tenant. La 2FA TOTP réduit drastiquement le risque de compromission.",
      cta: {
        label: currentUser?.mfaEnabled
          ? "Gérer la 2FA"
          : "Activer maintenant",
        href: "/profil/securite",
      },
    },
  ];

  const doneCount = steps.filter((s) => s.status === "done").length;
  const completed = doneCount === steps.length;

  return (
    <>
      <AdminPageHeader
        title="Bienvenue !"
        description={`Premiers pas dans ${tenant.name}. Trois étapes pour activer votre programme.`}
      />

      <div className="space-y-6 min-w-0">
        {/* Banner global */}
        <article
          className={`rounded-2xl border-2 p-5 ${
            completed
              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-accent-200 dark:border-accent-900/40 bg-accent-50/40 dark:bg-accent-900/15"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">{completed ? "🎉" : "🚀"}</div>
            <div>
              <p className="font-display font-extrabold text-primary-500 dark:text-accent-300 text-xl">
                {completed
                  ? "Tout est prêt !"
                  : `${doneCount} / ${steps.length} étape(s) complétée(s)`}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {completed
                  ? "Votre tenant est en ordre de marche. Vous pouvez aller au tableau de bord."
                  : "Quelques minutes pour transformer un tenant vide en programme actif."}
              </p>
            </div>
          </div>
          {completed && (
            <Link
              href="/admin"
              className="btn-primary text-sm mt-4 inline-block"
            >
              Aller au tableau de bord →
            </Link>
          )}
        </article>

        {/* Etapes */}
        <AdminSection
          title="Checklist"
          description="Cochez en faisant. Chaque étape est cliquable."
        >
          <ol className="space-y-3">
            {steps.map((s, idx) => (
              <li
                key={s.id}
                className={`rounded-xl border-2 p-4 flex items-start gap-4 ${
                  s.status === "done"
                    ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/15"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <div
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${
                    s.status === "done"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {s.status === "done" ? "✓" : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-primary-500 dark:text-accent-300">
                    {s.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {s.description}
                  </p>
                  <Link
                    href={s.cta.href}
                    className="inline-block mt-2 text-sm text-accent-700 dark:text-accent-300 hover:underline font-medium"
                  >
                    {s.cta.label} →
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </AdminSection>

        <AdminSection
          title="Besoin d'aide ?"
          description="Contactez-nous, on accompagne tous les nouveaux tenants la première semaine."
        >
          <ul className="text-sm space-y-2">
            <li>
              📚{" "}
              <Link href="/securite" className="text-accent-700 hover:underline">
                Trust Center / docs sécurité
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
      </div>
    </>
  );
}
