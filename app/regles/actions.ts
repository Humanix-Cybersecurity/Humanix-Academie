"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Attestation de lecture des regles par la personne connectee.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/lib/auth";
import { attesterLecture } from "@/lib/regles-organisation/etat";

export async function attesterLectureAction() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const resultat = await attesterLecture(session.user.tenantId as string, {
    userId: session.user.id as string,
    email: session.user.email ?? undefined,
    role: session.user.role,
  });
  revalidatePath("/regles");
  revalidatePath("/apprendre");
  revalidatePath("/admin/regles");
  redirect(`/regles?msg=${resultat}`);
}
