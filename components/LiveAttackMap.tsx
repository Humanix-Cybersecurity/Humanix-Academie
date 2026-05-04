"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Live Attack Map — visualisation temps reel des evenements cyber du tenant.
// Connecte a /api/admin/live-events via EventSource (SSE).
//
// Effet en demo : un prospect voit un clic phishing arriver en live avec
// animation, puis un signalement, puis une completion. C'est le "wouahh"
// commercial.
//
// UX :
//  - Timeline verticale, evenements arrivent par le haut avec animation pulse
//  - Compteurs animes par type d'evenement (clics phish, signalements, etc.)
//  - Indicateur "● LIVE" pulsant quand connexion active
//  - Auto-reconnect en cas de perte (EventSource le fait nativement)

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type LiveEvent = {
  id: string;
  type: string;
  createdAt: string;
  user: { name: string; service: string | null } | null;
  payload: any;
};

const EVENT_META: Record<
  string,
  { emoji: string; label: string; tone: "danger" | "success" | "info" | "warn" }
> = {
  episode_completed: { emoji: "✅", label: "Module terminé", tone: "success" },
  saison_completed: { emoji: "🎓", label: "Saison terminée", tone: "success" },
  phishing_clicked: { emoji: "⚠️", label: "Clic phishing", tone: "danger" },
  phishing_reported: {
    emoji: "🚨",
    label: "Phishing signalé",
    tone: "success",
  },
  shop_purchase: { emoji: "🛒", label: "Achat boutique", tone: "info" },
  level_up: { emoji: "🚀", label: "Level up", tone: "success" },
  user_invited: { emoji: "📩", label: "Utilisateur invité", tone: "info" },
};

const TONE_CLASS: Record<string, string> = {
  danger:
    "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
  success:
    "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
  info: "border-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300",
  warn: "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
};

export default function LiveAttackMap() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [counts, setCounts] = useState({
    completions: 0,
    phishingClicks: 0,
    phishingReports: 0,
    levelUps: 0,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/admin/live-events");
    esRef.current = es;

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));

    es.addEventListener("event", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as LiveEvent;
        setEvents((prev) => [data, ...prev].slice(0, 50));
        setCounts((c) => {
          if (data.type === "episode_completed")
            return { ...c, completions: c.completions + 1 };
          if (data.type === "phishing_clicked")
            return { ...c, phishingClicks: c.phishingClicks + 1 };
          if (data.type === "phishing_reported")
            return { ...c, phishingReports: c.phishingReports + 1 };
          if (data.type === "level_up")
            return { ...c, levelUps: c.levelUps + 1 };
          return c;
        });
      } catch (e) {
        console.warn("[live-map] bad event payload:", e);
      }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  return (
    <div className="card relative overflow-hidden">
      {/* Header avec indicateur LIVE */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-primary-500 flex items-center gap-2">
            🛰️ Live Attack Map
            <span
              className={clsx(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1",
                connected
                  ? "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-gray-100 text-gray-500",
              )}
              aria-live="polite"
            >
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  connected ? "bg-red-500 animate-pulse" : "bg-gray-400",
                )}
              />
              {connected ? "LIVE" : "OFF"}
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Activité cyber temps réel de votre équipe — flux SSE chiffré,
            scoping tenant strict.
          </p>
        </div>
      </div>

      {/* Compteurs animes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Counter
          emoji="✅"
          value={counts.completions}
          label="Modules"
          tone="success"
        />
        <Counter
          emoji="🚨"
          value={counts.phishingReports}
          label="Signalés"
          tone="success"
        />
        <Counter
          emoji="⚠️"
          value={counts.phishingClicks}
          label="Clics phish"
          tone="danger"
        />
        <Counter
          emoji="🚀"
          value={counts.levelUps}
          label="Level up"
          tone="success"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-12">
            <p className="text-3xl mb-2 opacity-50" aria-hidden="true">
              📡
            </p>
            <p>En attente d'activité…</p>
            <p className="text-xs mt-1">
              Les évènements apparaîtront en direct.
            </p>
          </div>
        ) : (
          events.map((e, i) => {
            const meta = EVENT_META[e.type] ?? {
              emoji: "•",
              label: e.type,
              tone: "info" as const,
            };
            return (
              <div
                key={e.id}
                className={clsx(
                  "border-l-4 rounded-r-xl p-3 flex items-start gap-3 transition-all",
                  TONE_CLASS[meta.tone],
                  // Animation pulse sur le tout dernier event arrivé
                  i === 0 && "animate-pulse-once shadow-md",
                )}
              >
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {meta.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <strong className="text-sm">{meta.label}</strong>
                    <time
                      className="text-[10px] text-gray-500 tabular-nums whitespace-nowrap"
                      dateTime={e.createdAt}
                    >
                      {formatRelativeTime(e.createdAt)}
                    </time>
                  </div>
                  {e.user && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      <strong>{e.user.name}</strong>
                      {e.user.service && (
                        <span className="text-gray-500">
                          {" "}
                          · {e.user.service}
                        </span>
                      )}
                    </p>
                  )}
                  {e.payload && (
                    <PayloadDetail type={e.type} payload={e.payload} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-4">
        Mises à jour automatiques — connexion sécurisée, données scopées à votre
        organisation.
      </p>
    </div>
  );
}

function Counter({
  emoji,
  value,
  label,
  tone,
}: {
  emoji: string;
  value: number;
  label: string;
  tone: "danger" | "success" | "info" | "warn";
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border-2 p-3 text-center transition-all",
        TONE_CLASS[tone],
        value > 0 && "scale-100",
      )}
    >
      <div className="text-2xl" aria-hidden="true">
        {emoji}
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">
        {label}
      </div>
    </div>
  );
}

function PayloadDetail({ type, payload }: { type: string; payload: any }) {
  if (!payload) return null;
  if (type === "episode_completed" && payload.score) {
    return (
      <p className="text-xs text-gray-500 mt-0.5">
        Score : <strong>{payload.score} XP</strong>
        {payload.coinsAwarded ? <> · +{payload.coinsAwarded} 🪙</> : null}
      </p>
    );
  }
  if (type === "level_up" && payload.newLevel) {
    return (
      <p className="text-xs text-gray-500 mt-0.5">
        Niveau atteint : <strong>{payload.newLevel}</strong>
      </p>
    );
  }
  if (type === "shop_purchase" && payload.itemSlug) {
    return (
      <p className="text-xs text-gray-500 mt-0.5">
        Item : <strong>{String(payload.itemSlug)}</strong>
        {payload.price ? <> · {payload.price} 🪙</> : null}
      </p>
    );
  }
  return null;
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 5) return "à l'instant";
  if (diff < 60) return `il y a ${Math.floor(diff)} s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
