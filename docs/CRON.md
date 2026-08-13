# Tâches planifiées (cron)

Référence opérationnelle pour planifier toutes les tâches récurrentes de
Humanix Académie. Source de vérité unique : ce document. Si tu déploies
une nouvelle stack (docker compose, k8s, PaaS), il te faut juste recopier
le tableau ci-dessous dans le scheduler de ton choix.

> ## ⚠️ Un seul ordonnanceur à la fois
>
> Plusieurs mécanismes savent appeler ces endpoints. Ils sont **exclusifs**.
> Les faire tourner ensemble exécute chaque job **deux fois** — y compris
> `data-retention-purge`, `audit-logs-purge` et les lancements de campagnes
> de phishing.
>
> **En production Humanix, c'est la crontab de l'hôte** (§4). Ofelia (§5)
> est l'option pour les self-hosters. `infra/cron/install-crontab.sh` refuse
> d'installer si un conteneur Ofelia tourne ; le garde-fou inverse n'existe
> pas, c'est à toi de vérifier avant de démarrer Ofelia.

> ## 🔴 Ce qui s'est passé entre la mise en service et le 2026-08-12
>
> **Aucun job n'a jamais abouti.** `CronRun` était vide et
> `/var/log/humanix/cron.log` contenait **137 Ko** de :
>
> ```
> curl: (22) The requested URL returned error: 400
> ```
>
> La crontab de l'hôte extrayait le secret ainsi, sur chacune de ses lignes :
>
> ```sh
> grep CRON_SECRET /opt/humanix-prod/.env | cut -d= -f2 | tr -d '"'
> ```
>
> Ce `grep` n'est pas ancré. Quelques lignes plus haut, le `.env` contient
> un commentaire qui **explique comment appeler les crons** :
>
> ```
> # Exemple d'appel : curl -H "x-cron-secret: $CRON_SECRET" https://.../api/cron/breaches-refresh
> ```
>
> Les deux lignes remontaient ensemble : le « secret » obtenu faisait 158
> caractères et contenait un **saut de ligne**. L'en-tête HTTP était donc
> malformée et l'analyseur la rejetait en **400**, avant même que la route
> ne vérifie le secret — d'où un `403` jamais observé et un diagnostic
> trompeur.
>
> **L'exemple documentant comment appeler les crons est ce qui les
> empêchait de fonctionner.** Trois enseignements, qui expliquent la forme
> actuelle de `infra/cron/` :
>
> 1. L'extraction du secret est faite **une seule fois**, dans
>    `scripts/cron-host.sh`, ancrée en début de ligne — au lieu d'être
>    recopiée onze fois dans un fichier que personne ne relit.
> 2. **La crontab est versionnée.** Elle n'existait que sur la machine :
>    personne ne pouvait lire ce qui était planifié sans ouvrir une session
>    SSH.
> 3. **Un job appelé n'est pas un job qui aboutit.** `CronRun` est la seule
>    preuve — d'où le §7.

## 1. Inventaire des tâches

11 endpoints HTTP `/api/cron/*` + quelques scripts standalone.

| #   | Endpoint / Script                   | Fréquence    | Cron expr     | maxDur | Idempotent | Critique | Rôle                                                                                                                                                                                                                                                                |
| --- | ----------------------------------- | ------------ | ------------- | ------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/api/cron/risk-snapshot`           | 1×/jour      | `0 3 * * *`   | 60s    | ✅         | ⭐⭐     | Snapshot quotidien du score de risque par tenant (alimente `/admin/analytics/forecast`).                                                                                                                                                                            |
| 2   | `/api/cron/data-retention-purge`    | 1×/jour      | `15 3 * * *`  | 300s   | ✅         | ⭐⭐     | Anonymise les users inactifs et supprime les events/audit-logs au-delà du seuil RGPD configuré par tenant.                                                                                                                                                          |
| 3   | `/api/cron/cyber-event-tick`        | 1×/jour      | `30 0 * * *`  | 60s    | ✅         | ⭐⭐     | Crée/active les `CyberEventInstance` (Cybermois, World Password Day…) selon le calendrier annuel.                                                                                                                                                                   |
| 4   | `/api/cron/achievements-reevaluate` | 1×/jour      | `30 3 * * *`  | 300s   | ✅         | ⭐       | Re-évalue les badges achievements pour rattraper ceux ratés à la volée. Émet aussi les notifications de saisons obligatoires : relance (`REMINDER_MANDATORY`, 1×/semaine max par saison) et annonce du certificat (`CERTIFICATE_READY`, 1× définitivement).         |
| 5   | `/api/cron/challenge-rewards`       | 1×/jour      | `45 3 * * *`  | 60s    | ✅         | ⭐⭐     | Distribue les coins/items aux gagnants des `TeamChallenge` terminés (idempotence via `rewardsDistributedAt`).                                                                                                                                                       |
| 6   | `/api/cron/phishing-launch`         | 1×/heure     | `0 * * * *`   | 60s    | ✅         | ⭐⭐     | Démarre les campagnes phishing dont `scheduledAt` est dans le passé (`sentAt=null`).                                                                                                                                                                                |
| 7   | `/api/cron/phishing-drip`           | 1×/heure     | `30 * * * *`  | 60s    | ✅         | ⭐⭐     | Envoie les mails de campagnes phishing drip-planifiés arrivés à échéance (`dripScheduledAt <= now`, `mailDispatchedAt IS NULL`). Décalé à HH:30 pour ne pas percuter `phishing-launch`.                                                                             |
| 8   | `/api/cron/breaches-refresh`        | 1× / 6h      | `0 */6 * * *` | 60s    | ✅         | ⭐       | Scrape les sources publiques de fuites de données (observatoire `/cyber-meteo`).                                                                                                                                                                                    |
| 9   | `/api/cron/weekly-anecdote`         | 1× / semaine | `0 8 * * 1`   | 300s   | ✅         | ⭐       | Envoie l'anecdote hebdo aux abonnés (lundi 8h).                                                                                                                                                                                                                     |
| 10  | `/api/cron/audit-logs-purge`        | 1×/jour      | `0 4 * * *`   | 120s   | ✅         | ⭐       | Filet de sécurité global : purge `AuditLog` > 400j (CNIL ~13 mois) pour les tenants qui n'ont pas configuré leur propre `dataRetentionDays`.                                                                                                                        |
| 11  | `/api/cron/exposure-scan`           | 1×/jour      | `0 5 * * *`   | 60s    | ✅         | ⭐       | Veille d'exposition B2B : détecte les fuites touchant les domaines des tenants abonnés. Inerte si `EXPOSURE_B2B_ENABLED != true`. **Ajouté au planning le 2026-08-09 (#749)** : l'endpoint existait mais n'était déclaré nulle part, il n'avait donc jamais tourné. |
| 12  | `scripts/scrape-breaches.ts --deep` | au boot      | n/a           | n/a    | ✅         | ⭐       | Import initial de l'observatoire breaches. Déjà appelé par `docker-entrypoint.sh`.                                                                                                                                                                                  |

> **Vérifier que tout ça tourne vraiment** : `/superadmin/system-health` affiche
> le dernier passage, la durée et le résultat de chaque tâche (modèle `CronRun`,
> alimenté par `lib/cron/record.ts`). Une tâche jamais vue y apparaît en
> « Jamais exécuté » — c'est exactement ce qui manquait pour repérer les
> oublis de planification.
>
> **Ajouter un cron** = 4 endroits à mettre à jour, sinon il ne tournera pas ou
> ne sera pas surveillé : ce tableau, **`infra/cron/crontab.prod`** (la
> production), `infra/ofelia/config.ini` (les self-hosters), et
> `lib/cron/registry.ts`.
>
> `infra/cron/install-crontab.sh` signale les jobs du registre qui ne sont
> planifiés nulle part — c'est ainsi qu'on a vu, le 2026-08-12, que
> `phishing-drip` et `exposure-scan` manquaient à la crontab de production
> alors qu'ils figuraient bien dans les trois autres endroits.

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
- **Comparaison constante** : `crypto.timingSafeEqual` côté serveur - pas de timing attack
- **Sans secret valide → 403 Forbidden**, pas d'exécution

À générer :

```sh
openssl rand -hex 32
```

## 3. Comment exécuter - comparatif

| Solution                                                  | Force                                                                                                       | Faiblesse                                                                         | Cas d'usage                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| **Cron host** (`infra/cron/crontab.prod`)                 | Natif Linux, zéro dépendance, **indépendant de Docker : si le démon tombe, les purges tournent quand même** | Couplé à l'host, logs séparés du conteneur, ne marche pas en k8s                  | **Utilisé en production Humanix** (§4) |
| **Container `crond` Alpine** dans le compose              | Portable, logs Docker centralisés                                                                           | Crond minimaliste (pas de retry, pas de timezone propre), config statique         | OK pour V1, devient limité au-delà     |
| **[Ofelia](https://github.com/mcuadros/ofelia)**          | Conçu pour Docker, retry, timezone, jobs via labels OU config INI, mature                                   | Pas k8s-native (mais migration cosmétique)                                        | **Recommandé V1** sur docker compose   |
| **[Supercronic](https://github.com/aptible/supercronic)** | Crontab classique mais pour conteneurs, logs PID 1 propres                                                  | Moins de features qu'ofelia                                                       | Alternative plus minimaliste           |
| **SaaS externe** (cron-job.org, EasyCron, CronHooks)      | Aucune infra, UI, alertes                                                                                   | Dépendance externe (downtime = cron mort), historique de scheduling chez un tiers | Plan B / staging                       |
| **GitHub Actions schedule**                               | Gratuit, zéro infra                                                                                         | Imprécis (peut être 15min en retard), couplé à GitHub                             | Plan B / dépannage                     |
| **Kubernetes `CronJob`**                                  | Natif k8s, retries, history, parallelism, métadata observable                                               | Nécessite k8s                                                                     | **Recommandé V2** (scale)              |
| **Scaleway Serverless Cron** / **Vercel Cron**            | Géré par le PaaS                                                                                            | Couplage fort au PaaS                                                             | Si tu hostes là-bas                    |

## 4. Production Humanix : la crontab de l'hôte

C'est ce qui tourne réellement sur `humanix-prod-01`. Le choix se justifie
par une propriété qu'Ofelia n'a pas : **elle ne dépend pas de Docker**. Si
le démon tombe ou si la stack est arrêtée pour maintenance, les purges et
les sauvegardes s'exécutent quand même.

**La source de vérité est `infra/cron/crontab.prod`, dans le dépôt.**
Ne jamais utiliser `crontab -e` : la modification serait invisible pour
tout le monde, et c'est exactement ce qui a laissé vivre le bug ci-dessus.

```bash
$EDITOR infra/cron/crontab.prod            # 1. editer
git commit && git push                      # 2. faire relire, merger
./scripts/deploy.sh prod                    # 3. deployer sur la machine
./infra/cron/install-crontab.sh --dry-run   # 4. verifier le diff
./infra/cron/install-crontab.sh             # 5. installer
```

L'installateur vérifie **avant** d'écrire :

- **chaque slug planifié a bien sa route** — une faute de frappe donnerait
  un 404 silencieux à 3 h du matin ;
- **chaque job du registre est planifié** — signalé sans bloquer, un job
  peut être volontairement absent ;
- **aucun conteneur Ofelia ne tourne** — sinon double exécution.

Il sauvegarde l'ancienne crontab dans `~/crontab.avant-<horodatage>.bak`,
puis **relit ce qui a réellement été installé** plutôt que de le supposer.

### Le secret

`scripts/cron-host.sh` lit `CRON_SECRET` dans le `.env` de la stack, **une
seule fois**, avec un motif ancré (`^CRON_SECRET=`) limité à la première
occurrence — et refuse de partir si le résultat fait moins de 16
caractères, avec un message lisible plutôt qu'un 400 opaque. Toute la
logique utile (retries, timeout, codes de sortie) reste dans
`scripts/cron-runner.sh`, partagé avec Ofelia.

## 5. Alternative self-hosters : Ofelia sur docker compose

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

## 6. V2 cible : Kubernetes CronJob

La **migration depuis Ofelia ou la crontab est cosmétique** : les expressions cron du
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

## 7. Monitoring

Tous les endpoints renvoient un JSON `{ ok: true, ... }` avec des
counters. À brancher sur ton outil :

- **Healthcheck simple** : alerter si l'endpoint répond ≠ 200 deux fois
  d'affilée.
- **Anomalie de count** : alerter si `tenantsScanned` chute brusquement
  (ex. risk-snapshot qui passe de 50 à 0 → la BDD ne répond plus).
- **Lag** : alerter si un cron critique (⭐⭐) ne s'est pas exécuté
  depuis > 2× sa fréquence.

Le projet a déjà `AuditLog` qui trace les actions sensibles
(`DATA_RETENTION_PURGED`, `PHISHING_CAMPAIGN_SENT`…) - tu peux requeter
la table pour des dashboards Grafana sans ajouter d'infra.

## 8. Archiver les journaux d'audit avant de les purger

`audit-logs-purge` (tâche n°10) **supprime** les entrées de plus de 400 jours.
Purger est une **obligation**, pas une option : le RGPD (art. 5.1.e) interdit
la conservation indéfinie. Mais d'autres textes imposent de pouvoir produire
ces journaux après coup. D'où `scripts/archive-audit-logs.sh`, qui archive
**avant** que la purge ne supprime.

**Un bucket, pas un mail.** Le mail a été écarté : taille limitée, transit par
des tiers, aucune preuve d'intégrité, et la boîte devient une copie
incontrôlée de tout l'historique. Ce que le bucket apporte et que le mail ne
peut pas, c'est l'**Object Lock** : l'archive est immuable, donc un attaquant
qui compromet l'application, la machine, ou même la clé d'accès, **ne peut pas
effacer ses traces**. Pour des journaux d'audit, c'est le critère décisif.

Le script exporte en **JSONL par mois calendaire complet**, compresse, chiffre
avec `age` vers une clé **publique** (il ne peut donc pas relire ce qu'il
produit — c'est voulu), et téléverse avec un verrou WORM.

**La marge de 30 jours** — archivage à 370, purge à 400 — n'est pas
décorative : elle fait qu'un échec d'archivage produit **un mois d'alertes
avant la moindre perte**. Sans elle, un archivage raté le 399ᵉ jour et une
purge réussie le 400ᵉ suffiraient à perdre les données définitivement.

**Idempotence par le bucket** : un objet par mois, nom déterministe, et on
demande au bucket avant d'exporter. Aucun fichier d'état local à maintenir,
donc rien à désynchroniser.

### Mise en service

Le job figure dans `infra/cron/crontab.prod` mais **commenté**. Ne l'activer
qu'une fois ces étapes faites, sans quoi il échouerait chaque nuit — et un
échec permanent est précisément ce qui apprend à ne plus lire les journaux.

1. ✅ **Droits IAM** — fait le 2026-08-13. La clé `humanix` liste désormais
   les buckets (403 le 2026-08-12).
2. ✅ **Bucket `humanix-archives-audit` créé avec Object Lock**, le
   2026-08-13. Vérifié : `ObjectLockEnabled`, versionnement activé, `AES256`.
   ⚠️ L'Object Lock **ne peut pas être activé après coup** : c'est à la
   création, et uniquement là. Un bucket créé sans lui devra être recréé.
   Aucune règle de rétention par défaut — délibéré : la durée se pose objet
   par objet, ce qui laisse cohabiter les journaux d'audit (366 jours) et les
   sauvegardes PostgreSQL (30 jours) dans le même bucket.
3. ✅ **Clé API dédiée, en écriture.** L'archiveur dépose ; il ne supprime
   pas. La restauration passe par une clé distincte, détenue par un humain.
4. ✅ **Règles de cycle de vie** posées et relues le 2026-08-13. La
   référence est versionnée : `infra/s3/lifecycle-humanix-archives-audit.json`,
   avec le mode d'emploi dans `infra/s3/README.md`.

   | Préfixe | Expiration | Versions non courantes |
   | --- | --- | --- |
   | `auditlog/` | **367 jours** | +1 jour |
   | `postgres/` | **31 jours** | +1 jour |

   Toujours **un jour de plus** que le verrou correspondant. Le verrou
   empêche d'effacer trop tôt, il n'efface pas : sans ces règles, les
   archives s'accumuleraient indéfiniment — une non-conformité RGPD à part
   entière (art. 5.1.e). Et une expiration réglée *avant* la fin du verrou ne
   supprimerait rien, l'objet étant protégé.

   La seconde colonne n'est pas un raffinement. Le bucket est **versionné**,
   condition d'Object Lock : une expiration seule pose un marqueur de
   suppression sans rien effacer, et le stockage continue d'être facturé. La
   console ne sait pas exprimer `NoncurrentVersionExpiration` ; il faut passer
   par l'API, puis **relire** la configuration pour vérifier qu'elle a été
   retenue en entier. Relecture faite : le champ est bien pris en charge.
5. ⬜ **`/etc/humanix/archive.env`** avec les variables listées en tête du
   script. Depuis le 2026-08-13, **le script lit ce fichier lui-même**, avec
   `set -a` : `source` seul créerait des variables de shell, invisibles pour
   `aws` et `psql` qui sont des processus enfants.
6. ⬜ **Décommenter la ligne**, réinstaller la crontab (§4), puis lancer une
   fois à la main en `--dry-run`.
7. ⬜ **Tester une restauration.** Une archive jamais restaurée n'est pas une
   archive.

### La durée retenue : 366 jours

Décision du 2026-08-13 : **un an, plus un jour de rotation**.

L'obligation la plus contraignante qui s'applique aux journaux de connexion
est celle de la **LCEN** (un an) ; la CNIL retient six mois comme durée de
référence pour les journaux applicatifs. Le jour supplémentaire évite qu'une
rotation exécutée quelques heures trop tôt tombe pile sur l'échéance.

⚠️ **Cette durée est irrévocable objet par objet.** En mode COMPLIANCE, une
rétention ne peut être ni raccourcie ni levée, pas même par le propriétaire du
bucket. C'est ce qui fait sa valeur — et ce qui interdit de la choisir à la
légère : chaque objet déposé engage le stockage pour 366 jours.

### Ce que le script vérifie lui-même

- le nombre de lignes exporté correspond à l'attendu ;
- l'objet distant existe après upload **et fait la bonne taille** — il relit
  les métadonnées plutôt que de croire le `put` sur parole ;
- l'empreinte SHA-256 est stockée en métadonnée de l'objet ;
- la clé `age` fournie est bien une clé publique, pas une privée.

### Rien ne presse

Au 2026-08-12, la plus ancienne entrée d'`AuditLog` a **83 jours** et rien
n'est purgeable avant le **2027-06-24**. Le temps de faire les choses
proprement plutôt que de les improviser.

## 9. Path de migration

| Phase             | Plateforme                                | Scheduler                       | Effort                                                |
| ----------------- | ----------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| V0 actuelle       | docker compose, hostname `localhost`      | rien (manuel)                   | -                                                     |
| **V1 cible**      | docker compose, hôte unique               | **Ofelia** (livré dans ce repo) | 5 min : poser `CRON_SECRET`, lancer le service        |
| V2 prod self-host | docker compose multi-host ou docker swarm | Ofelia (1 instance fixe)        | identique à V1                                        |
| **V3 scale**      | Kubernetes                                | **CronJob natifs**              | 1 sprint : générer manifestes, secrets, observabilité |

Aucune logique métier ne change entre V1 et V3. Les endpoints sont les
mêmes, le secret est le même, les fréquences sont les mêmes. Seule la
boîte qui appelle `curl` change.
