# Podman rootless

> **État au 2026-08-13, 20 h** : la **démo** et la **production** tournent
> toutes deux sous Podman rootless sur `humanix-prod-01`. Plus aucun conteneur
> Docker n'est en service ; ceux de l'ancienne stack sont **arrêtés, pas
> supprimés**, et leurs volumes restent intacts — c'est le retour arrière.
>
> Le démarrage au boot est **éprouvé par un vrai redémarrage**, pas seulement
> par un `systemctl start` : app, postgres et vector sont remontés seuls et
> sains en 38 secondes.

## Pourquoi

Le gain principal n'est pas le rootless des conteneurs, c'est **la disparition
du démon root**.

Avec Docker, l'utilisateur `humanix` appartient au groupe `docker`. C'est
l'équivalent d'un accès root sur la machine, **sans mot de passe et sans trace
`sudo`** : `docker run -v /:/host` suffit. Pour une entreprise qui vend de la
cybersécurité et publie ses audits sur `/securite/audits-externes`, c'est le
point le plus difficile à défendre devant un auditeur.

Podman n'a pas de démon. Les conteneurs sont des processus enfants de
l'utilisateur, isolés dans un espace de noms.

### Mesuré sur la machine

Identifiant réel des processus **sur l'hôte**, le 2026-08-13 :

| Conteneur               | Moteur | UID hôte |
| ----------------------- | ------ | -------- |
| `humanix-demo-app`      | Podman | `101000` |
| `humanix-demo-postgres` | Podman | `100069` |
| `humanix-demo-tts`      | Podman | `100998` |
| `humanix-prod-app`      | Docker | `1001`   |
| `humanix-prod-postgres` | Docker | **`70`** |

Les UID au-delà de 100000 viennent du `subuid` de `humanix` : pour le noyau, ces
processus ne sont que des sous-identités d'un utilisateur ordinaire. Côté
Docker, `postgres` tourne sous l'UID système 70, hérité d'un démon root.

## Ce qui a été fait

### Prérequis, tous déjà réunis

|                                    |                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| cgroups v2                         | ✅                                                                            |
| `kernel.unprivileged_userns_clone` | ✅ activé                                                                     |
| `subuid` / `subgid` pour `humanix` | ✅ `100000:65536`                                                             |
| Ports privilégiés                  | **aucun** : tout est en `127.0.0.1:3000/3001`, HAProxy tient 80/443 côté hôte |

### Installation

```bash
sudo apt-get install -y --no-install-recommends \
  podman podman-compose crun uidmap slirp4netns passt catatonit netavark aardvark-dns
```

> `--no-install-recommends` n'est pas cosmétique : sans lui, `apt` tire
> `buildah`, dont le paquet était servi en **erreur 500 par `esm.ubuntu.com`**
> le 2026-08-13. `buildah` est un CLI séparé ; Podman sait construire des
> images sans lui.

### Persistance après déconnexion

```bash
sudo loginctl enable-linger humanix
```

**Indispensable.** En rootless, les conteneurs d'un utilisateur sont tués à sa
déconnexion. Sans `linger`, la démo s'arrêterait à la fin de la session SSH qui
l'a démarrée.

### Migration des images, sans reconstruire

```bash
docker save postgres:16-alpine | podman load
docker save humanix-tts:1.0.0  | podman load
```

Podman les nomme `docker.io/library/...`. Il faut les réétiqueter pour que la
compose les résolve :

```bash
podman tag docker.io/library/humanix-tts:1.0.0 humanix-tts:1.0.0
```

### Migration des données

**Par `pg_dump`, jamais par copie de volume.** Le volume Docker vit sous
`/var/lib/docker/volumes` en UID système ; Podman rootless stocke sous
`~/.local/share/containers` avec un mappage d'UID différent. Copier les fichiers
donnerait des permissions incohérentes sur le répertoire de données PostgreSQL.

```bash
# 1. Sauvegarder AVANT d'arrêter quoi que ce soit
docker exec -i humanix-demo-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  > ~/demo-avant-podman-$(date +%Y%m%d-%H%M%S).dump

# 2. Arrêter Docker SANS detruire (le retour arriere en depend)
cd /opt/humanix-demo && docker compose stop

# 3. Postgres seul sous Podman, puis restauration
podman-compose up -d postgres
podman exec -i humanix-demo-postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < ~/demo-avant-podman-*.dump

# 4. Le reste de la pile
podman-compose up -d
```

### Démarrage au boot

`podman-compose` ne crée pas d'unité systemd tout seul. Sans cette étape, la
démo **ne remonte pas** après un redémarrage.

```bash
sudo podman-compose systemd -a create-unit          # une fois par machine
cd /opt/humanix-demo && podman-compose systemd -a register
systemctl --user daemon-reload
systemctl --user enable podman-compose@humanix-demo
```

> **Pourquoi pas des Quadlets.** Podman sait générer des unités systemd à partir
> de fichiers `.container`, et c'est plus natif. Mais ce serait une **seconde
> description** de la pile à maintenir en parallèle de la compose, donc une
> source de dérive. Ce dépôt a passé deux jours à refermer exactement ce genre
> d'écart (Vector, la crontab). Une seule source de vérité : la compose.

**Un redémarrage ramène la pile en couleur a.** Constaté sur la production le
2026-11-06 : au démarrage, les conteneurs applicatifs des deux piles ont été
recréés sous le nom de la couleur a (`humanix-<pile>-app`, ports 3000 et 3001),
depuis l'image `latest` de leur pile. Le code servi est bien celui de la
dernière livraison, mais le conteneur de couleur b (`humanix-<pile>-appb`,
ports 3010 et 3011) n'existe plus. Explication, lue le 2026-11-15 dans l'unité
et dans podman-compose 1.5.0 : l'unité lance `podman-compose up --no-start` avec
le seul `.env` de la pile, donc sans la couleur, le port ni la révision que
`deploy.sh` pose pendant une livraison (`APP_COULEUR`, `APP_HOST_PORT`,
`HUMANIX_REVISION`). L'empreinte de la compose n'est alors plus celle des
conteneurs en place (`io.podman.compose.config-hash`), et `up` démonte toute la
pile avant de la recréer. Sans livraison depuis le dernier démarrage, les
empreintes sont égales et rien n'est recréé : les conteneurs existants
redémarrent tels quels.

`.humanix-deployed`, lui, **n'est pas réécrit** : celui de la production
annonçait encore `couleur=b` et `port=3010` alors que seul le port 3000
répondait. Ses lignes `commit=` et `ref=` restent justes ; `couleur=` et
`port=` décrivent la dernière bascule, pas ce qui tourne, jusqu'à la livraison
suivante. La couleur en service se lit dans le moteur :

```bash
podman ps --filter name=-app --format '{{.Names}}  {{.Ports}}'
```

Les scripts ne se fient donc pas à ce fichier seul : `cron-host.sh` ne garde
le port noté que s'il répond et sonde sinon les deux couleurs de sa pile,
`reset-demo.sh` demande à podman le port de chaque conteneur qu'il relance.

### Déclaration du moteur

`scripts/deploy.sh` lit `CONTAINER_ENGINE` dans le `.env` de la stack :

```bash
CONTAINER_ENGINE=podman
```

Absent, il utilise `docker compose`, le comportement historique.

**Le moteur est déclaré, jamais deviné.** Les deux cohabitent sur la machine :
`podman ps` voit les conteneurs de la démo même quand on déploie la production.
Un déploiement qui rebasculerait une stack d'un moteur à l'autre sans prévenir
serait exactement le genre de régression silencieuse qu'on cherche à éliminer.

## Retour arrière

Les conteneurs Docker de la démo sont **arrêtés, pas supprimés**, et leurs
volumes sont intacts.

```bash
cd /opt/humanix-demo && podman-compose down && docker compose start
```

Quelques secondes, aucune perte. La sauvegarde `~/demo-avant-podman-*.dump` est
un second filet.

## Vérifier

```bash
# Le moteur, et sous quel UID les processus tournent REELLEMENT sur l'hote
for c in humanix-demo-app humanix-demo-postgres humanix-demo-tts; do
  pid=$(podman inspect "$c" --format '{{.State.Pid}}')
  printf '%-24s %s\n' "$c" "$(ps -o user= -p "$pid")"
done

# La demo repond, en local et via HAProxy
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://demo.humanix-academie.fr/api/health

# Les donnees sont la
podman exec -i humanix-demo-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select count(*) from \"Saison\""'
```

Référence au moment de la migration : **37 saisons, 13 users, 2 tenants**.

## Renouveler PostgreSQL

**La base ne se met pas à jour toute seule.** La compose nomme
`postgres:16-alpine`, un tag mouvant, et rien ne le retire :

- `deploy.sh` ne touche plus à la base depuis le 2026-08-19 (`--no-deps`,
  exprès) ;
- aucune tâche planifiée ne tire d'image, et `podman-auto-update.timer` est
  désactivé ;
- un redémarrage de l'hôte recrée le conteneur, mais sur l'image déjà
  présente.

Constaté le 2026-11-15 : prod et démo en **16.13**, sur une image du
2026-04-21. Trois versions de sécurité manquaient (16.14, 16.15, 16.16), soit
77 failles corrigées en amont. Rien ne le signalait : Trivy ne regarde que
l'image applicative, et Dependabot un Dockerfile (`docker/postgres`) que ces
piles n'utilisent pas.

PostgreSQL publie ses versions mineures **chaque trimestre, le deuxième jeudi
de février, mai, août et novembre**. À chacune, lire la rubrique « Migration »
des [notes de version](https://www.postgresql.org/docs/release/), puis :

```bash
/opt/humanix-prod/scripts/update-postgres.sh demo --dry-run   # état et plan, sans rien toucher
/opt/humanix-prod/scripts/update-postgres.sh demo             # la démo d'abord, toujours
/opt/humanix-prod/scripts/update-postgres.sh prod             # demande confirmation
```

Le script vit dans le clone de la production, comme ceux de la crontab : il
n'arrive sur l'hôte qu'avec une livraison de la **production**.

### Pourquoi il recrée toute la pile

Changer d'image, c'est recréer le conteneur. Or sous podman-compose un
`depends_on` devient `--requires` : l'application et Vector dépendent de
postgres, et Podman refuse de retirer un conteneur dont un autre dépend. La
base ne se remplace pas seule.

La pile est créée par l'unité `podman-compose@humanix-<pile>` (cf. « Démarrage
au boot »). Mais son `up --no-start` ne **recrée** des conteneurs que si leur
empreinte diffère de celle de la compose, et une image qui change sous un tag
ne change pas cette empreinte. Après un simple `podman pull`, ni
`systemctl --user restart` ni un redémarrage de l'hôte ne remplaceraient la
base. Elle ne le serait qu'au premier démarrage qui suit une livraison : un
jour, sans prévenir, et sans que personne l'ait décidé.

Le script rend ce chemin déterministe : il arrête l'unité, retire le pod de la
pile, relance l'unité, qui recrée tout sur les images présentes.
`podman pod rm` retire les conteneurs et laisse les volumes nommés (lu dans
Podman 5.7.0 : seuls les volumes anonymes partent) : `humanix_<pile>_pg` n'est
pas touché.

### Ce qu'il faut savoir avant de lancer

|         |                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Coupure | HAProxy répond 503 de l'arrêt de l'application à son retour : moins d'une minute                                            |
| Quand   | Loin des tâches planifiées : ni aux minutes 00 et 30, ni entre 01h00 et 05h00                                               |
| Filet   | En production, instantané chiffré par `dump-securite.sh` avant le premier arrêt                                             |
| Couleur | La pile revient en couleur a, comme après un redémarrage de l'hôte                                                          |
| HAProxy | Le script remet la couleur a à `ready` : après une livraison en couleur b, `deploy.sh` l'a laissée en `drain`               |
| Échec   | Avant le retrait du pod, la pile est relancée telle quelle ; après, le tag est remis sur l'image d'avant et la pile recréée |

**Enchaîner les deux piles.** Le tag local est commun à la démo et à la
production. La démo renouvelée, il désigne la nouvelle image : la production la
prendrait à sa prochaine recréation, donc au premier démarrage de l'hôte qui
suit une livraison, sans instantané ni vérification. La démo sert à éprouver,
la production suit dans la foulée.

L'image d'avant reste sous `localhost/humanix-postgres-precedent:<version>`, à
l'abri d'un `podman image prune`. Quand la nouvelle version a fait ses
preuves, la retirer par `podman rmi` de ce nom.

### Vérifier, et revenir en arrière après coup

```bash
for c in humanix-prod-postgres humanix-demo-postgres; do
  podman exec "$c" sh -c 'psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "show server_version"'
done
```

Le script revient seul en arrière quand il échoue. Pour revenir plus tard, à
la main, c'est son propre geste, pile par pile :

```bash
podman tag localhost/humanix-postgres-precedent:16.13 docker.io/library/postgres:16-alpine
systemctl --user stop podman-compose@humanix-demo
podman pod rm pod_humanix-demo
systemctl --user start podman-compose@humanix-demo
```

Deux précautions : le tag est **commun aux deux piles**, et HAProxy doit
revoir la couleur a (`sudo systemctl reload haproxy` si la pile servait en
couleur b). Les versions mineures d'une même branche partagent le même format
de données : revenir de 16.16 à 16.13 sur le même volume est sans risque.

### Ce que le script ne fait pas

- **Un changement de version majeure** (16 vers 17) : c'est `pg_upgrade`, ou un
  dump et une restauration, pas un changement d'image. Le script le refuse.
- **Les `REINDEX`** que demandent parfois les notes de version. Au 2026-11-15
  la base n'a que des index btree, aucune colonne `bpchar` et aucune extension
  hors `plpgsql` : aucune des réindexations de 16.14 à 16.16 ne la concerne.

## Ce qui reste à faire

- [x] ~~**Éprouver un vrai redémarrage machine.**~~ **Fait le 2026-08-13.**
      Après `systemctl reboot`, les deux piles sont remontées seules : le cœur
      de la production — app, postgres, vector — était sain en 38 secondes.

      **Sauf TTS**, et c'est ce qui a révélé le défaut du profil `piper` :
              rien ne l'activait, ni `deploy.sh` ni le `.env`, et l'unité systemd ne
              passe pas `--profile`. Le service ne survivait que par
              `restart: unless-stopped`. Le profil a été retiré du service.

- [ ] **Rien ne signale une nouvelle version de PostgreSQL.** Le renouvellement
      est manuel et tient à un calendrier (cf. « Renouveler PostgreSQL »). Deux
      pistes : épingler l'image par digest dans `docker-compose.humanix.yml`
      et laisser Dependabot proposer le suivant, ce qui demande que la
      livraison retire l'image épinglée avant tout redémarrage de l'hôte ; ou
      une tâche planifiée qui compare le digest local à celui du registre et
      l'écrit dans `cron.log`.
- [ ] **L'unité systemd générée est incomplète.** `podman-compose systemd -a
  register` écrit `COMPOSE_FILE=docker-compose.yml` seul, sans le fichier
      d'observabilité. Corrigé à la main dans
      `~/.config/containers/compose/projects/humanix-prod.env`, mais un
      nouveau `register` l'écraserait.
- [x] ~~`scripts/backup-db.sh` et `scripts/restore-db.sh` appellent `docker exec`
      en dur.~~ **Fait le 2026-08-13.** Les deux lisent `CONTAINER_ENGINE`, comme
      `deploy.sh` et `archive-audit-logs.sh`. Absent, `docker` : aucune
      installation existante ne change de comportement.

      Vérifié par un intercepteur nommé `podman` qui journalise ses arguments
                          avant de les relayer. La trace montre `podman ps --filter …` puis
                          `podman exec -i -e PGPASSWORD=… pg_dump …` — plus aucun appel `docker`.

                          Les deux scripts DOIVENT lire la même variable : restaurer avec un autre
                          moteur que celui qui a sauvegardé viserait le mauvais conteneur, donc la
                          mauvaise base, et on le découvrirait le jour de la restauration.

- [ ] La dizaine de documents qui citent `docker compose` dans leurs exemples.
- [ ] **Décider pour la production.** Deux corrections à ce que ce document
      affirmait.

      **Le volume PostgreSQL n'est pas un risque.** Mesuré le 2026-08-13 :
                      la base de production fait **15 Mo** (70 Mo de volume), celle de la démo
                      **14 Mo** (69 Mo). Elles sont de taille identique, et un `pg_dump` de la
                      production prend **0,231 s** pour 444 Ko. L'indisponibilité serait
                      dominée par l'arrêt et le démarrage des conteneurs, pas par les données.
                      La méthode reste `pg_dump`, jamais de copie de volume — non pour le
                      volume, mais parce que les UID diffèrent entre les deux moteurs.

                      **Le vrai obstacle est l'observabilité**, et il s'est déjà manifesté.
                      Cf. la section suivante.

## Marche à suivre pour la production

Mesures du 2026-08-13, qui rendent la bascule bien moins lourde qu'annoncé :

|                     |                                                     |
| ------------------- | --------------------------------------------------- |
| Base PostgreSQL     | 15 Mo, `pg_dump` en **0,231 s**                     |
| Images à transférer | `humanix-prod-app` (3,07 Go) et Vector (205 Mo)     |
| Déjà dans Podman    | `postgres:16-alpine`, `humanix-tts:1.0.0`           |
| Ports privilégiés   | **aucun** : la stack ne publie que `127.0.0.1:3000` |

L'indisponibilité est dominée par l'arrêt et le démarrage des conteneurs, pas
par les données.

### 1. Filet de sécurité

```bash
docker exec humanix-prod-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  > ~/prod-avant-podman-$(date +%Y%m%d-%H%M%S).dump
```

### 2. Transfert des images, et leur RÉÉTIQUETAGE

⚠️ **Le tiret bas n'est pas une coquille.** Le service `app` n'a pas d'`image:`,
il est construit — et compose dérive alors le nom depuis le projet et le
service. `docker compose` produit `humanix-prod-app`, `podman-compose` produit
`humanix-prod_app`. Sans réétiquetage, `podman-compose up` **reconstruit
l'image depuis zéro** : une dizaine de minutes, en pleine coupure.

Pour Vector l'écart est inverse : `podman load` le place sous `localhost/`,
alors que la compose le désigne par un nom court que Podman résout vers
`docker.io/`.

```bash
podman tag docker.io/library/humanix-prod-app:latest localhost/humanix-prod_app:latest
podman tag localhost/timberio/vector:0.55.X-alpine   docker.io/timberio/vector:0.55.X-alpine
```

Le transfert lui-même

```bash
docker save humanix-prod-app:latest        | podman load
docker save timberio/vector:0.55.X-alpine  | podman load
podman tag docker.io/library/humanix-prod-app:latest humanix-prod-app:latest
```

### 3. Déclarer le moteur

Dans `/opt/humanix-prod/.env` :

```bash
CONTAINER_ENGINE=podman
VECTOR_GROUP_ADD=keep-groups
```

⚠️ **Les deux, pas seulement la première.** Sans `VECTOR_GROUP_ADD`, Vector
perd l'accès au journal HAProxy — cf. la section suivante.

Et dans `/etc/humanix/backup.env`, pour que les sauvegardes visent le bon
moteur : `CONTAINER_ENGINE=podman`.

### 4. Arrêter Docker SANS détruire

```bash
cd /opt/humanix-prod
docker compose -f docker-compose.yml -f docker-compose.observabilite.yml stop
```

`stop`, jamais `down` : les conteneurs et volumes Docker restent en place, et
c'est tout le retour arrière.

### 5. PostgreSQL d'abord, puis restauration

```bash
podman-compose up -d postgres
podman exec -i humanix-prod-postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < ~/prod-avant-podman-*.dump
```

**Par `pg_dump`, jamais par copie de volume** : les UID diffèrent entre Docker
et Podman rootless, et une copie donnerait des permissions incohérentes sur le
répertoire de données.

### 6. Le reste de la pile

```bash
podman-compose -f docker-compose.yml -f docker-compose.observabilite.yml up -d
```

### 7. Démarrage au boot

```bash
cd /opt/humanix-prod && podman-compose systemd -a register
systemctl --user daemon-reload
systemctl --user enable podman-compose@humanix-prod
```

### 8. Vérifier

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://humanix-academie.fr/api/health
podman exec humanix-prod-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select count(*) from \"User\""'
podman exec humanix-prod-vector-1 sh -c \
  'head -c 1 /var/log/haproxy.log >/dev/null && echo journal-lisible || echo JOURNAL-ILLISIBLE'
```

Référence au moment de la bascule : **4 tenants, 37 users, 63 saisons,
372 épisodes**.

Le dernier contrôle est le plus important : c'est celui que `keep-groups`
conditionne, et le seul qui échouerait en silence.

### Retour arrière

```bash
cd /opt/humanix-prod && podman-compose down && docker compose start
```

Puis retirer `CONTAINER_ENGINE` et `VECTOR_GROUP_ADD` du `.env`.

## Le stockage des images vit sur `/srv`, et pourquoi

⚠️ **Podman rootless ne range pas ses images où Docker les rangeait.**

| Moteur          | Emplacement                              | Partition  | Taille    |
| --------------- | ---------------------------------------- | ---------- | --------- |
| Docker          | `/var/lib/docker`, `/var/lib/containerd` | `/var/lib` | 196 Go    |
| Podman rootless | `~/.local/share/containers/storage`      | **`/`**    | **49 Go** |

La migration du 2026-08-13 a donc déplacé le stockage d'images vers la plus
petite partition de la machine, sans que personne le remarque. Le lendemain,
une matinée de déploiements — chaque construction ajoutant 2 à 3 Go — a rempli
la racine à **100 %, zéro octet libre**, sur une machine qui porte PostgreSQL.

Le build échoue alors dans une avalanche d'erreurs `overlay` illisibles, et
Podman ne peut même plus élaguer : il lui faut écrire son index.

### La solution : un montage lié, PAS un changement de `graphroot`

Première tentative, **échouée** : déclarer `graphroot = "/srv/..."` dans
`~/.config/containers/storage.conf`. Podman refuse :

```
Error: database static dir "/home/humanix/.local/share/containers/storage/libpod"
does not match our static dir "/srv/containers/storage/libpod":
database configuration mismatch
```

Sa base `libpod` mémorise les chemins avec lesquels elle a été créée. Il
n'existe pas de chemin supporté pour déplacer un stockage peuplé — la réponse
habituelle est `podman system reset`, qui **détruirait les volumes**, donc la
base de production.

La bonne mécanique ne change pas le chemin du tout :

```bash
# 1. Copier, en PRESERVANT les proprietaires numeriquement
sudo rsync -aHAX --numeric-ids \
  /home/humanix/.local/share/containers/storage/ /srv/containers/storage/

# 2. Stacks arretees : rattrapage, puis bascule
sudo rsync -aHAX --numeric-ids --delete \
  /home/humanix/.local/share/containers/storage/ /srv/containers/storage/
cd ~/.local/share/containers && mv storage storage.ancien && mkdir storage
sudo mount --bind /srv/containers/storage ~/.local/share/containers/storage

# 3. PERSISTER, sans quoi le prochain boot laisse les stacks au sol
echo "/srv/containers/storage /home/humanix/.local/share/containers/storage none bind 0 0" \
  | sudo tee -a /etc/fstab
```

### `--numeric-ids` n'est pas optionnel

Le stockage rootless contient des fichiers appartenant aux UID **mappés** de
l'espace de noms : `100000` et au-delà, la plage `subuid` de `humanix`. Un
`rsync` lancé **sans** `sudo` produit des « permission denied » en cascade ;
lancé avec `sudo` mais **sans** `--numeric-ids`, il aplatit tous ces
propriétaires sur `humanix:humanix` et rend les couches illisibles.

Le contrôle qui tranche, avant toute bascule — les deux distributions doivent
se superposer **exactement** :

```bash
for d in ~/.local/share/containers/storage /srv/containers/storage; do
  sudo find "$d/overlay" -maxdepth 4 -printf "%U:%G\n" | sort | uniq -c | sort -rn | head -6
done
```

C'est le même piège que celui qui interdit de migrer les volumes PostgreSQL par
copie — les UID diffèrent — appliqué cette fois au stockage d'images.

## Le piège qui a déjà mordu : Vector ne voit pas Podman

Vector collecte les logs par la source `docker_logs`, qui interroge l'API du
démon via `/var/run/docker.sock`. **Ce socket ne voit que les conteneurs
Docker.**

Constaté le 2026-08-13, après la migration de la démo :

| Vu par `docker.sock`    | Vu par Podman seul      |
| ----------------------- | ----------------------- |
| `humanix-prod-app`      | `humanix-demo-app`      |
| `humanix-prod-postgres` | `humanix-demo-postgres` |
| `humanix-prod-tts`      | `humanix-demo-tts`      |
| `humanix-prod-vector-1` |                         |

Les logs de la démo ont donc **cessé d'atteindre Loki le jour de sa
migration**, sans que rien ne le signale : la chaîne de production
continuait de fonctionner, donc aucune alerte n'a sonné. C'est le mode de
panne le plus coûteux — une perte de visibilité qui se découvre le jour où
l'on cherche une trace qui n'existe pas.

Migrer la production sous Podman sans traiter ce point couperait **toute**
l'observabilité, cette fois.

### La correction

Podman expose une API compatible Docker, sur un socket à lui, désactivé par
défaut. Côté hôte, une fois :

```bash
systemctl --user enable --now podman.socket
ls -l /run/user/$(id -u)/podman/podman.sock
```

`loginctl enable-linger humanix` est déjà actif depuis la migration de la
démo — indispensable, sans quoi le socket disparaîtrait à la déconnexion.

`infra/vector/vector.yaml` porte désormais une **seconde source**
`docker_logs` pointant sur `unix:///var/run/podman.sock`, chaînée dans le
même `parse_json` que la première. Le socket est monté par
`docker-compose.observabilite.yml`, via `PODMAN_SOCK` pour ne pas coder en
dur un uid.

La source est tolérante à l'absence : sans socket, Vector journalise une
erreur de connexion et les autres sources continuent.
