"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form de lancement de campagne phishing.
//
// Ciblage (mai 2026, etendu juin 2026 avec recipient lists) :
// 4 modes possibles, mutuellement exclusifs cote UX
// (le form utilise le 1er non vide dans cet ordre) :
//   1. Recipient list (juin 2026 Phase 3 v2) — cohorte CSV importee
//   2. Groupes metier (compta, rh, dev, comex...) — recommandé, structuré
//   3. Service legacy (User.service string libre) — fallback compat
//   4. Tous les apprenants actifs — par defaut

import { useTransition, useState } from "react";
import { launchCampaign } from "@/app/admin/phishing/actions";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import clsx from "clsx";
import Link from "next/link";

export type GroupOption = {
  slug: string;
  name: string;
  emoji: string;
  memberCount: number;
};

export type RecipientListOption = {
  id: string;
  name: string;
  description: string | null;
  recipientCount: number;
};

export default function LaunchCampaignForm({
  services,
  groups,
  lists = [],
}: {
  services: string[];
  groups: GroupOption[];
  lists?: RecipientListOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("FAKE_MICROSOFT");
  // Phase 7a (juin 2026) : A/B variants. Si abTestEnabled : on affiche un
  // 2eme selecteur de template et on transmet templateB au server action.
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [selectedB, setSelectedB] = useState<string>("FAKE_COLISSIMO");
  // Phase 7b (juin 2026) : drip campaigns. Si dripEnabled : on transmet
  // dripDays au server action et le cron etalera les envois.
  const [dripEnabled, setDripEnabled] = useState(false);
  const [dripDays, setDripDays] = useState(3);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedListId, setSelectedListId] = useState<string>("");
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
    // Phase 7a : si A/B active, transmet le 2eme template au server action.
    // Le serveur split deterministe les targets (hash(userId) % 2) entre
    // variant A et B et envoie le bon template a chaque target.
    if (abTestEnabled && selectedB && selectedB !== selected) {
      formData.set("templateB", selectedB);
    }
    // Phase 7b : si drip active, transmet le nombre de jours d'etalement.
    // Le serveur cree les results avec dripScheduledAt etale en round-robin
    // et le cron /api/cron/phishing-drip envoie les mails au fur et a mesure.
    if (dripEnabled && dripDays >= 1) {
      formData.set("dripDays", String(dripDays));
    }
    // Priorite UX : list > groups > service > all. Le serveur respecte le
    // meme ordre via les champs FormData : si listId est present, le reste
    // est ignore (cf. actions.ts launchCampaign).
    if (selectedListId) {
      formData.set("listId", selectedListId);
    } else {
      // Pas de liste : on transmet les groupes selectionnes
      selectedGroups.forEach((slug) => formData.append("groupSlugs", slug));
    }
    startTransition(async () => {
      try {
        const res = await launchCampaign(formData);
        if (!res.ok) {
          const msgByError: Record<string, string> = {
            no_targets:
              "Aucune cible trouvée. Vérifie ton ciblage (liste, groupes, service, ou utilisateurs actifs).",
            invalid_template: "Template invalide.",
            smtp_not_configured:
              "Aucun SMTP configuré pour ton tenant. Va sur /admin/smtp pour le paramétrer (ou nous contacter pour une prestation au forfait).",
            smtp_decrypt_failed:
              "Erreur de déchiffrement du password SMTP. Re-saisis-le dans /admin/smtp.",
            unauthorized: "Session expirée, reconnecte-toi.",
            forbidden: "Tu n'as pas les droits pour lancer une campagne.",
            list_not_found:
              "Liste introuvable ou supprimée. Vérifie sur /admin/phishing/lists.",
          };
          setFeedback({
            type: "err",
            msg: msgByError[res.error] ?? res.message ?? "Lancement impossible.",
          });
          return;
        }
        // Phase 3 v2 : message specifique si entries externes skippees
        const skipNote = res.skippedExternal
          ? ` (${res.skippedExternal} email${res.skippedExternal > 1 ? "s" : ""} de la liste ignoré${res.skippedExternal > 1 ? "s" : ""} car non rattaché${res.skippedExternal > 1 ? "s" : ""} à un compte utilisateur)`
          : "";
        // Phase 7a : message specifique si A/B test active
        const variantNote = res.variantSplit
          ? ` — Split A/B : ${res.variantSplit.a} variant A / ${res.variantSplit.b} variant B`
          : "";
        // Phase 7b : message specifique si drip active
        const dripNote = res.dripPending
          ? ` — ⏱️ ${res.dripPending} mail${res.dripPending > 1 ? "s" : ""} planifie${res.dripPending > 1 ? "s" : ""} pour les prochains jours (envoyes par le cron)`
          : "";
        if (res.simulated) {
          setFeedback({
            type: "ok",
            msg: `🎭 Mode démo : campagne créée vers ${res.targets} cible${res.targets > 1 ? "s" : ""} (pas d'envoi réel)${skipNote}${variantNote}${dripNote}.`,
          });
        } else if (res.failed > 0) {
          setFeedback({
            type: "ok",
            msg: `🚀 Campagne lancée : ${res.sent}/${res.targets} envoyé(s), ${res.failed} échec(s)${skipNote}${variantNote}${dripNote}. Vérifie /admin/smtp si beaucoup d'échecs.`,
          });
        } else {
          setFeedback({
            type: "ok",
            msg: `🚀 Campagne lancée : ${res.sent} email${res.sent > 1 ? "s" : ""} envoyé${res.sent > 1 ? "s" : ""} via ton SMTP${skipNote}${variantNote}${dripNote}.`,
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

      {/* A/B TEST TOGGLE (Phase 7a, juin 2026)
          Active un 2eme selecteur de template. Les targets sont split
          deterministe 50/50 par hash(userId) % 2 cote server. Permet de
          comparer 2 lures sur la meme audience. */}
      <div className="rounded-xl border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/30 dark:bg-fuchsia-950/20 p-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={abTestEnabled}
            onChange={(e) => setAbTestEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="font-bold text-fuchsia-800 dark:text-fuchsia-200">
            🧪 Test A/B (envoyer 2 templates en parallele)
          </span>
        </label>
        {abTestEnabled && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-fuchsia-700 dark:text-fuchsia-300">
              Les destinataires seront divises 50/50 (split deterministe).
              Le dashboard de campagne affichera les metrics cote a cote pour
              identifier le template qui convertit le mieux.
            </p>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
              Template B (variant) :
            </label>
            <select
              value={selectedB}
              onChange={(e) => setSelectedB(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 p-2 text-sm bg-white dark:bg-slate-900"
            >
              {PHISHING_TEMPLATES.filter((t) => t.id !== selected).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name} ({t.difficulty})
                </option>
              ))}
            </select>
            {selectedB === selected && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Le template B doit etre different du template A pour que
                le test ait du sens.
              </p>
            )}
          </div>
        )}
      </div>

      {/* DRIP CAMPAIGN TOGGLE (Phase 7b, juin 2026)
          Etale les envois sur N jours pour eviter la "vague" qui eveille
          les soupcons internes. Distribution round-robin deterministe. */}
      <div className="rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20 p-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={dripEnabled}
            onChange={(e) => setDripEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="font-bold text-orange-800 dark:text-orange-200">
            ⏱️ Etaler les envois sur plusieurs jours (drip campaign)
          </span>
        </label>
        {dripEnabled && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Repartit les envois en round-robin sur N jours. Evite la
              vague &quot;tout le monde a recu le meme mail bizarre en meme
              temps&quot; qui casse la pedagogie en open space.
            </p>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
              Etalement sur{" "}
              <strong className="tabular-nums text-orange-700 dark:text-orange-300">
                {dripDays} jour{dripDays > 1 ? "s" : ""}
              </strong>{" "}
              :
            </label>
            <input
              type="range"
              min={1}
              max={14}
              step={1}
              value={dripDays}
              onChange={(e) => setDripDays(parseInt(e.target.value, 10))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-orange-600 dark:text-orange-400">
              <span>1j (rapide)</span>
              <span>7j (recommande)</span>
              <span>14j (max)</span>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300 italic">
              Les premieres cibles recoivent immediatement (J0), les
              suivantes sont planifiees pour le cron qui les envoie au fur
              et a mesure (/api/cron/phishing-drip, planifie 1x/heure).
            </p>
          </div>
        )}
      </div>

      {/* CIBLAGE PAR RECIPIENT LIST (Phase 3 v2, juin 2026) */}
      {lists.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Cibler une liste de destinataires
            <span className="ml-2 text-xs font-normal text-gray-500">
              (cohorte ad-hoc importee via CSV — prioritaire si selectionnee)
            </span>
          </label>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm bg-white"
          >
            <option value="">— Pas de liste, utiliser le ciblage ci-dessous —</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                📋 {l.name} ({l.recipientCount} destinataire
                {l.recipientCount > 1 ? "s" : ""})
                {l.description ? ` — ${l.description}` : ""}
              </option>
            ))}
          </select>
          {selectedListId && (
            <p className="text-xs text-accent-700 mt-2 font-medium">
              👉 Cette liste sera ciblée en priorité. Les autres modes
              (groupes / service) seront ignorés.
            </p>
          )}
          <p className="text-xs text-gray-500 italic mt-1">
            <Link
              href="/admin/phishing/lists"
              className="underline hover:text-accent-500"
            >
              Gérer mes listes →
            </Link>
          </p>
        </div>
      )}

      {/* CIBLAGE PAR GROUPES (recommandé). Desactive si une liste est selectionnee. */}
      {groups.length > 0 && (
        <div className={selectedListId ? "opacity-40 pointer-events-none" : ""}>
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

      {/* CIBLAGE LEGACY PAR SERVICE (string libre). Desactive si liste OU groupes selectionnes. */}
      <details className={`text-sm ${selectedListId ? "opacity-40 pointer-events-none" : ""}`}>
        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
          {selectedListId
            ? "Ou cibler par service (ignoré si une liste est sélectionnée)"
            : selectedGroups.size > 0
              ? "Ou cibler par service (legacy, ignoré si des groupes sont sélectionnés)"
              : "Ou cibler par service (legacy)"}
        </summary>
        <div className="mt-2">
          <select
            name="service"
            disabled={selectedGroups.size > 0 || !!selectedListId}
            className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Tous les collaborateurs actifs</option>
            {services.map((s) => (
              <option key={s} value={s}>
                Service : {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 italic mt-1">
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

      <p className="text-xs text-gray-500 italic text-center">
        En mode démo, les emails ne sont pas réellement envoyés. En production,
        ils partent via le SMTP configuré dans /admin/smtp avec liens trackés.
      </p>
    </form>
  );
}
