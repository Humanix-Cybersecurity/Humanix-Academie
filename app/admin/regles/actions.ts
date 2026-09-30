"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Enregistrement des regles de l'organisation (type, nom, signataire, seance,
// adoption). La validation est dans lib/regles-organisation/formulaire.ts.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { lireFormulaireRegles } from "@/lib/regles-organisation/formulaire";
import {
  enregistrerRegles,
  lireEtatRegles,
} from "@/lib/regles-organisation/etat";

export async function enregistrerReglesAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin?error=forbidden");
  }
  const tenantId = session.user.tenantId as string;
  const lu = lireFormulaireRegles(formData);
  if (!lu.ok) redirect(`/admin/regles?erreur=${lu.erreur}`);

  const avant = await lireEtatRegles(tenantId);
  await enregistrerRegles(tenantId, lu.input, {
    userId: session.user.id as string,
    email: session.user.email ?? undefined,
    role,
  });
  revalidatePath("/admin/regles");
  revalidatePath("/regles");
  revalidatePath("/apprendre");
  const nouvelleAdoption = lu.input.adoptee && !avant.adopteeLe;
  redirect(`/admin/regles?msg=${nouvelleAdoption ? "adoptee" : "enregistre"}`);
}
