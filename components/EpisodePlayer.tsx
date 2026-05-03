"use client";

// Player d'episode Duolingo-style — coeur de l'experience
// 4 etapes : Scenario -> Debrief -> Quiz -> Recap (avec confettis)
// + Detection level-up via reponse API et overlay

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import type { Choice, QuizQuestion } from "@/lib/episodes";
import HexMascotEvolved from "@/components/HexMascotEvolved";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import TTSButton from "@/components/TTSButton";
import LiveRegion from "@/components/a11y/LiveRegion";
import { useAnnouncer } from "@/lib/a11y";

type Step = "scenario" | "debrief" | "quiz" | "recap";

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
}) {
  const species = props.species ?? "fox";
  const [step, setStep] = useState<Step>("scenario");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const { message: announcement, announce } = useAnnouncer();

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
      if (step === "debrief" && e.key === "Enter") setStep("quiz");
      if (step === "quiz" && e.key === "Enter" && answered) nextQuiz();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answered, quizIndex, props.quiz, props.choices]);

  const handleChoice = (c: Choice) => {
    setChoice(c);
    setStep("debrief");
    if (c.outcome === "good") {
      smallConfetti();
      announce(`Bien joué. ${c.feedback}`);
    } else if (c.outcome === "bad") {
      announce(`Aïe. ${c.feedback}`);
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
      announce(`Bonne réponse ! ${q.explanation}`);
    } else {
      announce(`Mauvaise réponse. ${q.explanation}`);
    }
  };

  const nextQuiz = async () => {
    setAnswered(null);
    if (quizIndex + 1 < props.quiz.length) {
      setQuizIndex(quizIndex + 1);
    } else {
      const totalXP = Math.max((choice?.points ?? 0) + quizScore * 10 + props.xpReward, 0);
      // Pourcentage REEL de bonnes reponses au quiz (indicateur de maitrise).
      // Distinct de l'XP qui est de la gamification.
      const quizScorePct = props.quiz.length === 0
        ? 0
        : Math.round((quizScore / props.quiz.length) * 100);
      // Persistance backend
      if (!persisted) {
        setPersisted(true);
        const isPerfectQuiz = props.quiz.length > 0 && quizScore === props.quiz.length;
        try {
          const res = await fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              episodeId: props.episodeId,
              score: totalXP,         // XP gamification (peut > 100)
              quizScorePct,           // % maitrise (0-100)
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
        `Episode terminé. Score : ${Math.round((quizScore / Math.max(props.quiz.length, 1)) * 100)} pourcent. Tu as gagné ${totalXP} XP.`,
      );
    }
  };

  const totalXPEarned = Math.max((choice?.points ?? 0) + quizScore * 10 + props.xpReward, 0);
  const quizSuccessRate = props.quiz.length === 0 ? 0 : quizScore / props.quiz.length;

  return (
    <>
      <LiveRegion message={announcement} politeness="polite" />
      <div className="card animate-fadeIn relative overflow-hidden">
        <ProgressDots step={step} />

        {step === "scenario" && (
          <div className="animate-fadeIn">
            <div className="flex items-start gap-4 mb-6">
              <HexMascotEvolved xp={0} size="md" mood="curious" species={species} />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Mise en situation</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary-500">{props.title}</h1>
              </div>
            </div>

            <div className="bg-primary-50 rounded-2xl p-5 mb-6 leading-relaxed whitespace-pre-line text-gray-800 border-l-4 border-accent-500 relative">
              {props.scenario}
              <div className="mt-3 pt-3 border-t border-primary-200/40">
                <TTSButton text={props.scenario} label="Écouter le scénario" />
              </div>
            </div>
            <p className="font-semibold text-primary-500 mb-3">Que fais-tu ?</p>
            <div className="grid gap-3">
              {props.choices.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => handleChoice(c)}
                  className="text-left p-4 rounded-2xl border-2 border-gray-200 hover:border-accent-500 hover:bg-primary-50 transition-all hover:scale-[1.01] focus:outline-none flex items-start gap-3 group"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-accent-500 group-hover:text-white text-gray-500 font-bold flex items-center justify-center text-sm transition-colors">
                    {i + 1}
                  </span>
                  <span className="font-medium leading-relaxed">{c.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 italic text-center mt-4">
              Astuce : utilise les chiffres 1-4 du clavier
            </p>
          </div>
        )}

        {step === "debrief" && choice && (
          <div className="animate-fadeIn">
            <div className="flex items-start gap-4 mb-6">
              <HexMascotEvolved
                xp={0}
                mood={choice.outcome === "good" ? "happy" : choice.outcome === "bad" ? "sad" : "neutral"}
                size="md"
                animated
                species={species}
              />
              <div
                className={`flex-1 rounded-2xl p-5 text-white ${
                  choice.outcome === "good"
                    ? "bg-success"
                    : choice.outcome === "bad"
                    ? "bg-warn"
                    : "bg-gray-500"
                }`}
              >
                <p className="font-bold mb-2 text-lg">
                  {choice.outcome === "good" ? "✓ Bien joué !" : choice.outcome === "bad" ? "✗ Aïe…" : "→ Pas si simple"}
                </p>
                <p className="leading-relaxed">{choice.feedback}</p>
                {choice.points !== 0 && (
                  <p className="mt-3 text-sm font-bold">
                    {choice.points > 0 ? `+${choice.points} XP` : `${choice.points} XP`}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-gray-700 leading-relaxed whitespace-pre-line border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Le débrief de Hex</p>
                <TTSButton text={props.debrief} label="Écouter le débrief" />
              </div>
              {props.debrief}
            </div>
            <button onClick={() => setStep("quiz")} className="btn-primary w-full text-lg">
              Quiz éclair →
            </button>
            <p className="text-xs text-gray-400 italic text-center mt-3">Astuce : appuie sur Entrée</p>
          </div>
        )}

        {step === "quiz" && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Question {quizIndex + 1} <span className="text-gray-400">/ {props.quiz.length}</span>
              </p>
              <div
                role="progressbar"
                aria-valuenow={quizIndex + 1}
                aria-valuemin={1}
                aria-valuemax={props.quiz.length}
                aria-label={`Question ${quizIndex + 1} sur ${props.quiz.length}`}
                className="flex gap-1"
              >
                {props.quiz.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-6 rounded-full ${
                      i < quizIndex ? "bg-success" : i === quizIndex ? "bg-accent-500" : "bg-gray-300 dark:bg-slate-600"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-primary-500 mb-6">
              {props.quiz[quizIndex].question}
            </h2>

            <div className="grid gap-3 mb-4">
              {props.quiz[quizIndex].choices.map((c, i) => {
                const isAnswered = answered !== null;
                const isThis = answered === c.id;
                const isCorrect = c.correct;
                let cls = "border-gray-200 hover:border-accent-500 hover:bg-primary-50 hover:scale-[1.01]";
                if (isAnswered) {
                  if (isCorrect) cls = "border-success bg-green-50 scale-[1.02]";
                  else if (isThis) cls = "border-warn bg-red-50";
                  else cls = "border-gray-200 opacity-50";
                }
                return (
                  <button
                    key={c.id}
                    onClick={() => !isAnswered && handleQuizAnswer(c.id)}
                    disabled={isAnswered}
                    className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${cls}`}
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    <span className="font-medium leading-relaxed">{c.label}</span>
                    {isAnswered && isCorrect && <span className="ml-auto text-success text-xl">✓</span>}
                    {isAnswered && isThis && !isCorrect && <span className="ml-auto text-warn text-xl">✗</span>}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="animate-fadeIn">
                <div className="bg-primary-50 rounded-2xl p-4 mb-4 text-sm leading-relaxed border-l-4 border-accent-500">
                  <p className="font-bold text-accent-500 mb-1">💡 Hex t'explique</p>
                  {props.quiz[quizIndex].explanation}
                </div>
                <button onClick={nextQuiz} className="btn-primary w-full text-lg">
                  {quizIndex + 1 < props.quiz.length ? "Question suivante →" : "Voir mon résultat →"}
                </button>
              </div>
            )}
          </div>
        )}

        {step === "recap" && (
          <div className="animate-fadeIn text-center py-6">
            <div className="mb-6 flex justify-center">
              <HexMascotEvolved xp={0} size="xl" mood="celebrate" animated species={species} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-2">
              Bravo, c'est dans la boîte !
            </h2>
            <p className="text-gray-600 mb-8">Voici ton bilan de l'épisode :</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
              <StatCard label="XP gagnés" value={`+${totalXPEarned}`} accent />
              {coinsEarned > 0 && <StatCard label="Coins" value={`+${coinsEarned}`} amber />}
              <StatCard label="Quiz" value={`${quizScore}/${props.quiz.length}`} />
              <StatCard label="Réussite" value={`${Math.round(quizSuccessRate * 100)}%`} />
            </div>

            {quizSuccessRate === 1 && (
              <div className="inline-flex items-center gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 mb-6 animate-bounce-once">
                <span className="text-3xl">🏆</span>
                <div className="text-left">
                  <p className="font-bold text-amber-900">Sans-faute !</p>
                  <p className="text-sm text-amber-800">+15 coins bonus</p>
                </div>
              </div>
            )}

            {levelUp && (
              <div className="mb-6 animate-pulse-once">
                <button
                  onClick={() => {/* show overlay */}}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl px-5 py-3 font-bold shadow-lg"
                >
                  ✨ Niveau {levelUp} débloqué — clique pour voir
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/apprendre" className="btn-primary text-lg">
                Continuer mon parcours →
              </a>
              <a href="/profil" className="btn-secondary text-lg">
                Voir mon profil
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Level-up overlay (apres le recap) */}
      {levelUp && step === "recap" && (
        <LevelUpOverlay newLevelId={levelUp} onClose={() => setLevelUp(null)} species={species} />
      )}
    </>
  );
}

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["scenario", "debrief", "quiz", "recap"];
  const labels = { scenario: "Situation", debrief: "Débrief", quiz: "Quiz", recap: "Résultat" };
  return (
    <div className="flex justify-center items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const idx = steps.indexOf(step);
        const reached = i <= idx;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className={`h-2 w-10 sm:w-16 rounded-full transition-all ${reached ? "bg-accent-500" : "bg-gray-200"}`} />
              <span className={`text-[10px] sm:text-xs mt-1 ${reached ? "text-accent-600 font-medium" : "text-gray-400"}`}>
                {labels[s]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, accent, amber }: { label: string; value: string; accent?: boolean; amber?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "bg-accent-500 text-white" : amber ? "bg-amber-100" : "bg-gray-50"}`}>
      <p className={`text-2xl sm:text-3xl font-extrabold ${accent ? "text-white" : amber ? "text-amber-700" : "text-primary-500"}`}>
        {value}
      </p>
      <p className={`text-xs ${accent ? "text-white/80" : amber ? "text-amber-700" : "text-gray-500"}`}>{label}</p>
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
    confetti({ particleCount: 6, angle: 60, spread: 75, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 75, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
