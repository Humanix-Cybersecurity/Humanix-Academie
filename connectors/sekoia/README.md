# humanix-sekoia-connector

Pousse les preuves de conformité Humanix vers **Sekoia.io** (SIEM/XDR souverain français) via leur Intake API.

## Setup Sekoia.io (5 min)

1. Sekoia → **Operations Center → Intakes → Add Intake**
2. Format : **ArcSight CEF** (parser générique) ou parser Humanix custom (sur demande, à venir avec PR communautaire)
3. Récupérez l'**Intake Key** (UUID)

## Installation

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner HUMANIX_API_KEY, SEKOIA_INTAKE_KEY
```

## Utilisation

```bash
set -a && source .env && set +a
python humanix_sekoia_connector.py --framework NIS2 --dry-run
python humanix_sekoia_connector.py --framework NIS2

# Cron quotidien
0 6 * * * cd /opt/humanix-sekoia && set -a && . ./.env && set +a \
  && python humanix_sekoia_connector.py --framework NIS2 >> /var/log/humanix-sekoia.log 2>&1
```

## Licence

MIT.
