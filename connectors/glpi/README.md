# humanix-glpi-bridge

Microservice HTTP qui transforme les **webhooks signés Humanix** en **tickets GLPI** (ITSM open-source français).

## À quoi ça sert

Quand un user signale un phishing dans Humanix, un ticket GLPI est créé automatiquement sur la file Sécurité. Le SOC / IT prend le relais. Aucune intervention manuelle.

## Pré-requis

- Python 3.10+
- GLPI 10.x avec API REST activée (Setup → General → API)
- Un user technique GLPI avec App-Token + User-Token
- Une instance Humanix configurée pour pousser des webhooks signés HMAC

## Installation

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner les 5 variables
```

## Lancement

```bash
set -a && source .env && set +a
python humanix_glpi_bridge.py
# Écoute sur :8080 (configurable via PORT)
```

Pour la production, déployer derrière un reverse proxy HTTPS (HAProxy, Nginx, Caddy) et exposer sur un sous-domaine, par exemple :

```
https://humanix-bridge.exemple.fr/webhook
```

## Configuration côté Humanix

Dans `/admin/integrations` → **Nouveau webhook** :

- **Type** : Generic
- **URL** : `https://humanix-bridge.exemple.fr/webhook`
- **Secret** : copier `HUMANIX_WEBHOOK_SECRET` du `.env`
- **Events** : `phishing.reported`, `phishing.campaign_completed`, `evidence.exported`

## Mapping events → tickets

| Event Humanix                 | Ticket GLPI                   | Urgence     |
| ----------------------------- | ----------------------------- | ----------- |
| `phishing.reported`           | "Phishing signalé par <user>" | Haute (2)   |
| `phishing.campaign_completed` | "Campagne phishing terminée"  | Moyenne (3) |
| `evidence.exported`           | "Bundle GRC exporté"          | Basse (4)   |

## Sécurité

- Vérification HMAC-SHA256 obligatoire (rejette les payloads non signés ou avec mauvaise signature, en `timing-safe`)
- Pas d'écriture sur disque (sans état)
- Tokens GLPI uniquement dans `.env` (jamais dans le code)

## Licence

MIT.
