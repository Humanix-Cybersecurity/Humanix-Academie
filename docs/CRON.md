# Tâches planifiées (cron)

Référence opérationnelle pour planifier toutes les tâches récurrentes de
Humanix Académie. Source de vérité unique : ce document. Si tu déploies
une nouvelle stack (docker compose, k8s, PaaS), il te faut juste recopier
le tableau ci-dessous dans le scheduler de ton choix.

## 1. Inventaire des tâches

8 endpoints HTTP `/api/cron/*` + quelques scripts standalone.

| # | Endpoint / Script | Fréquence | Cron expr | maxDur | Idempotent | Critique | Rôle |
|---|---|---|---|---|---|---|---|
| 1 | `/api/cron/risk-snapshot` | 1×/jour | `0 3 * * *` | 60s | ✅ | ⭐⭐ | Snapshot quotidien du score de risque par tenant (alimente `/admin/analytics/forecast`). |
| 2 | `/api/cron/data-retention-purge` | 1×/jour | `15 3 * * *` | 300s | ✅ | ⭐⭐ | Anonymise les users inactifs et supprime les events/audit-logs au-delà du seuil RGPD configuré par tenant. |
| 3 | `/api/cron/cyber-event-tick` | 1×/jour | `30 0 * * *` | 60s | ✅ | ⭐⭐ | Crée/active les `CyberEventInstance` (Cybermois, World Password Day…) selon le calendrier annuel. |
| 4 | `/api/cron/achievements-reevaluate` | 1×/jour | `30 3 * * *` | 60s | ✅ | ⭐ | Re-évalue les badges achievements pour rattraper ceux ratés à la volée. |
| 5 | `/api/cron/challenge-rewards` | 1×/jour | `45 3 * * *` | 60s | ✅ | ⭐⭐ | Distribue les coins/items aux gagnants des `TeamChallenge` terminés (idempotence via `rewardsDistributedAt`). |
| 6 | `/api/cron/phishing-launch` | 1×/heure | `0 * * * *` | 60s | ✅ | ⭐⭐ | Démarre les campagnes phishing dont `scheduledAt` est dans le passé (`sentAt=null`). |
| 7 | `/api/cron/breaches-refresh` | 1× / 6h | `0 */6 * * *` | 60s | ✅ | ⭐ | Scrape les sources publiques de fuites de données (observatoire `/cyber-meteo`). |
| 8 | `/api/cron/weekly-anecdote` | 1× / semaine | `0 8 * * 1` | 300s | ✅ | ⭐ | Envoie l'anecdote hebdo aux abonnés (lundi 8h). |
| 9 | `/api/cron/audit-logs-purge` | 1×/jour | `0 4 * * *` | 120s | ✅ | ⭐ | Filet de sécurité global : purge `AuditLog` > 400j (CNIL ~13 mois) pour les tenants qui n'ont pas configuré leur propre `dataRetentionDays`. |
| 10 | `scripts/scrape-breaches.ts --deep` | au boot | n/a | n/a | ✅ | ⭐ | Import initial de l'observatoire breaches. Déjà appelé par `docker-entrypoint.sh`. |

**Légende criticité** :
- ⭐⭐ : silence = la feature ne marche pas (forecast vide, badges absents, phishing non envoyé)
- ⭐ : silence = dégradation lente (breaches obsolètes, anecdote pas envoyée, logs non purgés)

## 2. Sécurité

Tous les endpoints `/api/cron/*` exigent un secret partagé :

```http
GET /api/cron/<name>
X-Cron-Secret: <CRON_SECRET>
```

Ou via query string en fallback :

```
GET /api/cron/<name>?secret=<CRON_SECRET>
```

- **Variable d'env** : `CRON_SECRET` (≥ 16 caractères, à générer une fois)
- **Comparaison constante** : `crypto.timingSafeEqual` côté serveur — pas de timing attack
- **Sans secret valide → 403 Forbidden**, pas d'exécution

À générer :
```sh
openssl rand -hex 32
```

## 3. Comment exécuter — comparatif

| Solution | Force | Faiblesse | Cas d'usage |
|---|---|---|---|
| **Cron host (`crontab -e`)** | Natif Linux, zéro dépendance | Couplé à l'host, logs séparés du conteneur, ne marche pas en k8s | Déploiement single-server simpliste |
| **Container `crond` Alpine** dans le compose | Portable, logs Docker centralisés | Crond minimaliste (pas de retry, pas de timezone propre), config statique | OK pour V1, devient limité au-delà |
| **[Ofelia](https://github.com/mcuadros/ofelia)** | Conçu pour Docker, retry, timezone, jobs via labels OU config INI, mature | Pas k8s-native (mais migration cosmétique) | **Recommandé V1** sur docker compose |
| **[Supercronic](https://github.com/aptible/supercronic)** | Crontab classique mais pour conteneurs, logs PID 1 propres | Moins de features qu'ofelia | Alternative plus minimaliste |
| **SaaS externe** (cron-job.org, EasyCron, CronHooks) | Aucune infra, UI, alertes | Dépendance externe (downtime = cron mort), historique de scheduling chez un tiers | Plan B / staging |
| **GitHub Actions schedule** | Gratuit, zéro infra | Imprécis (peut être 15min en retard), couplé à GitHub | Plan B / dépannage |
| **Kubernetes `CronJob`** | Natif k8s, retries, history, parallelism, métadata observable | Nécessite k8s | **Recommandé V2** (scale) |
| **Scaleway Serverless Cron** / **Vercel Cron** | Géré par le PaaS | Couplage fort au PaaS | Si tu hostes là-bas |

## 4. V1 recommandé : Ofelia sur docker compose

Le repo livre une **extension compose** prête à l'emploi :

```sh
docker compose -f docker-compose.yml -f docker-compose.cron.yml up -d
```

Le service `ofelia` lit `infra/ofelia/config.ini`, exécute `curl` vers
les endpoints `/api/cron/*` aux fréquences du tableau, signe avec le
`CRON_SECRET`. Logs visibles via `docker compose logs ofelia`.

### Configuration

Ajoute dans ton `.env` :
```env
CRON_SECRET="<openssl rand -hex 32>"
```

Active le service :
```sh
docker compose -f docker-compose.yml -f docker-compose.cron.yml up -d ofelia
```

### Désactivation ponctuelle d'un job

Édite `infra/ofelia/config.ini`, commente la section, redémarre :
```sh
docker compose -f docker-compose.yml -f docker-compose.cron.yml restart ofelia
```

### Test manuel d'un endpoint

Le helper `scripts/cron-runner.sh` est aussi installé dans l'image ofelia :
```sh
docker compose exec ofelia /scripts/cron-runner.sh risk-snapshot
```

## 5. V2 cible : Kubernetes CronJob

La **migration depuis Ofelia est cosmétique** : les expressions cron du
tableau ci-dessus sont identiques côté k8s. Pour chaque ligne tu produis
un manifeste de la forme :

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: humanix-risk-snapshot
spec:
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: curl
            image: curlimages/curl:8
            command:
              - /bin/sh
              - -c
              - >
                curl -fsSL --retry 3
                -H "X-Cron-Secret: $CRON_SECRET"
                http://app.humanix.svc.cluster.local/api/cron/risk-snapshot
            env:
            - name: CRON_SECRET
              valueFrom:
                secretKeyRef: { name: humanix-cron, key: secret }
```

Bonnes pratiques k8s :
- `concurrencyPolicy: Forbid` partout (idempotent suffit, pas besoin de
  paralléliser).
- `successfulJobsHistoryLimit: 3` pour debug sans saturer etcd.
- `restartPolicy: OnFailure` pour profiter du retry du Job sans relancer
  le scheduler.
- Secret `humanix-cron` géré par `kubectl create secret` ou Sealed Secrets
  / External Secrets Operator si GitOps.

Pour générer les manifestes en bulk : un `kustomize` overlay qui génère
8 CronJob depuis le tableau. À ajouter dans `infra/k8s/cronjobs/` dès que
le projet bascule sur k8s.

## 6. Monitoring

Tous les endpoints renvoient un JSON `{ ok: true, ... }` avec des
counters. À brancher sur ton outil :

- **Healthcheck simple** : alerter si l'endpoint répond ≠ 200 deux fois
  d'affilée.
- **Anomalie de count** : alerter si `tenantsScanned` chute brusquement
  (ex. risk-snapshot qui passe de 50 à 0 → la BDD ne répond plus).
- **Lag** : alerter si un cron critique (⭐⭐) ne s'est pas exécuté
  depuis > 2× sa fréquence.

Le projet a déjà `AuditLog` qui trace les actions sensibles
(`DATA_RETENTION_PURGED`, `PHISHING_CAMPAIGN_SENT`…) — tu peux requeter
la table pour des dashboards Grafana sans ajouter d'infra.

## 7. Path de migration

| Phase | Plateforme | Scheduler | Effort |
|---|---|---|---|
| V0 actuelle | docker compose, hostname `localhost` | rien (manuel) | — |
| **V1 cible** | docker compose, hôte unique | **Ofelia** (livré dans ce repo) | 5 min : poser `CRON_SECRET`, lancer le service |
| V2 prod self-host | docker compose multi-host ou docker swarm | Ofelia (1 instance fixe) | identique à V1 |
| **V3 scale** | Kubernetes | **CronJob natifs** | 1 sprint : générer manifestes, secrets, observabilité |

Aucune logique métier ne change entre V1 et V3. Les endpoints sont les
mêmes, le secret est le même, les fréquences sont les mêmes. Seule la
boîte qui appelle `curl` change.
