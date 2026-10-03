#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Mesures de l'hote et des conteneurs, une ligne JSON par mesure.

Lance chaque minute par la crontab de l'hote (infra/cron/crontab.prod) :

    * * * * * /opt/humanix-prod/scripts/host-stats.py >> /var/log/humanix/stats.log 2>&1

Vector lit stats.log et convertit chaque ligne en jauges Prometheus pour
Mimir (infra/vector/vector.yaml, source `hote_stats`). Pourquoi ce script
plutot que node_exporter ou la source `host_metrics` de Vector :

  - node_exporter coute ~6,50 EUR/mois a Cockpit pour un millier de series
    dont on ne lit pas dix ; ici une quarantaine de series, ~0,30 EUR/mois.
  - Vector tourne dans un conteneur : `host_metrics` y voit les montages et
    les cgroups du conteneur, pas ceux de l'hote, et podman rootless place
    les cgroups des conteneurs sous user.slice. Depuis l'hote, tout est a
    portee de main : /proc, /sys/fs/cgroup, `podman inspect`, statvfs.

Lignes emises (champ `type`) :

  hote        cpu_pct, charge_1m/5m/15m, mem_total/utilisee/disponible,
              swap_total/utilise, uptime_s
  disque      point, total, utilise                (un par systeme de fichiers)
  conteneur   nom, cpu_pct, mem, pids              (un par conteneur en marche)
  certificat  domaine, jours                       (un par domaine surveille,
                                                    poignee de main reelle 1x/h)
  base        conteneur, taille, connexions, max_connexions, cache_pct,
              tuples_morts, transaction_max_s      (un par conteneur PostgreSQL)
  erreur      section, message                     (jamais de plantage global)

Le CPU se mesure par difference avec la minute precedente : l'etat tient
dans HUMANIX_STATS_ETAT (defaut /var/tmp/humanix-host-stats.json). Sans
etat (premiere execution, redemarrage), le script prend lui-meme deux
echantillons a une seconde d'ecart : chaque ligne porte toujours tous ses
champs, Vector n'a jamais de champ manquant a convertir.

Aucune dependance hors bibliotheque standard. Python 3.9+.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import socket
import ssl
import subprocess
import sys
import time
from pathlib import Path

ETAT = Path(os.environ.get("HUMANIX_STATS_ETAT", "/var/tmp/humanix-host-stats.json"))
DOMAINES = [
    d.strip()
    for d in os.environ.get(
        "HUMANIX_STATS_DOMAINES", "humanix-academie.fr,demo.humanix-academie.fr"
    ).split(",")
    if d.strip()
]
TLS_HOTE = os.environ.get("HUMANIX_STATS_TLS_HOTE", "127.0.0.1")
TLS_PORT = int(os.environ.get("HUMANIX_STATS_TLS_PORT", "443"))
CGROUP_RACINE = Path(os.environ.get("HUMANIX_STATS_CGROUP", "/sys/fs/cgroup"))
PROC = Path(os.environ.get("HUMANIX_STATS_PROC", "/proc"))
# Systemes de fichiers reels : ni tmpfs, ni overlay des conteneurs, ni
# pseudo-systemes. vfat couvre /boot/efi, qui ne bouge jamais mais compte.
FS_SUIVIS = {"ext4", "ext3", "ext2", "xfs", "btrfs", "zfs", "vfat"}

HORODATAGE = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def emettre(type_: str, **champs: object) -> None:
    ligne = {"ts": HORODATAGE, "type": type_}
    ligne.update(champs)
    sys.stdout.write(json.dumps(ligne, ensure_ascii=False, separators=(",", ":")) + "\n")


def erreur(section: str, exc: BaseException) -> None:
    emettre("erreur", section=section, message=f"{type(exc).__name__}: {exc}"[:300])


def lire_etat() -> dict:
    try:
        etat = json.loads(ETAT.read_text(encoding="utf-8"))
        return etat if isinstance(etat, dict) else {}
    except (OSError, ValueError):
        return {}


def ecrire_etat(etat: dict) -> None:
    try:
        tmp = ETAT.with_suffix(".tmp")
        tmp.write_text(json.dumps(etat), encoding="utf-8")
        os.replace(tmp, ETAT)
    except OSError as exc:
        erreur("etat", exc)


# --- Echantillons CPU (hote et conteneurs) ---------------------------------


def cpu_totaux() -> tuple[int, int]:
    """(total, inactif) en jiffies, d'apres la premiere ligne de /proc/stat."""
    with open(PROC / "stat", encoding="utf-8") as f:
        champs = f.readline().split()
    valeurs = [int(x) for x in champs[1:]]
    # user nice system idle iowait irq softirq steal
    inactif = valeurs[3] + (valeurs[4] if len(valeurs) > 4 else 0)
    return sum(valeurs), inactif


def conteneurs_en_marche() -> list[tuple[str, Path]]:
    """[(nom, cgroup)] des conteneurs podman en marche."""
    ids = subprocess.run(
        ["podman", "ps", "-q"], capture_output=True, text=True, timeout=20, check=True
    ).stdout.split()
    if not ids:
        return []
    sortie = subprocess.run(
        ["podman", "inspect", "--format", "{{.Name}}\t{{.State.CgroupPath}}", *ids],
        capture_output=True,
        text=True,
        timeout=20,
        check=True,
    ).stdout
    resultat = []
    for ligne in sortie.splitlines():
        if "\t" in ligne:
            nom, chemin = ligne.split("\t", 1)
            resultat.append((nom.lstrip("/"), CGROUP_RACINE / chemin.strip().lstrip("/")))
    return resultat


def lire_cpu_stat(cgroup: Path) -> int | None:
    try:
        for ligne in (cgroup / "cpu.stat").read_text(encoding="utf-8").splitlines():
            if ligne.startswith("usage_usec "):
                return int(ligne.split()[1])
    except OSError:
        return None
    return None


def lire_entier(chemin: Path) -> int | None:
    try:
        return int(chemin.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None


def echantillon(conteneurs: list[tuple[str, Path]]) -> dict:
    """Compteurs cumules de l'hote et des conteneurs, a un instant donne."""
    total, inactif = cpu_totaux()
    maintenant = time.time()
    usages = {}
    for nom, cgroup in conteneurs:
        usage = lire_cpu_stat(cgroup)
        if usage is not None:
            usages[nom] = {"usage": usage, "t": maintenant}
    return {
        "cpu": {"total": total, "inactif": inactif, "t": maintenant},
        "conteneurs": usages,
    }


# --- Mesures ----------------------------------------------------------------


def mesurer_hote(avant: dict, apres: dict) -> None:
    champs: dict[str, object] = {}
    a, b = avant.get("cpu") or {}, apres["cpu"]
    d_total = b["total"] - a.get("total", b["total"])
    if d_total > 0:
        d_inactif = b["inactif"] - a.get("inactif", b["inactif"])
        champs["cpu_pct"] = round(100.0 * (1.0 - d_inactif / d_total), 2)
    else:
        champs["cpu_pct"] = 0.0

    with open(PROC / "loadavg", encoding="utf-8") as f:
        c1, c5, c15 = (float(x) for x in f.read().split()[:3])

    mem: dict[str, int] = {}
    with open(PROC / "meminfo", encoding="utf-8") as f:
        for ligne in f:
            cle, _, reste = ligne.partition(":")
            if reste.strip():
                mem[cle] = int(reste.split()[0]) * 1024  # kB -> octets
    total_mem = mem.get("MemTotal", 0)
    disponible = mem.get("MemAvailable", 0)
    swap_total = mem.get("SwapTotal", 0)
    swap_libre = mem.get("SwapFree", 0)

    with open(PROC / "uptime", encoding="utf-8") as f:
        uptime = float(f.read().split()[0])

    champs.update(
        {
            "charge_1m": c1,
            "charge_5m": c5,
            "charge_15m": c15,
            "mem_total": total_mem,
            "mem_utilisee": max(total_mem - disponible, 0),
            "mem_disponible": disponible,
            "swap_total": swap_total,
            "swap_utilise": max(swap_total - swap_libre, 0),
            "uptime_s": int(uptime),
        }
    )
    emettre("hote", **champs)


def mesurer_disques() -> None:
    vus: set[str] = set()
    with open(PROC / "mounts", encoding="utf-8") as f:
        for ligne in f:
            morceaux = ligne.split()
            if len(morceaux) < 3:
                continue
            peripherique, point, fstype = morceaux[0], morceaux[1], morceaux[2]
            # Un peripherique monte deux fois (bind mount du stockage des
            # conteneurs sous /srv) ne compte qu'une fois : premier point vu.
            if fstype not in FS_SUIVIS or peripherique in vus:
                continue
            vus.add(peripherique)
            try:
                st = os.statvfs(point)
            except OSError as exc:
                erreur(f"disque {point}", exc)
                continue
            total = st.f_frsize * st.f_blocks
            libre = st.f_frsize * st.f_bfree
            emettre("disque", point=point, total=total, utilise=total - libre)


def mesurer_conteneurs(
    conteneurs: list[tuple[str, Path]], avant: dict, apres: dict
) -> None:
    for nom, cgroup in conteneurs:
        champs: dict[str, object] = {"nom": nom, "cpu_pct": 0.0, "mem": 0, "pids": 0}
        mem = lire_entier(cgroup / "memory.current")
        pids = lire_entier(cgroup / "pids.current")
        if mem is not None:
            champs["mem"] = mem
        if pids is not None:
            champs["pids"] = pids
        a = (avant.get("conteneurs") or {}).get(nom)
        b = apres["conteneurs"].get(nom)
        if a and b and b["usage"] >= a.get("usage", 0):
            ecoule_us = (b["t"] - a.get("t", b["t"])) * 1_000_000
            if ecoule_us > 0:
                # Comme `top` : 100 % = un coeur entier, peut depasser 100.
                champs["cpu_pct"] = round(100.0 * (b["usage"] - a["usage"]) / ecoule_us, 2)
        emettre("conteneur", **champs)


def jours_restants(domaine: str) -> int:
    contexte = ssl.create_default_context()
    # HTTP/1.1 seul et fermeture propre (unwrap) : sans ALPN h2, HAProxy
    # n'envoie pas de trame SETTINGS a un client qui ne demandera rien, et
    # il ne se retrouve pas a ecrire sur une connexion morte. Avec `option
    # dontlognull`, une poignee de main sans requete ne laisse alors aucune
    # ligne de journal. Avant ce reglage, chaque sonde laissait un
    # « ECONNRESET returned by OS » ou « EPIPE » dans Loki, deux par minute.
    contexte.set_alpn_protocols(["http/1.1"])
    with socket.create_connection((TLS_HOTE, TLS_PORT), timeout=5) as brut:
        tls = contexte.wrap_socket(brut, server_hostname=domaine)
        try:
            cert = tls.getpeercert()
        finally:
            try:
                tls.unwrap()
            except (OSError, ssl.SSLError):
                pass
    fin = ssl.cert_time_to_seconds(cert["notAfter"])
    return int((fin - time.time()) // 86400)


# Une vraie poignee de main par domaine et par heure suffit : un certificat
# ne change pas plus souvent. Entre deux, la valeur memorisee est reemise
# chaque minute pour que la jauge reste fraiche cote Mimir (les regles
# d'alerte lisent la derniere valeur). Un echec se retente au bout de 5 min.
CERTIFICAT_INTERVALLE_S = 3600
CERTIFICAT_RETENTATIVE_S = 300


def mesurer_certificats(avant: dict, apres: dict) -> None:
    cache = dict(avant.get("certificats") or {})
    maintenant = time.time()
    for domaine in DOMAINES:
        connu = cache.get(domaine)
        if connu and maintenant - connu.get("t", 0) < CERTIFICAT_INTERVALLE_S:
            emettre("certificat", domaine=domaine, jours=connu["jours"])
            continue
        try:
            jours = jours_restants(domaine)
            horodatage = maintenant
        except Exception as exc:  # expire, chaine invalide, port ferme : on le dit
            jours = -1
            horodatage = maintenant - CERTIFICAT_INTERVALLE_S + CERTIFICAT_RETENTATIVE_S
            erreur(f"certificat {domaine}", exc)
        cache[domaine] = {"jours": jours, "t": horodatage}
        emettre("certificat", domaine=domaine, jours=jours)
    apres["certificats"] = cache


# --- Bases PostgreSQL -------------------------------------------------------

REQUETE_BASE = (
    "select pg_database_size(current_database()),"
    " (select count(*) from pg_stat_activity where datname = current_database()),"
    " (select setting from pg_settings where name = 'max_connections'),"
    " (select coalesce(round(100.0 * sum(blks_hit)"
    "   / nullif(sum(blks_hit) + sum(blks_read), 0), 1), 0)"
    "  from pg_stat_database where datname = current_database()),"
    " (select coalesce(sum(n_dead_tup), 0) from pg_stat_user_tables),"
    " (select coalesce(extract(epoch from max(now() - xact_start)), 0)::int"
    "  from pg_stat_activity where datname = current_database()"
    "  and state <> 'idle')"
)


def mesurer_bases(conteneurs: list[tuple[str, Path]]) -> None:
    """Taille, connexions, cache, tuples morts et plus longue transaction de
    chaque conteneur PostgreSQL, par `podman exec ... psql` avec le role et la
    base du conteneur lui-meme : ni role de lecture ni secret supplementaire.
    Une douzaine de series, la ou la source postgresql_metrics de Vector en
    produirait soixante pour une base de 17 Mo."""
    for nom, _ in conteneurs:
        if "postgres" not in nom:
            continue
        try:
            env = subprocess.run(
                ["podman", "exec", nom, "sh", "-c", 'echo "$POSTGRES_USER|$POSTGRES_DB"'],
                capture_output=True,
                text=True,
                timeout=20,
                check=True,
            ).stdout.strip()
            utilisateur, _, base = env.partition("|")
            sortie = subprocess.run(
                [
                    "podman", "exec", nom, "psql",
                    "-U", utilisateur or "postgres",
                    "-d", base or "postgres",
                    "-At", "-F", "|", "-c", REQUETE_BASE,
                ],
                capture_output=True,
                text=True,
                timeout=20,
                check=True,
            ).stdout.strip()
            taille, connexions, max_conn, cache, morts, trans = sortie.split("|")
            emettre(
                "base",
                conteneur=nom,
                taille=int(taille),
                connexions=int(connexions),
                max_connexions=int(max_conn),
                cache_pct=float(cache),
                tuples_morts=int(morts),
                transaction_max_s=int(trans),
            )
        except Exception as exc:
            erreur(f"base {nom}", exc)


# --- Principal --------------------------------------------------------------


def principal() -> int:
    avant = lire_etat()
    try:
        conteneurs = conteneurs_en_marche()
    except Exception as exc:
        erreur("conteneurs", exc)
        conteneurs = []

    try:
        if "cpu" not in avant:
            # Pas d'etat : deux echantillons a une seconde d'ecart.
            avant = echantillon(conteneurs)
            time.sleep(1)
        apres = echantillon(conteneurs)
    except Exception as exc:
        erreur("echantillon", exc)
        apres = {"cpu": {"total": 0, "inactif": 0, "t": time.time()}, "conteneurs": {}}

    for section, fonction in (
        ("hote", lambda: mesurer_hote(avant, apres)),
        ("disques", mesurer_disques),
        ("conteneurs", lambda: mesurer_conteneurs(conteneurs, avant, apres)),
        ("certificats", lambda: mesurer_certificats(avant, apres)),
        ("bases", lambda: mesurer_bases(conteneurs)),
    ):
        try:
            fonction()
        except Exception as exc:
            erreur(section, exc)
    ecrire_etat(apres)
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(principal())
