# humanix-ciso-connector

Connecteur autonome qui synchronise les preuves de conformité (evidence) de **Humanix Académie** vers **CISO Assistant** (intuitem).

> Premier — et à ce jour seul — connecteur natif entre une plateforme française de sensibilisation cyber et un outil GRC open-source.

## À quoi ça sert

Vous gérez votre conformité (ISO 27001, NIS2, RGPD, ANSSI HG) dans CISO Assistant. Vos collaborateurs se forment dans Humanix Académie. Ce connecteur fait le pont :

- récupère les preuves vivantes depuis l'API Humanix (`/api/v1/evidence-export`)
- les transforme au format attendu par CISO Assistant
- crée ou met à jour les evidences dans CISO Assistant via son API REST

Plus de copier-coller manuel. Plus d'Excel partagé. Le score de conformité reflète automatiquement le facteur humain.

## Pré-requis

- Python 3.10+
- Une clé API Humanix (plan Pro ou supérieur — voir `/admin/api-keys`)
- Un compte CISO Assistant avec droits écriture sur les evidences

## Installation

```bash
git clone https://github.com/humanix-cybersecurity/humanix-ciso-connector
cd humanix-ciso-connector
pip install -r requirements.txt
cp .env.sample .env
# renseigner les valeurs dans .env
```

## Utilisation

### Mode dry-run (recommandé pour le premier essai)

```bash
set -a && source .env && set +a
python humanix_ciso_connector.py --framework ISO27001:2022 --dry-run
```

Cela affiche ce qui serait synchronisé sans rien écrire dans CISO Assistant.

### Mode live

```bash
python humanix_ciso_connector.py --framework NIS2
```

### Tous les frameworks supportés

```
ISO27001:2022   ISO/IEC 27001:2022 (Annexe A)
NIS2            Directive UE 2022/2555
RGPD            Règlement UE 2016/679
ANSSI-HG        Guide d'hygiène informatique ANSSI
NIST-CSF        NIST Cybersecurity Framework v2.0 (mapping partiel)
```

### Cron quotidien

```cron
# Tous les jours à 6h, sync NIS2
0 6 * * * cd /opt/humanix-ciso && set -a && . ./.env && set +a && python humanix_ciso_connector.py --framework NIS2 >> /var/log/humanix-ciso.log 2>&1
```

### Debug — sauvegarder le bundle brut

```bash
python humanix_ciso_connector.py --framework RGPD --output bundle.json --dry-run
jq '.evidences[] | {control_ref, status, score}' bundle.json
```

## Comportement

- En cas d'erreur sur un contrôle, le connecteur continue avec les suivants et fait un résumé final.
- Le code retour est `1` si au moins un upsert a échoué, `0` sinon.
- L'authentification CISO Assistant utilise le endpoint `/api/iam/login/` (à adapter si votre instance utilise un autre flux d'auth).

## Sécurité

- La clé API Humanix donne accès **en lecture** aux preuves de conformité de votre tenant uniquement (cloisonnement strict).
- Aucune PII brute ne transite par ce connecteur : seuls des liens vers les certificats et des métriques agrégées.
- Les credentials CISO Assistant doivent être stockés dans un coffre-fort (vault, secret manager) en production.

## Licence

MIT — utilisable librement, y compris dans des projets propriétaires ou AGPL.

## Support

- **Bug Humanix** : security@humanix-cybersecurity.fr
- **Bug CISO Assistant** : voir https://github.com/intuitem/ciso-assistant-community
- **Spec technique** : `/INTEGRATION_CISO_ASSISTANT.md` dans le repo Humanix
