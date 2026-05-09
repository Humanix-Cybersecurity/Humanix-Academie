// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/automations
//
// Configuration des automations de remediation declenchees apres le
// clic sur un phishing simule. C'est de l'OPT-IN STRICTE : par defaut
// rien n'est active, parce que ces actions ont des consequences
// concretes pour l'user (forcer 2FA = il doit le configurer au prochain
// login pour pouvoir bosser).
//
// Le RSSI active selon sa politique cyber. Le bandeau d'alerte rouge en
// haut de la page le previent que ce sont des actions reelles, pas
// pedagogiques.
//
// Auth : ADMIN, RSSI, SUPERADMIN

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import AutomationsForm from "@/components/admin/AutomationsForm";

export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      autoForce2FAAfterPhishingClick: true,
      autoRevokeSessionAfterPhishingClick: true,
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automations cyber"
        description="Actions automatiques déclenchées après un événement à risque (clic phishing, incident). OPT-IN strict : rien n'est activé par défaut."
        icon="⚙️"
      />

      {/* Bandeau de cadrage : ces toggles ont des consequences reelles */}
      <article className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
        <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-2 mb-2">
          <span aria-hidden="true">⚠️</span>
          Ces actions touchent l&apos;expérience de tes collaborateurs
        </h3>
        <p className="text-xs text-amber-900/90 dark:text-amber-100/90 leading-relaxed">
          Activer une automation veut dire que dès qu&apos;un user clique sur
          un phishing simulé, l&apos;action s&apos;applique automatiquement.
          Communique-le clairement (charte, CSE, FAQ) avant d&apos;activer.
          Inactif par défaut, désactivable à tout moment.
        </p>
      </article>

      <AdminSection
        title="Remédiation post-clic phishing"
        description="Actions appliquées au collaborateur qui clique sur un mail piégé simulé."
      >
        <AutomationsForm
          initial={{
            autoForce2FAAfterPhishingClick:
              tenant?.autoForce2FAAfterPhishingClick ?? false,
            autoRevokeSessionAfterPhishingClick:
              tenant?.autoRevokeSessionAfterPhishingClick ?? false,
          }}
        />
      </AdminSection>

      <AdminSection
        title="Ce qui est déjà actif (et ne se désactive pas)"
        description="Les automations pédagogiques de base, livrées avec la plateforme."
      >
        <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <Item
            icon="🎯"
            title="Mini-module flash 2 min"
            text="Quand un user clique sur un phishing simulé, on lui propose immédiatement un mini-module ciblé (2 min) pour ancrer le bon réflexe avant la rechute."
          />
          <Item
            icon="📨"
            title="Webhook temps réel RSSI"
            text="L'événement phishing.user_clicked est dispatché aux webhooks abonnés (Slack/Teams) avec userName + template + lien. Configure les webhooks dans /admin/integrations."
          />
          <Item
            icon="🌱"
            title="Auto-assignation parcours obligatoire"
            text="Tout nouveau collaborateur (SCIM, CSV import, invitation) est automatiquement enrôlé dans les saisons obligatoires du tenant à sa création."
          />
          <Item
            icon="📈"
            title="Snapshot quotidien du score humain"
            text="Le score humain agrégé du tenant est photographié chaque nuit pour le graphe d'évolution 90 jours dans /admin/impact."
          />
          <Item
            icon="📧"
            title="Relances automatiques inactifs"
            text="Les collaborateurs sans activité depuis 7+ jours reçoivent un email de rappel chaleureux signé Hex (cron quotidien)."
          />
        </ul>
      </AdminSection>
    </div>
  );
}

function Item({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="text-xl flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="font-bold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {text}
        </p>
      </div>
    </li>
  );
}
