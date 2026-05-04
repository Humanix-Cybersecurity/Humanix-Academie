// SPDX-License-Identifier: AGPL-3.0-or-later
// Rendu safe d'un contenu markdown : aucun dangerouslySetInnerHTML
import { parseMarkdown, renderInlineBold } from "@/lib/markdown";

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
          default:
            return null;
        }
      })}
    </div>
  );
}

function Inline(text: string) {
  return renderInlineBold(text).map((part, i) =>
    typeof part === "string" ? part : <strong key={i}>{part.bold}</strong>,
  );
}
