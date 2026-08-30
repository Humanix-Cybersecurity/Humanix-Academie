# Drainer HAProxy avant d'arrêter une couleur

## Le défaut que ça corrige

Les backends sont sondés en `check inter 1s fall 2`. HAProxy met donc **jusqu'à
deux secondes** à constater qu'un conteneur arrêté ne répond plus, et pendant ce
temps il continue d'y router des requêtes.

`option redispatch` en rejoue la plupart sur la couleur restante, mais **pas
celles déjà transmises** au backend. C'est le 502 d'une seconde mesuré le
2026-08-19. Les livraisons « sans coupure » antérieures n'étaient pas garanties :
c'étaient des tirages favorables, sur un trafic assez faible pour qu'aucune
requête ne tombe dans la fenêtre.

Le drain inverse l'ordre. On prévient HAProxy **avant** d'arrêter : plus aucune
nouvelle connexion vers ce serveur, les connexions en cours vont à leur terme, et
`deploy.sh` n'arrête le conteneur qu'une fois le compteur à zéro.

## Ce qu'il faut ajouter à la configuration

> ⚠️ La configuration de production vit dans `/etc/haproxy/haproxy.cfg` **sur le
> serveur** et n'est pas versionnée ici. `infra/haproxy/haproxy.cfg` est la
> variante conteneurisée, utilisée en développement : la modifier n'a aucun effet
> sur la production.

Dans la section `global` :

```
    # Socket d'administration : permet a scripts/deploy.sh de retirer une
    # couleur du pool AVANT de l'arreter (cf. docs/HAPROXY-DRAIN.md).
    #
    # `group humanix` plutot que sudo : le script de deploiement tourne sous
    # cet utilisateur, et un deploiement non interactif ne doit pas dependre
    # d'une elevation de privileges.
    stats socket /run/haproxy/admin.sock user haproxy group humanix mode 660 level admin
    stats timeout 30s
```

`level admin` est nécessaire : `set server ... state drain` est refusé à un
niveau inférieur.

## Appliquer

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg   # valider AVANT de recharger
sudo systemctl reload haproxy                 # reload, PAS restart
```

`reload` conserve les connexions en cours ; `restart` les coupe, ce qui produirait
exactement la coupure qu'on cherche à supprimer.

## Vérifier

```bash
ls -l /run/haproxy/admin.sock   # attendu : srw-rw---- haproxy humanix
python3 -c 'import socket,sys
s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM); s.settimeout(5)
s.connect("/run/haproxy/admin.sock"); s.sendall(b"show stat\n")
print(s.recv(200).decode().splitlines()[0][:60])'
```

La deuxième commande doit rendre l'en-tête CSV `# pxname,svname,qcur,...`.

> ⚠️ **N'utilisez pas `nc -U` pour cette vérification.** Sur la production
> (Ubuntu, `netcat-openbsd` 1.234), `nc -U` refuse ce socket avec
> `Permission denied` **y compris en root**, alors que Python s'y connecte sans
> élévation. Un refus que root ne lève pas n'est pas une question de droits, et
> conclure « le socket est cassé » sur cette base serait faux : il fonctionne.
>
> `scripts/deploy.sh` essaie donc `python3`, puis `socat`, puis `nc`, et
> **éprouve** le résultat au lieu de supposer qu'un binaire présent suffit.

## Ce que fait `deploy.sh`

1. démarre la nouvelle couleur et attend qu'elle réponde ;
2. remet la nouvelle couleur en `ready` — sans quoi un `drain` laissé par la
   livraison précédente la maintiendrait hors du pool, et la bascule suivante
   viderait le service ;
3. attend que HAProxy la voie `UP` ;
4. passe l'ancienne couleur en `drain` ;
5. sonde `scur` jusqu'à zéro, au plus `HUMANIX_HAPROXY_DRAIN_TIMEOUT` secondes
   (20 par défaut) ;
6. arrête alors seulement l'ancien conteneur.

**Tout ceci est facultatif.** Sans le socket, `deploy.sh` retombe sur le
comportement précédent en l'écrivant dans son journal. Une livraison n'échoue pas
faute d'un confort.

## Réglages

| Variable                        | Défaut                    | Rôle                                |
| ------------------------------- | ------------------------- | ----------------------------------- |
| `HUMANIX_HAPROXY_SOCKET`        | `/run/haproxy/admin.sock` | chemin du socket                    |
| `HUMANIX_HAPROXY_DRAIN_TIMEOUT` | `20`                      | secondes avant d'arrêter quand même |

## Noms côté HAProxy

Une couleur `a` est une chaîne **vide** côté conteneurs (`humanix-prod-app`) mais
s'appelle bien `prod_a` côté HAProxy. La correspondance est faite par
`haproxy_serveur()` dans `scripts/deploy.sh`.

| Environnement | Backend        | Serveurs                         |
| ------------- | -------------- | -------------------------------- |
| prod          | `backend_prod` | `prod_a` (3000), `prod_b` (3010) |
| demo          | `backend_demo` | `demo_a` (3001), `demo_b` (3011) |
