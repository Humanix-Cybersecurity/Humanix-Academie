# Monitoring Humanix Académie

> Stack monitoring : **Scaleway Cockpit** (Loki + Mimir + Alertmanager + Grafana)
> + **Vector** (logs Docker → Loki) + **prom-client** (metrics applicatives Next.js)

## TL;DR

1. **Activer Cockpit** dans la console Scaleway région `fr-par`
2. **Créer un token** Cockpit avec scopes `metrics:write` + `logs:write`
3. **Définir `METRICS_SCRAPE_TOKEN`** (>= 16 chars) en prod
4. **Importer `dashboards/humanix-overview.json`** dans Grafana Cockpit
5. **Provisionner les 7 alertes** documentées dans `alerts-cockpit.md`
6. **Déployer Vector** dans `docker-compose.yml` pour streamer les logs

Total ~30-45 min côté ops.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Humanix Académie                     │
│                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────────┐  │
│  │  HAProxy   │───▶│  Next.js   │───▶│  PostgreSQL    │  │
│  │            │    │  + Prisma  │    │                │  │
│  └─────┬──────┘    └─────┬──────┘    └────────────────┘  │
│        │ stdout          │ /api/metrics                  │
│        │                 │ (Bearer token)                │
│        ▼                 ▼                               │
│  ┌────────────┐    ┌────────────┐                        │
│  │  Vector    │    │ Cockpit    │                        │
│  │  (Rust)    │    │ Agent      │                        │
│  └─────┬──────┘    │ (scrape)   │                        │
│        │           └─────┬──────┘                        │
└────────┼─────────────────┼───────────────────────────────┘
         │ Loki push       │ Prometheus push
         │ HTTPS Bearer    │ HTTPS Bearer
         ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│              Scaleway Cockpit (fr-par)                   │
│                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────────┐  │
│  │   Loki     │    │   Mimir    │    │  Alertmanager  │  │
│  │  (logs)    │    │ (metrics)  │    │                │  │
│  └─────┬──────┘    └─────┬──────┘    └────────┬───────┘  │
│        └─────────────────┴────────────────────┘          │
│                         │                                │
│                         ▼                                │
│                  ┌────────────┐                          │
│                  │  Grafana   │ ◄── Florian / RSSI       │
│                  │ dashboard  │     (via SSO Scaleway)   │
│                  └────────────┘                          │
└──────────────────────────────────────────────────────────┘
                          │
                          │ webhook
                          ▼
                  ┌────────────┐
                  │  Slack     │
                  │ #cyber-    │
                  │ alerts     │
                  └────────────┘
```

## Quotas Cockpit gratuits (à jour 2026)

| Composant | Free tier | Au-delà |
|-----------|-----------|---------|
| Logs (Loki) | 50 GB ingestion/mois, 7j rétention | 0,90 €/GB ingéré |
| Métriques (Mimir) | 100k échantillons/min, 31j rétention | 0,025 €/1M samples |
| Alertes Alertmanager | Illimité | Gratuit |
| Grafana | Illimité | Gratuit |
| Traces (Tempo) | ❌ payant | 0,40 €/GB |

Pour Humanix actuel (< 5 GB logs/mois, < 10k metrics/min) → **100 % gratuit**.

## Setup pas-à-pas

### 1. Activer Cockpit

Console Scaleway → **Observability → Cockpit** → région `fr-par` → Enable.

Récupérer l'URL Grafana (format `https://<random>.fr-par.grafana.scaleway.fr`).

### 2. Générer le token de scraping

Cockpit → **Tokens** → New Token :
- Name : `humanix-prod-scraper`
- Scopes : `metrics:write`, `logs:write`, `alerts:read+write`

Sauvegarder le token dans 1Password vault Humanix.

### 3. Configurer les env vars en prod

Sur la VM prod, ajouter à `/opt/humanix-prod/.env` :

```bash
# Token Bearer pour authentifier le scraping Prometheus
METRICS_SCRAPE_TOKEN=$(openssl rand -hex 32)

# Token Cockpit (pour Vector → Loki)
SCW_COCKPIT_TOKEN=<le token créé étape 2>

# Endpoint Loki Cockpit (fixe selon région)
SCW_LOKI_URL=https://logs.cockpit.fr-par.scw.cloud/loki/api/v1/push

# Endpoint Mimir Cockpit (pour scrape Prometheus distant si besoin)
SCW_MIMIR_URL=https://metrics.cockpit.fr-par.scw.cloud
```

### 4. Déployer Vector pour les logs Docker

Ajouter à `docker-compose.yml` :

```yaml
services:
  vector:
    image: timberio/vector:0.40-alpine
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./infra/vector/vector.toml:/etc/vector/vector.toml:ro
    environment:
      - SCW_LOKI_TOKEN=${SCW_COCKPIT_TOKEN}
      - SCW_LOKI_URL=${SCW_LOKI_URL}
```

Créer `infra/vector/vector.toml` :

```toml
[sources.docker]
type = "docker_logs"
exclude_containers = ["vector"]  # éviter la boucle

[transforms.parse_json]
type = "remap"
inputs = ["docker"]
source = '''
  if exists(.message) {
    parsed, err = parse_json(.message)
    if err == null {
      . = merge(., parsed)
    }
  }
'''

[sinks.scaleway_loki]
type = "loki"
inputs = ["parse_json"]
endpoint = "${SCW_LOKI_URL}"
auth.strategy = "bearer"
auth.token = "${SCW_LOKI_TOKEN}"
encoding.codec = "json"
remove_label_fields = true

# Labels Loki : host + container + service. Pas de PII.
[sinks.scaleway_loki.labels]
host = "humanix-prod-01"
container = "{{ container_name }}"
image = "{{ image }}"
```

### 5. Configurer le scrape Prometheus distant

Dans Cockpit → **Data sources** → Prometheus déjà configuré.

Pour scrape `/api/metrics` Humanix, ajouter un job. Comme Cockpit ne
scrape pas direct un endpoint externe (il reçoit du push), 2 options :

**Option A** — Grafana Agent côté Humanix (push vers Mimir) :

```yaml
# infra/grafana-agent/agent.yaml
server:
  log_level: info

metrics:
  global:
    scrape_interval: 30s
    external_labels:
      app: humanix-academie
      env: production
  configs:
    - name: humanix
      remote_write:
        - url: ${SCW_MIMIR_URL}/api/v1/push
          authorization:
            type: Bearer
            credentials: ${SCW_COCKPIT_TOKEN}
      scrape_configs:
        - job_name: humanix-app
          static_configs:
            - targets: ['app:3000']
          metrics_path: /api/metrics
          authorization:
            type: Bearer
            credentials: ${METRICS_SCRAPE_TOKEN}
```

Ajouter au `docker-compose.yml` :

```yaml
  grafana-agent:
    image: grafana/agent:v0.40.0
    restart: unless-stopped
    command: -config.file=/etc/agent/agent.yaml
    volumes:
      - ./infra/grafana-agent/agent.yaml:/etc/agent/agent.yaml:ro
    environment:
      - SCW_MIMIR_URL=${SCW_MIMIR_URL}
      - SCW_COCKPIT_TOKEN=${SCW_COCKPIT_TOKEN}
      - METRICS_SCRAPE_TOKEN=${METRICS_SCRAPE_TOKEN}
    depends_on:
      - app
```

**Option B** (simpler mais moins flexible) — utiliser Vector aussi pour metrics :

```toml
[sources.humanix_metrics]
type = "prometheus_scrape"
endpoints = ["http://app:3000/api/metrics"]
scrape_interval_secs = 30
auth.strategy = "bearer"
auth.token = "${METRICS_SCRAPE_TOKEN}"

[sinks.scaleway_mimir]
type = "prometheus_remote_write"
inputs = ["humanix_metrics"]
endpoint = "${SCW_MIMIR_URL}/api/v1/push"
auth.strategy = "bearer"
auth.token = "${SCW_COCKPIT_TOKEN}"
```

Recommandé : **Option B** (un seul agent Vector pour logs + metrics =
plus simple à maintenir).

### 6. Importer le dashboard

Grafana Cockpit → **Dashboards → Import** → uploader
`infra/grafana/dashboards/humanix-overview.json`.

Sélectionner la datasource Prometheus quand demandé.

### 7. Provisionner les 7 alertes

Suivre `infra/grafana/alerts-cockpit.md`. Compter ~5 min par alerte
via l'UI (35 min total). À automatiser via API Scaleway quand le
besoin se fera sentir.

## Vérifications post-déploiement

```bash
# 1. /api/metrics répond
curl -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" \
  https://humanix-academie.fr/api/metrics | head -30

# 2. Vector démarre sans erreur
docker compose logs vector | tail -50

# 3. Logs apparaissent dans Cockpit Loki (UI Explorer)
# Query LogQL : {app="humanix-academie"}

# 4. Métriques apparaissent dans Cockpit Mimir
# Query PromQL : up{job="humanix-app"}

# 5. Dashboard affiche les graphiques
# Aller dans Grafana → Dashboards → "Humanix Académie — Overview"

# 6. Test alerte (déclencher 11 logins échoués en 1 min)
# → Slack #cyber-alerts doit recevoir la notification < 30s
```

## Maintenance

| Fréquence | Action |
|-----------|--------|
| **Quotidien** | Coup d'œil au dashboard Grafana |
| **Hebdo** | Examiner les alertes warning, ajuster les seuils |
| **Mensuel** | Audit volume Loki/Mimir (rester sous quota gratuit) |
| **Trimestriel** | Revue exhaustive : nouvelles surfaces, nouvelles audit actions |
| **Annuel** | Rotation du token `METRICS_SCRAPE_TOKEN` (PSSI M15) |

## Conformité

Ce setup couvre les exigences :
- **ANSSI HG M36** (journalisation composants importants) — Loki + Mimir
- **ANSSI HG M38** (audits réguliers) — dashboards + alertes
- **SOC 2 CC4.1 / CC4.2** (monitoring & deficiencies) — détection continue
- **SOC 2 CC7.1 / CC7.2** (system operations / surveillance anomalies) — alertes proactives
- **RGPD art. 32** (sécurité du traitement) — mesure technique appropriée
- **NIS2 art. 21.2(b)** (gestion incidents) — alertes routées vers procédure incident
