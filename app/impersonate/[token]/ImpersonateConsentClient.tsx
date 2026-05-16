"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Composant client : boutons Accepter / Refuser avec double-clic de
// confirmation pour eviter les pre-fetch automatiques par les
// clients mail (Outlook, Slack, etc.).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptImpersonation,
  rejectImpersonation,
} from "@/lib/impersonation/actions";

type Props = { token: string };

type Result = { kind: "ok" | "err"; message: string } | null;

export default function ImpersonateConsentClient({ token }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>(null);
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const onAccept = () => {
    if (!confirmingAccept) {
      setConfirmingAccept(true);
      setConfirmingReject(false);
      return;
    }
    startTransition(async () => {
      const res = await acceptImpersonation(token);
      if (res.ok) {
        setResult({
          kind: "ok",
          message:
            "Accès autorisé. L'administrateur peut maintenant consulter votre compte en lecture seule. Vous pouvez révoquer l'accès à tout moment depuis vos paramètres de sécurité.",
        });
        setTimeout(() => {
          router.push("/profil/securite");
          router.refresh();
        }, 2500);
      } else {
        setResult({ kind: "err", message: errorMessage(res.reason) });
      }
    });
  };

  const onReject = () => {
    if (!confirmingReject) {
      setConfirmingReject(true);
      setConfirmingAccept(false);
      return;
    }
    startTransition(async () => {
      const res = await rejectImpersonation(token);
      if (res.ok) {
        setResult({
          kind: "ok",
          message:
            "Demande refusée. L'administrateur n'aura pas accès à votre compte. Votre compte reste inchangé.",
        });
      } else {
        setResult({ kind: "err", message: errorMessage(res.reason) });
      }
    });
  };

  if (result) {
    return (
      <section
        className={`rounded-2xl p-6 text-center mb-6 ${
          result.kind === "ok"
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800/40"
            : "bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800/40"
        }`}
      >
        <div className="text-5xl mb-3" aria-hidden="true">
          {result.kind === "ok" ? "✅" : "⚠️"}
        </div>
        <p
          className={`font-semibold ${result.kind === "ok" ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"}`}
        >
          {result.message}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={onAccept}
          disabled={pending}
          className={`px-6 py-3 rounded-xl font-bold text-white shadow-sm transition ${
            confirmingAccept
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-primary-500 hover:bg-primary-600"
          } disabled:opacity-50`}
        >
          {confirmingAccept
            ? pending
              ? "Autorisation en cours…"
              : "✓ Confirmer l'autorisation"
            : "Autoriser l'accès en lecture"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={pending}
          className={`px-6 py-3 rounded-xl font-medium border-2 transition ${
            confirmingReject
              ? "border-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100"
              : "border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          } disabled:opacity-50`}
        >
          {confirmingReject
            ? pending
              ? "Refus en cours…"
              : "✓ Confirmer le refus"
            : "Refuser"}
        </button>
      </div>
      {(confirmingAccept || confirmingReject) && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Cliquez une seconde fois pour confirmer votre choix.
        </p>
      )}
    </section>
  );
}

function errorMessage(reason: string): string {
  switch (reason) {
    case "not_found":
      return "Cette demande n'existe pas ou a déjà été utilisée.";
    case "expired":
      return "Cette demande a expiré.";
    case "already_processed":
      return "Cette demande a déjà été traitée.";
    case "wrong_account":
      return "Vous êtes connecté avec un autre compte. Reconnectez-vous avec la bonne adresse.";
    case "unauthorized":
      return "Connectez-vous pour confirmer cette action.";
    default:
      return "Une erreur est survenue. Réessayez plus tard.";
  }
}
