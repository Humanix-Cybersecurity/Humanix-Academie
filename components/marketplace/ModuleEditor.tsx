"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDraft, submitForReview, deleteDraft } from "@/app/admin/contributions/actions";
import { ALLOWED_CATEGORIES } from "@/lib/marketplace/schema";

type Choice = { id: string; label: string; outcome: "good" | "bad" | "neutral"; feedback: string; points: number };
type QuizChoice = { id: string; label: string; correct: boolean };
type QuizQ = { question: string; choices: QuizChoice[]; explanation: string };
type Episode = {
  title: string;
  durationMinutes: number;
  scenario: string;
  choices: Choice[];
  debrief: string;
  quiz: QuizQ[];
  xpReward: number;
};

type Module = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  language: "fr";
  authorOrgName: string;
  license: "CC_BY" | "CC_BY_SA";
  payload: { episodes: Episode[] };
};

const EMPTY_CHOICE = (i: number): Choice => ({
  id: `c${i}`,
  label: "",
  outcome: "neutral",
  feedback: "",
  points: 0,
});
const EMPTY_QUIZ_CHOICE = (i: number): QuizChoice => ({ id: `q${i}`, label: "", correct: false });
const EMPTY_QUIZ = (): QuizQ => ({
  question: "",
  choices: [
    { ...EMPTY_QUIZ_CHOICE(1), correct: true },
    EMPTY_QUIZ_CHOICE(2),
  ],
  explanation: "",
});
const EMPTY_EPISODE = (): Episode => ({
  title: "",
  durationMinutes: 6,
  scenario: "",
  choices: [
    { ...EMPTY_CHOICE(1), outcome: "good", points: 30 },
    EMPTY_CHOICE(2),
  ],
  debrief: "",
  quiz: [EMPTY_QUIZ()],
  xpReward: 50,
});
const EMPTY_MODULE: Module = {
  slug: "",
  title: "",
  description: "",
  emoji: "🎯",
  category: "phishing",
  difficulty: "medium",
  language: "fr",
  authorOrgName: "",
  license: "CC_BY_SA",
  payload: { episodes: [EMPTY_EPISODE()] },
};

export default function ModuleEditor(props: {
  mode: "create" | "edit" | "view";
  moduleId?: string;
  initialData?: Module;
  currentStatus?: string;
}) {
  const [data, setData] = useState<Module>(props.initialData ?? EMPTY_MODULE);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string; issues?: { path: string; message: string }[] } | null>(null);
  const router = useRouter();
  const readonly = props.mode === "view";

  const onSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const r = await saveDraft({ moduleId: props.moduleId, data });
      if (r.ok) {
        setFeedback({ type: "ok", msg: "✓ Brouillon sauvegardé" });
        if (!props.moduleId) router.push(`/admin/contributions/${r.moduleId}`);
      } else {
        if (r.error === "validation_failed") {
          setFeedback({ type: "err", msg: "Validation échouée — corrige les champs ci-dessous", issues: r.issues });
        } else if (r.error === "slug_taken") {
          setFeedback({ type: "err", msg: "Ce slug est déjà utilisé. Choisis-en un autre." });
        } else {
          setFeedback({ type: "err", msg: "Erreur de sauvegarde." });
        }
      }
    });
  };

  const onSubmit = () => {
    if (!props.moduleId) {
      alert("Sauvegarde-le d'abord en brouillon.");
      return;
    }
    if (!confirm("Soumettre ce module à la modération ? Tu ne pourras plus l'éditer tant qu'un modérateur n'a pas tranché.")) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await submitForReview(props.moduleId!);
        setFeedback({ type: "ok", msg: "🎉 Soumis à la modération. Tu seras notifié de la décision." });
        setTimeout(() => router.refresh(), 600);
      } catch (e: any) {
        const m = e?.message ?? "";
        if (m === "rate_limited") setFeedback({ type: "err", msg: "Limite atteinte : 5 soumissions max par 24h." });
        else setFeedback({ type: "err", msg: "Soumission impossible — sauvegarde d'abord." });
      }
    });
  };

  const onDelete = () => {
    if (!props.moduleId) return;
    if (!confirm("Supprimer ce brouillon définitivement ?")) return;
    startTransition(async () => {
      try {
        await deleteDraft(props.moduleId!);
        router.push("/admin/contributions");
      } catch {
        setFeedback({ type: "err", msg: "Suppression impossible." });
      }
    });
  };

  // Helpers d'edition
  const update = (patch: Partial<Module>) => setData((d) => ({ ...d, ...patch }));
  const updateEp = (i: number, patch: Partial<Episode>) =>
    setData((d) => ({ ...d, payload: { episodes: d.payload.episodes.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) } }));
  const addEpisode = () =>
    setData((d) => ({ ...d, payload: { episodes: [...d.payload.episodes, EMPTY_EPISODE()] } }));
  const removeEpisode = (i: number) =>
    setData((d) => ({ ...d, payload: { episodes: d.payload.episodes.filter((_, idx) => idx !== i) } }));

  const generateSlug = () => {
    const slug = data.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    update({ slug });
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-2xl p-4 ${
            feedback.type === "ok" ? "bg-success/10 border-2 border-success" : "bg-red-50 border-2 border-red-300"
          }`}
        >
          <p className={`font-bold ${feedback.type === "ok" ? "text-success" : "text-warn"}`}>{feedback.msg}</p>
          {feedback.issues && (
            <ul className="text-xs text-red-800 mt-2 list-disc pl-5 space-y-0.5">
              {feedback.issues.map((iss, i) => (
                <li key={i}>
                  <code>{iss.path}</code> — {iss.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* METADONNEES */}
      <Section title="📋 Identité du module">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Titre" value={data.title} onChange={(v) => update({ title: v })} disabled={readonly} required />
          <div className="flex gap-2">
            <Input label="Slug (URL)" value={data.slug} onChange={(v) => update({ slug: v })} disabled={readonly} placeholder="ex: phishing-avance" />
            {!readonly && (
              <button type="button" onClick={generateSlug} className="text-xs self-end mb-3 text-accent-500 hover:text-accent-600 whitespace-nowrap">
                🪄 auto
              </button>
            )}
          </div>
        </div>
        <Textarea label="Description" value={data.description} onChange={(v) => update({ description: v })} disabled={readonly} rows={2} placeholder="Une phrase qui résume l'apport du module" />
        <div className="grid sm:grid-cols-4 gap-3">
          <Input label="Emoji" value={data.emoji} onChange={(v) => update({ emoji: v })} disabled={readonly} maxLength={4} />
          <Select label="Catégorie" value={data.category} onChange={(v) => update({ category: v })} disabled={readonly}
            options={ALLOWED_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Select label="Difficulté" value={data.difficulty} onChange={(v) => update({ difficulty: v as any })} disabled={readonly}
            options={[
              { value: "easy", label: "Facile" },
              { value: "medium", label: "Moyenne" },
              { value: "hard", label: "Difficile" },
            ]} />
          <Select label="Licence" value={data.license} onChange={(v) => update({ license: v as any })} disabled={readonly}
            options={[
              { value: "CC_BY", label: "CC-BY" },
              { value: "CC_BY_SA", label: "CC-BY-SA" },
            ]} />
        </div>
        <Input label="Organisation (optionnel)" value={data.authorOrgName} onChange={(v) => update({ authorOrgName: v })} disabled={readonly} placeholder="Ex: ACME Cybersecurity" />
      </Section>

      {/* EPISODES */}
      <Section title={`📚 Épisodes (${data.payload.episodes.length}/10)`}>
        {data.payload.episodes.map((ep, i) => (
          <EpisodeBlock
            key={i}
            episode={ep}
            index={i}
            readonly={readonly}
            onUpdate={(patch) => updateEp(i, patch)}
            onRemove={data.payload.episodes.length > 1 ? () => removeEpisode(i) : null}
          />
        ))}
        {!readonly && data.payload.episodes.length < 10 && (
          <button type="button" onClick={addEpisode} className="btn-secondary w-full text-sm">
            + Ajouter un épisode
          </button>
        )}
      </Section>

      {/* ACTIONS */}
      {!readonly && (
        <div className="card sticky bottom-4 shadow-lg flex flex-wrap gap-2 justify-between items-center">
          <div className="text-xs text-gray-500">
            Statut : <strong>{props.currentStatus ?? "Nouveau"}</strong>
          </div>
          <div className="flex gap-2 flex-wrap">
            {props.moduleId && (
              <button onClick={onDelete} disabled={pending} className="btn-secondary text-sm py-2 px-3 border-warn text-warn hover:bg-red-50">
                Supprimer
              </button>
            )}
            <button onClick={onSave} disabled={pending} className="btn-secondary text-sm py-2 px-4">
              {pending ? "Sauvegarde…" : "💾 Sauvegarder brouillon"}
            </button>
            <button onClick={onSubmit} disabled={pending || !props.moduleId} className="btn-primary text-sm py-2 px-5">
              {pending ? "Soumission…" : "🚀 Soumettre à modération"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Sub-components =====

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h3 className="font-bold text-primary-500 text-lg">{title}</h3>
      {children}
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; required?: boolean; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 block mb-1">{props.label}{props.required && " *"}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-accent-500 focus:outline-none disabled:bg-gray-50"
      />
    </label>
  );
}

function Textarea(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 block mb-1">{props.label}</span>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-accent-500 focus:outline-none disabled:bg-gray-50 resize-y"
      />
      <span className="text-[10px] text-gray-400">{props.value.length} caractères</span>
    </label>
  );
}

function Select<T extends string>(props: { label: string; value: T; onChange: (v: T) => void; disabled?: boolean; options: { value: T; label: string }[] }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 block mb-1">{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        disabled={props.disabled}
        className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-accent-500 focus:outline-none bg-white disabled:bg-gray-50"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function EpisodeBlock(props: {
  episode: Episode;
  index: number;
  readonly: boolean;
  onUpdate: (patch: Partial<Episode>) => void;
  onRemove: (() => void) | null;
}) {
  const ep = props.episode;
  const update = props.onUpdate;

  const updateChoice = (i: number, patch: Partial<Choice>) =>
    update({ choices: ep.choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const addChoice = () => {
    if (ep.choices.length >= 4) return;
    update({ choices: [...ep.choices, { ...EMPTY_CHOICE(ep.choices.length + 1) }] });
  };
  const removeChoice = (i: number) => {
    if (ep.choices.length <= 2) return;
    update({ choices: ep.choices.filter((_, idx) => idx !== i) });
  };

  const updateQuiz = (i: number, patch: Partial<QuizQ>) =>
    update({ quiz: ep.quiz.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) });
  const addQuiz = () => ep.quiz.length < 5 && update({ quiz: [...ep.quiz, EMPTY_QUIZ()] });
  const removeQuiz = (i: number) => ep.quiz.length > 1 && update({ quiz: ep.quiz.filter((_, idx) => idx !== i) });

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-primary-500">Épisode {props.index + 1}</h4>
        {props.onRemove && !props.readonly && (
          <button onClick={props.onRemove} className="text-xs text-warn hover:underline">
            Retirer cet épisode
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input label="Titre épisode" value={ep.title} onChange={(v) => update({ title: v })} disabled={props.readonly} required />
        </div>
        <Input label="Durée (min)" value={ep.durationMinutes.toString()} onChange={(v) => update({ durationMinutes: Math.max(3, Math.min(15, parseInt(v) || 6)) })} disabled={props.readonly} />
      </div>
      <Textarea label="Scénario / mise en situation" value={ep.scenario} onChange={(v) => update({ scenario: v })} disabled={props.readonly} rows={4} placeholder="Pose le décor, plante le contexte. Pas de HTML." />

      {/* Choix */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Choix proposés ({ep.choices.length}/4)</p>
        <div className="space-y-2">
          {ep.choices.map((c, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-gray-200 space-y-2">
              <div className="grid sm:grid-cols-[1fr_120px_80px_auto] gap-2 items-end">
                <Input label={`Option ${i + 1}`} value={c.label} onChange={(v) => updateChoice(i, { label: v })} disabled={props.readonly} />
                <Select label="Issue"
                  value={c.outcome}
                  onChange={(v) => updateChoice(i, { outcome: v as any })}
                  disabled={props.readonly}
                  options={[
                    { value: "good", label: "✓ Bon" },
                    { value: "bad", label: "✗ Mauvais" },
                    { value: "neutral", label: "→ Neutre" },
                  ]}
                />
                <Input label="Points" value={c.points.toString()} onChange={(v) => updateChoice(i, { points: parseInt(v) || 0 })} disabled={props.readonly} />
                {!props.readonly && ep.choices.length > 2 && (
                  <button onClick={() => removeChoice(i)} className="text-warn text-xs mb-3">✕</button>
                )}
              </div>
              <Textarea label="Feedback affiché à l'apprenant" value={c.feedback} onChange={(v) => updateChoice(i, { feedback: v })} disabled={props.readonly} rows={2} />
            </div>
          ))}
        </div>
        {!props.readonly && ep.choices.length < 4 && (
          <button onClick={addChoice} className="text-xs text-accent-500 hover:underline mt-2">+ ajouter un choix</button>
        )}
      </div>

      <Textarea label="Débrief expert (Hex explique)" value={ep.debrief} onChange={(v) => update({ debrief: v })} disabled={props.readonly} rows={4} />

      {/* Quiz */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Quiz éclair ({ep.quiz.length}/5)</p>
        <div className="space-y-3">
          {ep.quiz.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl p-3 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-primary-500">Question {qi + 1}</p>
                {!props.readonly && ep.quiz.length > 1 && (
                  <button onClick={() => removeQuiz(qi)} className="text-warn text-xs">✕ retirer</button>
                )}
              </div>
              <Input label="Question" value={q.question} onChange={(v) => updateQuiz(qi, { question: v })} disabled={props.readonly} />
              <div className="space-y-2">
                {q.choices.map((qc, qci) => (
                  <div key={qci} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${props.index}-${qi}`}
                      checked={qc.correct}
                      onChange={() => updateQuiz(qi, {
                        choices: q.choices.map((c, idx) => ({ ...c, correct: idx === qci })),
                      })}
                      disabled={props.readonly}
                      className="flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={qc.label}
                      onChange={(e) => updateQuiz(qi, {
                        choices: q.choices.map((c, idx) => idx === qci ? { ...c, label: e.target.value } : c),
                      })}
                      placeholder={`Réponse ${qci + 1}`}
                      disabled={props.readonly}
                      className="flex-1 rounded-lg border border-gray-200 p-2 text-sm focus:border-accent-500 focus:outline-none disabled:bg-gray-50"
                    />
                    {!props.readonly && q.choices.length > 2 && (
                      <button
                        onClick={() => updateQuiz(qi, { choices: q.choices.filter((_, idx) => idx !== qci) })}
                        className="text-warn text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {!props.readonly && q.choices.length < 4 && (
                  <button
                    onClick={() => updateQuiz(qi, {
                      choices: [...q.choices, { ...EMPTY_QUIZ_CHOICE(q.choices.length + 1) }],
                    })}
                    className="text-xs text-accent-500 hover:underline"
                  >
                    + ajouter une réponse
                  </button>
                )}
              </div>
              <Textarea label="Explication (affichée après la réponse)" value={q.explanation} onChange={(v) => updateQuiz(qi, { explanation: v })} disabled={props.readonly} rows={2} />
            </div>
          ))}
          {!props.readonly && ep.quiz.length < 5 && (
            <button onClick={addQuiz} className="text-xs text-accent-500 hover:underline">+ ajouter une question quiz</button>
          )}
        </div>
      </div>
    </div>
  );
}
