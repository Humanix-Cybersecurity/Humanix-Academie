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

### Deux mécaniques de l'interface qui font perdre du temps

**La requête seule ne suffit pas.** Grafana construit une règle en trois étages :
la requête `A`, une réduction `B`, un seuil `C`. Coller la LogQL dans `A` et
chercher le champ « seuil » à côté ne mène nulle part. Mettre `B` sur **Last**,
et porter la condition du tableau (`IS ABOVE 20`) dans `C`.

**L'ordre de création compte.** Un point de contact doit exister avant qu'une
règle puisse notifier — sinon l'alerte se déclenche dans le vide, ce qui est
exactement l'état qu'on cherche à quitter. Voir la section « Acheminement »
en premier, puis créer les règles dans cet ordre :

1. **règle 5** (l'homme mort) — elle surveille les six autres ;
2. **règle 2** (exfiltration) puis **1** (échecs d'authentification) ;
3. **règles 4** et **3** ;
4. **règles 6 et 7**, une fois le trafic observé sur sept jours.

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

---

## Règle 1 — Rafale d'échecs d'authentification

Le signal le plus banal, et celui qui précède le plus souvent le reste.

```logql
sum(count_over_time({env="prod"} | json | canal="securite" | action="USER_LOGIN_FAILED" [5m]))
```

| Paramètre  | Valeur                        |
| ---------- | ----------------------------- |
| Condition  | `IS ABOVE 20`                 |
| Évaluation | toutes les `1m`, pendant `5m` |
| Sévérité   | `warning`                     |

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

| Paramètre  | Valeur                        |
| ---------- | ----------------------------- |
| Condition  | `IS ABOVE 0`                  |
| Évaluation | toutes les `1m`, pendant `0m` |
| Sévérité   | `critical`                    |

**Sans temporisation.** L'application n'émet cette action que lorsqu'elle a
déjà conclu à une anomalie ; attendre une confirmation reviendrait à demander
deux fois la même chose. Une occurrence déclenche
`docs/PROCEDURE-VIOLATION-DONNEES.md`, y compris à 3 h du matin.

---

## Règle 3 — Débit d'export anormal

```logql
sum by (tenantId) (count_over_time({env="prod"} | json | canal="securite" | action="DATA_EXPORTED" [1h]))
```

| Paramètre  | Valeur                          |
| ---------- | ------------------------------- |
| Condition  | `IS ABOVE 10`                   |
| Évaluation | toutes les `10m`, pendant `10m` |
| Sévérité   | `warning`                       |

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

| Paramètre  | Valeur                        |
| ---------- | ----------------------------- |
| Condition  | `IS ABOVE 3`                  |
| Évaluation | toutes les `5m`, pendant `5m` |
| Sévérité   | `critical`                    |

Ces actions sont légitimes et rares. Leur **regroupement** ne l'est pas :
désactiver un second facteur puis changer un rôle dans le quart d'heure est la
signature d'une prise de contrôle, pas d'une administration ordinaire.

---

## Règle 5 — L'homme mort

Celle qu'on oublie, et sans laquelle les quatre autres ne valent rien.

```logql
sum(count_over_time({env="prod"} | json | canal="securite" | action="HEARTBEAT" [15m]))
```

| Paramètre           | Valeur                        |
| ------------------- | ----------------------------- |
| Condition           | `IS BELOW 1`                  |
| Évaluation          | toutes les `1m`, pendant `0m` |
| **Si aucune donnée** | **`Alerting`**                |
| Sévérité            | `critical`                    |

⚠️ **Les deux réglages ci-dessus sont ceux qui font marcher la règle**, et tous
deux ont été trouvés en la testant — elle ne s'est pas déclenchée du premier
coup.

**« Si aucune donnée » doit valoir `Alerting`.** C'est sous *Configure no data
and error handling*. Quand plus aucune ligne ne correspond, LogQL ne renvoie pas
`0` : il ne renvoie **rien**. Le seuil `IS BELOW 1` n'a alors rien à comparer et
la règle bascule en *No Data*, un état distinct qui ne suit pas forcément le même
acheminement. Une règle d'homme mort laissée au réglage par défaut reste donc
muette dans le seul cas où on la veut bruyante.

**Pas de temporisation.** La fenêtre `[15m]` *est* la tolérance : il faut trois
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
