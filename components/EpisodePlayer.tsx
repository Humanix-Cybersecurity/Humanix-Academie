"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Player d'episode - refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// 4 etapes : Scenario → Debrief → Quiz → Recap (avec confettis)
// + Detection level-up via reponse API et overlay
//
// Toute la mecanique est preservee : keyboard shortcuts, LiveRegion a11y,
// announce, persistance /api/progress, level-up overlay, confettis.
// Cette refonte change uniquement la presentation pour incarner la
// maitrise tranquille (couleurs douces, ton chaleureux, cascade
// animations, citation finale signature).
//
// Changements editoriaux :
//   "Mise en situation"     → "L'histoire du jour"
//   "Que fais-tu ?"         → "Tu fais quoi ?"
//   "✗ Aïe…" + bg-warn rouge → "🌿 Pas grave, on apprend" + amber chaud
//   "Bravo, c'est dans la boite !" → "Bravo, tu en as fini avec celui-la"
//   Ajout citation finale "Hex veille" sur le recap

import { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import type { Choice, QuizQuestion } from "@/lib/episodes";
import HexMascotEvolved from "@/components/HexMascotEvolved";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import TTSButton from "@/components/TTSButton";
import FormattedText from "@/components/FormattedText";
import LiveRegion from "@/components/a11y/LiveRegion";
import { useAnnouncer } from "@/lib/a11y";

type Step = "scenario" | "debrief" | "quiz" | "recap";

// Citations rotatives selon le score quiz - pas la meme philosophie selon
// le niveau de maitrise atteint. Toutes chaleureuses, jamais jugeantes.
const RECAP_CITATIONS = {
  perfect: "« Tu n'as pas a etre expert. Tu as juste a etre averti une seconde avant le clic. C'est exactement ce que tu viens de faire. »",
  good: "« La maitrise cyber, c'est moins une affaire d'expert qu'une habitude tranquille. Tu construis cette habitude. »",
  partial: "« Le meilleur reflexe cyber, c'est de prendre 30 secondes avant d'agir. Tu en es deja capable. »",
  low: "« Apprendre la cyber, c'est apprendre a se faire confiance. Hex t'accompagne, pas le contraire. »",
};

export default function EpisodePlayer(props: {
  saisonSlug: string;
  episodeId: string;
  episodeSlug: string;
  title: string;
  scenario: string;
  choices: Choice[];
  debrief: string;
  quiz: QuizQuestion[];
  xpReward: number;
  species?: string; // mascotte choisie par l'user (default fox)
  /**
   * Etat de reprise : si l'user a deja commence l'episode et l'a quitte
   * en cours, on lui propose de reprendre la ou il etait. Provient du
   * server component (page.tsx) qui lit Progress.{resumeStep, resumeQuizIndex,
   * resumeChoiceId} en BDD. null = nouvelle session.
   */
  resume?: {
    step: "scenario" | "debrief" | "quiz";
    quizIndex: number;
    choiceId: string | null;
  } | null;
}) {
  const species = props.species ?? "fox";

  // Initialisation des states avec le resume si disponible. On retrouve le
  // choice depuis l'id stocke (utile pour rejouer le bon debrief sans
  // reposer la question scenario).
  const initialStep: Step = props.resume?.step ?? "scenario";
  const initialChoice: Choice | null =
    props.resume?.choiceId
      ? (props.choices.find((c) => c.id === props.resume!.choiceId) ?? null)
      : null;
  const initialQuizIndex = props.resume?.quizIndex ?? 0;

  const [step, setStep] = useState<Step>(initialStep);
  const [choice, setChoice] = useState<Choice | null>(initialChoice);
  const [quizIndex, setQuizIndex] = useState(initialQuizIndex);
  const [quizScore, setQuizScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const { message: announcement, announce } = useAnnouncer();

  /**
   * Persiste l'etat de reprise a chaque transition de step. Best-effort :
   * un echec reseau ne casse pas le flow utilisateur, l'episode continue.
   * Le call est leger (juste un upsert sur la row Progress, pas de XP).
   */
  const persistResume = (
    s: "scenario" | "debrief" | "quiz",
    qIdx: number,
    cId: string | null,
  ) => {
    void fetch("/api/progress/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeId: props.episodeId,
        step: s,
        quizIndex: qIdx,
        choiceId: cId,
      }),
    }).catch(() => {
      // silencieux : la reprise est un nice-to-have, pas un blocage
    });
  };

  // Keyboard shortcuts (1-4 pour choisir, Enter pour continuer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step === "scenario" && /^[1-4]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (props.choices[idx]) handleChoice(props.choices[idx]);
      }
      if (step === "quiz" && /^[1-4]$/.test(e.key) && answered === null) {
        const q = props.quiz[quizIndex];
        const idx = parseInt(e.key, 10) - 1;
        if (q.choices[idx]) handleQuizAnswer(q.choices[idx].id);
      }
      if (step === "debrief" && e.key === "Enter") {
        setStep("quiz");
        persistResume("quiz", 0, choice?.id ?? null);
      }
      if (step === "quiz" && e.key === "Enter" && answered) nextQuiz();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answered, quizIndex, props.quiz, props.choices]);

  const handleChoice = (c: Choice) => {
    setChoice(c);
    setStep("debrief");
    persistResume("debrief", 0, c.id);
    if (c.outcome === "good") {
      smallConfetti();
      announce(`Bien joue. ${c.feedback}`);
    } else if (c.outcome === "bad") {
      announce(`On apprend. ${c.feedback}`);
    } else {
      announce(c.feedback);
    }
  };

  const handleQuizAnswer = (id: string) => {
    setAnswered(id);
    const q = props.quiz[quizIndex];
    const correct = q.choices.find((cc) => cc.correct)?.id === id;
    if (correct) {
      setQuizScore((s) => s + 1);
      smallConfetti();
      announce(`Bonne reponse. ${q.explanation}`);
    } else {
      announce(`Pas tout a fait. ${q.explanation}`);
    }
  };

  const nextQuiz = async () => {
    setAnswered(null);
    if (quizIndex + 1 < props.quiz.length) {
      const newIdx = quizIndex + 1;
      setQuizIndex(newIdx);
      persistResume("quiz", newIdx, choice?.id ?? null);
    } else {
      const totalXP = Math.max(
        (choice?.points ?? 0) + quizScore * 10 + props.xpReward,
        0,
      );
      // Pourcentage REEL de bonnes reponses au quiz (indicateur de maitrise).
      // Distinct de l'XP qui est de la gamification.
      const quizScorePct =
        props.quiz.length === 0
          ? 0
          : Math.round((quizScore / props.quiz.length) * 100);
      // Persistance backend
      if (!persisted) {
        setPersisted(true);
        const isPerfectQuiz =
          props.quiz.length > 0 && quizScore === props.quiz.length;
        try {
          const res = await fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              episodeId: props.episodeId,
              score: totalXP, // XP gamification (peut > 100)
              quizScorePct, // % maitrise (0-100)
              status: "COMPLETED",
              perfectQuiz: isPerfectQuiz,
            }),
          });
          const data = await res.json();
          if (data?.coinsAwarded) setCoinsEarned(data.coinsAwarded);
          if (data?.leveledUp && data?.newLevel) {
            // Level up : on garde l'info pour montrer l'overlay APRES le recap
            setLevelUp(data.newLevel);
          }
        } catch {}
      }
      setStep("recap");
      bigConfetti();
      announce(
        `Episode termine. Score : ${Math.round((quizScore / Math.max(props.quiz.length, 1)) * 100)} pour cent. Tu as gagne ${totalXP} XP.`,
      );
    }
  };

  const totalXPEarned = Math.max(
    (choice?.points ?? 0) + quizScore * 10 + props.xpReward,
    0,
  );
  const quizSuccessRate =
    props.quiz.length === 0 ? 0 : quizScore / props.quiz.length;

  // Citation rotative selon le score
  const citation =
    quizSuccessRate === 1
      ? RECAP_CITATIONS.perfect
      : quizSuccessRate >= 0.7
        ? RECAP_CITATIONS.good
        : quizSuccessRate >= 0.4
          ? RECAP_CITATIONS.partial
          : RECAP_CITATIONS.low;

  return (
    <>
      <LiveRegion message={announcement} politeness="polite" />
      <div className="card animate-fadeIn relative overflow-hidden">
        <ProgressDots step={step} />

        {/* ============================================================
            STEP 1 - SCENARIO : l'histoire du jour
            ============================================================ */}
        {step === "scenario" && (
          <div className="animate-fadeIn">
            <div className="flex items-start gap-4 mb-6">
              <div className="animate-float">
                <HexMascotEvolved
                  xp={0}
                  size="md"
                  mood="curious"
                  species={species}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-accent-500 font-bold mb-2">
                  L'histoire du jour
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
                  {props.title}
                </h1>
              </div>
            </div>

            {/* Carte scenario : gradient soft cyan/blue, plus immersive */}
            <div className="bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/30 rounded-2xl p-5 mb-6 leading-relaxed whitespace-pre-line text-gray-800 dark:text-gray-100 border-l-4 border-accent-500">
              <FormattedText text={props.scenario} />
              <div className="mt-4 pt-3 border-t border-cyan-200/40 dark:border-cyan-900/40">
                <TTSButton text={props.scenario} label="Ecouter le scenario" />
              </div>
            </div>

            <p className="font-display font-bold text-primary-500 dark:text-accent-300 mb-4 text-lg">
              Tu fais quoi ?
            </p>

            <div className="grid gap-3">
              {props.choices.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => handleChoice(c)}
                  className="text-left p-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 hover:bg-accent-50/50 dark:hover:bg-accent-900/20 transition-all hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-md focus:outline-none flex items-start gap-3 group animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 group-hover:bg-accent-500 group-hover:text-white text-gray-500 dark:text-gray-400 font-display font-extrabold flex items-center justify-center text-base transition-colors tabular-nums">
                    {i + 1}
                  </span>
                  <span className="font-medium leading-relaxed text-gray-800 dark:text-gray-100">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center mt-5">
              Astuce : tu peux utiliser les chiffres 1 a 4 du clavier
            </p>
          </div>
        )}

        {/* ============================================================
            STEP 2 - DEBRIEF : on apprend ensemble, sans jugement
            ============================================================ */}
        {step === "debrief" && choice && (
          <div className="animate-fadeIn">
            <div className="flex items-start gap-4 mb-6">
              <HexMascotEvolved
                xp={0}
                mood={
                  choice.outcome === "good"
                    ? "happy"
                    : choice.outcome === "bad"
                      ? "thinking"
                      : "neutral"
                }
                size="md"
                animated
                species={species}
              />
              <div
                className={`flex-1 rounded-2xl p-5 border-2 ${
                  choice.outcome === "good"
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100"
                    : choice.outcome === "bad"
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-100"
                      : "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                }`}
              >
                <p className="font-display font-extrabold mb-2 text-lg">
                  {choice.outcome === "good"
                    ? "✓ Bien joue"
                    : choice.outcome === "bad"
                      ? "🌿 Pas grave, on apprend"
                      : "→ Pas si simple"}
                </p>
                <p className="leading-relaxed">
                  <FormattedText text={choice.feedback} />
                </p>
                {choice.points !== 0 && (
                  <p className="mt-3 text-sm font-bold tabular-nums">
                    {choice.points > 0
                      ? `+${choice.points} XP`
                      : `${choice.points} XP`}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/30 rounded-2xl p-5 mb-6 text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line border border-cyan-200 dark:border-cyan-900/40">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.25em] text-accent-500 font-bold">
                  Le debrief de Hex
                </p>
                <TTSButton text={props.debrief} label="Ecouter le debrief" />
              </div>
              <FormattedText text={props.debrief} />
            </div>
            <button
              onClick={() => {
                setStep("quiz");
                persistResume("quiz", 0, choice?.id ?? null);
              }}
              className="btn-primary w-full text-lg animate-glow"
            >
              Quiz eclair <span aria-hidden="true">→</span>
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center mt-4">
              Astuce : appuie sur Entree
            </p>
          </div>
        )}

        {/* ============================================================
            STEP 3 - QUIZ : maitrise progressive
            ============================================================ */}
        {step === "quiz" && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                Question {quizIndex + 1}{" "}
                <span className="text-gray-400 dark:text-gray-500">
                  / {props.quiz.length}
                </span>
              </p>
              <div
                role="progressbar"
                aria-valuenow={quizIndex + 1}
                aria-valuemin={1}
                aria-valuemax={props.quiz.length}
                aria-label={`Question ${quizIndex + 1} sur ${props.quiz.length}`}
                className="flex gap-1.5"
              >
                {props.quiz.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-7 sm:w-9 rounded-full transition-all ${
                      i < quizIndex
                        ? "bg-emerald-500"
                        : i === quizIndex
                          ? "bg-accent-500"
                          : "bg-gray-200 dark:bg-slate-700"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-6 leading-tight">
              {props.quiz[quizIndex].question}
            </h2>

            <div className="grid gap-3 mb-4">
              {props.quiz[quizIndex].choices.map((c, i) => {
                const isAnswered = answered !== null;
                const isThis = answered === c.id;
                const isCorrect = c.correct;
                let cls =
                  "border-gray-200 dark:border-slate-700 hover:border-accent-500 hover:bg-accent-50/50 dark:hover:bg-accent-900/20 hover:scale-[1.01] hover:-translate-y-0.5";
                if (isAnswered) {
                  if (isCorrect)
                    cls =
                      "border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 scale-[1.02] shadow-md";
                  else if (isThis)
                    cls =
                      "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30";
                  else cls = "border-gray-200 dark:border-slate-700 opacity-50";
                }
                return (
                  <button
                    key={c.id}
                    onClick={() => !isAnswered && handleQuizAnswer(c.id)}
                    disabled={isAnswered}
                    className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 animate-slide-up ${cls}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-display font-extrabold flex items-center justify-center text-base tabular-nums">
                      {i + 1}
                    </span>
                    <span className="font-medium leading-relaxed text-gray-800 dark:text-gray-100">
                      {c.label}
                    </span>
                    {isAnswered && isCorrect && (
                      <span
                        className="ml-auto text-emerald-600 dark:text-emerald-400 text-xl"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    )}
                    {isAnswered && isThis && !isCorrect && (
                      <span
                        className="ml-auto text-amber-600 dark:text-amber-400 text-xl"
                        aria-hidden="true"
                      >
                        ✗
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="animate-fadeIn">
                <div className="bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/30 rounded-2xl p-5 mb-4 text-sm leading-relaxed border-l-4 border-accent-500">
                  <p className="font-display font-bold text-accent-600 dark:text-accent-300 mb-2 flex items-center gap-2">
                    <span aria-hidden="true">💡</span> Hex t'eclaire
                  </p>
                  <p className="text-gray-700 dark:text-gray-200">
                    <FormattedText text={props.quiz[quizIndex].explanation} />
                  </p>
                </div>
                <button
                  onClick={nextQuiz}
                  className="btn-primary w-full text-lg"
                >
                  {quizIndex + 1 < props.quiz.length
                    ? "Question suivante →"
                    : "Voir mon bilan →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            STEP 4 - RECAP : ton chaleureux, citation Hex veille
            ============================================================ */}
        {step === "recap" && (
          <div className="animate-fadeIn text-center py-6">
            <div className="mb-6 flex justify-center">
              <div className="animate-float">
                <HexMascotEvolved
                  xp={0}
                  size="xl"
                  mood="celebrate"
                  animated
                  species={species}
                />
              </div>
            </div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              Episode termine
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
              Bravo, tu en as fini avec celui-la.
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 italic">
              Voici ton bilan tranquille de l'episode.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
              <BilanCard label="XP gagnes" value={`+${totalXPEarned}`} accent />
              {coinsEarned > 0 && (
                <BilanCard label="Coins" value={`+${coinsEarned}`} amber />
              )}
              <BilanCard
                label="Quiz"
                value={`${quizScore}/${props.quiz.length}`}
              />
              <BilanCard
                label="Reussite"
                value={`${Math.round(quizSuccessRate * 100)}%`}
              />
            </div>

            {quizSuccessRate === 1 && (
              <div className="inline-flex items-center gap-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border-2 border-amber-300 dark:border-amber-800/60 rounded-2xl px-5 py-3 mb-6 animate-bounce-once">
                <span className="text-3xl" aria-hidden="true">
                  🏆
                </span>
                <div className="text-left">
                  <p className="font-display font-extrabold text-amber-900 dark:text-amber-200">
                    Sans-faute&nbsp;!
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 tabular-nums">
                    +15 coins bonus
                  </p>
                </div>
              </div>
            )}

            {levelUp && (
              <div className="mb-6 animate-pulse-once">
                <button
                  onClick={() => {
                    /* show overlay */
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white rounded-2xl px-6 py-3 font-display font-extrabold shadow-lg animate-glow"
                >
                  <span aria-hidden="true">✨</span> Niveau {levelUp} debloque
                  - clique pour voir
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link href="/apprendre" className="btn-primary text-lg">
                Continuer mon parcours →
              </Link>
              <Link href="/profil" className="btn-secondary text-lg">
                Voir mon profil
              </Link>
            </div>

            {/* Respiration finale - citation Hex veille rotative selon le score */}
            <div className="pt-6 border-t-2 border-dashed border-gray-200 dark:border-slate-700 max-w-2xl mx-auto">
              <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                {citation}
              </blockquote>
              <p
                aria-hidden="true"
                className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
              >
                - Hex veille
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Level-up overlay (apres le recap) */}
      {levelUp && step === "recap" && (
        <LevelUpOverlay
          newLevelId={levelUp}
          onClose={() => setLevelUp(null)}
          species={species}
        />
      )}
    </>
  );
}

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["scenario", "debrief", "quiz", "recap"];
  const labels = {
    scenario: "Situation",
    debrief: "Debrief",
    quiz: "Quiz",
    recap: "Bilan",
  };
  return (
    <div className="flex justify-center items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const idx = steps.indexOf(step);
        const reached = i <= idx;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span
                className={`h-2 w-10 sm:w-16 rounded-full transition-all ${reached ? "bg-gradient-to-r from-accent-500 to-primary-500" : "bg-gray-200 dark:bg-slate-700"}`}
              />
              <span
                className={`text-[10px] sm:text-xs mt-1.5 uppercase tracking-widest ${reached ? "text-accent-600 dark:text-accent-300 font-bold" : "text-gray-400 dark:text-gray-500"}`}
              >
                {labels[s]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BilanCard({
  label,
  value,
  accent,
  amber,
}: {
  label: string;
  value: string;
  accent?: boolean;
  amber?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        accent
          ? "bg-gradient-to-br from-accent-500 to-primary-500 text-white shadow-md"
          : amber
            ? "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-950/30"
            : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-900/60"
      }`}
    >
      <p
        className={`font-display text-2xl sm:text-3xl font-extrabold tabular-nums ${
          accent
            ? "text-white"
            : amber
              ? "text-amber-700 dark:text-amber-200"
              : "text-primary-500 dark:text-accent-300"
        }`}
      >
        {value}
      </p>
      <p
        className={`text-xs uppercase tracking-widest font-medium mt-1 ${
          accent
            ? "text-white/80"
            : amber
              ? "text-amber-700/80 dark:text-amber-200/80"
              : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function smallConfetti() {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#00A3A1", "#0B3D91", "#2E8B57", "#FFD700"],
  });
}

function bigConfetti() {
  const colors = ["#00A3A1", "#0B3D91", "#2E8B57", "#FFD700", "#FF69B4"];
  const duration = 2000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 75,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 75,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
