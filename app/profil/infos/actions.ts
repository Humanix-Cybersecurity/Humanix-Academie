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
//   - Audit log USER_UPDATED a chaque succes
//
// Champs modifiables :
//   - name    : nom complet / pseudo affiche partout (header, leaderboard,
//               certificat, dirigeant view)
//   - service : departement / equipe (texte libre, optionnel)
//
// Champs NON modifiables ici (geres ailleurs) :
//   - email          : identifiant unique (cf. /profil/donnees pour suppression)
//   - role           : geree par admin via /admin/utilisateurs
//   - tenantId       : pas de cross-tenant
//   - mascotSpecies  : /profil/mascotte
//   - password / mfa : /profil/securite

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

  // Read l'etat actuel pour ne logger que les vrais changements (et eviter
  // un USER_UPDATED bruyant a chaque clic Save).
  const before = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, service: true, email: true, tenantId: true, role: true },
  });
  if (!before) {
    return { ok: false, error: "Compte introuvable." };
  }

  const newName = rawName;
  const newService = rawService === "" ? null : rawService;

  if (before.name === newName && before.service === newService) {
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
    },
  });

  // Audit log : ne logue que les diffs reels.
  const changes: Record<string, { from: string | null; to: string | null }> = {};
  if (before.name !== newName) {
    changes.name = { from: before.name, to: newName };
  }
  if (before.service !== newService) {
    changes.service = { from: before.service, to: newService };
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
