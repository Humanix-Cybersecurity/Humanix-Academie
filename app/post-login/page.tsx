// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /post-login — page de routage canonique après authentification réussie.
// Server component qui :
//   - Lit la session
//   - Pas de session → redirect vers /connexion
//   - Session avec rôle ADMIN+ → /admin
//   - Session LEARNER → /apprendre
//
// Pourquoi cette page existe :
// Avant Phase 4, /connexion et /inscription envoyaient TOUS les users vers
// /apprendre. Un ADMIN qui se loggait passait donc par /apprendre puis
// devait naviguer manuellement vers /admin. Cette page centralise la
// logique : un seul callbackUrl partout = "/post-login".

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pathForRole } from "@/lib/role-redirect";

// dynamic = la décision dépend de la session, jamais cacher.
export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const role = (session.user as { role?: string }).role;
  redirect(pathForRole(role));
}
