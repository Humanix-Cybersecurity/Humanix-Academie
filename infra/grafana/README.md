# Monitoring Humanix Académie

> Stack monitoring : **Scaleway Cockpit** (Loki + Mimir + Alertmanager + Grafana)
>
> - **Vector** (logs Docker → Loki) + **prom-client** (metrics applicatives Next.js)

> ### 🔧 Révision du 2026-08-12 — ce document était faux sur sept points
>
> Vector tournait en prod **depuis mai 2026 sans jamais rien livrer** : 0 octet
> et 0 échantillon côté Cockpit, tout en crachant 298 Ko/h de logs sur
> lui-même (95 % du volume de la machine). Erreurs cumulées, toutes issues de
> ce document :
>
> | #   | Erreur                                                                | Statut sur la prod                          | Corrigée en |
> | --- | --------------------------------------------------------------------- | ------------------------------------------- | ----------- |
> | 1   | Data sources « custom » jamais créées → aucune destination            | **avérée**                                  | §2          |
> | 2   | Push vers une data source d'origine `scaleway` → **403**              | **avérée** (cause directe du blocage)       | §4          |
> | 3   | Nom de variable du token incohérent entre `.env` et la conf           | latente (le déploiement avait divergé)      | §4          |
> | 4   | `vector.yaml` recopié à la main, hors dépôt (`/opt/vector.yaml`)      | **avérée**                                  | §5          |
> | 5   | Auto-exclusion inopérante (match par **préfixe**) → boucle de logs    | **avérée** (les 298 Ko/h)                   | §5          |
> | 6   | Tag d'image `0.55-alpine` inexistant sur Docker Hub                   | latente (la prod tourne en `latest-alpine`) | §5          |
> | 7   | `SCW_MIMIR_URL` absente : **aucune métrique** n'était poussée du tout | **avérée**                                  | §4, §6      |
>
> Diagnostic établi sur les logs Vector du 12/08 : l'erreur réelle était
> **403 Forbidden**, pas 404. L'URL résolvait, le jeton était accepté — seule
> l'autorisation d'écrire manquait, ce qui pointe l'erreur 2 sans ambiguïté.
>
> La table des coûts était fausse elle aussi, et concluait à tort « 100 %
> gratuit ». Corrigée ci-dessous sur des chiffres relevés sur l'API.

## TL;DR

1. **Activer Cockpit** dans la console Scaleway région `fr-par`
2. **Créer les 2 data sources `custom`** (§2) — sans elles, rien n'est poussable
3. **Créer un token** en **écriture seule** : `write_only_logs` + `write_only_metrics` (§3)
4. **Poser les env vars** en prod — attention, `SCW_LOKI_URL` **sans** chemin et `SCW_MIMIR_URL` **avec** (§4)
5. **Déployer Vector** avec la conf **versionnée** `infra/vector/vector.yaml` (§5)
6. **Importer `dashboards/humanix-overview.json`** dans Grafana Cockpit (§7)
7. **Provisionner les 7 alertes** documentées dans `alerts-cockpit.md` (§8)

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

> Depuis le 2026-10-03, Vector lit aussi `/var/log/haproxy.log` et en tire
> **deux flux** : des métriques (statut, durée → Mimir, depuis août) et, nouveau,
> les **requêtes structurées** (adresse IP, méthode, chemin sans paramètres,
> statut, octets, durée → Loki, label `source="haproxy"`). C'est ce second flux
> qui répond à « qui nous scanne ? ». Tableau de bord dédié :
> `dashboards/humanix-trafic-haproxy.json`, règles 8 à 11 de
> `docs/ALERTES-GRAFANA.md`.

> ⚠️ Le bloc « Cockpit Agent (scrape) » du schéma ci-dessus est **trompeur** :
> Cockpit ne scrape rien, il ne fait que **recevoir du push**. C'est ce
> malentendu qui a fait chercher au mauvais endroit pendant trois mois. C'est
> le **même Vector** qui scrape `/api/metrics` et pousse vers Mimir (cf. §6).

## Ce que ça coûte (vérifié le 2026-08-12)

> ⚠️ La version précédente de cette section annonçait « 50 Go de logs et
> 100k échantillons/min gratuits », donc « 100 % gratuit ». **C'était faux.**
> Il n'existe AUCUN palier gratuit pour les données qu'on pousse soi-même.
> Chiffres ci-dessous relevés sur l'API Cockpit du projet et recoupés avec
> la grille publique Scaleway.

| Composant                                       | Facturation                          |
| ----------------------------------------------- | ------------------------------------ |
| Métriques/logs des ressources **Scaleway**      | gratuit                              |
| **Ce qu'on pousse** (« custom »)                | facturé **dès le 1er échantillon**   |
| Métriques custom                                | **0,15 €** / million d'échantillons  |
| Logs et traces custom                           | **0,35 €** / Go ingéré               |
| Rétention par défaut (31 j métriques, 7 j logs) | incluse                              |
| Rétention étendue (1 an / 1 mois)               | 29 €/mois — **on n'en a pas besoin** |
| Alertmanager, utilisateurs Grafana              | inclus                               |

Estimation pour Humanix, sur volumes **mesurés** et non supposés :

| Poste                                    | Volume             | Coût/mois |
| ---------------------------------------- | ------------------ | --------- |
| Logs des conteneurs                      | ~11 Mo/mois        | ~0,01 €   |
| Journal HAProxy (13 000 lignes/jour)     | ~150 Mo/mois       | ~0,05 €   |
| Journaux d'exploitation (cron, backup…)  | < 1 Mo/mois        | ~0 €      |
| Mesures hôte et conteneurs (~40 séries)  | 1,7 M échantillons | ~0,26 €   |
| Mesures PostgreSQL (~12 séries)          | 0,5 M échantillons | ~0,08 €   |
| Métriques produit et Hex (~30 séries)    | 1,3 M échantillons | ~0,20 €   |
| Métriques app (~110 séries @ 60 s)       | 4,8 M échantillons | ~0,71 €   |
| _(option)_ node_exporter (~1 000 séries) | 43 M échantillons  | ~6,50 €   |

**Soit moins de 1 €/mois en l'état.** Deux leviers si ça dérive : l'intervalle
de scrape (linéaire — 30 s au lieu de 60 s double la note) et la cardinalité
des labels. Ne JAMAIS mettre en label un identifiant d'utilisateur, de session
ou de requête : chaque valeur distincte crée une série, donc une ligne de facture.

## Setup pas-à-pas

### 1. Activer Cockpit

Console Scaleway → **Observability → Cockpit** → région `fr-par` → Enable.

Récupérer l'URL Grafana (format `https://<random>.fr-par.grafana.scaleway.fr`).

### 2. Créer les deux Data Sources « custom »

> ✅ **Fait le 2026-08-12** sur le projet `c9a236c0-…`. Cette section
> documente le pourquoi et sert si on repart de zéro.

**C'est la cause n°1 de la panne de mai→août 2026.** Le projet ne contenait
que les deux data sources créées d'office par Scaleway, d'origine
`scaleway`. **On ne peut rien pousser dedans** : elles sont alimentées par
Scaleway pour ses propres ressources. Le push exige des data sources
d'origine `custom`, et elles n'existaient pas. Vector avait beau tourner,
il n'avait aucune destination.

```bash
scw -p humanix cockpit data-source create name=humanix-prod-logs type=logs region=fr-par
scw -p humanix cockpit data-source create name=humanix-prod-metrics type=metrics region=fr-par
```

Ne pas passer `retention-days` : les valeurs par défaut (7 j logs, 31 j
métriques) sont celles du palier gratuit. En demander plus est facturé.

Relever ensuite l'**URL propre à chaque data source** — elle est préfixée
par son identifiant :

```bash
scw -p humanix cockpit data-source list
```

C'est cette URL qui va dans `SCW_LOKI_URL` / `SCW_MIMIR_URL`, **pas** l'URL
générique `logs.cockpit.fr-par.scw.cloud`, qui renvoie **404**.

### 3. Générer le token de push

En **écriture seule**. Le token précédent (`token-interesting-knuth`, mai 2026) portait neuf scopes dont `full_access_alert_manager` : beaucoup trop
large pour un agent qui ne fait qu'envoyer. Un agent compromis ne doit pas
pouvoir lire les journaux ni désarmer les alertes.

```bash
scw -p humanix cockpit token create name=humanix-prod-vector-push \
  token-scopes.0=write_only_logs token-scopes.1=write_only_metrics region=fr-par
```

**COPIE LE SECRET IMMÉDIATEMENT** — Scaleway ne le réaffichera plus.
Sauvegarder dans le coffre Humanix. Rotation annuelle (PSSI M15).

### 4. Configurer les env vars en prod

Sur la VM prod, ajouter à `/opt/humanix-prod/.env` :

```bash
# Token Bearer attendu par /api/metrics. >= 16 caracteres, sinon
# l'endpoint repond 503 et refuse de servir quoi que ce soit.
METRICS_SCRAPE_TOKEN=$(openssl rand -hex 32)

# Token Cockpit, en ECRITURE SEULE (cf. etape 3). Un seul nom pour les
# deux sinks Vector : logs ET metriques.
SCW_COCKPIT_TOKEN=<le token cree a l'etape 3>

# URL propres a chaque data source CUSTOM. Les deux formes DIFFERENT :
# Loki sans chemin (Vector l'ajoute), Mimir avec. Cf. tableau ci-dessous.
SCW_LOKI_URL=https://9cb3d00b-29df-4036-b6cb-ff50f63fc6e0.logs.cockpit.fr-par.scw.cloud
SCW_MIMIR_URL=https://299b6f0c-5da0-4894-9796-e8133b6a3048.metrics.cockpit.fr-par.scw.cloud/api/v1/push
```

> 🔴 **Les trois pièges qui ont fait perdre trois mois** (mai → août 2026,
> pendant lesquels Vector tournait sans jamais rien livrer) :
>
> 1. **Pointer la bonne data source.** La conf déployée visait
>    `1760729a-…`, c'est-à-dire « Scaleway Logs », d'origine `scaleway`.
>    Scaleway refuse l'écriture dans ses propres sources : **403 Forbidden**,
>    relevé dans les logs Vector le 12/08. Ce n'est **pas** un 404 — l'URL
>    résolvait et le jeton était accepté ; c'est l'autorisation d'écrire qui
>    manquait. Piège voisin mais distinct : l'URL générique, sans identifiant
>    de data source, renvoie bien **404**.
> 2. **Un seul nom de variable.** Le `.env` définissait `SCW_COCKPIT_TOKEN`
>    et la conf Vector lisait un autre nom : token vide, donc **401**.
> 3. **Les deux URL n'ont pas la même forme.** C'est asymétrique, et ce n'est
>    pas une coquille.
>
> | Variable        | Forme                               | Pourquoi                                                                                                                                                                         |
> | --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `SCW_LOKI_URL`  | **base, sans chemin**               | le sink `loki` ajoute `/loki/api/v1/push` lui-même — _« The base URL of the Loki instance. The path value is appended to this. »_ Le fournir ici le mettrait en **double** → 404 |
> | `SCW_MIMIR_URL` | **complète, `/api/v1/push` inclus** | `prometheus_remote_write` n'ajoute rien — _« The endpoint should include the scheme and the path to write to. »_                                                                 |
>
> Vérifiable sans jeton, en sondant les endpoints (401 = le chemin existe,
> 404 = il n'existe pas) :
>
> ```bash
> for u in "$SCW_MIMIR_URL" "$SCW_LOKI_URL/loki/api/v1/push"; do
>   printf '%s -> %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$u")"
> done
> ```
>
> Ces valeurs sont celles du projet `c9a236c0-…`. Si tu recrées une data
> source, l'identifiant change : relis-le avec
> `scw -p humanix cockpit data-source list`.

### 5. Déployer Vector pour les logs Docker

Ajouter à `docker-compose.yml` :

```yaml
services:
  vector:
    # Le tag doit etre `0.55.X-alpine` (avec le `.X`). `0.55-alpine`
    # n'existe pas sur Docker Hub : le pull echoue.
    image: timberio/vector:0.55.X-alpine
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./infra/vector/vector.yaml:/etc/vector/vector.yaml:ro
    # PIEGE : avec `environment:` les vars ${SCW_*} ne sont pas
    # toujours interpolees correctement selon la position du .env.
    # `env_file` injecte TOUTES les vars du .env directement dans
    # le container → plus robuste, recommande pour les agents.
    env_file:
      - .env
```

> ⚠️ **Format YAML, pas TOML** : Vector 0.55+ charge `vector.yaml` par
> defaut. Si tu utilises `vector.toml`, Vector ignore ton fichier
> et fallback sur sa source de demo `demo_logs` (qui genere des logs
> Syslog fake avec des noms type `nullable_nate`, `cache_cowboy`).

La configuration est **versionnée dans le dépôt** : [`infra/vector/vector.yaml`](../vector/vector.yaml).
Elle couvre les logs **et** les métriques (un seul agent), et son en-tête
documente les cinq causes de la panne de mai→août 2026.

> ⚠️ Elle ne vivait autrefois QUE sur la machine, recopiée à la main depuis
> ce document. C'est la quatrième cause de la panne : sans son fichier,
> Vector bascule sur sa source de démo `demo_logs` et fabrique de faux logs
> Syslog (`nullable_nate`, `cache_cowboy`…). Ne la dupliquez plus ici.

Trois pièges qu'elle neutralise, et qu'il faut connaître avant d'y toucher :

| Piège                                                             | Ce qui se passe si on l'oublie                                                                                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude_containers` matche par **préfixe**                       | `vector` ne matche PAS `humanix-prod-vector-1` → Vector se relit lui-même, chaque erreur en génère une autre. C'est l'origine des **298 Ko/h** mesurés le 12/08, soit 95 % du volume de logs de la machine. |
| Vector interpole `${...}` en **texte brut**, commentaires compris | Un nom de variable cité dans un commentaire est résolu comme une vraie variable → refus de démarrer. Citer les noms sans la syntaxe `${}`.                                                                  |
| `string!(...)` **abandonne** l'événement si le champ manque       | Un `remap` qui abandonne jette la ligne **silencieusement**. Utiliser `string(...) ?? ""`.                                                                                                                  |

Valider avant de déployer — ça prend dix secondes et ça évite un redémarrage en boucle :

```bash
docker run --rm -v "$PWD/infra/vector/vector.yaml:/etc/vector/vector.yaml:ro" --env-file .env timberio/vector:0.55.X-alpine validate --no-environment /etc/vector/vector.yaml
```

### 6. Métriques applicatives : c'est Vector qui scrape

Cockpit ne sait **pas** scraper un endpoint externe — il ne fait que _recevoir
du push_. Il faut donc un agent côté Humanix qui scrape `/api/metrics` puis
pousse vers Mimir.

C'est déjà le rôle du **même** Vector que les logs
([`infra/vector/vector.yaml`](../vector/vector.yaml), source `humanix_metrics`
et sink `scaleway_mimir`) : un seul agent, une seule conf, un seul token.

> L'ancienne version de ce document proposait un `grafana-agent` séparé en
> « option A », tout en recommandant l'option B. Abandonné : deux agents,
> deux configs et deux tokens à maintenir pour le même résultat. Le fichier
> `infra/grafana-agent/agent.yaml` qu'elle décrivait n'a d'ailleurs jamais
> existé dans le dépôt.

Intervalle de scrape : **60 s**. La facturation est linéaire en nombre
d'échantillons — 30 s doublerait la note pour une résolution inutile ici.

Si le conteneur applicatif porte un autre nom que `humanix-prod-app`, le
surcharger via le `.env` plutôt que de modifier la conf :

```bash
HUMANIX_METRICS_TARGET=mon-conteneur:3000
```

> ⚠️ **La moitié du dashboard restera vide tant que `recordHttpMetric` ne
> sera pas câblé.** `humanix_http_requests_total` et
> `humanix_http_request_duration_seconds` sont déclarées dans
> `lib/metrics/registry.ts` mais **jamais alimentées** : le helper existe et
> n'est appelé nulle part. Ça représente 9 des 18 requêtes du dashboard et
> 2 des 7 alertes. Les métriques Node (mémoire, event loop, CPU) et
> `humanix_audit_action_total`, elles, remontent bien.

### 7. Importer le dashboard

Grafana Cockpit → **Dashboards → Import** → uploader
`infra/grafana/dashboards/humanix-overview.json`.

Sélectionner la datasource Prometheus quand demandé.

Troisième tableau, `infra/grafana/dashboards/humanix-produit-hex.json` (activité,
campagnes, courriels, messages Hex par résultat, plan et modèle, coût Mistral
estimé) : data source Prometheus. Il lit les compteurs `humanix_hex_*`,
`humanix_courriels_total` et `humanix_episodes_termines_total` ajoutés le
2026-10-03 à `lib/metrics/registry.ts`, en plus des actions d'audit.

Même manœuvre pour `infra/grafana/dashboards/humanix-trafic-haproxy.json`
(trafic, scanners, authentification, refus HAProxy, TLS), en choisissant cette
fois la data source **Loki** (`humanix-prod-logs`). Il ne montre quelque chose
qu'une fois Vector redémarré avec la configuration qui contient
`haproxy_journal` (cf. §9).

### 8. Provisionner les alertes

Les règles 1 à 7 (`infra/grafana/alerts-cockpit.md`, `docs/ALERTES-GRAFANA.md`)
ont été saisies à la main en août 2026. Les règles 8 à 18 se créent par l'API
de Grafana avec `infra/grafana/provisionner-alertes.py`, idempotent : relancer
met à jour sans doubler, et les règles restent modifiables dans l'interface.

Il faut un jeton de **compte de service Grafana** (pas le jeton Cockpit de
Vector, qui ne sait qu'écrire des logs et des métriques) : Administration →
Users and access → Service accounts → Add service account, rôle Editor →
Add service account token. Le jeton ne se met que dans l'environnement du
terminal, jamais dans un fichier du dépôt ni dans une discussion.

```bash
export GRAFANA_URL=https://c9a236c0-86de-4360-9a19-21e04705c7f6.dashboard.cockpit.scaleway.com
export GRAFANA_TOKEN=glsa_...        # colle-le ici, dans le terminal seulement
python3 infra/grafana/provisionner-alertes.py --dry-run   # affiche, n'envoie rien
python3 infra/grafana/provisionner-alertes.py             # crée ou met à jour les 11 règles
```

Le script retrouve les data sources Loki et Prometheus (préfère
`humanix-prod-*`), crée le dossier « Humanix », pose chaque règle sous
l'identifiant `humanix-regle-<n>` et règle l'intervalle d'évaluation par
groupe. Les notifications suivent la politique par défaut, comme les règles 1
à 7 : vérifier qu'elle pointe sur le point de contact de
`docs/ALERTES-GRAFANA.md`, « Acheminement ».

## Vérifications post-déploiement

L'ancienne liste ne prouvait rien : elle vérifiait que Vector _démarre_, pas
qu'il _livre_. C'est précisément pour ça que la panne a duré trois mois — tout
avait l'air normal. **Le seul test qui compte est le compteur d'ingestion côté
Cockpit.**

```bash
# 1. L'endpoint sert bien les metriques (>= 100 lignes attendues)
curl -sf -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" \
  https://humanix-academie.fr/api/metrics | grep -c '^humanix_'

# 2. Vector ne rejette rien. Chercher 401 / 404 / "error", pas "started".
docker logs humanix-prod-vector-1 --since 5m 2>&1 | grep -iE 'error|401|404|refused' | head

# 3. Vector ne se relit plus lui-meme : ce volume doit etre FAIBLE.
#    Avant correction : 298 Ko/h. Apres : quelques Ko/h.
docker logs humanix-prod-vector-1 --since 1h 2>&1 | wc -c

# 4. LE TEST QUI COMPTE — les compteurs custom doivent devenir non nuls.
#    Compter quelques minutes apres le demarrage de Vector.
scw -p humanix cockpit usage-overview get -o json \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); \
      print("metriques:", d["external_metrics_usage"]["quantity_over_interval"]); \
      print("logs     :", d["external_logs_usage"]["quantity_over_interval"])'
```

Tant que l'étape 4 affiche `0`, **rien n'est livré** — inutile d'aller regarder
Grafana. Reprendre §2 (les data sources existent-elles en origine `custom` ?),
puis §4 (URL complète ? un seul nom de variable ?).

Une fois non nul, dans Grafana :

- LogQL : `{host="humanix-prod-01", env="prod"}`
- LogQL, journal HAProxy : `{source="haproxy"} | json | statut = 404`
- PromQL : `humanix_nodejs_heap_size_used_bytes`
  (choisir une métrique **réellement alimentée** — pas
  `humanix_http_requests_total`, cf. l'avertissement du §6)

### 9. Redémarrer Vector après une modification de `vector.yaml`

Le fichier est monté en lecture seule depuis le clone (`./infra/vector/vector.yaml`) :
une livraison met le fichier à jour, mais Vector ne le relit **pas** tout seul.

```bash
cd /opt/humanix-prod && vector_cfg=infra/vector/vector.yaml
# 1. Valider et jouer les tests unitaires AVEC l'image de prod, sans rien redémarrer.
podman run --rm -v "$PWD/infra/vector:/etc/vector:ro" --env-file .env \
  timberio/vector:0.55.X-alpine validate --no-environment /etc/vector/vector.yaml
podman run --rm -v "$PWD/infra/vector:/etc/vector:ro" --env-file .env \
  timberio/vector:0.55.X-alpine test /etc/vector/vector.yaml
# 2. Redémarrer (quelques secondes de trou dans les logs, rien d'autre).
#    JAMAIS `podman-compose ... up` à la main dans /opt/humanix-prod : hors
#    de deploy.sh, les variables de la pile (couleur, port, réseau, noms)
#    manquent, et compose crée une TROISIÈME pile, `humanix-app` et
#    `humanix-postgres` sur un réseau à part, avec une base vide qu'il
#    sème au passage. Vu le 2026-10-03, nettoyé à la main. Une livraison
#    (`./scripts/deploy.sh prod main`) recrée Vector proprement quand le
#    compose ou le montage change ; un simple restart suffit pour la conf.
podman restart humanix-prod_vector_1
# 3. Vérifier qu'il ne rejette rien, puis que les lignes arrivent.
podman logs --since 2m humanix-prod_vector_1 2>&1 | grep -iE 'error|401|404|refused' | head
```

Puis dans Grafana Explore : `{source="haproxy"}` doit afficher des lignes dans
la minute (les scanners ne laissent jamais le journal vide longtemps).

### 9 bis. Le montage d'un fichier fige son inode : HAProxy et la rotation

Constaté le 2026-10-04 : plus aucune ligne HAProxy dans Loki ni Mimir depuis
minuit. Le compose monte le **fichier** `/var/log/haproxy.log` dans le
conteneur Vector ; à la rotation quotidienne, logrotate renomme ce fichier et
rsyslog en crée un nouveau, mais le conteneur garde l'ancien inode, devenu
`haproxy.log.1`. Vector lit donc un fichier que plus personne n'écrit, sans
erreur, jusqu'à la prochaine recréation du conteneur. Les livraisons quasi
quotidiennes masquaient le défaut depuis août : les métriques HAProxy
s'arrêtaient chaque nuit et repartaient à la livraison suivante.

Remède côté hôte, une fois : `copytruncate` dans `/etc/logrotate.d/haproxy`.
Le fichier est copié puis vidé en place, l'inode ne change plus, et Vector
détecte la troncature. C'est déjà la règle choisie pour `/var/log/humanix`
(`infra/logrotate/humanix`), qui est, lui, monté comme répertoire.

Pour récupérer après une rotation déjà passée : supprimer le conteneur Vector
puis relivrer (`podman rm -f humanix-prod_vector_1 && ./scripts/deploy.sh prod main`),
jamais `podman-compose up` à la main (cf. §9).

### 10. Exploitation : journaux de l'hôte et mesures de la machine

Depuis le 2026-10-03, Vector lit aussi `/var/log/humanix/` (sauvegardes,
archivage, crons applicatifs, acme.sh → Loki, label `source="exploitation"`)
et `stats.log`, écrit chaque minute par `scripts/host-stats.py` (CPU, charge,
mémoire, disques, conteneurs, jours restants des certificats → Mimir, jauges
`humanix_hote_*`, `humanix_conteneur_*`, `humanix_certificat_*`, `humanix_base_*`). Tableau de
bord : `dashboards/humanix-exploitation.json`, règles 12 à 16 de
`docs/ALERTES-GRAFANA.md`.

Trois gestes sur l'hôte, une fois :

```bash
cd /opt/humanix-prod
# 1. Rotation des journaux de /var/log/humanix (sans elle, stats.log grossit de 3 Mo/jour).
sudo install -m 0644 infra/logrotate/humanix /etc/logrotate.d/humanix
# 2. La crontab : acme.sh journalisé, host-stats.py chaque minute.
./infra/cron/install-crontab.sh
# 3. Vector : la livraison l'a recréé avec le nouveau montage ; sinon un
#    redémarrage suffit (cf. §9, et surtout son avertissement : jamais de
#    `podman-compose up` à la main dans /opt/humanix-prod).
podman restart humanix-prod_vector_1
```

Puis importer `dashboards/humanix-exploitation.json` en choisissant les deux
data sources, Prometheus et Loki. Vérifications : `{source="exploitation"}`
dans Explore, et `humanix_hote_cpu_pourcent` côté métriques, dans la minute.

Pourquoi un script plutôt que node_exporter ou `host_metrics` de Vector :
node_exporter coûte ~6,50 €/mois pour un millier de séries, et Vector, dans
son conteneur, ne voit ni les montages ni les cgroups rootless de l'hôte.
Depuis l'hôte, `/proc`, `/sys/fs/cgroup` et `podman inspect` suffisent.

### 11. Disponibilité vue de l'extérieur

Tout ce qui précède tourne sur la machine ou dépend d'elle : si l'hôte tombe,
Vector se tait, et la règle 5 (« homme mort ») ne se déclenche que par
absence de données chez Scaleway. Une sonde externe comble ce cas, et c'est
la seule brique qui ne se configure pas ici : un service tiers, gratuit à ce
volume, qui appelle les deux adresses ci-dessous toutes les 5 minutes depuis
l'extérieur et pousse une notification sur le téléphone en cas d'échec.

| Adresse                                       | Attendu                           |
| --------------------------------------------- | --------------------------------- |
| `https://humanix-academie.fr/api/health`      | HTTP 200, corps `{"status":"ok"}` |
| `https://demo.humanix-academie.fr/api/health` | HTTP 200, corps `{"status":"ok"}` |

Exiger le corps, pas seulement le code : HAProxy répond 200 avec une page
d'erreur si l'application est absente mais le proxy en vie. Ne pas router la
notification vers une adresse hébergée par la plateforme elle-même, pour les
mêmes raisons que les alertes Grafana (cf. `docs/ALERTES-GRAFANA.md`,
« Acheminement »).

## Maintenance

| Fréquence       | Action                                                         |
| --------------- | -------------------------------------------------------------- |
| **Quotidien**   | Coup d'œil au dashboard Grafana                                |
| **Hebdo**       | Examiner les alertes warning, ajuster les seuils               |
| **Mensuel**     | Audit volume Loki/Mimir (rester sous quota gratuit)            |
| **Trimestriel** | Revue exhaustive : nouvelles surfaces, nouvelles audit actions |
| **Annuel**      | Rotation du token `METRICS_SCRAPE_TOKEN` (PSSI M15)            |

## Conformité

Ce setup couvre les exigences :

- **ANSSI HG M36** (journalisation composants importants) - Loki + Mimir
- **ANSSI HG M38** (audits réguliers) - dashboards + alertes
- **SOC 2 CC4.1 / CC4.2** (monitoring & deficiencies) - détection continue
- **SOC 2 CC7.1 / CC7.2** (system operations / surveillance anomalies) - alertes proactives
- **RGPD art. 32** (sécurité du traitement) - mesure technique appropriée
- **NIS2 art. 21.2(b)** (gestion incidents) - alertes routées vers procédure incident
