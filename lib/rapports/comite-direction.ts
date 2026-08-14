// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Rapport mensuel de conformite pour le comite de direction.
//
// Ferme #750. Les generateurs PDF existaient deja
// (app/api/admin/conformity-report, app/api/admin/pack-nis2/annual-report)
// mais seulement en telechargement manuel : personne ne les ouvrait, et
// l'etape 4 du wizard d'onboarding ecrivait un AuditLog sans effet.
//
// ---------------------------------------------------------------------
// UN LIEN, PAS UNE PIECE JOINTE
// ---------------------------------------------------------------------
//
// L'issue demandait « envoyer le rapport ». On envoie un LIEN vers le
// rapport, pour deux raisons.
//
// La premiere est technique : lib/email/scaleway-tem.ts ne sait pas
// attacher de fichier. Son corps JSON porte from/to/subject/html/text et
// des en-tetes, rien d'autre.
//
// La seconde est meilleure. Un rapport de conformite en piece jointe laisse
// des copies dans toutes les boites, hors de tout controle d'acces et de
// toute tracabilite. Un lien impose au destinataire d'etre authentifie,
// journalise l'acces, et garde le document unique. Pour une entreprise qui
// vend de la conformite, c'est l'argument le plus defendable -- et ce serait
// gênant d'avoir a expliquer l'inverse a un auditeur.
//
// ---------------------------------------------------------------------
// A QUI
// ---------------------------------------------------------------------
//
// L'issue dit « dirigeant + DPO ». Ces notions n'existent NULLE PART dans
// le modele : les roles sont LEARNER, MANAGER, RSSI, ADMIN, SUPERADMIN, et
// la production ne compte aucun RSSI.
//
// On envoie donc aux ADMIN du tenant, qui pilotent la conformite
// aujourd'hui. `destinatairesRapport()` est le SEUL endroit a changer si un
// jour le Tenant porte un `dpoEmail` explicite -- c'est pour cela qu'elle
// est isolee et testee.

import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";

/** Ce dont la resolution des destinataires a besoin. */
export type UtilisateurDestinataire = {
  email: string | null;
  role: Role;
};

/**
 * Qui recoit le rapport mensuel.
 *
 * Regles, dans l'ordre :
 *   - ADMIN et RSSI du tenant ; RSSI est inclus par anticipation, aucun
 *     n'existe en production aujourd'hui mais le role est prevu pour ca ;
 *   - jamais SUPERADMIN : ce sont les comptes Humanix, pas ceux du client ;
 *   - jamais un email vide -- l'anonymisation RGPD vide ce champ tout en
 *     conservant l'utilisateur, et un `to: null` ferait echouer l'envoi
 *     pour TOUT le lot ;
 *   - dedoublonne, insensible a la casse : deux comptes pour la meme
 *     personne ne doivent pas produire deux courriels.
 */
export function destinatairesRapport(
  utilisateurs: readonly UtilisateurDestinataire[],
): string[] {
  const retenus = new Map<string, string>();

  for (const u of utilisateurs) {
    if (u.role !== "ADMIN" && u.role !== "RSSI") continue;
    const email = (u.email ?? "").trim();
    if (email.length === 0) continue;
    const cle = email.toLowerCase();
    if (!retenus.has(cle)) retenus.set(cle, email);
  }

  return [...retenus.values()];
}

/** Mois precedent, au format « aout 2026 », pour le sujet et le corps. */
export function moisPrecedent(reference: Date): string {
  const d = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export type ContenuRapport = { subject: string; html: string; text: string };

/**
 * Corps du courriel.
 *
 * Volontairement sobre : ce message part a des dirigeants, pas a des
 * apprenants. Il dit ce qui est disponible, ou le trouver, et rien de plus.
 */
export function composerRapport(args: {
  nomTenant: string;
  mois: string;
  urlRapport: string;
}): ContenuRapport {
  const { nomTenant, mois, urlRapport } = args;
  const subject = `Rapport de conformite ${nomTenant} - ${mois}`;

  const text = [
    `Rapport de conformite - ${mois}`,
    "",
    `Le rapport mensuel de ${nomTenant} est disponible :`,
    urlRapport,
    "",
    "Il recapitule la posture de conformite, la progression des",
    "formations et les evenements de securite du mois ecoule.",
    "",
    "L'acces demande une authentification : le document n'est pas joint",
    "a ce message, et sa consultation est journalisee.",
  ].join("\n");

  const html = [
    `<p><strong>Rapport de conformite &mdash; ${escapeHtml(mois)}</strong></p>`,
    `<p>Le rapport mensuel de ${escapeHtml(nomTenant)} est disponible :</p>`,
    `<p><a href="${escapeHtml(urlRapport)}">Consulter le rapport</a></p>`,
    "<p>Il recapitule la posture de conformite, la progression des formations",
    "et les evenements de securite du mois ecoule.</p>",
    '<p style="color:#666;font-size:0.9em">L\'acces demande une authentification :',
    "le document n'est pas joint a ce message, et sa consultation est journalisee.</p>",
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------
// ORCHESTRATION
// ---------------------------------------------------------------------

export type ResultatEnvoi = {
  tenants: number;
  envoyes: number;
  sansDestinataire: number;
  echecs: number;
  erreurs: string[];
};

/**
 * Envoie le rapport a tous les tenants actifs.
 *
 * BEST-EFFORT PAR TENANT : l'echec d'un envoi ne doit pas priver les autres
 * de leur rapport. Chaque tenant est traite dans son propre try, et les
 * erreurs sont collectees plutot que propagees -- c'est la convention des
 * autres crons du projet.
 */
export async function envoyerRapportsMensuels(
  maintenant: Date = new Date(),
): Promise<ResultatEnvoi> {
  const r: ResultatEnvoi = {
    tenants: 0,
    envoyes: 0,
    sansDestinataire: 0,
    echecs: 0,
    erreurs: [],
  };

  // On s'arrete AVANT de lire quoi que ce soit si aucun canal n'est
  // configure. `isEmailConfigured()` renvoie false en DEMO_MODE et en
  // dev : sans cette garde, le cron parcourrait tous les tenants pour
  // accumuler des echecs previsibles, et son journal deviendrait illisible.
  if (!isEmailConfigured()) {
    r.erreurs.push("aucun canal email configure (ou DEMO_MODE/dev actif)");
    return r;
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  if (base.length === 0) {
    r.erreurs.push(
      "NEXT_PUBLIC_APP_URL non defini : lien impossible a construire",
    );
    return r;
  }

  const mois = moisPrecedent(maintenant);
  const tenants = await db.tenant.findMany({
    select: {
      id: true,
      name: true,
      users: { select: { email: true, role: true } },
    },
  });

  r.tenants = tenants.length;

  for (const t of tenants) {
    try {
      const destinataires = destinatairesRapport(t.users);
      if (destinataires.length === 0) {
        r.sansDestinataire++;
        continue;
      }

      const { subject, html, text } = composerRapport({
        nomTenant: t.name,
        mois,
        urlRapport: `${base}/api/admin/conformity-report`,
      });

      const envoi = await sendEmail({
        to: destinataires,
        subject,
        html,
        text,
        // Transactionnel : ce rapport fait partie du service, on ne propose
        // pas de s'en desabonner. L'en-tete reste pose pour la conformite
        // des boites reception.
        unsubscribe: { kind: "transactional" },
      });

      if (envoi.ok) {
        r.envoyes++;
      } else {
        r.echecs++;
        r.erreurs.push(`${t.id}: ${envoi.reason}`);
      }
    } catch (e) {
      r.echecs++;
      r.erreurs.push(`${t.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return r;
}
