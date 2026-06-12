// SPDX-License-Identifier: AGPL-3.0-or-later
// /profil/données - droits des personnes RGPD (articles 15 a 22).
//
// Permet a l'utilisateur d'exercer ses droits :
//  - Article 15 : droit d'accès (resume affiche + export complet)
//  - Article 20 : portabilite (export JSON downloadable)
//  - Article 17 : droit a l'oubli (demande d'effacement)
//  - Article 16 : rectification (geree depuis /profil)
//  - Article 21 : opposition (a traiter ad-hoc avec l'admin/RSSI)
//
// Toute action est tracee dans AuditLog (RGPD art. 5.2 accountability).
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DataRightsActions from "@/components/DataRightsActions";

export const dynamic = "force-dynamic";

export default async function DonneesPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const userId = session.user.id as string;

  const [user, progressCount, eventCount, webauthnCount, lastLogin] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          service: true,
          tenantId: true,
          role: true,
          coins: true,
          level: true,
          riskScore: true,
          createdAt: true,
          mfaEnabled: true,
          tenant: { select: { name: true, plan: true } },
        },
      }),
      db.progress.count({ where: { userId } }),
      db.event.count({ where: { userId } }),
      db.webAuthnCredential.count({ where: { userId } }),
      db.user.findUnique({
        where: { id: userId },
        select: { lastLoginAt: true, lastSeenAt: true },
      }),
    ]);

  if (!user) redirect("/connexion");

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Mon compte · RGPD
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Mes données personnelles
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Vos droits issus du Règlement Général sur la Protection des Données
          (UE 2016/679). Toute action ici est tracée dans le journal d'audit.
        </p>
      </header>

      {/* Article 15 : droit d'accès */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <header>
          <p className="text-xs uppercase tracking-widest text-accent-500 font-bold">
            Article 15 - Droit d'accès
          </p>
          <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300">
            Vue d'ensemble de vos données
          </h2>
        </header>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="Nom" value={user.name ?? "-"} />
          <Field label="Service" value={user.service ?? "-"} />
          <Field label="Rôle" value={user.role} />
          <Field label="Organisation" value={user.tenant?.name ?? "-"} />
          <Field label="Plan" value={user.tenant?.plan ?? "-"} />
          <Field label="Niveau" value={String(user.level)} />
          <Field label="Coins" value={String(user.coins)} />
          <Field
            label="Score de risque"
            value={`${user.riskScore} / 100`}
          />
          <Field
            label="2FA activée"
            value={user.mfaEnabled ? "oui" : "non"}
          />
          <Field
            label="Clés FIDO2 enregistrées"
            value={String(webauthnCount)}
          />
          <Field
            label="Compte créé"
            value={user.createdAt.toLocaleDateString("fr-FR")}
          />
          <Field
            label="Dernière connexion"
            value={
              lastLogin?.lastLoginAt
                ? lastLogin.lastLoginAt.toLocaleDateString("fr-FR")
                : "-"
            }
          />
          <Field
            label="Progression enregistrée"
            value={`${progressCount} entrée(s)`}
          />
          <Field
            label="Événements business"
            value={`${eventCount} entrée(s)`}
          />
        </dl>
      </section>

      {/* Article 20 : portabilite */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <header>
          <p className="text-xs uppercase tracking-widest text-accent-500 font-bold">
            Article 20 - Portabilité
          </p>
          <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300">
            Exporter mes données
          </h2>
        </header>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Téléchargez un export JSON de toutes vos données personnelles
          stockées par Humanix Académie : profil, progression, événements,
          notifications. Format structuré, lisible par toute application
          tierce conforme.
        </p>
        <a
          href="/profil/donnees/export"
          download
          className="btn-primary text-sm inline-block"
        >
          📥 Télécharger mes données (JSON)
        </a>
      </section>

      {/* Article 16 : rectification */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <header>
          <p className="text-xs uppercase tracking-widest text-accent-500 font-bold">
            Article 16 - Rectification
          </p>
          <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300">
            Modifier mes informations
          </h2>
        </header>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Modifiez votre nom, votre mascotte ou votre photo depuis votre
          profil. Pour le service ou le rôle, contactez votre administrateur.
        </p>
        <Link href="/profil" className="btn-secondary text-sm inline-block">
          Aller à mon profil →
        </Link>
      </section>

      {/* Article 17 : effacement */}
      <section className="rounded-2xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/15 p-5 space-y-3">
        <header>
          <p className="text-xs uppercase tracking-widest text-rose-700 dark:text-rose-300 font-bold">
            Article 17 - Droit à l'oubli
          </p>
          <h2 className="font-display text-lg font-extrabold text-rose-900 dark:text-rose-200">
            Demander l'effacement
          </h2>
        </header>
        <p className="text-sm text-rose-900 dark:text-rose-200">
          Cette action efface définitivement votre compte, vos progressions,
          vos événements et vos clés de sécurité. Une trace agrégée et
          anonymisée peut être conservée pour des obligations légales (preuve
          de formation, durée légale de conservation des logs sécurité).
        </p>
        <DataRightsActions
          userEmail={user.email}
          tenantName={user.tenant?.name ?? "votre organisation"}
        />
      </section>

      <p className="text-xs text-gray-500 italic text-center">
        Pour toute question RGPD, contactez{" "}
        <a
          href="mailto:dpo@humanix-cybersecurity.fr"
          className="underline"
        >
          dpo@humanix-cybersecurity.fr
        </a>
        .
      </p>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
        {label}
      </dt>
      <dd className="font-medium text-gray-900 dark:text-gray-100 break-words">
        {value}
      </dd>
    </div>
  );
}
