# humanix-splunk-connector

Connecteur autonome qui pousse les preuves de conformité Humanix Académie vers **Splunk** via HEC (HTTP Event Collector).

## À quoi ça sert

Une fois déployé, votre Splunk reçoit en temps quasi-réel toutes les preuves de sensibilisation (score maturité, certificats, statut compliance par contrôle ISO/NIS2/RGPD/ANSSI/NIST). Vous pouvez :

- créer des dashboards d'évolution du score humain par BU / service
- déclencher des alertes sur dégradation (`severity_id > 5`)
- corréler avec vos autres logs (EDR, IAM, SIEM existant)

## Pré-requis

- Python 3.10+
- Splunk Enterprise / Cloud avec HEC activé
- Une clé API Humanix (plan Essentielle ou supérieur)

## Configuration côté Splunk

1. **Settings → Data inputs → HTTP Event Collector** → New Token
2. Nom : `humanix-academie`
3. Source type : `humanix:compliance:evidence` (ou laissez vide, le connecteur le force)
4. Index : `security_compliance` (recommandé) ou `main`
5. Récupérez le **token GUID** généré → c'est `SPLUNK_HEC_TOKEN`

## Installation

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner .env
```

## Utilisation

```bash
# 1. Test à blanc
set -a && source .env && set +a
python humanix_splunk_connector.py --framework ISO27001:2022 --dry-run

# 2. Si OK : envoi réel
python humanix_splunk_connector.py --framework NIS2

# 3. Cron quotidien
0 6 * * * cd /opt/humanix-splunk && set -a && . ./.env && set +a && python humanix_splunk_connector.py --framework NIS2 >> /var/log/humanix-splunk.log 2>&1
```

## Search SPL exemples

```spl
# Score moyen par framework sur 30 jours
sourcetype="humanix:compliance:evidence"
| stats avg(compliance_score) as avg_score by framework

# Contrôles non-conformes récents
sourcetype="humanix:compliance:evidence" compliance_status=non_compliant
| table _time tenant_name framework control_ref control_name

# Alerte dégradation
sourcetype="humanix:compliance:evidence" severity_id>=7
| stats count by tenant_name, control_ref
| where count > 1
```

## Licence

MIT.

## Support

Spec format : `lib/siem-formatters.ts` dans le repo Humanix · Bug : security@humanix-cybersecurity.fr
