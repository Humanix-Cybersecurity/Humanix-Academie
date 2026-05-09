// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire d'edition des infos personnelles. Client component pour gerer
// l'etat pending / erreur / succes apres submit du server action.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileInfo } from "./actions";

const NAME_MAX = 100;
const SERVICE_MAX = 100;

export default function ProfileInfoForm({
  initialName,
  initialService,
  email,
  emailVerified,
}: {
  initialName: string;
  initialService: string;
  email: string;
  emailVerified: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [service, setService] = useState(initialService);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const router = useRouter();

  // Detect dirty state pour activer/griser le bouton Save
  const dirty = name.trim() !== initialName.trim() || service.trim() !== initialService.trim();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await updateProfileInfo(fd);
      if (res.ok) {
        setFeedback({
          kind: "success",
          message: "✓ Tes informations ont été mises à jour.",
        });
        // Refresh server components qui affichent name/service
        router.refresh();
      } else {
        setFeedback({ kind: "error", message: res.error });
      }
    } catch (err: unknown) {
      const code = (err as { digest?: string } | null)?.digest;
      if (typeof code === "string" && code.startsWith("NEXT_REDIRECT")) {
        // Le server action a fait un redirect (session expiree), on laisse
        // remonter pour que Next.js suive.
        throw err;
      }
      setFeedback({
        kind: "error",
        message: "Une erreur est survenue. Réessaye dans quelques instants.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 shadow-sm p-5 sm:p-6 space-y-5"
      noValidate
    >
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 text-sm rounded-xl p-3 ${
            feedback.kind === "error"
              ? "bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100"
              : "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100"
          }`}
        >
          <span aria-hidden="true">
            {feedback.kind === "error" ? "⚠️" : "✅"}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Email — readonly */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1"
        >
          Email{" "}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            (non modifiable)
          </span>
        </label>
        <div className="relative">
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            aria-describedby="email-help"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-3 text-sm text-gray-600 dark:text-gray-300 cursor-not-allowed"
          />
          {emailVerified && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 text-sm font-bold"
              aria-label="Email vérifié"
              title="Email vérifié"
            >
              ✓
            </span>
          )}
        </div>
        <p
          id="email-help"
          className="text-xs text-gray-500 dark:text-gray-400 mt-1.5"
        >
          {emailVerified
            ? "Ton email est vérifié. C'est l'identifiant utilisé pour la connexion."
            : "Email non vérifié — connecte-toi via le lien magique pour le valider."}
        </p>
      </div>

      {/* Nom (= pseudo affiche partout) */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1"
        >
          Nom affiché{" "}
          <span className="text-warn" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Prénom Nom (ou pseudo)"
          className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:outline-none transition"
          aria-describedby="name-help"
        />
        <p
          id="name-help"
          className="text-xs text-gray-500 dark:text-gray-400 mt-1.5"
        >
          Apparaît dans ton espace, dans le classement, sur tes certificats
          PDF, et est visible des admins de ton organisation.
        </p>
      </div>

      {/* Service / Equipe */}
      <div>
        <label
          htmlFor="service"
          className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1"
        >
          Service / équipe{" "}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            (optionnel)
          </span>
        </label>
        <input
          id="service"
          name="service"
          type="text"
          maxLength={SERVICE_MAX}
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="Ex : RH, Compta, Direction, IT…"
          className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:outline-none transition"
          aria-describedby="service-help"
        />
        <p
          id="service-help"
          className="text-xs text-gray-500 dark:text-gray-400 mt-1.5"
        >
          Permet aux admins de filtrer les progressions par service. Laisse
          vide si tu ne souhaites pas le renseigner.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <span className="animate-pulse" aria-hidden="true">
                ⏳
              </span>
              Enregistrement…
            </>
          ) : (
            <>
              <span aria-hidden="true">💾</span>
              Enregistrer
            </>
          )}
        </button>
        {dirty && !pending && (
          <button
            type="button"
            onClick={() => {
              setName(initialName);
              setService(initialService);
              setFeedback(null);
            }}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
