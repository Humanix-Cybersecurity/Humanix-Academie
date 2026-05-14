"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Terminal viewer style GitLab/GitHub Actions pour les logs SSE d'une sync
// CISO Assistant. S'abonne a /api/admin/ciso-sync/[runId]/stream et affiche
// les lignes au fur et a mesure. Auto-scroll, coloration par level
// ([INFO] gris, [OK] vert, [WARN] orange, [FAIL] rouge), badge final.

import { useEffect, useRef, useState } from "react";

type DoneEvent = {
  status: "success" | "partial" | "failed" | "timeout" | "deleted";
  total?: number;
  ok?: number;
  fail?: number;
  finishedAt?: string | null;
  message?: string;
};

export default function CisoSyncTerminal({
  runId,
  onDone,
}: {
  runId: string;
  onDone?: (e: DoneEvent) => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState<DoneEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource(`/api/admin/ciso-sync/${runId}/stream`);
    source.addEventListener("log", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as { text: string };
      // text peut contenir plusieurs lignes. Split + filter empty.
      setLines((prev) => [
        ...prev,
        ...data.text.split("\n").filter((l) => l.length > 0),
      ]);
    });
    source.addEventListener("done", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as DoneEvent;
      setDone(data);
      onDone?.(data);
      source.close();
    });
    source.onerror = () => {
      // Le serveur ferme apres "done" : c'est normal. Si ferme avant, on
      // affiche un message d'erreur generique.
      if (source.readyState === EventSource.CLOSED && !done) {
        setLines((prev) => [
          ...prev,
          "-- Connexion SSE fermée prématurément --",
        ]);
      }
      source.close();
    };
    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Auto-scroll vers le bas a chaque nouvelle ligne
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const lineColor = (line: string): string => {
    if (line.includes("[OK]")) return "text-emerald-400";
    if (line.includes("[FAIL]")) return "text-red-400";
    if (line.includes("[WARN]")) return "text-amber-300";
    if (line.includes("[INFO]")) return "text-slate-300";
    return "text-slate-400";
  };

  const downloadLogs = () => {
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ciso-sync-${runId}.log`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const statusBadge = () => {
    if (!done) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/40 border border-cyan-500/40 text-cyan-300 text-sm font-medium">
          <span
            className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"
            aria-hidden="true"
          />
          Sync en cours…
        </span>
      );
    }
    if (done.status === "success") {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 text-sm font-medium">
          ✓ {done.ok}/{done.total} synchronisées
        </span>
      );
    }
    if (done.status === "partial") {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/40 border border-amber-500/40 text-amber-300 text-sm font-medium">
          ⚠ Partiel : {done.ok}/{done.total} OK, {done.fail} échecs
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/40 border border-red-500/40 text-red-300 text-sm font-medium">
        ✗ Échec ({done.fail}/{done.total} ratés)
      </span>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-amber-500/70" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            ciso-sync · run {runId.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge()}
          {done && lines.length > 0 && (
            <button
              type="button"
              onClick={downloadLogs}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              ⬇ Télécharger
            </button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className="bg-slate-950 text-sm font-mono p-4 overflow-y-auto"
        style={{ height: "440px" }}
      >
        {lines.length === 0 && !done && (
          <div className="text-slate-500 italic">
            Initialisation de la synchronisation…
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`${lineColor(line)} whitespace-pre-wrap leading-relaxed`}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
