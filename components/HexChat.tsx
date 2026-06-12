"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Panneau de chat flottant pour parler avec Hex.
//
// UX :
//   - Bouton FAB rond bottom-right (mascotte 🦊). Affiche une pastille
//     "nouveau" la premiere fois qu'un user voit la feature.
//   - Au click : panneau s'ouvre en slide-up (mobile fullscreen, desktop
//     ~400×600 ancre bottom-right).
//   - Header : "Hex" + avatar + bouton fermer.
//   - Zone de messages : bulles user (droite, primaire) et Hex (gauche,
//     blanc). Indicateur "typing" pendant le streaming.
//   - Input bas : textarea auto-resize + bouton envoyer.
//   - Stockage local : conversation persiste en localStorage (cle =
//     "humanix:hex:conversation"). Cleared via un bouton "nouvelle
//     conversation".
//
// SECURITE :
//   - On limite la conversation a 20 messages (au-dela : on tronque par
//     la gauche, en gardant le premier message + les 19 derniers).
//   - On force HTTPS sur l'origine pour le fetch /api/ai/chat (cookie
//     auth est httpOnly + samesite=lax, pas accessible JS).
//   - Aucun render de markdown HTML (on affiche du plain text + soft
//     line breaks). Pas d'XSS possible par le LLM.

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import MarkdownView from "@/components/MarkdownView";
import {
  POPUP_PRIORITY,
  isLandingPath,
  usePopupSlot,
} from "@/components/popup-coordinator";

type ChatRole = "user" | "assistant";
type Citation = {
  title: string;
  sourcePath: string;
  url: string | null;
  score: number;
};
type PiiNotice = {
  detected: boolean;
  summary: string;
};
type ChatMessage = {
  role: ChatRole;
  content: string;
  citations?: Citation[];
  /** Notice si des PII ont ete masquees avant l'envoi a Mistral. */
  piiNotice?: PiiNotice;
};

const STORAGE_KEY = "humanix:hex:conversation";
const FAB_DISMISSED_KEY = "humanix:hex:fab-tooltip-dismissed";
const MAX_HISTORY = 20;

// Extrait le slug d'episode quand l'user est sur une page module.
// Pattern : /apprendre/<saison>/<episode>
function extractCurrentModule(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const m = pathname.match(/^\/apprendre\/([^/]+)\/([^/?#]+)/);
  if (!m) return undefined;
  return `${m[1]}/${m[2]}`;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Coucou 🦊 Je suis Hex, ton assistant cyber.\n\nPose-moi une question sur le phishing, les mots de passe, le RGPD, NIS2, ou comment utiliser Humanix.\n\nJe suis bref par défaut - si tu veux que je creuse, dis-le-moi.",
};

function loadConversation(): ChatMessage[] {
  if (typeof window === "undefined") return [GREETING];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [GREETING];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [GREETING];
    return parsed;
  } catch {
    return [GREETING];
  }
}

function saveConversation(msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    // On stocke max MAX_HISTORY messages - au-dela on tronque par la
    // gauche (en gardant le greeting initial + les 19 derniers).
    const toStore =
      msgs.length > MAX_HISTORY
        ? [msgs[0], ...msgs.slice(msgs.length - (MAX_HISTORY - 1))]
        : msgs;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    /* localStorage pleine ou refusee → silencieux */
  }
}

type Props = {
  // Si false (HEX_AI_PROVIDER=disabled cote serveur), on n'affiche meme pas
  // le FAB pour eviter de teaser une feature non disponible.
  enabled: boolean;
};

export default function HexChat({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFabHint, setShowFabHint] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Hydrate conversation depuis localStorage cote client uniquement
  useEffect(() => {
    setMessages(loadConversation());
    if (typeof window !== "undefined") {
      const dismissed = window.localStorage.getItem(FAB_DISMISSED_KEY);
      if (!dismissed) {
        // Affiche la bulle tooltip 12 sec apres le mount.
        // Avant : 6s mais cumule avec Cookie + PWA + Mascot ca faisait
        // 4 popups en 6s. Le coordinator s'occupe maintenant de la
        // sequencer (priorite 30, viendra apres cookie/PWA si ready).
        const t = window.setTimeout(() => setShowFabHint(true), 12000);
        return () => window.clearTimeout(t);
      }
    }
  }, []);

  // Coordinator slot : ne concerne QUE le tooltip (la bulle "Hex est
  // dispo"), pas le FAB lui-meme qui reste toujours visible. Sur landing
  // page, le tooltip est carrement supprime - un FAB visible suffit comme
  // affordance, la bulle additionnelle est du bruit pour la conversion.
  const onLanding = isLandingPath(pathname);
  const tooltipReady = showFabHint && !open && !onLanding;
  const tooltipAllowed = usePopupSlot({
    id: "hex-tooltip",
    priority: POPUP_PRIORITY.hexTooltip,
    ready: tooltipReady,
  });

  // Auto-scroll en bas a chaque nouveau message
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  // Persist conversation
  useEffect(() => {
    saveConversation(messages);
  }, [messages]);

  const toggle = () => {
    setOpen((v) => !v);
    setShowFabHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FAB_DISMISSED_KEY, "1");
    }
  };

  const reset = () => {
    setMessages([GREETING]);
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");

    const newHistory: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    // Bulle assistant vide qui va se remplir au fur et a mesure
    setMessages([...newHistory, { role: "assistant", content: "" }]);
    setStreaming(true);

    // Filtrer le greeting du payload : c'est un placeholder UI, pas un
    // vrai message d'historique LLM
    const payloadMessages = newHistory
      .filter((m, i) => !(i === 0 && m === GREETING))
      .map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          context: {
            currentRoute: pathname ?? undefined,
            currentModule: extractCurrentModule(pathname),
          },
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) detail = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      if (!res.body) throw new Error("Pas de stream reçu");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let assistantCitations: Citation[] | undefined;
      let assistantPiiNotice: PiiNotice | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE : lines "data: {...}\n\n"
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              delta?: string;
              error?: string;
              citations?: Citation[];
              pii?: PiiNotice;
            };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.pii) {
              assistantPiiNotice = parsed.pii;
              setMessages((prev) => {
                const next = prev.slice(0, -1);
                next.push({
                  role: "assistant",
                  content: assistantContent,
                  citations: assistantCitations,
                  piiNotice: assistantPiiNotice,
                });
                return next;
              });
            }
            if (parsed.citations) {
              assistantCitations = parsed.citations;
              setMessages((prev) => {
                const next = prev.slice(0, -1);
                next.push({
                  role: "assistant",
                  content: assistantContent,
                  citations: assistantCitations,
                  piiNotice: assistantPiiNotice,
                });
                return next;
              });
            }
            if (parsed.delta) {
              assistantContent += parsed.delta;
              setMessages((prev) => {
                // Mise a jour de la derniere bulle assistant uniquement
                const next = prev.slice(0, -1);
                next.push({
                  role: "assistant",
                  content: assistantContent,
                  citations: assistantCitations,
                  piiNotice: assistantPiiNotice,
                });
                return next;
              });
            }
          } catch {
            /* event malformé - on ignore */
          }
        }
      }
    } catch (e: unknown) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      if (!isAbort) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue";
        setError(msg);
        // Retire la bulle assistant vide si on n'a recu aucun delta
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last.role === "assistant" && last.content === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // Le greeting initial occupe l'espace meme si l'user n'a rien tape
  const visibleMessages = useMemo(() => messages, [messages]);

  if (!enabled) return null;

  return (
    <>
      {/* FAB bouton flottant */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {/* Tooltip d'accueil (premier passage uniquement, gate par
            le PopupCoordinator pour ne pas s'empiler avec cookie/PWA/mascotte) */}
        {tooltipReady && tooltipAllowed && (
          <div className="bg-white dark:bg-slate-900 shadow-lg rounded-2xl border-2 border-accent-500 p-3 max-w-xs animate-fadeIn">
            <p className="text-sm font-semibold text-primary-500 dark:text-accent-300 mb-1">
              🦊 Hex est dispo
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Une question cyber ? Clique-moi.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Fermer le chat Hex" : "Ouvrir le chat Hex"}
          aria-expanded={open}
          aria-controls="hex-chat-panel"
          className="bg-gradient-to-br from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-full shadow-xl w-14 h-14 flex items-center justify-center text-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-300"
        >
          {open ? "✕" : "🦊"}
        </button>
      </div>

      {/* Panneau de chat */}
      {open && (
        <div
          id="hex-chat-panel"
          role="dialog"
          aria-label="Discussion avec Hex"
          className="fixed inset-x-2 bottom-20 sm:inset-x-auto sm:right-4 sm:bottom-20 sm:w-[400px] z-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-accent-500 flex flex-col max-h-[calc(100vh-6rem)] sm:max-h-[600px] animate-fadeIn"
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-slate-800 dark:to-slate-800 rounded-t-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl" aria-hidden="true">
                🦊
              </span>
              <div className="min-w-0">
                <p className="font-bold text-primary-500 dark:text-accent-300 text-sm truncate">
                  Hex · assistant cyber
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  IA souveraine · Mistral France
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reset}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-warn px-2 py-1 rounded"
                title="Nouvelle conversation"
              >
                🗑 Reset
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50 dark:bg-slate-900/50"
          >
            {visibleMessages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {streaming &&
              visibleMessages[visibleMessages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 text-sm text-gray-500 inline-flex items-center gap-1">
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                  </div>
                </div>
              )}
            {error && (
              <div
                role="alert"
                className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900 rounded-xl p-3 text-xs text-red-800 dark:text-red-200"
              >
                <strong>Hex est tombé :</strong> {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-b-2xl">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={streaming}
                rows={1}
                aria-label="Ton message à Hex"
                placeholder="Pose une question cyber…"
                className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 max-h-32"
                style={{ minHeight: "40px" }}
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="bg-warn hover:bg-warn/80 text-white rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap"
                  aria-label="Envoyer le message"
                >
                  →
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1.5 text-center">
              Hex peut se tromper. Pas de PII (mot de passe, IBAN, vrais noms).
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  // User : texte brut (whitespace-pre-wrap preserve les sauts de ligne tapes).
  // Assistant : markdown render (gras / liens / listes / code / tables) via
  // MarkdownView - meme composant que /apprendre/recap (PR #434), donc XSS-safe
  // par construction (whitelist + pas de dangerouslySetInnerHTML).
  // Pendant le streaming, le markdown partiel s'affiche degrade (les `**` en
  // attente de fermeture restent textuels), c'est acceptable et resout des
  // que le delta suivant ferme la balise.
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
          isUser
            ? "bg-primary-500 text-white whitespace-pre-wrap"
            : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-slate-700"
        }`}
      >
        {isUser ? (
          message.content
        ) : message.content ? (
          <MarkdownView
            content={message.content}
            className="!space-y-2 [&_p]:!text-gray-800 [&_p]:dark:!text-gray-100 [&_p]:!my-0"
          />
        ) : (
          "…"
        )}
      </div>
      {/* Notice PII : Hex a masque des donnees sensibles avant envoi
          a Mistral. Affichage discret mais explicite (transparence Zero-Trust). */}
      {!isUser && message.piiNotice?.detected && (
        <div className="mt-1.5 max-w-[85%] bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 rounded-xl px-2.5 py-1.5 text-[10px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
          <span aria-hidden="true">🛡</span>
          <span>
            <strong>Hex a masqué {message.piiNotice.summary}</strong> avant
            d'envoyer ton message à l'IA. C'est volontaire - on ne transmet
            jamais tes données personnelles aux fournisseurs tiers.
          </span>
        </div>
      )}
      {/* Citations RAG (Phase 3) : sous la bulle Hex, badges des sources */}
      {!isUser && message.citations && message.citations.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 max-w-[85%]">
          <span
            className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mr-1"
            aria-label="Sources Humanix"
          >
            📚 Sources :
          </span>
          {message.citations.slice(0, 5).map((c, i) =>
            c.url ? (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-200 border border-accent-200 dark:border-accent-900 rounded-full px-2 py-0.5 hover:bg-accent-100 dark:hover:bg-accent-950/60 transition"
              >
                {c.title}
              </a>
            ) : (
              <span
                key={i}
                className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full px-2 py-0.5"
              >
                {c.title}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    />
  );
}
