// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form client de /admin/automations : 2 toggles + bouton enregistrer.
//
// Volontairement minimaliste : ce sont des choix de politique cyber,
// pas un terrain de jeu UX. Chaque toggle a une description claire de
// la consequence pour l'user (RSSI doit savoir ce qu'il signe).

"use client";

import { useState, useTransition } from "react";
import { updateAutomations } from "@/app/admin/automations/actions";

type Initial = {
  autoForce2FAAfterPhishingClick: boolean;
  autoRevokeSessionAfterPhishingClick: boolean;
};

export default function AutomationsForm({ initial }: { initial: Initial }) {
  const [pending, startTransition] = useTransition();
  const [force2FA, setForce2FA] = useState(initial.autoForce2FAAfterPhishingClick);
  const [revokeSession, setRevokeSession] = useState(
    initial.autoRevokeSessionAfterPhishingClick,
  );
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData();
    if (force2FA) formData.set("autoForce2FAAfterPhishingClick", "on");
    if (revokeSession) formData.set("autoRevokeSessionAfterPhishingClick", "on");
    startTransition(async () => {
      const res = await updateAutomations(formData);
      if (res.ok) {
        setFeedback({ type: "ok", msg: "✅ Automations enregistrées." });
      } else {
        setFeedback({
          type: "err",
          msg: `Erreur : ${res.error}`,
        });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ToggleRow
        checked={force2FA}
        onChange={setForce2FA}
        title="Forcer la 2FA au prochain login"
        consequence="Si l'user n'a pas encore configuré le 2FA, on positionne User.mfaForced=true. Au prochain login, il devra configurer le 2FA pour pouvoir continuer à utiliser ses comptes pro."
        impact="Impact moyen - l'user doit consacrer 2-3 min pour configurer son authenticator avant sa prochaine session."
      />
      <ToggleRow
        checked={revokeSession}
        onChange={setRevokeSession}
        title="Révoquer toutes les sessions actives"
        consequence="Toutes les Session NextAuth de l'user sont supprimées (déconnexion forcée de tous les devices). Au prochain accès, il devra se reconnecter."
        impact="Impact moyen - l'user voit ses applications déconnectées, doit re-saisir ses identifiants. Combiné avec le toggle 2FA, c'est une remédiation forte mais saine."
      />

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary text-sm px-5 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {feedback && (
          <span
            className={`text-sm font-medium ${feedback.type === "ok" ? "text-success" : "text-warn"}`}
          >
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  consequence,
  impact,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  consequence: string;
  impact: string;
}) {
  return (
    <label className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-accent-300 transition cursor-pointer bg-white dark:bg-slate-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 accent-accent-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
          {consequence}
        </p>
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 italic">
          {impact}
        </p>
      </div>
    </label>
  );
}
