"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form de lancement de campagne phishing.
//
// Ciblage (mai 2026) : 3 modes possibles, mutuellement exclusifs cote UX
// (le form utilise le 1er non vide dans cet ordre) :
//   1. Groupes metier (compta, rh, dev, comex...) — recommandé, structuré
//   2. Service legacy (User.service string libre) — fallback compat
//   3. Tous les apprenants actifs — par defaut

import { useTransition, useState } from "react";
import { launchCampaign } from "@/app/admin/phishing/actions";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import clsx from "clsx";

export type GroupOption = {
  slug: string;
  name: string;
  emoji: string;
  memberCount: number;
};

export default function LaunchCampaignForm({
  services,
  groups,
}: {
  services: string[];
  groups: GroupOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("FAKE_MICROSOFT");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const toggleGroup = (slug: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const onSubmit = async (formData: FormData) => {
    setFeedback(null);
    formData.set("template", selected);
    // Le multi-select des groupes : on ajoute un entry par groupe selectionne
    // (FormData.getAll("groupSlugs") cote serveur retournera l'array)
    selectedGroups.forEach((slug) => formData.append("groupSlugs", slug));
    startTransition(async () => {
      try {
        const res = await launchCampaign(formData);
        if (!res.ok) {
          const msgByError: Record<string, string> = {
            no_targets:
              "Aucune cible trouvée. Vérifie ton ciblage (groupes, service, ou utilisateurs actifs).",
            invalid_template: "Template invalide.",
            smtp_not_configured:
              "Aucun SMTP configuré pour ton tenant. Va sur /admin/smtp pour le paramétrer (ou nous contacter pour une prestation au forfait).",
            smtp_decrypt_failed:
              "Erreur de déchiffrement du password SMTP. Re-saisis-le dans /admin/smtp.",
            unauthorized: "Session expirée, reconnecte-toi.",
            forbidden: "Tu n'as pas les droits pour lancer une campagne.",
          };
          setFeedback({
            type: "err",
            msg: msgByError[res.error] ?? res.message ?? "Lancement impossible.",
          });
          return;
        }
        if (res.simulated) {
          setFeedback({
            type: "ok",
            msg: `🎭 Mode démo : campagne créée vers ${res.targets} cible${res.targets > 1 ? "s" : ""} (pas d'envoi réel).`,
          });
        } else if (res.failed > 0) {
          setFeedback({
            type: "ok",
            msg: `🚀 Campagne lancée : ${res.sent}/${res.targets} envoyé(s), ${res.failed} échec(s). Vérifie /admin/smtp si beaucoup d'échecs.`,
          });
        } else {
          setFeedback({
            type: "ok",
            msg: `🚀 Campagne lancée : ${res.sent} email${res.sent > 1 ? "s" : ""} envoyé${res.sent > 1 ? "s" : ""} via ton SMTP.`,
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue.";
        setFeedback({ type: "err", msg: `Erreur: ${msg}` });
      }
    });
  };

  const tpl = PHISHING_TEMPLATES.find((t) => t.id === selected);
  const totalGroupTargets =
    selectedGroups.size === 0
      ? null
      : groups
          .filter((g) => selectedGroups.has(g.slug))
          .reduce((s, g) => s + g.memberCount, 0);

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Template
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          {PHISHING_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={clsx(
                "text-left p-4 rounded-xl border-2 transition-all",
                selected === t.id
                  ? "border-accent-500 bg-accent-50 scale-[1.02]"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-bold text-primary-500 text-sm">
                  {t.name}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t.description}</p>
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                  t.difficulty === "easy"
                    ? "bg-green-100 text-green-700"
                    : t.difficulty === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700",
                )}
              >
                {t.difficulty === "easy"
                  ? "Facile"
                  : t.difficulty === "medium"
                    ? "Moyen"
                    : "Difficile"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CIBLAGE PAR GROUPES (recommandé) */}
      {groups.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Cibler des groupes métier
            <span className="ml-2 text-xs font-normal text-gray-500">
              (recommandé — un DAF n&apos;a pas les mêmes risques qu&apos;un dev)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const active = selectedGroups.has(g.slug);
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => toggleGroup(g.slug)}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border-2 transition-all",
                    active
                      ? "bg-accent-500 border-accent-500 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-700 hover:border-accent-300 hover:bg-accent-50",
                  )}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{g.emoji}</span>
                  <span>{g.name}</span>
                  <span
                    className={clsx(
                      "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
                      active
                        ? "bg-white/25"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {g.memberCount}
                  </span>
                </button>
              );
            })}
          </div>
          {totalGroupTargets !== null && (
            <p className="text-xs text-accent-700 mt-2 font-medium">
              👉 {totalGroupTargets} collaborateur
              {totalGroupTargets > 1 ? "s" : ""} ciblé
              {totalGroupTargets > 1 ? "s" : ""} dans{" "}
              {selectedGroups.size} groupe
              {selectedGroups.size > 1 ? "s" : ""}.
            </p>
          )}
        </div>
      )}

      {/* CIBLAGE LEGACY PAR SERVICE (string libre) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
          {selectedGroups.size > 0
            ? "Ou cibler par service (legacy, ignoré si des groupes sont sélectionnés)"
            : "Ou cibler par service (legacy)"}
        </summary>
        <div className="mt-2">
          <select
            name="service"
            disabled={selectedGroups.size > 0}
            className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Tous les collaborateurs actifs</option>
            {services.map((s) => (
              <option key={s} value={s}>
                Service : {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 italic mt-1">
            Le champ service est libre (saisi en CSV import). Pour un
            ciblage structuré, utilise les groupes ci-dessus.
          </p>
        </div>
      </details>

      {tpl && (
        <details className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
          <summary className="cursor-pointer font-medium">
            Aperçu de l&apos;email piégé
          </summary>
          <div className="mt-2 space-y-1">
            <p>
              <strong>De :</strong> {tpl.emailFrom}
            </p>
            <p>
              <strong>Sujet :</strong> {tpl.emailSubject}
            </p>
            <p className="mt-2 font-bold">Marqueurs pédagogiques :</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {tpl.markers.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Lancement…" : "🚀 Lancer la campagne"}
      </button>

      {feedback && (
        <p
          className={`text-sm text-center font-medium ${feedback.type === "ok" ? "text-success" : "text-warn"}`}
        >
          {feedback.msg}
        </p>
      )}

      <p className="text-xs text-gray-400 italic text-center">
        En mode démo, les emails ne sont pas réellement envoyés. En production,
        ils partent via le SMTP configuré dans /admin/smtp avec liens trackés.
      </p>
    </form>
  );
}
