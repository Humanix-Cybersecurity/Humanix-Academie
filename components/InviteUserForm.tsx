"use client";
import { useTransition, useState } from "react";
import { inviteUser } from "@/app/admin/actions";

export default function InviteUserForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const onSubmit = async (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        await inviteUser(formData);
        setFeedback({ type: "ok", msg: "Invitation envoyée avec succès." });
        // reset
        const form = document.querySelector(
          "#invite-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } catch (e: any) {
        const msg =
          e?.message === "email_taken"
            ? "Cet email est déjà inscrit dans la PME."
            : e?.message === "invalid_email"
              ? "Email invalide."
              : "Impossible d'inviter cet utilisateur.";
        setFeedback({ type: "err", msg });
      }
    });
  };

  return (
    <form
      id="invite-form"
      action={onSubmit}
      className="space-y-3"
      aria-describedby="invite-feedback invite-help"
    >
      <p id="invite-help" className="text-xs text-gray-700 dark:text-gray-300">
        Champs marqués <span className="text-warn">*</span> obligatoires.
      </p>

      <div>
        <label
          htmlFor="invite-name"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Prénom et nom
        </label>
        <input
          id="invite-name"
          name="name"
          type="text"
          placeholder="Prénom Nom"
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="invite-email"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Email professionnel{" "}
          <span className="text-warn" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          aria-required="true"
          placeholder="prenom@masociete.fr"
          autoComplete="email"
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="invite-service"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Service
        </label>
        <input
          id="invite-service"
          name="service"
          type="text"
          placeholder="Compta, Commercial, RH…"
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="invite-role"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Rôle
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="LEARNER"
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm bg-white dark:bg-slate-800"
        >
          <option value="LEARNER">🎓 Apprenant</option>
          <option value="MANAGER">👔 Manager</option>
          <option value="ADMIN">🛡️ Admin</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="btn-primary w-full text-sm"
      >
        {pending ? "Envoi…" : "Envoyer l'invitation"}
      </button>

      {/* Feedback annoncé aux lecteurs d'écran (aria-live polite) */}
      <div
        id="invite-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback && (
          <p
            className={`text-sm text-center font-medium ${
              feedback.type === "ok" ? "text-success" : "text-warn"
            }`}
          >
            {feedback.type === "ok" ? "✓ " : "✗ "}
            {feedback.msg}
          </p>
        )}
      </div>
    </form>
  );
}
