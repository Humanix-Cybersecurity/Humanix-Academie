// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Creation manuelle d'un tenant depuis /superadmin/tenants.
//
// POURQUOI CE MODULE
//   Le mail « Nouvelle demande d'abonnement » renvoyait vers un script
//   `npm run db:provision-tenant` qui n'existe plus, et l'image de
//   production n'embarque pas npm. Depuis le retrait de l'essai gratuit
//   (mai 2026), un tenant ne se creait donc QUE par un paiement Mollie :
//   impossible d'ouvrir un espace d'evaluation a un prospect revendeur
//   sans manipuler la base a la main.
//
//   Ce module ne touche ni a la base ni a la session : il lit et valide le
//   formulaire, construit les URL de retour et traduit les erreurs. C'est
//   la partie testable. L'action serveur (app/superadmin/tenants/actions.ts)
//   enchaine provisionTenantWithAdmin, le statut revendeur et l'invitation.

import type { PlanId } from "@/lib/plans";
import type { ProvisionError } from "@/lib/tenant-provisioning";

/** Plans qu'on peut donner a un tenant cree a la main. Starter est reserve
 *  aux comptes gratuits du tenant Communaute (cf. tenant-provisioning). */
export type PlanCreable = Exclude<PlanId, "starter">;

export type CreationTenantInput = {
  organizationName: string;
  email: string;
  adminName: string | null;
  plan: PlanCreable;
  /** Accorder le statut revendeur (marque blanche multi-clients) d'emblee. */
  revendeur: boolean;
  /** Envoyer le lien de connexion a l'admin des la creation. */
  envoyerInvitation: boolean;
};

export type ErreurCreationTenant =
  | "nom_invalide"
  | "email_invalide"
  | "plan_invalide"
  | ProvisionError;

export type LectureFormulaire =
  | { ok: true; input: CreationTenantInput }
  | { ok: false; erreur: ErreurCreationTenant };

const PLANS_CREABLES = new Set<PlanCreable>(["pro", "enterprise"]);

/** Meme regle pragmatique que tenant-provisioning : un seul @, pas
 *  d'espace, un domaine avec un point. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function champ(formData: FormData, nom: string): string {
  return String(formData.get(nom) ?? "").trim();
}

export function lireFormulaireCreationTenant(
  formData: FormData,
): LectureFormulaire {
  const organizationName = champ(formData, "org");
  if (organizationName.length < 2 || organizationName.length > 120) {
    return { ok: false, erreur: "nom_invalide" };
  }
  const email = champ(formData, "email").toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, erreur: "email_invalide" };
  }
  const planBrut = champ(formData, "plan");
  if (!PLANS_CREABLES.has(planBrut as PlanCreable)) {
    return { ok: false, erreur: "plan_invalide" };
  }
  const adminName = champ(formData, "adminName").slice(0, 120) || null;
  return {
    ok: true,
    input: {
      organizationName,
      email,
      adminName,
      plan: planBrut as PlanCreable,
      revendeur: formData.get("revendeur") === "on",
      envoyerInvitation: formData.get("invitation") === "on",
    },
  };
}

export const MESSAGES_ERREUR: Record<ErreurCreationTenant, string> = {
  nom_invalide:
    "Le nom de l'organisation doit faire entre 2 et 120 caractères.",
  email_invalide: "L'adresse e-mail de l'admin est invalide.",
  plan_invalide:
    "Le plan doit être Pro ou Enterprise : Starter est réservé aux comptes gratuits du tenant Communauté.",
  invalid_email: "L'adresse e-mail de l'admin est invalide.",
  invalid_plan:
    "Le plan doit être Pro ou Enterprise : Starter est réservé aux comptes gratuits du tenant Communauté.",
  email_already_on_other_tenant:
    "Cette adresse a déjà un compte sur un autre tenant. Un compte gratuit sur le tenant Communauté compte aussi : utilisez une autre adresse, ou supprimez ce compte d'abord.",
  community_slug_collision:
    "Ce nom produit le même identifiant que le tenant Communauté. Choisissez un autre nom.",
  invalid_state:
    "Un tenant lié à ce client de paiement existe déjà dans un état inattendu. Voir les journaux.",
  db_error:
    "La création a échoué en base. Rien n'a été créé ; voir les journaux du serveur.",
};

export function messageErreurCreationTenant(code: string): string {
  return (
    MESSAGES_ERREUR[code as ErreurCreationTenant] ??
    "La création a échoué pour une raison inattendue. Voir les journaux du serveur."
  );
}

/**
 * URL du formulaire, prerempli. Sert au mail de demande d'abonnement (lien
 * direct vers le formulaire) et au retour d'erreur (on ne perd pas la
 * saisie). Les champs vides sont omis ; `plan` ne passe que s'il est
 * creable, sinon le formulaire retombe sur sa valeur par defaut.
 */
export function urlFormulaireCreationTenant(
  valeurs: {
    org?: string | null;
    email?: string | null;
    adminName?: string | null;
    plan?: string | null;
    revendeur?: boolean;
    erreur?: string | null;
  } = {},
): string {
  const qs = new URLSearchParams({ nouveau: "1" });
  if (valeurs.org) qs.set("org", valeurs.org);
  if (valeurs.email) qs.set("email", valeurs.email);
  if (valeurs.adminName) qs.set("adminName", valeurs.adminName);
  if (valeurs.plan && PLANS_CREABLES.has(valeurs.plan as PlanCreable)) {
    qs.set("nplan", valeurs.plan);
  }
  if (valeurs.revendeur) qs.set("revendeur", "1");
  if (valeurs.erreur) qs.set("erreur", valeurs.erreur);
  return `/superadmin/tenants?${qs.toString()}`;
}
