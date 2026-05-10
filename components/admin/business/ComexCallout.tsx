// SPDX-License-Identifier: AGPL-3.0-or-later
// Callout COMEX : 2 CTA pour partager le dashboard (PDF + relancer inactifs).

import Link from "next/link";

export default function ComexCallout() {
  return (
    <article className="rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-5 sm:p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <span aria-hidden="true">📤</span>
        <span>Convaincre votre COMEX</span>
      </h3>
      <p className="text-sm opacity-90 mb-4">
        Partagez ce dashboard avec votre dirigeant ou votre direction
        financière.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/admin/conformity-report"
          download
          className="inline-flex items-center gap-1.5 bg-white text-primary-500 font-bold text-sm py-2 px-4 rounded-lg hover:scale-105 active:scale-95 transition shadow-sm"
        >
          <span aria-hidden="true">📄</span>
          <span>Exporter rapport COMEX (PDF)</span>
        </a>
        <Link
          href="/admin/utilisateurs"
          className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/40 text-white font-bold text-sm py-2 px-4 rounded-lg hover:bg-white/20 transition"
        >
          <span aria-hidden="true">✉️</span>
          <span>Relancer les inactifs</span>
        </Link>
      </div>
    </article>
  );
}
