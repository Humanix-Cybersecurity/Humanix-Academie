// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server action de mise a jour des infos personnelles (nom + service).
//
// SECURITE :
//   - Auth requise (sinon redirect login)
//   - Email JAMAIS modifiable : c'est l'identifiant unique cote Auth.js +
//     anti-piratage (changer l'email permettrait de voler un compte par
//     un attaquant qui aurait la session)
//   - Validation des longueurs cote serveur (defense en profondeur)
//   - Audit log USER_UPDATED a chaque succès
//
// Champs modifiables :
//   - name    : nom complet / pseudo affiche partout (header, leaderboard,
//               certificat, dirigeant view)
//   - service : departement / équipe (texte libre, optionnel)
//
// Champs NON modifiables ici (geres ailleurs) :
//   - email          : identifiant unique (cf. /profil/données pour suppression)
//   - role           : geree par admin via /admin/utilisateurs
//   - tenantId       : pas de cross-tenant
//   - mascotSpecies  : /profil/mascotte
//   - password / mfa : /profil/sécurité

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditOutcomes } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

const NAME_MAX_LENGTH = 100;
const SERVICE_MAX_LENGTH = 100;

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfileInfo(
  formData: FormData,
): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session?.user) {
    redirect(getSignInPath());
  }
  const userId = session!.user!.id as string;

  // Sanitize : trim + cap longueur. On accepte chaine vide pour service
  // (= effacer le service), mais le name doit avoir au moins 2 chars
  // non-blancs (sinon on tombe dans des bonjours "Bonjour, .").
  const rawName = String(formData.get("name") ?? "").trim();
  const rawService = String(formData.get("service") ?? "").trim();
  // Prenom + nom REELS, optionnels (utilises seulement pour le certificat).
  // Chaine vide autorisee = effacer (revient au pseudo).
  const rawFirstName = String(formData.get("firstName") ?? "").trim();
  const rawLastName = String(formData.get("lastName") ?? "").trim();

  if (!rawName || rawName.length < 2) {
    return {
      ok: false,
      error:
        "Le nom doit contenir au moins 2 caractères (espaces de début/fin ignorés).",
    };
  }
  if (rawName.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le nom est trop long (maximum ${NAME_MAX_LENGTH} caractères).`,
    };
  }
  if (rawService.length > SERVICE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le service est trop long (maximum ${SERVICE_MAX_LENGTH} caractères).`,
    };
  }
  if (
    rawFirstName.length > NAME_MAX_LENGTH ||
    rawLastName.length > NAME_MAX_LENGTH
  ) {
    return {
      ok: false,
      error: `Prénom / nom trop long (maximum ${NAME_MAX_LENGTH} caractères).`,
    };
  }

  // Read l'etat actuel pour ne logger que les vrais changements (et éviter
  // un USER_UPDATED bruyant a chaque clic Save).
  const before = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      firstName: true,
      lastName: true,
      service: true,
      email: true,
      tenantId: true,
      role: true,
    },
  });
  if (!before) {
    return { ok: false, error: "Compte introuvable." };
  }

  const newName = rawName;
  const newService = rawService === "" ? null : rawService;
  const newFirstName = rawFirstName === "" ? null : rawFirstName;
  const newLastName = rawLastName === "" ? null : rawLastName;

  if (
    before.name === newName &&
    before.service === newService &&
    before.firstName === newFirstName &&
    before.lastName === newLastName
  ) {
    // No-op : on ne touche pas la BDD ni l'audit log.
    revalidatePath("/profil");
    revalidatePath("/profil/infos");
    return { ok: true };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name: newName,
      service: newService,
      firstName: newFirstName,
      lastName: newLastName,
    },
  });

  // Audit log : ne logue que les diffs reels.
  //
  // PII : firstName/lastName sont l'identite civile REELLE de la personne. On
  // ne les ecrit PAS en clair dans l'AuditLog (qui a sa propre retention) -
  // minimisation RGPD art. 5.1.c. On consigne uniquement la TRANSITION (ajout /
  // suppression / modification) via un marqueur "[défini]", ce qui garde un
  // audit exploitable sans dupliquer la donnee. Le pseudo `name`, lui, est
  // public (affiche partout) : on le journalise en clair, sans enjeu.
  const redactPII = (v: string | null): string | null => (v ? "[défini]" : null);
  const changes: Record<string, { from: string | null; to: string | null }> = {};
  if (before.name !== newName) {
    changes.name = { from: before.name, to: newName };
  }
  if (before.service !== newService) {
    changes.service = { from: before.service, to: newService };
  }
  if (before.firstName !== newFirstName) {
    changes.firstName = {
      from: redactPII(before.firstName),
      to: redactPII(newFirstName),
    };
  }
  if (before.lastName !== newLastName) {
    changes.lastName = {
      from: redactPII(before.lastName),
      to: redactPII(newLastName),
    };
  }

  await auditLog({
    action: AuditAction.USER_UPDATED,
    outcome: AuditOutcomes.SUCCESS,
    actor: {
      userId,
      email: before.email,
      role: before.role,
    },
    target: { type: "user", id: userId },
    tenantId: before.tenantId,
    metadata: { source: "self", changes },
  });

  // Revalide les pages qui affichent ces champs
  revalidatePath("/profil");
  revalidatePath("/profil/infos");
  revalidatePath("/apprendre");
  revalidatePath("/admin");

  return { ok: true };
}
