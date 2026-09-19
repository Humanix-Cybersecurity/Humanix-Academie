// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Le mail de la boucle fermee. Une seule regle de fond, qui vaut plus que
// le gabarit : il dit « ceci a circule dans l'entreprise », jamais « vous
// avez clique ». Le destinataire n'est pas designe, il est prevenu.
//
// On cite le SUJET du mail piege quand la source l'a donne : c'est ce qui
// permet de le reconnaitre dans sa boite. On ne cite pas l'expediteur, qui
// peut avoir ete usurpe pour ressembler a un collegue : le nommer dans un
// mail de prevention reviendrait a le designer.

import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isEmailOptedOut } from "@/lib/email/opt-out-check";

export type NotificationDeclenchement = {
  to: string;
  prenom: string | null;
  saisonTitle: string;
  episodeTitle: string;
  saisonSlug: string;
  episodeSlug: string;
  subject: string | null;
};

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function urlEpisode(saisonSlug: string, episodeSlug: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/apprendre/${saisonSlug}/${episodeSlug}`;
}

export function gabaritDeclenchement(n: NotificationDeclenchement): {
  subject: string;
  html: string;
  text: string;
} {
  const salut = n.prenom ? `Bonjour ${echapper(n.prenom)},` : "Bonjour,";
  const sujetCite = n.subject ? n.subject.trim().slice(0, 80) : null;
  const url = urlEpisode(n.saisonSlug, n.episodeSlug);

  const contexte = sujetCite
    ? `Un message intitulé « ${echapper(sujetCite)} » a circulé dans l'entreprise et a été identifié comme une tentative d'hameçonnage.`
    : "Une tentative d'hameçonnage a circulé dans l'entreprise et a été identifiée par nos outils de protection.";

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:24px; background:#f4f6f8; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color:#1a1f24;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 36px;">
    <p style="margin:0 0 16px; font-size:16px;">${salut}</p>
    <p style="margin:0 0 16px; font-size:16px; line-height:1.5;">${contexte}</p>
    <p style="margin:0 0 16px; font-size:16px; line-height:1.5;">Rien ne vous est reproché : ce message vous parvient parce que vous faites partie des personnes qui l'ont reçu. Six minutes suffisent pour savoir le reconnaître la prochaine fois.</p>
    <p style="margin:0 0 8px; font-size:14px; color:#5a6470;">${echapper(n.saisonTitle)}</p>
    <p style="margin:0 0 24px; font-size:18px; font-weight:600;">${echapper(n.episodeTitle)}</p>
    <a href="${url}" style="display:inline-block; background:#00A3A1; color:white; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:bold;">Ouvrir l'épisode</a>
    <p style="margin:28px 0 0; font-size:13px; color:#5a6470; line-height:1.5;">Si vous avez un doute sur un message reçu, ne cliquez sur rien et signalez-le : c'est toujours le bon réflexe, et personne ne vous le reprochera.</p>
  </div>
</body></html>`;

  const text = [
    n.prenom ? `Bonjour ${n.prenom},` : "Bonjour,",
    "",
    sujetCite
      ? `Un message intitulé « ${sujetCite} » a circulé dans l'entreprise et a été identifié comme une tentative d'hameçonnage.`
      : "Une tentative d'hameçonnage a circulé dans l'entreprise et a été identifiée par nos outils de protection.",
    "",
    "Rien ne vous est reproché : ce message vous parvient parce que vous faites partie des personnes qui l'ont reçu. Six minutes suffisent pour savoir le reconnaître la prochaine fois.",
    "",
    `${n.saisonTitle} - ${n.episodeTitle}`,
    url,
    "",
    "Si vous avez un doute sur un message reçu, ne cliquez sur rien et signalez-le.",
  ].join("\n");

  return {
    subject:
      "Ce qui vient de circuler dans l'entreprise, et comment le reconnaître",
    html,
    text,
  };
}

/** Envoi en meilleur effort. `true` si le mail est parti. */
export async function notifierDeclenchement(
  n: NotificationDeclenchement,
): Promise<boolean> {
  try {
    if (!isEmailConfigured()) return false;
    if (await isEmailOptedOut(n.to, "transactional")) return false;
    const g = gabaritDeclenchement(n);
    const res = await sendEmail({
      to: n.to,
      subject: g.subject,
      html: g.html,
      text: g.text,
      unsubscribe: { kind: "transactional" },
    });
    return res.ok;
  } catch {
    return false;
  }
}
