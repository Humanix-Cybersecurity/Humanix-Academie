"use client";

// Composant snippet copiable reutilisable.
// A11y : aria-live pour annoncer la copie aux lecteurs d'ecran.

import { useEffect, useState } from "react";

export default function CopyableSnippet({
  code,
  label,
}: {
  code: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // noop
    }
  }

  return (
    <div className="relative">
      <pre
        className="bg-slate-900 dark:bg-black text-slate-100 p-4 pr-24 rounded-xl text-xs sm:text-sm overflow-x-auto"
        aria-label={`Snippet ${label}`}
      >
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
        aria-label={`Copier le snippet ${label}`}
      >
        {copied ? "✓ Copie" : "Copier"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Snippet copie" : ""}
      </span>
    </div>
  );
}
