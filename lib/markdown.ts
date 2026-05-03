// Renderer markdown ULTRA SIMPLE et SAFE — pas de HTML brut accepte.
// Sortie : tableau de blocks typed que React rendera proprement (pas de
// dangerouslySetInnerHTML).
// Couvre : H1, H2, H3, paragraphes, listes a puces, listes ordonnees, blockquotes.

export type MdBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string };

export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trim = line.trim();

    if (!trim) {
      i++;
      continue;
    }

    if (trim.startsWith("# ")) {
      blocks.push({ type: "h1", text: trim.slice(2).trim() });
      i++;
      continue;
    }
    if (trim.startsWith("## ")) {
      blocks.push({ type: "h2", text: trim.slice(3).trim() });
      i++;
      continue;
    }
    if (trim.startsWith("### ")) {
      blocks.push({ type: "h3", text: trim.slice(4).trim() });
      i++;
      continue;
    }
    if (trim.startsWith("> ")) {
      blocks.push({ type: "quote", text: trim.slice(2).trim() });
      i++;
      continue;
    }
    if (trim.startsWith("- ") || trim.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        items.push(lines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(trim)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraphe : aggregue lignes consecutives non-vides
    const paragLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#|>|-|\*|\d+\.)\s/.test(lines[i].trim())) {
      paragLines.push(lines[i]);
      i++;
    }
    if (paragLines.length > 0) {
      blocks.push({ type: "p", text: paragLines.join(" ").trim() });
    }
  }
  return blocks;
}

/**
 * Convertit le contenu markdown en texte brut (pour TTS).
 */
export function markdownToPlainText(src: string): string {
  return src
    .replace(/^#{1,6}\s/gm, "") // titres
    .replace(/^>\s/gm, "") // quotes
    .replace(/^[-*]\s/gm, "• ") // listes
    .replace(/^\d+\.\s/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1") // gras
    .replace(/\*(.+?)\*/g, "$1") // italique
    .replace(/`([^`]+)`/g, "$1") // code inline
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Fonction helper pour rendre le **gras** dans React de maniere safe
export function renderInlineBold(text: string): (string | { bold: string })[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part) => (part.startsWith("**") && part.endsWith("**") ? { bold: part.slice(2, -2) } : part));
}
