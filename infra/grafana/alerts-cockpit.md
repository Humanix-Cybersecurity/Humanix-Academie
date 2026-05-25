# Alertes Scaleway Cockpit — Setup

> Configuration des alertes Alertmanager sur Scaleway Cockpit pour la
> production Humanix Académie. Couvre l'étape **E** du sprint Monitoring.

## Pré-requis

- Endpoint `/api/metrics` exposé en prod avec `METRICS_SCRAPE_TOKEN`
  configuré (`>= 16 chars`)
- Scaleway Cockpit activé (région `fr-par`)
- Datasource Prometheus créée dans le Grafana Cockpit
- Receveur configuré pour les notifications :
  - **Slack** (webhook channel #cyber-alerts)
  - OU **Email** (security@humanix-cybersecurity.fr)
  - OU **PagerDuty** (si on monte un on-call rotation)

## Convention de nommage

`humanix_<surface>_<symptome>` :
- `humanix_http_5xx_high` — explosion d'erreurs serveur
- `humanix_security_exfiltration_detected` — alerte exfiltration
- `humanix_security_brute_force_login` — pic login failed
- `humanix_security_prompt_injection_burst` — tentatives de fuite Hex

## 7 alertes à provisionner

### 1. 🔴 `humanix_http_5xx_high` — Explosion 5xx

**Symptôme** : > 1 % d'erreurs serveur sur 5 min.

```promql
(
  sum(rate(humanix_http_requests_total{status=~"5.."}[5m]))
  /
  clamp_min(sum(rate(humanix_http_requests_total[5m])), 1)
) > 0.01
```

| Champ | Valeur |
|-------|--------|
| Severity | `critical` |
| For | `5m` (évite les faux positifs sur pic isolé) |
| Annotation summary | `5xx error rate > 1% sur 5 min ({{ $value | humanizePercentage }})` |
| Annotation description | `Vérifier les logs HAProxy + app dans Loki. Investiguer DB, IA, ou bug récent.` |
| Receiver | Slack #cyber-alerts |

---

### 2. 🔴 `humanix_security_exfiltration_detected` — Exfiltration en masse

**Symptôme** : au moins 1 event `EXFILTRATION_SUSPECTED` dans la dernière heure.

```promql
sum(increase(humanix_audit_action_total{action="EXFILTRATION_SUSPECTED"}[1h])) >= 1
```

| Champ | Valeur |
|-------|--------|
| Severity | `critical` |
| For | `0s` (déclenchement immédiat) |
| Annotation summary | `Exfiltration en masse détectée — investigation immédiate requise` |
| Annotation description | `Voir /admin/audit?action=EXFILTRATION_SUSPECTED + /superadmin/admins-by-tenant pour identifier le user. Révoquer la session + reset MFA si compromission confirmée.` |
| Receiver | Slack #cyber-alerts + Email security@ |

---

### 3. 🟠 `humanix_security_brute_force_login` — Pic login failed

**Symptôme** : > 10 logins échoués / min pendant 5 min consécutives.

```promql
sum(rate(humanix_audit_action_total{action="USER_LOGIN_FAILED"}[5m])) * 60 > 10
```

| Champ | Valeur |
|-------|--------|
| Severity | `warning` |
| For | `5m` |
| Annotation summary | `Bruteforce login détecté ({{ $value }} échecs/min)` |
| Annotation description | `Vérifier /admin/audit?action=USER_LOGIN_FAILED. Si IP unique : block via HAProxy stick-table. Si distribué : investiguer credential stuffing.` |
| Receiver | Slack #cyber-alerts |

---

### 4. 🟠 `humanix_security_prompt_injection_burst` — Burst Hex prompt injection

**Symptôme** : > 10 tentatives de fuite system prompt en 1h.

```promql
sum(increase(humanix_audit_action_total{action="AI_PROMPT_INJECTION_ATTEMPT"}[1h])) > 10
```

| Champ | Valeur |
|-------|--------|
| Severity | `warning` |
| For | `0s` |
| Annotation summary | `>10 tentatives de fuite system prompt Hex en 1h ({{ $value }})` |
| Annotation description | `Vérifier si un user spécifique abuse ou un script automatisé. Le filtre output bloque mais il faut auditer le contexte.` |
| Receiver | Slack #cyber-alerts |

---

### 5. 🟡 `humanix_http_p95_latency_high` — Latence p95 dégradée

**Symptôme** : p95 latence > 1 s sur 10 min.

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(humanix_http_request_duration_seconds_bucket[5m]))
) > 1
```

| Champ | Valeur |
|-------|--------|
| Severity | `warning` |
| For | `10m` |
| Annotation summary | `p95 latency > 1s ({{ $value | humanizeDuration }})` |
| Annotation description | `Lent — vérifier DB (slow queries), IA Mistral (timeout), ou taille des PDF rendus.` |
| Receiver | Slack #cyber-alerts |

---

### 6. 🟡 `humanix_nodejs_eventloop_lag_high` — Event loop bloqué

**Symptôme** : p99 event loop lag > 200ms sur 5 min.

```promql
humanix_nodejs_eventloop_lag_p99_seconds > 0.2
```

| Champ | Valeur |
|-------|--------|
| Severity | `warning` |
| For | `5m` |
| Annotation summary | `Event loop lag p99 = {{ $value | humanizeDuration }}` |
| Annotation description | `Backpressure I/O ou CPU-bound code. Vérifier les loops sur grand tableau, regex catastrophiques, calculs synchrones.` |
| Receiver | Slack #cyber-alerts |

---

### 7. 🟢 `humanix_metrics_endpoint_down` — Scraping cassé

**Symptôme** : pas de scrape réussi depuis 5 min.

```promql
up{job="humanix-academie"} == 0
```

| Champ | Valeur |
|-------|--------|
| Severity | `warning` |
| For | `5m` |
| Annotation summary | `L'endpoint /api/metrics ne répond plus depuis 5 min` |
| Annotation description | `Si la prod est UP mais le scrape ne passe pas : vérifier METRICS_SCRAPE_TOKEN, le firewall, ou Cockpit lui-même.` |
| Receiver | Slack #cyber-alerts |

---

## Procédure de provisioning dans Cockpit

### Option A — Via UI Grafana (rapide)

1. Console Scaleway → Cockpit → **Alerting** → New alert rule
2. **Data source** : Prometheus (Cockpit Mimir)
3. **Query** : copier la PromQL ci-dessus
4. **Folder** : `Humanix` (créer si absent)
5. **Group** : par criticité (`critical`, `warning`, `info`)
6. **Labels** : `app=humanix-academie`, `severity=<level>`
7. **Annotations** : copier `summary` + `description`
8. **Contact point** : Slack #cyber-alerts (créer le webhook au préalable)
9. **Save**

Répéter pour les 7 alertes.

### Option B — Via API Scaleway (Infra as Code, recommandé)

Pour gérer les alertes en YAML versionné (à terme), utiliser l'API
Cockpit `POST /alerting/v1alpha1/rules`. Cf. doc :
https://www.scaleway.com/en/developers/api/cockpit/regional-api/

Pour le moment, **Option A suffit** (7 alertes, set-and-forget).

---

## Tests post-setup

Une fois les 7 alertes provisionnées, déclencher chaque cas en
contrôlé pour vérifier :

| Alerte | Comment tester |
|--------|----------------|
| `5xx_high` | Provoquer 10 requêtes 500 (endpoint mal configuré). |
| `exfiltration` | Forger 11 exports de 500 rows en 5 min (compte test). |
| `brute_force_login` | 15 tentatives de login échouées en 1 min. |
| `prompt_injection` | 11 requêtes "ignore previous instructions" au chat Hex. |
| `p95_latency` | Ralentir artificiellement un endpoint (ex: `sleep 2s` temporaire). |
| `eventloop_lag` | Boucle synchrone de 500ms. |
| `metrics_endpoint_down` | Arrêter `app` container 6 min. |

---

## Réception des alertes

**Slack** : webhook `https://hooks.slack.com/services/...` dans le
channel `#cyber-alerts` (à créer côté workspace Slack Humanix).

**Email** : envoyer à `security@humanix-cybersecurity.fr` qui forward
vers Florian + équipe (à ajuster quand l'effectif grandit).

**PagerDuty** (à terme) : routing key dédié pour les alertes
`severity=critical` quand l'astreinte sera structurée.

---

## Maintenance

- **Revue mensuelle** : examiner les false positives, ajuster les seuils
- **Revue trimestrielle** : ajout / suppression d'alertes selon les
  nouvelles surfaces (nouveaux endpoints, nouvelles audit actions)
- **Documentation** : tenir ce fichier à jour à chaque modification.
  En cas de divergence avec la prod, la prod fait foi mais on
  reflète ici dans la PR suivante.

## Conformité

- ✅ **ANSSI HG M36** (journalisation des composants importants) — alertes émises sur l'audit log
- ✅ **ANSSI HG M40** (procédure incident) — chaque alerte critical doit déclencher le runbook Pack NIS2
- ✅ **SOC 2 CC4.1** (monitoring activities) — détection continue
- ✅ **SOC 2 CC7.2** (surveillance anomalies) — alertes proactives
- ✅ **RGPD art. 32** (sécurité du traitement) — mesure technique adaptée
