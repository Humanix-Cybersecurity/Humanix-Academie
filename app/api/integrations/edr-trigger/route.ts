// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/integrations/edr-trigger
//
// Le recepteur de la boucle fermee. Un outil de detection du tenant (filtre
// mail, EDR, SIEM, ou le pont connectors/mailinblack-vade) signale qu'une
// menace REELLE a atteint des collaborateurs. On leur pousse la formation
// correspondante dans l'heure. Toute la logique est dans
// lib/boucle-fermee/declencheur.ts ; ici on authentifie, on borne, on valide.
//
// CONTRAT (celui que le pont envoie depuis mai 2026, elargi sans le casser)
//
//   Authorization: Bearer hxa_...          cle API du tenant
//   {
//     "source": "mailinblack",             obligatoire
//     "logins": ["a@x.fr", "b@x.fr"],      obligatoire, 1..500
//     "reason": "Phishing detecte ...",    obligatoire
//     "trigger_module": "remediation-flash",   optionnel, slug de saison
//     "subject": "...", "from_address": "...", "verdict": "...",   optionnels
//     "external_id": "id-cote-source",     optionnel, cle d'idempotence
//     "dry_run": true                      optionnel, ne persiste rien
//   }
//
// REPONSES
//
//   202  declencheur traite (quel que soit son statut interne)
//   200  rejeu d'un declencheur deja traite : meme corps, aucun effet
//   400  corps invalide ; 401/402 cle ; 429 plafond par cle
//
// La reponse ne renvoie JAMAIS d'adresse : uniquement des compteurs et la
// saison choisie. Le pont sait qui il a envoye, il n'a pas besoin qu'on le
// lui redise, et un journal de proxy ne doit pas porter ces adresses.
//
// PORTEES DE CLE
//
//   ApiKey.scopes existe ("read" par defaut) mais n'est verifie nulle part
//   dans l'API v1 aujourd'hui. On ne cree pas un regime de portees ici :
//   l'effet de cet endpoint est borne (assigner un episode et prevenir des
//   utilisateurs du tenant appelant), et l'authentification par cle plus le
//   plafond suffisent au MVP. A revoir si un regime de portees est introduit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { traiterDeclencheur } from "@/lib/boucle-fermee/declencheur";

export const dynamic = "force-dynamic";

// 60 declencheurs par heure et par cle : un filtre mail qui bloque une
// campagne produit un evenement par campagne, pas par destinataire. Au-dela,
// c'est un outil mal branche, pas une vague d'attaques.
const PLAFOND_PAR_CLE = 60;
const FENETRE_MS = 60 * 60 * 1000;

const Schema = z.object({
  source: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/i, "source : lettres, chiffres, - et _ uniquement"),
  logins: z.array(z.string().max(320)).min(1).max(500),
  reason: z.string().trim().min(1).max(2000),
  trigger_module: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "trigger_module : un slug de saison")
    .optional()
    .nullable(),
  subject: z.string().max(500).optional().nullable(),
  from_address: z.string().max(320).optional().nullable(),
  verdict: z.string().max(80).optional().nullable(),
  external_id: z.string().trim().max(200).optional().nullable(),
  dry_run: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status ?? 401 },
    );
  }
  const tenantId = auth.tenantId!;
  const apiKeyId = auth.apiKeyId ?? null;

  const limite = checkRateLimit(
    `edr-trigger:${apiKeyId ?? tenantId}`,
    PLAFOND_PAR_CLE,
    FENETRE_MS,
  );
  if (!limite.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: limite.retryAfter },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }

  let brut: unknown;
  try {
    brut = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parse = Schema.safeParse(brut);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parse.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // `?dry_run=1` equivaut au champ du corps : pratique depuis un curl.
  const url = new URL(req.url);
  const dryRun =
    parse.data.dry_run === true || url.searchParams.get("dry_run") === "1";

  const resultat = await traiterDeclencheur(
    { ...parse.data, dry_run: dryRun },
    { tenantId, apiKeyId },
  );

  return NextResponse.json(resultat, { status: resultat.replay ? 200 : 202 });
}
