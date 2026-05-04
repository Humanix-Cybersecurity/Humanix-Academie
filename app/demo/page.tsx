// SPDX-License-Identifier: AGPL-3.0-or-later
// Page /demo : choix de l'offre + role pour les demos live (salons, ventes, RDV)
// Active uniquement quand DEMO_MODE=true
"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { switchDemoPlan, getDemoCurrentPlan } from "@/app/demo/actions";
import { PLAN_LABEL, PLAN_EMOJI, type PlanId } from "@/lib/plans";

type RoleId = "learner" | "admin" | "moderator";

// Note : les `id` restent les keys DB (rétro-compat tenants existants).
// Les labels affichés (PLAN_LABEL) sont eux alignés sur la nouvelle grille
// mai 2026 — `solo` -> Starter, `premium` -> Enterprise.
const PLAN_OPTIONS: { id: PlanId; tagline: string; price: string }[] = [
  {
    id: "decouverte",
    tagline: "Cloud forever-free 5 sièges",
    price: "0 €/mois",
  },
  {
    id: "solo",
    tagline: "TPE qui démarre (15 sièges max)",
    price: "19 €/mois (forfait)",
  },
  {
    id: "essentielle",
    tagline: "Standard PME (16-50 sièges)",
    price: "3 €/user/mois",
  },
  {
    id: "pro",
    tagline: "PME industrialisée (51-250 sièges)",
    price: "2,50 €/user/mois",
  },
  {
    id: "premium",
    tagline: "ETI / multi-sites / SecNumCloud",
    price: "Sur devis",
  },
];

const ROLES: {
  id: RoleId;
  emoji: string;
  title: string;
  who: string;
  description: string;
  email: string;
  target: string;
  color: "accent" | "primary" | "amber";
}[] = [
  {
    id: "learner",
    emoji: "🎮",
    title: "Apprenant",
    who: "Yanis · Commercial",
    description:
      "Parcours collaborateur : modules, mises en situation, quiz, badges, mascotte évolutive, boutique.",
    email: "yanis@demo-pme.fr",
    target: "/apprendre",
    color: "accent",
  },
  {
    id: "admin",
    emoji: "👔",
    title: "Dirigeant",
    who: "Sophie · CEO PME Demo",
    description:
      "Console : tableau de bord, modules, utilisateurs, score de risque, rapport de conformité PDF.",
    email: "sophie@demo-pme.fr",
    target: "/admin",
    color: "primary",
  },
  {
    id: "moderator",
    emoji: "⚖️",
    title: "Modérateur",
    who: "Florian · Humanix",
    description:
      "SUPERADMIN : modération du marketplace, validation/refus des contributions communauté.",
    email: "contact@humanix-cybersecurity.fr",
    target: "/admin/moderation",
    color: "amber",
  },
];

export default function DemoPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("essentielle");
  const [loading, setLoading] = useState<RoleId | null>(null);
  const [planSyncing, setPlanSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sync le plan stocke en DB au chargement (pour pre-cocher le bon)
  useEffect(() => {
    getDemoCurrentPlan()
      .then((p) => setSelectedPlan(p))
      .catch(() => {});
  }, []);

  const onPickPlan = async (plan: PlanId) => {
    setError(null);
    setSelectedPlan(plan);
    setPlanSyncing(true);
    try {
      await switchDemoPlan(plan);
    } catch {
      setError(
        "Impossible de changer d'offre. Le mode démo est-il bien activé ?",
      );
    } finally {
      setPlanSyncing(false);
    }
  };

  const loginAs = async (role: RoleId, email: string, target: string) => {
    setLoading(role);
    setError(null);
    // Forcer le plan une derniere fois avant connexion (au cas ou l'user
    // n'a pas cliqu sur un bouton mais juste lance la demo direct)
    try {
      await switchDemoPlan(selectedPlan);
    } catch {
      // si ca foire, on continue quand meme avec le plan en place
    }
    const res = await signIn("demo", {
      email,
      redirect: false,
      callbackUrl: target,
    });
    if (res?.ok) router.push(target);
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 animate-bounce-slow">🦊</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 mb-3">
            Mode Démo Humanix Académie
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            1. Choisis l'offre que tu veux découvrir
            <br />
            2. Choisis ton rôle pour entrer dans l'expérience
          </p>
        </div>

        {/* ETAPE 1 : Selecteur d'offre */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3 text-center">
            Étape 1 — L'offre que tu veux tester
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLAN_OPTIONS.map((p) => {
              const active = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onPickPlan(p.id)}
                  disabled={planSyncing}
                  className={`card text-left transition-all hover:scale-[1.02] disabled:opacity-50 ${
                    active
                      ? "ring-4 ring-accent-500 border-accent-500 bg-gradient-to-br from-accent-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
                      : "hover:ring-2 hover:ring-gray-300"
                  }`}
                  aria-pressed={active}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{PLAN_EMOJI[p.id]}</span>
                    <span className="font-bold text-primary-500">
                      {PLAN_LABEL[p.id]}
                    </span>
                    {active && (
                      <span className="ml-auto text-xs text-accent-500 font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                    {p.tagline}
                  </p>
                  <p className="text-xs font-medium text-gray-500">{p.price}</p>
                </button>
              );
            })}
          </div>
          {error && (
            <p className="mt-3 text-sm text-warn text-center">{error}</p>
          )}
        </div>

        {/* ETAPE 2 : Choix du role */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3 text-center">
            Étape 2 — Le rôle que tu veux incarner
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {ROLES.map((r) => (
              <DemoCard
                key={r.id}
                emoji={r.emoji}
                title={r.title}
                who={r.who}
                description={r.description}
                cta={
                  loading === r.id
                    ? "Connexion…"
                    : `Entrer comme ${r.title.toLowerCase()}`
                }
                onClick={() => loginAs(r.id, r.email, r.target)}
                loading={loading !== null}
                color={r.color}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">
          Données de démo locales · Aucune donnée n'est envoyée à l'extérieur
          <br />
          Plan actif : <strong>{PLAN_LABEL[selectedPlan]}</strong>
        </div>
      </div>
    </div>
  );
}

function DemoCard({
  emoji,
  title,
  who,
  description,
  cta,
  onClick,
  loading,
  color,
}: {
  emoji: string;
  title: string;
  who: string;
  description: string;
  cta: string;
  onClick: () => void;
  loading: boolean;
  color: "accent" | "primary" | "amber";
}) {
  const ringClass =
    color === "accent"
      ? "hover:ring-accent-500"
      : color === "primary"
        ? "hover:ring-primary-500"
        : "hover:ring-amber-500";
  const btnClass =
    color === "accent"
      ? "btn-primary"
      : color === "primary"
        ? "btn-secondary"
        : "btn-secondary border-amber-500 text-amber-700 hover:bg-amber-50";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`card text-left transition-all hover:scale-[1.02] hover:ring-4 ${ringClass} disabled:opacity-50 disabled:cursor-wait`}
    >
      <div className="text-5xl mb-4">{emoji}</div>
      <h2 className="text-2xl font-bold text-primary-500 mb-1">{title}</h2>
      <p className="text-sm text-accent-500 font-medium mb-3">{who}</p>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
        {description}
      </p>
      <div className={`${btnClass} w-full pointer-events-none`}>{cta}</div>
    </button>
  );
}
