"use client";

// Formulaire CRUD anecdote - reutilise pour creation et edition.
// Utilise une server action via prop pour soumettre.

import { useState } from "react";
import Link from "next/link";
import { upsertAnecdote } from "@/app/admin/anecdotes/actions";

const CATEGORIES = [
  { value: "RANSOMWARE", label: "🔒 Rançongiciel" },
  { value: "PHISHING", label: "🎣 Phishing" },
  { value: "FRAUDE", label: "💸 Fraude" },
  { value: "DATA_LEAK", label: "📤 Fuite de données" },
  { value: "SUPPLY_CHAIN", label: "🔗 Supply chain" },
  { value: "HACKTIVISME", label: "🚩 Hacktivisme" },
  { value: "IA_ABUS", label: "🤖 Abus IA" },
  { value: "AUTRE", label: "🛡 Autre" },
];

export type AnecdoteEditorData = {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string;
  lesson?: string;
  miniAction?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  category?: string;
  incidentDate?: string; // YYYY-MM-DD
  scheduledFor?: string | null; // YYYY-MM-DD
  isActive?: boolean;
};

export default function AnecdoteEditor({
  initial,
  isEdit,
}: {
  initial: AnecdoteEditorData;
  isEdit: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    try {
      await upsertAnecdote(formData);
    } catch (e: any) {
      // L'action redirect() throw aussi, on filtre uniquement les vraies erreurs
      const msg = String(e?.message ?? e);
      if (msg.includes("NEXT_REDIRECT")) return;
      setError(msg);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          ⚠ {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Slug *" htmlFor="slug" hint="URL : /anecdotes/[slug]">
          <input
            id="slug"
            name="slug"
            type="text"
            defaultValue={initial.slug ?? ""}
            required
            pattern="[a-z0-9-]+"
            className="input"
            placeholder="ex: chu-corbeil-2022"
          />
        </Field>

        <Field label="Catégorie *" htmlFor="category">
          <select
            id="category"
            name="category"
            defaultValue={initial.category ?? "AUTRE"}
            className="input"
            required
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Titre * (max 200 car.)" htmlFor="title">
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={initial.title ?? ""}
          required
          maxLength={200}
          className="input"
          placeholder="Le CHU de Corbeil paralysé 5 semaines par un rançongiciel"
        />
      </Field>

      <Field
        label="Ce qui s'est passé * (résumé en 3-4 lignes)"
        htmlFor="summary"
      >
        <textarea
          id="summary"
          name="summary"
          defaultValue={initial.summary ?? ""}
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          className="input"
          placeholder="Date, type d'attaque, impact concret. Faits, pas opinions."
        />
      </Field>

      <Field label="La leçon * (1-2 phrases percutantes)" htmlFor="lesson">
        <textarea
          id="lesson"
          name="lesson"
          defaultValue={initial.lesson ?? ""}
          required
          minLength={20}
          maxLength={2000}
          rows={3}
          className="input"
          placeholder="Ce que ça nous apprend, pourquoi ça concerne le lecteur."
        />
      </Field>

      <Field
        label="Mini-action de la semaine * (concrète, faisable aujourd'hui)"
        htmlFor="miniAction"
      >
        <textarea
          id="miniAction"
          name="miniAction"
          defaultValue={initial.miniAction ?? ""}
          required
          minLength={20}
          maxLength={2000}
          rows={3}
          className="input"
          placeholder="Demandez à votre prestataire IT : « À quand remonte le dernier test de restauration ? »"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="URL source presse *" htmlFor="sourceUrl">
          <input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            defaultValue={initial.sourceUrl ?? ""}
            required
            className="input"
            placeholder="https://www.lemonde.fr/..."
          />
        </Field>
        <Field label="Label source *" htmlFor="sourceLabel">
          <input
            id="sourceLabel"
            name="sourceLabel"
            type="text"
            defaultValue={initial.sourceLabel ?? ""}
            required
            maxLength={120}
            className="input"
            placeholder="Le Monde, mars 2024"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date de l'incident *" htmlFor="incidentDate">
          <input
            id="incidentDate"
            name="incidentDate"
            type="date"
            defaultValue={initial.incidentDate ?? ""}
            required
            className="input"
          />
        </Field>
        <Field
          label="Lundi d'envoi programmé (optionnel)"
          htmlFor="scheduledFor"
        >
          <input
            id="scheduledFor"
            name="scheduledFor"
            type="date"
            defaultValue={initial.scheduledFor ?? ""}
            className="input"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial.isActive ?? true}
        />
        <span>Active (visible dans la file d'attente)</span>
      </label>

      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <button type="submit" className="btn-primary">
          {isEdit ? "💾 Enregistrer" : "➕ Créer l'anecdote"}
        </button>
        <Link href="/admin/anecdotes" className="btn-secondary">
          Annuler
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
      )}
    </div>
  );
}
