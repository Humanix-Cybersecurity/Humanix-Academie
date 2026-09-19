# Boucle fermée : menace réelle → formation ciblée dans l'heure

Quand un outil de détection du tenant (filtre mail, EDR, SIEM) signale qu'une
menace **réelle** a atteint des collaborateurs, Humanix leur pousse l'épisode
correspondant et les prévient. Pas un module planifié pour le trimestre : la
leçon qui montre le mail qu'ils viennent de recevoir.

```
Mailinblack / Vade / HarfangLab / Sekoia ...
        │  webhook sortant
        ▼
connectors/mailinblack-vade (pont, normalise)      ← ou tout autre client HTTP
        │  POST /api/integrations/edr-trigger
        ▼
lib/boucle-fermee/declencheur.ts
   1. idempotence          (rejeu = lecture, aucun second mail)
   2. destinataires        (utilisateurs ACTIFS du tenant, adresses inconnues comptées et oubliées)
   3. saison → épisode     (suggestion du pont, sinon lib/threat-modules.ts)
   4. plafonnement         (1 fois la même saison / 7 j, 2 déclenchements / 7 j)
   5. assignation          (Progress NOT_STARTED, comme l'onboarding)
   6. notification         (meilleur effort, après la base)
   7. traces               (ThreatTrigger, Event, webhook threat.trigger.fired)
```

## Contrat

```
POST /api/integrations/edr-trigger
Authorization: Bearer hxa_...

{
  "source": "mailinblack",                 obligatoire
  "logins": ["a@acme.fr", "b@acme.fr"],   obligatoire, 1..500
  "reason": "Phishing détecté ...",        obligatoire
  "trigger_module": "remediation-flash",   optionnel, slug de saison
  "subject": "...",                        optionnel, cité dans le mail aux destinataires
  "from_address": "...",                   optionnel, jamais cité (usurpation possible)
  "verdict": "phishing",                   optionnel
  "external_id": "evt-42",                 optionnel, clé d'idempotence côté source
  "dry_run": true                          optionnel, calcule tout et n'écrit rien
}
```

| Code          | Sens                                                         |
| ------------- | ------------------------------------------------------------ |
| `202`         | déclencheur traité, quel que soit son statut interne         |
| `200`         | rejeu d'un déclencheur déjà traité : même corps, aucun effet |
| `400`         | corps invalide (`details` par champ)                         |
| `401` / `402` | clé absente, invalide, expirée / plan sans API               |
| `429`         | plus de 60 déclencheurs par heure pour cette clé             |

Réponse :

```json
{
  "trigger_id": "clx…",
  "replay": false,
  "status": "assigned",
  "saison": {
    "slug": "remediation-flash",
    "title": "Remédiation flash post-phishing"
  },
  "episode": { "id": "…", "slug": "01-microsoft-flash", "title": "…" },
  "recipients": {
    "requested": 14,
    "matched": 12,
    "assigned": 9,
    "in_progress": 1,
    "already_done": 1,
    "throttled": 1,
    "notified": 10
  }
}
```

**La réponse ne contient jamais d'adresse.** Le pont sait qui il a envoyé ; un
journal de proxy ne doit pas porter ces adresses.

### Statuts

| `status`        | Signification                                                                     |
| --------------- | --------------------------------------------------------------------------------- |
| `assigned`      | au moins une personne a reçu l'épisode (nouveau ou relance d'un épisode en cours) |
| `already_done`  | tout le monde avait déjà terminé l'épisode                                        |
| `all_throttled` | tout le monde était plafonné                                                      |
| `no_match`      | aucune saison publiée ne correspond à la menace                                   |
| `no_recipients` | aucune adresse n'appartient à un utilisateur actif du tenant                      |
| `dry_run`       | rien n'a été écrit                                                                |

## Comment la saison est choisie

1. `trigger_module`, si c'est un slug de saison publiée et visible du tenant.
2. Sinon la cartographie `lib/threat-modules.ts`, appliquée à `reason + subject + from_address + verdict`, avec les saisons « juste après » promues en tête (`remediation-flash` pour une menace de phishing). C'est la **même table** que `GET /api/v1/recommend-modules` : la boucle choisit ce qu'un RSSI aurait choisi à la main.
3. L'épisode est le premier publié de la saison, par ordre de slug (`01-`, `02-`…).

Un tenant qui veut une autre saison pour une source donnée renseigne
`trigger_module` côté pont. C'est volontairement simple : on observe d'abord
ce que produit un vrai branchement avant d'ajouter une configuration.

## Plafonnement

Sans plafond, un EDR bavard transforme la formation en spam et la fait
désactiver. Constantes dans `declencheur.ts` :

- une personne ne reçoit pas **deux fois la même saison** en sept jours ;
- ni **plus de deux déclenchements** toutes saisons confondues en sept jours ;
- une clé API ne déclenche pas plus de **60 fois par heure**.

Les personnes plafonnées sont tracées (`outcome: throttled`) : on sait qu'elles
étaient concernées, on sait pourquoi elles n'ont rien reçu.

## Ce qui est délibéré

- **Jamais « vous avez cliqué ».** Le mail dit _ceci a circulé dans
  l'entreprise_. Le destinataire est prévenu, pas désigné. Même ligne que les
  épisodes sur la surveillance des salariés.
- **L'expéditeur n'est jamais cité** dans le mail de prévention : il peut avoir
  été usurpé pour ressembler à un collègue.
- **La base d'abord, le mail ensuite.** Un échec d'envoi ne perd jamais une
  assignation ; `recipientsNotified` dit ce qui est réellement parti.
- **Pas d'enum Prisma.** `status` et `outcome` sont des chaînes documentées,
  conformément à la règle bleu/vert du projet.
- **Portées de clé non vérifiées**, comme partout dans l'API v1 aujourd'hui.
  L'effet est borné au tenant appelant.

## Brancher un outil

Le plus court, depuis n'importe quel outil capable d'un webhook sortant, sans
passer par le pont :

```bash
curl -X POST "$HUMANIX/api/integrations/edr-trigger?dry_run=1" \
  -H "Authorization: Bearer $HUMANIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source":"harfanglab","logins":["a@acme.fr"],"reason":"phishing credential harvesting"}'
```

`dry_run=1` rend le plan complet — saison choisie, personnes reconnues,
plafonnées — sans rien déclencher. C'est l'étape de recette d'un MSSP.

## Preuve

Chaque déclenchement est une preuve datée : _après l'incident X, ces N
personnes ont reçu la formation Y le jour même_. `ThreatTrigger` et
`ThreatTriggerRecipient` sont requêtables par tenant, période et personne.
Leur intégration à `evidence-export` et au pack NIS2 est l'étape suivante.

## Ce qui reste

- Une page `/admin/boucle-fermee` : historique, taux de complétion post-incident, réglage du plafond.
- Le mode **confirmer avant d'envoyer**, pour les MSSP qui veulent un humain dans la boucle.
- Le regroupement : trois campagnes similaires dans la semaine donnent un épisode, pas trois.
- L'intégration aux exports de preuves.
