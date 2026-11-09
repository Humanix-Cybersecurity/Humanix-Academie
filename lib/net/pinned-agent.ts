// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Anti DNS-rebinding : EPINGLE (pin) la connexion sortante sur l'IP DEJA
// validee par le garde SSRF, en supprimant la 2e resolution DNS que fetch() /
// undici feraient sinon de leur cote.
//
// Fenetre TOCTOU eliminee : sans ce pin, un attaquant DNS-rebinding peut
// renvoyer une IP publique au moment de la validation (le lookup du garde) puis
// une IP privee (169.254.169.254, 127.0.0.1, RFC1918) au moment ou undici
// re-resout le hostname pour ouvrir le socket. On force ici undici a se
// connecter EXACTEMENT a l'adresse vetee.
//
// On ne touche NI au Host header NI au SNI : undici les derive de l'autorite de
// l'URL (le hostname), donc la validation TLS (servername / checkServerIdentity)
// et le routage vhost continuent d'utiliser le hostname d'origine -- seule la
// cible IP du socket est figee.
//
// DEUX PORTES A FERMER, PAS UNE
//
// Le `lookup` epingle ne voit passer que les NOMS d'hote. Quand l'hote est deja
// une adresse IP litterale, node:net ouvre le socket sans jamais appeler
// `lookup`. Une cible validee qui repondait `307 Location: http://[::1]:3000/`
// (ou 127.0.0.1, ou 169.254.x.x) faisait donc sortir la requete vers cette
// adresse malgre l'epinglage, des que l'appelant suivait les redirections.
// Mesure le 2026-11-09 sur undici 8.12.3 : POST et corps conserves.
//
// D'ou le connecteur de buildPinnedAgent : il refuse toute adresse litterale
// absente de la liste epinglee. Nom ou litteral, le socket ne sort plus QUE
// vers une adresse validee. Les appelants refusent en plus les redirections
// (`redirect: "manual"` puis isRedirectStatus) : ce connecteur est le filet
// pour celui qui l'oublierait.

import { BlockList, isIP } from "node:net";
import { Agent, buildConnector } from "undici";

/** Une adresse resolue + classee sure, prete a etre epinglee. */
export type PinnedAddress = { address: string; family: number };

/**
 * Code de l'erreur produite quand le connecteur refuse une adresse litterale
 * hors liste. Cote appelant, fetch() rejette en `TypeError: fetch failed` et
 * cette erreur se lit dans `err.cause` (`cause.code`).
 */
export const PINNED_ADDRESS_REFUSED = "ERR_PINNED_ADDRESS_REFUSED";

/** Statuts que fetch() traite comme une redirection (norme Fetch). */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Cette reponse est-elle une redirection que fetch() aurait suivie ? Avec
 * `redirect: "manual"`, le fetch d'undici rend la reponse 3xx telle quelle au
 * lieu de la suivre : c'est a l'appelant de la traiter comme un echec.
 */
export function isRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.has(status);
}

/**
 * Signature `lookup` attendue par node:net / node:tls (et donc par le
 * connector undici). Node 20 (autoSelectFamily=true par defaut) appelle avec
 * `options.all === true` et attend un tableau ; les runtimes plus anciens /
 * autoSelectFamily=false attendent la forme mono-adresse `(err, address,
 * family)`. On gere les DEUX.
 */
type NetLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: PinnedAddress[] | string,
  family?: number,
) => void;

/**
 * Fabrique un `lookup` qui ignore le hostname demande et renvoie TOUJOURS les
 * adresses pre-validees. Expose separement de buildPinnedAgent pour pouvoir le
 * tester unitairement (formes all:true ET all:false).
 */
export function makePinnedLookup(
  addresses: PinnedAddress[],
): (
  hostname: string,
  options: { all?: boolean } | undefined,
  callback: NetLookupCallback,
) => void {
  if (addresses.length === 0) {
    throw new Error("makePinnedLookup: au moins une adresse validee requise");
  }
  // Copie defensive : la liste est figee a la construction, elle ne doit pas
  // pouvoir muter apres coup (sinon on re-ouvrirait la fenetre TOCTOU).
  const pinned = addresses.map((a) => ({
    address: a.address,
    family: a.family,
  }));
  return (_hostname, options, callback) => {
    if (options && options.all) {
      callback(null, pinned);
    } else {
      callback(null, pinned[0].address, pinned[0].family);
    }
  };
}

/**
 * Fabrique le garde du connecteur : cet hote peut-il etre joint a travers
 * l'agent epingle ?
 *  - un NOM d'hote : oui, `lookup` le ramene de force aux adresses epinglees ;
 *  - une adresse IP LITTERALE : seulement si elle fait partie des adresses
 *    epinglees (cas d'une URL validee dont l'hote etait deja un litteral).
 *
 * Expose separement de buildPinnedAgent pour etre teste sans reseau.
 */
export function makePinnedHostGuard(
  addresses: PinnedAddress[],
): (hostname: string) => boolean {
  if (addresses.length === 0) {
    throw new Error(
      "makePinnedHostGuard: au moins une adresse validee requise",
    );
  }
  // BlockList sert ici d'ENSEMBLE d'adresses autorisees, pas de liste noire :
  // la comparaison est numerique, donc insensible a l'ecriture (casse, zeros
  // de tete, IPv4 enveloppee en ::ffff:a.b.c.d ou ::ffff:hhhh:hhhh). La famille
  // est relue sur l'adresse elle-meme plutot que crue sur parole, et une
  // adresse mal formee fait echouer la construction : jamais ouvert par defaut.
  const pinned = new BlockList();
  for (const a of addresses) {
    const family = isIP(a.address);
    if (family === 0) {
      throw new Error(
        "makePinnedHostGuard: adresse epinglee invalide, refus par prudence",
      );
    }
    pinned.addAddress(a.address, family === 6 ? "ipv6" : "ipv4");
  }
  return (hostname) => {
    const family = isIP(hostname);
    if (family === 0) return true;
    return pinned.check(hostname, family === 6 ? "ipv6" : "ipv4");
  };
}

/**
 * Construit un undici Agent dont la resolution DNS est court-circuitee vers
 * `addresses` (les IP deja validees par le garde SSRF) et qui refuse toute
 * adresse litterale hors de cette liste. A passer comme `dispatcher` a fetch().
 *
 * @param addresses adresses validees a epingler (>= 1). Le socket ne sortira
 *   que vers celles-ci, que l'hote demande soit un nom ou une adresse litterale
 *   (cf. « DEUX PORTES A FERMER » en tete de fichier).
 * @param opts.rejectUnauthorized passer `false` pour accepter un cert
 *   auto-signe (cas CISO Assistant self-host, verifySSL=false). Par defaut la
 *   verification TLS reste stricte.
 */
export function buildPinnedAgent(
  addresses: PinnedAddress[],
  opts: { rejectUnauthorized?: boolean } = {},
): Agent {
  const lookup = makePinnedLookup(addresses);
  const canReach = makePinnedHostGuard(addresses);
  // Le MEME connecteur que celui qu'undici construit seul quand on lui passe
  // `connect: { lookup, ... }` : memes valeurs par defaut (delai de connexion,
  // ALPN, cache de sessions TLS). On ne fait que le faire preceder du garde.
  //
  // Le type undici de `lookup` ne modelise que la forme mono-adresse ; la
  // forme all:true (tableau) est pourtant supportee par net/tls et utilisee
  // par Node 20. Le runtime gere les deux (cf. makePinnedLookup), d'ou le cast.
  const connect = buildConnector({
    lookup: lookup as never,
    ...(opts.rejectUnauthorized === false && { rejectUnauthorized: false }),
  });
  return new Agent({
    connect(
      options: buildConnector.Options,
      callback: buildConnector.Callback,
    ): void {
      if (!canReach(options.hostname)) {
        const refusal = Object.assign(
          new Error(
            `pinned-agent: adresse litterale ${options.hostname} hors de la liste epinglee, connexion refusee`,
          ),
          { code: PINNED_ADDRESS_REFUSED },
        );
        // Asynchrone, comme le serait un vrai echec de connexion : undici ne
        // s'attend pas a etre rappele avant le retour du connecteur.
        queueMicrotask(() => callback(refusal, null));
        return;
      }
      connect(options, callback);
    },
  });
}
