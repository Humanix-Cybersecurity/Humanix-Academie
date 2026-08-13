# Podman rootless

> **État au 2026-08-13** : la **démo** tourne sous Podman rootless sur
> `humanix-prod-01`. La **production** est encore sous Docker. Les deux moteurs
> cohabitent sur la même machine, et c'est volontaire pendant la période
> d'observation.

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

## Ce qui reste à faire

- [ ] **Éprouver un vrai redémarrage machine.** L'unité systemd a été testée par
      `systemctl --user start` après arrêt complet de la pile, ce qui n'est pas
      la même chose qu'un boot.
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
- [ ] **Décider pour la production.** Le vrai risque y est le volume PostgreSQL,
      bien plus gros que les 69 Mo de la démo. Même méthode : `pg_dump`, jamais
      de copie de volume.
