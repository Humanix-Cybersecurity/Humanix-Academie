# humanix-sentinel-connector

Connecteur autonome qui pousse les preuves de conformité Humanix Académie vers **Microsoft Sentinel** via la Logs Ingestion API.

## À quoi ça sert

Vos preuves de sensibilisation arrivent dans Sentinel comme une table custom (`HumanixCompliance_CL`). Le **workbook clé en main fourni** vous donne immédiatement :

- statut global (compliant / partial / non_compliant)
- évolution du score moyen sur 30 jours
- détail par contrôle avec icônes de statut
- filtres par tenant et framework

## Setup Azure (10 min, à faire une fois)

### 1. Data Collection Endpoint (DCE)

Azure Portal → **Data Collection Endpoints** → Create.
Région = même que votre Log Analytics workspace.
Notez l'**ingestion endpoint URI**.

### 2. Custom Log Table

Log Analytics workspace → **Tables** → New custom log (DCR-based).
Nom : `HumanixCompliance` (le suffixe `_CL` sera ajouté).
Schéma JSON :

```json
[
  { "name": "TimeGenerated", "type": "datetime" },
  { "name": "TenantId_s", "type": "string" },
  { "name": "TenantName_s", "type": "string" },
  { "name": "Framework_s", "type": "string" },
  { "name": "ControlRef_s", "type": "string" },
  { "name": "ControlName_s", "type": "string" },
  { "name": "Category_s", "type": "string" },
  { "name": "Status_s", "type": "string" },
  { "name": "Score_d", "type": "real" },
  { "name": "ArtifactsCount_d", "type": "real" },
  { "name": "ScopeNote_s", "type": "string" }
]
```

### 3. Data Collection Rule (DCR)

Pendant la création de la table custom, Azure crée automatiquement une DCR.
Notez son **Immutable ID** (Properties).

### 4. App Registration (Service Principal)

Azure AD → **App registrations** → New registration.
Nom : `humanix-sentinel-connector`.
Récupérez : Tenant ID, Application (client) ID, Client secret.

Sur la DCR : **Access control (IAM)** → Add role assignment → `Monitoring Metrics Publisher` à votre App Registration.

### 5. Workbook

Sentinel → **Workbooks** → New → Edit → `</>` → collez le contenu de [`humanix-workbook.json`](./humanix-workbook.json) → Save.

## Installation du connecteur

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner les 7 variables
```

## Utilisation

```bash
# 1. Test à blanc
set -a && source .env && set +a
python humanix_sentinel_connector.py --framework ISO27001:2022 --dry-run

# 2. Envoi réel
python humanix_sentinel_connector.py --framework NIS2

# 3. Cron quotidien
0 6 * * * cd /opt/humanix-sentinel && set -a && . ./.env && set +a && python humanix_sentinel_connector.py --framework NIS2 >> /var/log/humanix-sentinel.log 2>&1
```

## Vérifier l'arrivée des données

Dans Log Analytics → Logs → exécutez :

```kql
HumanixCompliance_CL
| order by TimeGenerated desc
| take 10
```

## Licence

MIT.

## Support

Spec format : `lib/siem-formatters.ts` dans le repo Humanix · Bug : security@humanix-cybersecurity.fr
