// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/revendeur - Portail revendeur (white-label multi-clients).
// Gate : ADMIN/RSSI/SUPERADMIN + tenant revendeur (isReseller) + plan
// white_label. Permet de créer et lister des tenants CLIENTS enfants, chacun
// en marque blanche. Le branding du revendeur descend par défaut aux clients
// (cascade) ; un client peut aussi avoir sa propre marque.

import { redirect } from "next/navigation";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getResellerGate, listClients } from "@/lib/reseller";
import { getRootDomain } from "@/lib/subdomain-tenant";
import NewClientForm from "./NewClientForm";

export const dynamic = "force-dynamic";

const ERROR_LABELS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid_name: "Nom de client invalide.",
  invalid_subdomain:
    "Sous-domaine invalide (lettres, chiffres, tirets ; 2 à 40 caractères).",
  subdomain_reserved: "Ce sous-domaine est réservé. Choisissez-en un autre.",
  subdomain_taken: "Ce sous-domaine est déjà pris.",
  invalid_color: "Couleur invalide (format #RRGGBB).",
  invalid_admin_email: "Email de l'administrateur invalide.",
  admin_email_taken:
    "Cet email est déjà rattaché à un autre espace. Choisissez-en un autre.",
  slug_collision: "Impossible de générer un identifiant unique pour ce nom.",
  db_error: "Erreur lors de la création. Réessayez.",
};

export default async function RevendeurPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string; slug?: string }>;
}) {
  const { msg, error, slug } = await searchParams;
  const gate = await getResellerGate();

  // Rôle/session insuffisants : on renvoie vers l'admin sans divulguer.
  if (
    !gate.ok &&
    (gate.reason === "unauthenticated" || gate.reason === "forbidden_role")
  ) {
    redirect("/admin");
  }

  const rootDomain = getRootDomain();

  // Tenant non revendeur : message commercial (relation accordée par Humanix).
  if (!gate.ok && gate.reason === "not_reseller") {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Revendeur"
          description="Déployez la plateforme à vos propres clients, sous leur marque."
          icon="🏷️"
        />
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-6">
          <h2 className="font-display font-bold text-indigo-900 dark:text-indigo-200 mb-2">
            Programme revendeur
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Le mode revendeur vous permet de créer et gérer des espaces clients
            en marque blanche (votre logo et vos couleurs, ou ceux de chaque
            client), chacun avec ses propres administrateurs et son
            sous-domaine.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Ce programme est activé par l&apos;équipe Humanix dans le cadre d&apos;un
            partenariat. Contactez-nous à{" "}
            <a
              className="text-accent-600 dark:text-accent-300 underline"
              href="mailto:contact@humanix-cybersecurity.fr?subject=Programme%20revendeur"
            >
              contact@humanix-cybersecurity.fr
            </a>{" "}
            pour en bénéficier.
          </p>
        </div>
      </div>
    );
  }

  // Revendeur sans plan white_label : il faut Enterprise.
  if (!gate.ok && gate.reason === "plan_required") {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Revendeur"
          description="Déployez la plateforme à vos propres clients, sous leur marque."
          icon="🏷️"
        />
        <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/15 p-6">
          <h2 className="font-display font-bold text-amber-900 dark:text-amber-200 mb-2">
            Plan Enterprise requis
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Le portail revendeur (marque blanche) nécessite un plan Enterprise.
            Contactez l&apos;équipe Humanix pour activer la fonctionnalité.
          </p>
        </div>
      </div>
    );
  }

  // À partir d'ici gate.ok === true.
  if (!gate.ok) redirect("/admin");

  const clients = await listClients(gate.tenantId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Revendeur"
        description="Créez et gérez vos espaces clients en marque blanche. Votre marque descend automatiquement à vos clients ; chacun peut aussi avoir la sienne."
        icon="🏷️"
      />

      {/* Flash */}
      {msg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/15 p-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {msg === "created" &&
            `✓ Client créé${slug ? ` (${slug})` : ""}.`}
          {msg === "created-invited" &&
            `✓ Client créé${slug ? ` (${slug})` : ""} et invitation envoyée à son administrateur.`}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/15 p-3 text-sm text-rose-900 dark:text-rose-200"
        >
          ⚠ {ERROR_LABELS[error] ?? "Une erreur est survenue."}
        </div>
      )}

      {/* Création d'un client */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-1">
          Nouveau client
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Renseignez au minimum le nom. Laissez la marque vide pour que le
          client hérite de la vôtre. L&apos;email administrateur reçoit un lien
          d&apos;activation (lien magique, sans mot de passe).
        </p>
        <NewClientForm rootDomain={rootDomain} resellerName={gate.tenant.name} />
      </section>

      {/* Liste des clients */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-4">
          Mes clients ({clients.length})
        </h2>
        {clients.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun client pour l&apos;instant. Créez le premier ci-dessus.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-slate-800">
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Sous-domaine</th>
                  <th className="py-2 pr-4">Marque</th>
                  <th className="py-2 pr-4">Comptes</th>
                  <th className="py-2 pr-4">État</th>
                  <th className="py-2 pr-4">Créé le</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-slate-800/60"
                  >
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4">{c.plan}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {c.brandSubdomain
                        ? `${c.brandSubdomain}.${rootDomain}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {c.brandingEnabled ? "propre" : "héritée"}
                    </td>
                    <td className="py-2 pr-4">{c.userCount}</td>
                    <td className="py-2 pr-4">
                      {c.isActive ? (
                        <span className="text-emerald-600 dark:text-emerald-300">
                          actif
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-300">
                          suspendu
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {c.createdAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/revendeur/${c.id}`}
                        className="text-accent-600 dark:text-accent-300 hover:underline"
                      >
                        Gérer →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
