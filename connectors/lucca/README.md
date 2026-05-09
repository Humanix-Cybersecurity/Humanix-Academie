# humanix-lucca-connector

Synchronise les utilisateurs **Lucca** (HR souverain français) vers **Humanix Académie** via SCIM v2.

## À quoi ça sert

- Nouveau collaborateur dans Lucca → compte Humanix créé automatiquement, module onboarding cyber poussé.
- Départ d'un collaborateur → compte Humanix soft-désactivé, historique conservé pour audit.
- Changement de service → mise à jour du Group SCIM côté Humanix.

## Pré-requis

- Python 3.10+
- Compte Lucca avec API activée (Settings → API → générer une clé application)
- Clé API Humanix (plan Pro ou supérieur)

## Installation

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner LUCCA_BASE_URL, LUCCA_API_KEY, HUMANIX_API_KEY
```

## Utilisation

```bash
# Test à blanc
set -a && source .env && set +a
python humanix_lucca_connector.py --dry-run

# Synchronisation réelle
python humanix_lucca_connector.py

# Cron toutes les heures (recommandé)
0 * * * * cd /opt/humanix-lucca && set -a && . ./.env && set +a && python humanix_lucca_connector.py >> /var/log/humanix-lucca.log 2>&1
```

## Mapping Lucca → Humanix

| Champ Lucca            | Champ Humanix (SCIM)             |
| ---------------------- | -------------------------------- |
| `mail`                 | `userName` + `emails[0].value`   |
| `firstName + lastName` | `displayName` + `name`           |
| `department.name`      | `urn:humanix:...:service`        |
| `isActive`             | `active`                         |
| (par défaut)           | `urn:humanix:...:role = LEARNER` |

## Licence

MIT.
