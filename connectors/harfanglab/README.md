# humanix-harfanglab-connector

Bridge bidirectionnel entre **HarfangLab** (EDR souverain 🇫🇷) et **Humanix Académie**.

## Deux sens de circulation

### Sens 1 — push : Humanix → HarfangLab

```bash
python humanix_harfanglab_connector.py push --framework NIS2
```

Pousse les preuves de conformité au format CEF dans le syslog HarfangLab. Permet de corréler le facteur humain (taux de complétion, signalements phishing) avec les alertes techniques EDR dans le même Manager.

### Sens 2 — pull : HarfangLab → Humanix

```bash
python humanix_harfanglab_connector.py pull --hours 24 --dry-run
```

Récupère les alertes EDR des dernières heures, identifie les utilisateurs touchés (par leur login session), et déclenche une campagne de sensibilisation Humanix ciblée pour eux.

> **Boucle vertueuse cyber** : votre EDR détecte un comportement à risque → Humanix forme l'utilisateur sur le sujet précis → le risque résiduel diminue.

## Pré-requis

- HarfangLab Manager 2.x avec API REST
- User HarfangLab avec scope `alerts:read`
- Clé API Humanix (Essentielle+)

## Setup

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner HARFANGLAB_*, HUMANIX_*
```

## Cron typique

```cron
# Push de preuves vers HarfangLab : 1×/jour
0 6 * * * python /opt/humanix-hl/humanix_harfanglab_connector.py push --framework NIS2

# Pull des alertes pour ciblage : toutes les 4h
0 */4 * * * python /opt/humanix-hl/humanix_harfanglab_connector.py pull --hours 4
```

## Licence

MIT.
