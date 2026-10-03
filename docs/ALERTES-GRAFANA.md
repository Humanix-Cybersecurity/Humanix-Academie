# Alertes de détection — Grafana / Loki

> Ce document ferme le manque nommé dans `docs/PROCEDURE-VIOLATION-DONNEES.md` :
> _« Cette procédure suppose que vous savez qu'une violation a eu lieu.
> Aujourd'hui, rien ne vous alerte. »_
>
> L'engagement de notification sous 48 h du DPA (article 6) ne court qu'à partir
> de la **connaissance** de l'incident. Sans détection, ce délai est confortable
> et vide : on ne sait jamais, donc on n'est jamais en retard. Ces règles sont
> ce qui rend l'engagement réel.

---

## Pourquoi ces règles se créent à la main

Le jeton `SCW_COCKPIT_TOKEN` est **en écriture seule**. Il pousse des journaux
vers Loki et ne peut rien lire — a fortiori rien créer. Les règles ci-dessous
se saisissent donc dans l'interface Grafana de Scaleway Cockpit :

**Alerting → Alert rules → New alert rule**, source de données
**`humanix-prod-logs`**.

C'est fastidieux une fois, et jamais plus. Les requêtes sont écrites pour être
recopiées telles quelles.

### Le jeu complet, en un fichier

`alertes-grafana.json` (à côté de ce document) contient les **sept règles telles
qu'elles tournent**, exportées depuis Grafana après leur création. Il se recharge
par **Alerting → Alert rules → Import**, sans repasser par la saisie manuelle.

Ce fichier n'est pas une source de vérité : le jeton est en écriture seule, donc
rien ne le synchronise avec Grafana. C'est un **instantané**, à ré-exporter après
toute modification faite dans l'interface, sans quoi il diverge en silence.

### Trois mécaniques de l'interface, dont une qui rend une règle inopérante

**La requête seule ne suffit pas.** Grafana construit une règle en trois étages :
la requête `A`, une réduction `B`, un seuil `C`. Coller la LogQL dans `A` et
chercher le champ « seuil » à côté ne mène nulle part. Mettre `B` sur **Last**,
et porter la condition du tableau (`IS ABOVE 20`) dans `C`.

**⚠️ La requête doit être de type `Instant`, jamais `Range`.** C'est le réglage
le plus discret et le seul capable de rendre une règle définitivement muette.

Quand plus aucune ligne ne correspond, Loki n'émet pas `0` : il **cesse
d'émettre des points**. Sur une requête `Range`, la série s'arrête donc sur sa
dernière valeur connue, et `Last` retourne indéfiniment ce dernier point
disponible. Une règle « moins de 1 » n'est jamais franchie, et l'état _No Data_
n'est jamais atteint non plus puisque la série existe.

Mesuré sur la règle 5 : à l'arrêt de Vector, la courbe a drainé `3 → 2 → 1` puis
s'est figée sur `1`. La règle était correctement configurée par ailleurs et ne
pouvait structurellement pas se déclencher.

`Instant` évalue uniquement à `now`. Si rien ne correspond à cet instant, il n'y
a pas de série du tout — donc _No Data_, donc l'alerte si le réglage suivant est
mis.

**Le sens de « Si aucune donnée » n'est PAS le même pour toutes les règles.**
C'est une asymétrie qu'on lit à l'envers une fois sur deux :

| Règle          | Absence de données signifie  | _Alert state if no data_ |
| -------------- | ---------------------------- | ------------------------ |
| 5 (homme mort) | la collecte est morte        | **`Alerting`**           |
| 1, 2, 3, 4     | rien d'anormal ne se produit | **`OK` / `Normal`**      |

Mettre `Alerting` sur les règles 1 à 4 les ferait hurler en permanence : une
journée sans échec d'authentification est une bonne journée, pas une panne.

**L'ordre de création compte.** Un point de contact doit exister avant qu'une
règle puisse notifier — sinon l'alerte se déclenche dans le vide, ce qui est
exactement l'état qu'on cherche à quitter. Voir la section « Acheminement »
en premier, puis créer les règles dans cet ordre :

1. **règle 5** (l'homme mort) — elle surveille les six autres ;
2. **règle 2** (exfiltration) puis **1** (échecs d'authentification) ;
3. **règles 4** et **3** ;
4. **règles 6 et 7**, une fois le trafic observé sur sept jours.

### Tester une règle sans couper la production

Vérifier un homme mort en arrêtant Vector coûte quinze minutes d'aveuglement, et
ne teste que la moitié du chemin. Pour éprouver **l'acheminement** — règle →
politique de notification → Telegram — inverser temporairement la condition :

`IS BELOW 1` → `IS ABOVE 0`

Elle devient vraie immédiatement. Si la notification arrive dans la minute,
l'acheminement fonctionne et seule la requête est en cause. Sinon, le problème
est la politique de notification, et toucher aux règles ne sert à rien.

Remettre la condition d'origine ensuite.

### État de la chaîne

Vérifié de bout en bout le 2026-08-14 : `instrumentation.ts` émet, `podman logs`
le montre, Vector l'achemine, et les battements sont visibles dans Grafana. Ce
qui reste manquant, ce sont les règles ci-dessous — le code émet, personne
n'écoute encore.

---

## Ce que Loki voit, et ce qu'il ne voit pas

Une chose à comprendre avant de lire les requêtes, parce qu'elle a failli rendre
tout ce dispositif inopérant :

**Un `AuditLog` part en base PostgreSQL. Vector ne collecte que la sortie
standard des conteneurs.** Les deux ne se rencontrent nulle part.

Les événements d'audit — `USER_LOGIN_FAILED`, `EXFILTRATION_SUSPECTED` —
n'atteignaient donc **jamais** Loki. Aucune règle LogQL n'aurait pu les voir,
quelle que soit son écriture.

`lib/audit.ts` émet désormais, **en plus** de l'écriture en base, une ligne JSON
sur la sortie standard pour une liste courte d'actions surveillables. C'est
cette ligne que les requêtes ci-dessous interrogent.

**Ce qui est émis, volontairement pauvre :**

```json
{
  "canal": "securite",
  "action": "USER_LOGIN_FAILED",
  "severite": "WARNING",
  "outcome": "FAILURE",
  "tenantId": "clx…",
  "acteurPresent": true
}
```

**Ni courriel, ni adresse IP, ni identifiant d'utilisateur.** Ces lignes partent
chez un tiers (Scaleway Cockpit), hors de la rétention paramétrée par le Client.
On veut savoir _qu'il se passe quelque chose_, pas _qui_. Le détail reste dans
l'`AuditLog` en base, sous le contrôle du Client — et c'est là qu'on va le
chercher une fois l'alerte reçue.

**Étiquettes Loki disponibles** : `host`, `container`, `image`, `env`
(`env` vaut `prod` ou `demo` — dérivé du nom du conteneur, les deux piles
partageant le même Vector).

**Depuis le 2026-10-03, le journal HAProxy arrive aussi dans Loki**, sous le
label `source="haproxy"` (labels : `env` = `prod`, `demo` ou `edge` quand
HAProxy a répondu seul ; `type` = `http` ou `connexion` ; `classe` = `2xx`…
`5xx`). Contrairement aux lignes d'audit, celles-ci portent **l'adresse IP**, la
méthode, le chemin **sans ses paramètres**, le statut, les octets, la durée et
l'état de terminaison (`PR--` = refusé par une règle HAProxy). Décision
documentée dans `infra/vector/vector.yaml` (transform `haproxy_journal`) :
finalité sécurité, rétention 7 jours chez Scaleway. C'est le flux qui rend
visibles les balayages, la force brute lente et les refus en rafale : règles 8
à 11 ci-dessous, tableau de bord `infra/grafana/dashboards/humanix-trafic-haproxy.json`.

---

## Règle 1 — Rafale d'échecs d'authentification

Le signal le plus banal, et celui qui précède le plus souvent le reste.

```logql
sum(count_over_time({env="prod"} | json | canal="securite" | action="USER_LOGIN_FAILED" [5m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 20`                 |
| Évaluation           | toutes les `1m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `warning`                     |

**Pourquoi 20 et pas 5.** Un utilisateur qui se trompe trois fois puis demande
un lien de connexion en produit déjà quatre ou cinq. Un seuil à 5 se
déclencherait chaque semaine, et une alerte qui se déclenche chaque semaine
n'est plus lue — c'est la seule façon dont ce dispositif peut échouer en
silence. 20 en 5 minutes ne ressemble à aucun usage humain.

---

## Règle 2 — Exfiltration suspectée

```logql
sum(count_over_time({env="prod"} | json | canal="securite" | action="EXFILTRATION_SUSPECTED" [5m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 0`                  |
| Évaluation           | toutes les `1m`, pendant `0m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `critical`                    |

**Sans temporisation.** L'application n'émet cette action que lorsqu'elle a
déjà conclu à une anomalie ; attendre une confirmation reviendrait à demander
deux fois la même chose. Une occurrence déclenche
`docs/PROCEDURE-VIOLATION-DONNEES.md`, y compris à 3 h du matin.

---

## Règle 3 — Débit d'export anormal

```logql
sum by (tenantId) (count_over_time({env="prod"} | json | canal="securite" | action="DATA_EXPORTED" [1h]))
```

| Paramètre            | Valeur                          |
| -------------------- | ------------------------------- |
| Type de requête      | `Instant`                       |
| Condition            | `IS ABOVE 10`                   |
| Évaluation           | toutes les `10m`, pendant `10m` |
| **Si aucune donnée** | **`OK`**                        |
| Sévérité             | `warning`                       |

**On alerte sur le débit, jamais sur l'existence.** Exporter ses données est un
**droit du Client** (RGPD art. 20, et DPA article 9). Une alerte à la première
occurrence traiterait l'exercice d'un droit comme un incident — ce serait faux,
et l'alerte finirait désactivée. C'est la cadence qui distingue un client qui
récupère ses données d'un compte compromis qui aspire un tenant.

Le `sum by (tenantId)` compte **par client** : douze exports répartis sur quatre
tenants sont une matinée ordinaire, douze sur un seul ne le sont pas.

---

## Règle 4 — Élévation de privilèges

```logql
sum(count_over_time({env="prod"} | json | canal="securite" | action=~"USER_ROLE_CHANGED|USER_MFA_DISABLED|USER_MFA_RESET_BY_ADMIN|TENANT_DELETED" [15m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 3`                  |
| Évaluation           | toutes les `5m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `critical`                    |

Ces actions sont légitimes et rares. Leur **regroupement** ne l'est pas :
désactiver un second facteur puis changer un rôle dans le quart d'heure est la
signature d'une prise de contrôle, pas d'une administration ordinaire.

---

## Règle 5 — L'homme mort

Celle qu'on oublie, et sans laquelle les quatre autres ne valent rien.

```logql
sum(count_over_time({env="prod"} | json | canal="securite" | action="HEARTBEAT" [15m]))
```

| Paramètre            | Valeur                         |
| -------------------- | ------------------------------ |
| **Type de requête**  | **`Instant`** (jamais `Range`) |
| Condition            | `IS BELOW 1`                   |
| Évaluation           | toutes les `1m`, pendant `0m`  |
| **Si aucune donnée** | **`Alerting`**                 |
| Sévérité             | `critical`                     |

⚠️ **Les trois réglages en gras sont ceux qui font marcher la règle**, et les
trois ont été trouvés en la testant — elle ne s'est pas déclenchée aux deux
premières tentatives. Le type `Instant` est le plus discret et le plus
decisif : en `Range`, la série se fige sur sa dernière valeur et la condition
n'est jamais franchie (cf. la section sur les mécaniques de l'interface).

**« Si aucune donnée » doit valoir `Alerting`.** C'est sous _Configure no data
and error handling_. Quand plus aucune ligne ne correspond, LogQL ne renvoie pas
`0` : il ne renvoie **rien**. Le seuil `IS BELOW 1` n'a alors rien à comparer et
la règle bascule en _No Data_, un état distinct qui ne suit pas forcément le même
acheminement. Une règle d'homme mort laissée au réglage par défaut reste donc
muette dans le seul cas où on la veut bruyante.

**Pas de temporisation.** La fenêtre `[15m]` _est_ la tolérance : il faut trois
battements manqués pour la vider. Y ajouter une temporisation compterait la
patience deux fois et repousserait l'alerte à 25 minutes.

**Un silence et une panne se ressemblent parfaitement.** Si Vector s'arrête, si
le jeton expire, si le socket Podman disparaît, les quatre règles ci-dessus
cessent de se déclencher — et cette absence se lit comme « tout va bien ». Le
dispositif de détection deviendrait alors exactement ce qu'il est censé
remplacer : rien, avec l'apparence de quelque chose.

Cette règle a déjà eu un précédent ici : Vector est resté aveugle après la
bascule vers Podman parce qu'il écoutait un socket Docker qui n'existait plus.
Personne ne l'a vu, parce que rien ne manquait visiblement.

**Pourquoi un battement dédié plutôt que le trafic.** Cette règle a d'abord été
écrite sur le volume de journaux de `humanix-prod-app`. Mesure du 2026-08-14 en
production : cette application n'écrit **rien** hors démarrage — 32 lignes en
tout, 0 ligne par minute au repos. La règle se serait déclenchée en permanence
sur une production parfaitement saine, et aurait été désactivée dans la semaine.

Le journal HAProxy ne convenait pas davantage, pour une autre raison : il
**n'arrive pas dans Loki sous forme de lignes**. La source `haproxy` de
`infra/vector/vector.yaml` est bien raccordée, mais vers **Mimir et en tant que
métriques** — `haproxy → haproxy_extraction → haproxy_metriques → scaleway_mimir`
produit `humanix_http_requests_total` et `humanix_http_request_duration_seconds`.
C'est délibéré et sain : un journal d'accès vaut peu comme texte et beaucoup
comme débit. Il n'y a simplement rien à interroger en LogQL.

Le seul flux régulier qui atteignait vraiment Loki était un sous-produit des
sondes de santé du conteneur TTS ; y accrocher la détection l'aurait rendue
tributaire d'un service que personne ne maintient délibérément.

`instrumentation.ts` émet donc un battement explicite toutes les 5 minutes, soit
3 attendus par quart d'heure. Sa disparition ne signifie qu'une chose.

Elle se vérifie en arrêtant Vector — et il **faut** la vérifier, car une règle
d'homme mort jamais éprouvée est elle-même un point aveugle. Noter le nom exact
du conteneur, avec des **tirets bas** (podman-compose, contrairement aux autres
services, ne le nomme pas explicitement) :

```bash
ssh humanix@humanix-academie.fr 'podman stop humanix-prod_vector_1 && sleep 900 && podman start humanix-prod_vector_1'
```

---

## Règles 6 et 7 — côté métriques (Mimir, pas Loki)

Les journaux HAProxy alimentent déjà Mimir en métriques. Rien à ajouter au
code : ces deux règles sont disponibles immédiatement, sur la source de données
**`humanix-prod-metrics`**.

**Règle 6 — taux d'erreurs serveur.** Un pic de 5xx accompagne aussi bien une
panne qu'une exploitation en cours.

```promql
sum(rate(humanix_http_requests_total{status=~"5.."}[5m]))
  / sum(rate(humanix_http_requests_total[5m]))
```

Condition `IS ABOVE 0.05` pendant `10m`, sévérité `warning`. En ratio et non en
valeur absolue : dix erreurs sur cent requêtes et dix sur cent mille ne disent
pas la même chose.

**Règle 7 — effondrement du trafic.**

```promql
sum(rate(humanix_http_requests_total[10m]))
```

Condition `IS BELOW 0.01` pendant `15m`, sévérité `critical`. Complète la règle 5
par l'autre bout : celle-ci vérifie que le service **répond**, la règle 5 que la
**collecte** fonctionne. Une panne de HAProxy ou de TLS laisserait le battement
intact — l'application tourne, personne ne l'atteint.

⚠️ À calibrer sur le trafic réel avant activation. Mesure du 2026-08-14 :
`/var/log/haproxy.log` était à **0 ligne/minute** sur la minute observée. Un
seuil posé sans mesure préalable produirait une alerte permanente, exactement
l'erreur évitée à la règle 5. Regarder d'abord la courbe sur sept jours.

---

## Règle 8 — Balayage (une adresse enchaîne les 404)

Les scanners énumèrent des chemins qui n'existent pas : `/.env`,
`/wp-login.php`, `/geoserver/web/`. Le 2026-10-02, 6 111 des 13 313 lignes du
journal étaient des 404, et trois adresses en portaient la moitié.

```logql
sum by (client_ip) (count_over_time({source="haproxy", type="http", classe="4xx"} | json | statut = 404 [10m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 100`                |
| Évaluation           | toutes les `1m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `warning`                     |

**Pourquoi 100 en 10 minutes.** Un humain qui se trompe d'URL en produit deux
ou trois ; un robot d'indexation honnête en produit quelques dizaines par
heure et respecte `robots.txt`. Cent 404 en dix minutes depuis une seule
adresse, c'est une liste de mots. L'alerte est **par adresse** (`sum by`) : elle
nomme l'IP à bloquer, et HAProxy sait la bloquer (`stk_abuse`, ou une liste
d'adresses refusées si cela devient récurrent).

---

## Règle 9 — Force brute lente sur l'authentification

HAProxy coupe déjà à 150 requêtes par 10 secondes sur `/api/auth/callback`
(429). Cette règle attrape ce qui passe **sous** ce seuil : une adresse qui
tente un mot de passe toutes les dix secondes pendant une heure.

```logql
sum by (client_ip) (count_over_time({source="haproxy", type="http"} | json | methode = "POST" | chemin =~ "/api/auth/.*|/connexion.*" [15m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 40`                 |
| Évaluation           | toutes les `1m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `warning`                     |

Elle complète la règle 1, qui compte les échecs côté application mais sans
adresse. Les deux ensemble : _combien_ d'échecs (règle 1), _depuis où_
(règle 9).

---

## Règle 10 — Les protections HAProxy tirent en rafale

Chaque refus décidé par HAProxy lui-même (agent interdit → 403, méthode
exotique → 405, compteurs d'abus → 429) porte la terminaison `PR`. Quelques-uns
par heure, c'est le bruit de fond d'Internet. Des centaines en cinq minutes,
c'est une attaque en cours que les règles encaissent : il faut regarder si
elles tiennent, et d'où ça vient.

```logql
sum(count_over_time({source="haproxy", type="http"} | json | terminaison =~ "PR.*" [5m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 300`                |
| Évaluation           | toutes les `1m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `warning`                     |

---

## Règle 11 — Échecs de poignée de main TLS

Les lignes `SSL handshake failure` (label `type="connexion"`) viennent de
clients qui n'achèvent pas le TLS : sondes de certificats, scanners de
versions, vieux clients. Un pic soudain signale un balayage de la machine
entière, souvent quelques minutes avant la règle 8.

```logql
sum(count_over_time({source="haproxy", type="connexion"}[10m]))
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS ABOVE 200`                |
| Évaluation           | toutes les `1m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `warning`                     |

**Ce que ces quatre règles ne font pas** : bloquer. Elles nomment une adresse
et un motif ; le blocage reste une décision humaine, dans `haproxy.cfg`. Les
seuils sont des premiers réglages : relever le compte réel dans le tableau de
bord pendant deux semaines avant de les durcir.

---

## Règle 12 — Disque à plus de 80 %

Un disque plein arrête PostgreSQL sans prévenir, et `/var/log` est une
partition à part de 20 Go : le 2026-10-03 elle était à 68 %, AIDE y
écrivant 5 Go par jour.

```promql
100 * humanix_hote_disque_utilise_octets / humanix_hote_disque_total_octets
```

| Paramètre            | Valeur                         |
| -------------------- | ------------------------------ |
| Type de requête      | `Instant`                      |
| Condition            | `IS ABOVE 80`                  |
| Évaluation           | toutes les `5m`, pendant `10m` |
| **Si aucune donnée** | **`Alerting`**                 |
| Sévérité             | `warning` ; `critical` à 90    |

**Pourquoi « aucune donnée » alerte ici, et seulement ici.** Cette série vient
de `scripts/host-stats.py`, lancé par la crontab de l'hôte. Si elle disparaît,
c'est que la crontab ou Vector est arrêté, et toutes les règles 12 à 16
deviennent aveugles en même temps. Une seule règle porte ce rôle de vigie.

---

## Règle 13 — Mémoire disponible sous 10 %

```promql
100 * humanix_hote_memoire_disponible_octets / humanix_hote_memoire_totale_octets
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS BELOW 10`                 |
| Évaluation           | toutes les `1m`, pendant `5m` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `warning`                     |

La machine a 30 Go dont 28 libres : ce seuil ne se verra que sur une fuite
mémoire de l'application ou un conteneur qui s'emballe. Le tableau de bord
dit lequel (`humanix_conteneur_memoire_octets`).

---

## Règle 14 — Aucune sauvegarde réussie depuis 26 heures

La règle la plus rentable du dispositif. La sauvegarde chiffrée part à 02:45
et écrit « Sauvegarde terminee avec succes » dans `backup.log`. L'envoi FTP
peut échouer chaque nuit pendant un mois sans que rien ne le dise.

```logql
sum(count_over_time({source="exploitation", fichier="backup.log", resultat="ok"}[26h]))
```

| Paramètre            | Valeur                         |
| -------------------- | ------------------------------ |
| Type de requête      | `Instant`                      |
| Condition            | `IS BELOW 1`                   |
| Évaluation           | toutes les `30m`, pendant `1h` |
| **Si aucune donnée** | **`Alerting`**                 |
| Sévérité             | `critical`                     |

**Pourquoi « aucune donnée » alerte.** Une sauvegarde absente et un journal
absent sont la même nouvelle : on ne sait pas si la base est sauvegardée.
C'est l'inverse des règles 1 à 11, où l'absence de données est la normalité.

---

## Règle 15 — Un cron a échoué

```logql
sum by (job) (count_over_time({source="exploitation", fichier="cron.log", resultat="echec"} | json [3h]))
```

| Paramètre            | Valeur                          |
| -------------------- | ------------------------------- |
| Type de requête      | `Instant`                       |
| Condition            | `IS ABOVE 1`                    |
| Évaluation           | toutes les `15m`, pendant `15m` |
| **Si aucune donnée** | **`OK`**                        |
| Sévérité             | `warning`                       |

**Pourquoi 2 en 3 heures et pas 1.** Une livraison coupe l'application
quelques secondes ; un job horaire qui tombe pile dessus échoue une fois et
réussit l'heure suivante. Deux échecs du même job en trois heures, ce n'est
plus la livraison : c'est le cas vu le 2026-10-03, où la cible des crons ne
suivait pas la bascule bleu/vert, pendant six semaines.

---

## Règle 16 — Certificat TLS à moins de 14 jours

acme.sh renouvelle à 30 jours de l'échéance (cron de 12:19, journal
`acme.log`). Sous 14 jours, il a échoué deux semaines de suite.

```promql
humanix_certificat_jours_restants
```

| Paramètre            | Valeur                        |
| -------------------- | ----------------------------- |
| Type de requête      | `Instant`                     |
| Condition            | `IS BELOW 14`                 |
| Évaluation           | toutes les `1h`, pendant `2h` |
| **Si aucune donnée** | **`OK`**                      |
| Sévérité             | `critical`                    |

La valeur `-1` signifie que la poignée de main TLS locale a échoué (certificat
expiré ou chaîne invalide) : elle déclenche la règle, et le détail est dans
`{source="exploitation", fichier="stats.log"}`.

---

## Règle 17 — Hex : le fournisseur répond en erreur

Depuis le 2026-10-03 chaque message adressé à Hex est compté dans
`humanix_hex_messages_total`, avec son résultat. `fournisseur` veut dire que
Mistral a répondu en erreur : modèle refusé sur ce palier (403), limite de
débit (429), incident (5xx). Le 2026-10-01, c'est ainsi que Hex est resté muet
une journée : le palier gratuit avait disparu, personne n'a vu les 403.

```promql
sum(increase(humanix_hex_messages_total{resultat="fournisseur"}[15m]))
```

| Paramètre            | Valeur                         |
| -------------------- | ------------------------------ |
| Type de requête      | `Instant`                      |
| Condition            | `IS ABOVE 2`                   |
| Évaluation           | toutes les `5m`, pendant `10m` |
| **Si aucune donnée** | **`OK`**                       |
| Sévérité             | `warning`                      |

Les refus de quota (`resultat=~"quota_.*"`) ne sont pas une alerte : c'est le
dispositif qui fait son travail. Ils se lisent dans le tableau de bord
`humanix-produit-hex.json`, avec le coût estimé du mois.

---

## Acheminement

Une alerte qui reste dans Grafana n'a réveillé personne.

**Alerting → Contact points → Add contact point**, type `Email`, adresse
`securite@humanix-cybersecurity.fr`.

⚠️ **Ne pas router vers une adresse hébergée par la plateforme elle-même.** Une
compromission qui rend le service inaccessible rendrait aussi l'alerte
illisible — au moment précis où elle compte.

Pour les règles `critical` (2, 4 et 5), l'adresse ne suffit pas la nuit. Le
strict minimum est une **notification poussée sur téléphone** : Grafana OnCall,
ou un webhook vers n'importe quel service de push. Sans cela, le délai réel de
connaissance est « demain matin », et l'engagement de 48 h repose sur une heure
zéro qu'on se sera fixée soi-même.

---

## Ce que ces règles ne couvrent toujours pas

À dire franchement, parce qu'un dispositif de détection qu'on croit complet est
plus dangereux qu'un dispositif dont on connaît les trous :

**L'accès direct à la base.** Quelqu'un qui obtient un accès SSH et lit
PostgreSQL au `psql` ne produit **aucun** événement applicatif. Aucune de ces
règles ne le verra.

**La lecture lente.** Un compte compromis qui consulte cent fiches par jour
pendant un mois reste sous tous les seuils. Les seuils attrapent la brutalité,
pas la patience.

**L'intégrité des fichiers.** AIDE est installé sur le serveur ; son rapport
n'est lu par personne. C'est la prochaine marche, et elle est bon marché.

**L'agent utilisateur.** HAProxy bloque déjà quelques signatures (sqlmap,
nikto…) mais ne journalise pas l'en-tête : les règles 8 à 11 raisonnent par
adresse et par chemin, jamais par outil. Ajouter `capture request header
User-Agent` dans `haproxy.cfg` le rendrait disponible, `haproxy_journal` sait
déjà le lire s'il apparaît.
