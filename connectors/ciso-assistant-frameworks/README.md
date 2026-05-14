# Humanix × CISO Assistant — Community Frameworks

Bibliothèques **CC BY-SA 4.0** publiées par Humanix-Cybersecurity pour
enrichir l'écosystème CISO Assistant (intuitem) avec la couche humaine
de la cybersécurité.

## Contenu

| Fichier | Type | Description |
|---|---|---|
| `humanix-awareness-catalog-v1.yaml` | Framework | Catalogue des 27 modules de sensibilisation Humanix Académie, indexés par typologie de menace et vertical métier. |
| `mapping-humanix-awareness-to-iso27001-2022.yaml` | Mapping | Lie chaque module Humanix aux contrôles ISO/IEC 27001:2022 (relation `equal` ou `intersect`). |

D'autres mappings suivront (NIS2, RGPD, ANSSI HG, NIST CSF 2.0).

## Pourquoi ce projet

CISO Assistant est devenu un standard parce qu'il **fédère une
communauté ouverte** autour de mappings de frameworks. Humanix Académie
contribue à cet écosystème en publiant le mapping **couche humaine
↔ contrôles GRC** sous licence CC BY-SA 4.0 :

- Un RSSI sait instantanément quel module Humanix couvre quel contrôle.
- L'écart "techniquement couvert / humainement couvert" devient visible.
- Le mapping vit côté ouvert, pas dans la boîte noire d'un éditeur.

## Comment charger ces bibliothèques dans votre instance CISO Assistant

### Méthode 1 — Upload manuel (UI CISO Assistant)

1. Téléchargez les fichiers YAML depuis ce dossier.
2. Dans CISO Assistant, menu **Libraries → Upload library**.
3. Sélectionnez `humanix-awareness-catalog-v1.yaml` en premier
   (le mapping dépend de ce framework).
4. Puis `mapping-humanix-awareness-to-iso27001-2022.yaml`.
5. Allez dans **Libraries → Available** et cliquez **Import** sur
   chacun. Les frameworks et mappings apparaissent dans votre instance.

### Méthode 2 — Via l'API CISO Assistant (curl)

```bash
TOKEN=$(curl -sX POST https://ciso.exemple.fr/api/iam/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@exemple.fr","password":"..."}' \
  | jq -r .token)

# Upload + import du framework Humanix
curl -X POST "https://ciso.exemple.fr/api/stored-libraries/upload/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/x-yaml" \
  --data-binary @humanix-awareness-catalog-v1.yaml

# Récupère l'id, puis import
LIB_ID=$(curl -s "https://ciso.exemple.fr/api/stored-libraries/?urn=urn:humanix:risk:library:humanix-awareness-catalog-v1" \
  -H "Authorization: Token $TOKEN" | jq -r '.results[0].id')

curl -X POST "https://ciso.exemple.fr/api/stored-libraries/$LIB_ID/import/" \
  -H "Authorization: Token $TOKEN"

# Idem pour le mapping
curl -X POST "https://ciso.exemple.fr/api/stored-libraries/upload/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/x-yaml" \
  --data-binary @mapping-humanix-awareness-to-iso27001-2022.yaml

LIB_ID=$(curl -s "https://ciso.exemple.fr/api/stored-libraries/?urn=urn:humanix:risk:library:mapping-humanix-awareness-to-iso27001-2022" \
  -H "Authorization: Token $TOKEN" | jq -r '.results[0].id')

curl -X POST "https://ciso.exemple.fr/api/stored-libraries/$LIB_ID/import/" \
  -H "Authorization: Token $TOKEN"
```

### Méthode 3 — PR sur intuitem/risk-libraries (proposition Humanix)

L'idéal serait que ces frameworks soient distribués **directement par
la library CISO Assistant officielle**. Humanix proposera une PR sur
`intuitem/risk-libraries` après validation du fondateur intuitem.

Tant que la PR n'est pas mergée, ce dossier `connectors/ciso-assistant-frameworks/`
reste la **source canonique** des frameworks Humanix, distribuée via
Humanix-Cybersecurity/Humanix-Academie sur GitHub (licence CC BY-SA 4.0).

## Relations utilisées dans les mappings

Selon le standard CISO Assistant :
- **`equal`** : le module Humanix couvre intégralement et littéralement
  l'exigence du framework cible (cas A.6.3 Sensibilisation où Humanix
  est le cœur de métier).
- **`intersect`** : le module Humanix couvre **une dimension** de
  l'exigence (typiquement la dimension humaine). Le contrôle technique
  associé reste à mettre en place par ailleurs (cas A.8.7 Anti-malware
  où Humanix sensibilise mais l'EDR fait le reste).
- **`subset`** : le module est inclus dans l'exigence (plus restrictif).
- **`superset`** : le module dépasse l'exigence (plus large).

Humanix utilise uniquement `equal` et `intersect` pour rester honnête
sur le périmètre couvert.

## Versioning

Chaque YAML porte un champ `version: <int>`. Quand le catalogue Humanix
évolue (nouveau module, mapping affiné), on incrémente. Les ressources
chargées dans CISO Assistant ne sont **jamais écrasées en place** :
l'utilisateur doit ré-importer manuellement, ce qui garantit la
traçabilité des changements.

Cf. `publication_date` pour la date de publication exacte.

## Licence

**CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0
International). Reuse autorisé avec :
- attribution claire à Humanix-Cybersecurity SASU,
- partage des éventuelles modifications sous la même licence.

Cette licence permissive vise à encourager :
- les **PR/contributions** d'autres acteurs cyber souverains français
  (ajouts de modules, mappings additionnels vers Sapin II, DORA, etc.),
- la **réutilisation par d'autres GRC** que CISO Assistant (Eramba,
  ServiceNow GRC...) puisque le format YAML est largement portable.

Le **contenu pédagogique** des modules (épisodes MDX, quiz, scénarios)
reste sous AGPLv3 (cf. `LICENSE` à la racine du repo).

## Contact

`contact@humanix-cybersecurity.fr` — Humanix-Cybersecurity SASU
