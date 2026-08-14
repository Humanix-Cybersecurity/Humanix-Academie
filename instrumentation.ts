// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Point d'instrumentation Next.js : execute UNE FOIS par processus serveur,
// avant de servir la premiere requete.
//
// Il ne sert ici qu'a une chose : emettre un battement de coeur.

/**
 * Periode du battement. Cinq minutes donnent trois lignes par quart d'heure,
 * de quoi distinguer un silence d'un simple trou sans inonder Loki : environ
 * 288 lignes par jour et par pile, negligeable a l'ingestion.
 */
const PERIODE_BATTEMENT_MS = 5 * 60 * 1000;

function battre(): void {
  console.warn(
    JSON.stringify({
      canal: "securite",
      action: "HEARTBEAT",
      severite: "INFO",
    }),
  );
}

export async function register(): Promise<void> {
  // `register` est appele pour CHAQUE runtime, y compris `edge`, ou
  // `setInterval` n'a pas la meme semantique et ou le processus est ephemere.
  // Sans ce garde, on emettrait des battements depuis des contextes qui ne
  // representent pas la sante du serveur.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // POURQUOI CE BATTEMENT EXISTE
  //
  // La regle « homme mort » de docs/ALERTES-GRAFANA.md doit distinguer deux
  // situations qui se ressemblent parfaitement vues de Grafana : « rien
  // d'anormal » et « la collecte est morte ». Si Vector s'arrete ou si le
  // jeton Cockpit expire, les alertes de securite cessent de se declencher,
  // et cette absence se lit comme une bonne nouvelle.
  //
  // On ne peut pas s'appuyer sur le trafic pour cela. Mesure du 2026-08-14 en
  // production : l'application n'ecrit RIEN sur sa sortie standard hors
  // demarrage (0 ligne/minute au repos), et le journal HAProxy -- qui n'est de
  // toute facon pas raccorde au puits Loki -- etait lui aussi a zero. Une
  // regle « moins d'une ligne en dix minutes » se serait donc declenchee en
  // permanence sur une production parfaitement saine.
  //
  // Le seul flux regulier atteignant Loki venait du conteneur TTS, comme
  // sous-produit de ses sondes de sante. Y accrocher la detection l'aurait
  // rendue dependante d'un service que personne ne maintient deliberement.
  //
  // D'ou ce battement : explicite, sans dependance, et dont la disparition
  // signifie exactement une chose.
  battre();

  const minuteur = setInterval(battre, PERIODE_BATTEMENT_MS);

  // `unref` : ce minuteur ne doit jamais retenir le processus en vie. Sans
  // lui, un arret propre attendrait la prochaine echeance.
  minuteur.unref?.();
}
