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

import { Agent } from "undici";

/** Une adresse resolue + classee sure, prete a etre epinglee. */
export type PinnedAddress = { address: string; family: number };

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
 * Construit un undici Agent dont la resolution DNS est court-circuitee vers
 * `addresses` (les IP deja validees par le garde SSRF). A passer comme
 * `dispatcher` a fetch().
 *
 * @param addresses adresses validees a epingler (>= 1). Le socket ne sortira
 *   que vers celles-ci.
 * @param opts.rejectUnauthorized passer `false` pour accepter un cert
 *   auto-signe (cas CISO Assistant self-host, verifySSL=false). Par defaut la
 *   verification TLS reste stricte.
 */
export function buildPinnedAgent(
  addresses: PinnedAddress[],
  opts: { rejectUnauthorized?: boolean } = {},
): Agent {
  const lookup = makePinnedLookup(addresses);
  return new Agent({
    // Le type undici `connect.lookup` ne modelise que la forme mono-adresse ;
    // la forme all:true (tableau) est pourtant supportee par net/tls et
    // utilisee par Node 20. Le runtime gere les deux (cf. makePinnedLookup),
    // d'ou le cast.
    connect: {
      lookup: lookup as never,
      ...(opts.rejectUnauthorized === false && { rejectUnauthorized: false }),
    },
  });
}
