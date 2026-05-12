// SPDX-License-Identifier: AGPL-3.0-or-later
// Rendu safe d'un contenu markdown : aucun dangerouslySetInnerHTML.
// renderInline() gere : liens [texte](url) avec whitelist anti-XSS,
// gras **texte**, italique *texte* / _texte_, code `inline`.
import Link from "next/link";
import { parseMarkdown, renderInline, type InlineToken } from "@/lib/markdown";

export default function MarkdownView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseMarkdown(content);
  return (
    <div
      className={`prose-humanix space-y-4 leading-relaxed ${className ?? ""}`}
    >
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return (
              <h1
                key={i}
                className="text-2xl sm:text-3xl font-extrabold text-primary-500 mt-6 mb-2"
              >
                {Inline(b.text)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={i}
                className="text-xl sm:text-2xl font-bold text-primary-500 mt-5 mb-2"
              >
                {Inline(b.text)}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                className="text-lg font-bold text-accent-500 mt-4 mb-1"
              >
                {Inline(b.text)}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="text-gray-800">
                {Inline(b.text)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc pl-6 space-y-1 text-gray-800">
                {b.items.map((it, j) => (
                  <li key={j}>{Inline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-6 space-y-1 text-gray-800">
                {b.items.map((it, j) => (
                  <li key={j}>{Inline(it)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-accent-500 pl-4 italic text-gray-600 bg-primary-50 py-2 rounded-r-xl"
              >
                {Inline(b.text)}
              </blockquote>
            );
          case "table":
            return (
              <div
                key={i}
                className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700 my-2"
              >
                <table className="w-full text-sm border-collapse">
                  <caption className="sr-only">Tableau de donnees du contenu markdown</caption>
                  <thead className="bg-primary-50 dark:bg-slate-800/60">
                    <tr>
                      {b.headers.map((h, j) => (
                        <th
                          key={j}
                          scope="col"
                          className="text-left p-3 font-bold text-primary-500 dark:text-accent-300 border-b-2 border-primary-200 dark:border-slate-700"
                        >
                          {Inline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-primary-50/30 dark:hover:bg-slate-800/30"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="p-3 text-gray-800 dark:text-gray-200 align-top"
                          >
                            {Inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function Inline(text: string) {
  return renderInline(text).map((tok: InlineToken, i: number) => {
    if (typeof tok === "string") return <span key={i}>{tok}</span>;
    if ("bold" in tok) return <strong key={i}>{tok.bold}</strong>;
    if ("italic" in tok) return <em key={i}>{tok.italic}</em>;
    if ("code" in tok) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[0.9em] font-mono text-primary-600 dark:text-accent-300"
        >
          {tok.code}
        </code>
      );
    }
    if ("link" in tok) {
      const { text: linkText, href } = tok.link;
      const isExternal = /^https?:\/\//.test(href);
      const className =
        "text-accent-500 dark:text-accent-300 underline underline-offset-2 hover:text-accent-600 dark:hover:text-accent-200 transition-colors";
      // Liens internes -> Next Link (preload + client transition)
      // Liens externes -> <a target="_blank" rel="noopener noreferrer"> safe
      // (whitelist déjà appliquee cote renderInline -> javascript: rejete)
      if (isExternal) {
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {linkText}
          </a>
        );
      }
      return (
        <Link key={i} href={href} className={className}>
          {linkText}
        </Link>
      );
    }
    return null;
  });
}
