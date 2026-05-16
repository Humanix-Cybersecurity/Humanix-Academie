"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bouton « Sortir » : cloture la session « Voir en tant que » et
// redirige l'admin vers la liste des utilisateurs.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { endImpersonation } from "@/lib/impersonation/actions";

export default function EndImpersonationButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (
      !confirm(
        "Mettre fin à la session de consultation ? Vous n'aurez plus accès au compte de cet utilisateur (sauf nouvelle demande d'autorisation).",
      )
    )
      return;
    startTransition(async () => {
      await endImpersonation(sessionId, "admin_ended");
      router.push("/admin/utilisateurs");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-sm font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition"
    >
      {pending ? "Fermeture…" : "Sortir de la session"}
    </button>
  );
}
