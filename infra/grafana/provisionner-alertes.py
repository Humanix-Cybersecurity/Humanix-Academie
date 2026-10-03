#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Cree ou met a jour les regles d'alerte 8 a 18 dans Grafana (Cockpit).

Les regles sont decrites dans docs/ALERTES-GRAFANA.md ; ce script en est la
traduction pour l'API de provisionnement de Grafana, pour ne pas les saisir
onze fois a la main. Les regles 1 a 7 existent deja (saisies a la main en
aout 2026) et ne sont pas touchees.

Usage :

    GRAFANA_URL=https://<id>.dashboard.cockpit.scaleway.com \\
    GRAFANA_TOKEN=glsa_... \\
    python3 infra/grafana/provisionner-alertes.py [--dry-run] [--seulement 12,14]

Le jeton est celui d'un compte de service Grafana (Administration > Users
and access > Service accounts, role Editor, puis Add token). Ce n'est PAS
le jeton Cockpit de Vector, qui n'a que le droit d'ecrire des logs et des
metriques. Le jeton n'est lu que dans l'environnement : jamais en argument,
jamais dans un fichier du depot.

Idempotent : chaque regle a un identifiant stable (humanix-regle-<n>) ; la
relancer met a jour sans doubler. Les regles restent modifiables dans
l'interface (en-tete X-Disable-Provenance).

Aucune dependance hors bibliotheque standard.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DOSSIER_UID = "humanix-alertes"
DOSSIER_TITRE = "Humanix"

# Une regle = requete (loki ou prometheus), comparaison, seuil, "for",
# intervalle d'evaluation (= groupe), etat sans donnee, severite.
REGLES: list[dict] = [
    {
        "n": 8,
        "titre": "Balayage : une adresse enchaine les 404",
        "source": "loki",
        "expr": 'sum by (client_ip) (count_over_time({source="haproxy", type="http", classe="4xx"} | json | statut = 404 [10m]))',
        "op": "gt", "seuil": 100, "pendant": "5m", "intervalle": "1m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Plus de 100 reponses 404 en 10 min depuis {{ $labels.client_ip }}",
    },
    {
        "n": 9,
        "titre": "Force brute lente sur l'authentification",
        "source": "loki",
        "expr": 'sum by (client_ip) (count_over_time({source="haproxy", type="http"} | json | methode = "POST" | chemin =~ "/api/auth/.*|/connexion.*" [15m]))',
        "op": "gt", "seuil": 40, "pendant": "5m", "intervalle": "1m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Plus de 40 POST d'authentification en 15 min depuis {{ $labels.client_ip }}",
    },
    {
        "n": 10,
        "titre": "Les protections HAProxy tirent en rafale",
        "source": "loki",
        "expr": 'sum(count_over_time({source="haproxy", type="http"} | json | terminaison =~ "PR.*" [5m]))',
        "op": "gt", "seuil": 300, "pendant": "5m", "intervalle": "1m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Plus de 300 refus HAProxy (403/405/429) en 5 min",
    },
    {
        "n": 11,
        "titre": "Echecs de poignee de main TLS",
        "source": "loki",
        "expr": 'sum(count_over_time({source="haproxy", type="connexion"}[10m]))',
        "op": "gt", "seuil": 200, "pendant": "5m", "intervalle": "1m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Plus de 200 echecs TLS en 10 min : balayage de la machine",
    },
    {
        "n": 12,
        "titre": "Disque a plus de 80 %",
        "source": "prometheus",
        "expr": "100 * humanix_hote_disque_utilise_octets / humanix_hote_disque_total_octets",
        "op": "gt", "seuil": 80, "pendant": "10m", "intervalle": "5m",
        "sans_donnee": "Alerting", "severite": "warning",
        "resume": "{{ $labels.point }} a {{ $values.B | printf \"%.0f\" }} % (absence de donnees = host-stats ou Vector arrete)",
    },
    {
        "n": 13,
        "titre": "Memoire disponible sous 10 %",
        "source": "prometheus",
        "expr": "100 * humanix_hote_memoire_disponible_octets / humanix_hote_memoire_totale_octets",
        "op": "lt", "seuil": 10, "pendant": "5m", "intervalle": "1m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Moins de 10 % de memoire disponible sur humanix-prod-01",
    },
    {
        "n": 14,
        "titre": "Aucune sauvegarde reussie depuis 26 heures",
        "source": "loki",
        "expr": 'sum(count_over_time({source="exploitation", fichier="backup.log", resultat="ok"}[26h]))',
        "op": "lt", "seuil": 1, "pendant": "1h", "intervalle": "30m",
        "sans_donnee": "Alerting", "severite": "critical",
        "resume": "Pas de « Sauvegarde terminee avec succes » depuis 26 h (ou journal absent)",
    },
    {
        "n": 15,
        "titre": "Un cron a echoue",
        "source": "loki",
        "expr": 'sum by (job) (count_over_time({source="exploitation", fichier="cron.log", resultat="echec"} | json [3h]))',
        "op": "gt", "seuil": 1, "pendant": "15m", "intervalle": "15m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Le job {{ $labels.job }} a echoue au moins deux fois en 3 h",
    },
    {
        "n": 16,
        "titre": "Certificat TLS a moins de 14 jours",
        "source": "prometheus",
        "expr": "humanix_certificat_jours_restants",
        "op": "lt", "seuil": 14, "pendant": "2h", "intervalle": "1h",
        "sans_donnee": "OK", "severite": "critical",
        "resume": "{{ $labels.domaine }} : {{ $values.B }} jours restants (acme.sh a echoue, ou -1 = TLS local en erreur)",
    },
    {
        "n": 17,
        "titre": "Hex : le fournisseur repond en erreur",
        "source": "prometheus",
        "expr": 'sum(increase(humanix_hex_messages_total{resultat="fournisseur"}[15m]))',
        "op": "gt", "seuil": 2, "pendant": "10m", "intervalle": "5m",
        "sans_donnee": "OK", "severite": "warning",
        "resume": "Plus de 2 erreurs Mistral en 15 min (403 modele refuse, 429, 5xx)",
    },
    {
        "n": 18,
        "titre": "PostgreSQL : connexions a plus de 80 % du maximum",
        "source": "prometheus",
        "expr": "100 * humanix_base_connexions / humanix_base_connexions_max",
        "op": "gt", "seuil": 80, "pendant": "5m", "intervalle": "1m",
        "sans_donnee": "OK", "severite": "critical",
        "resume": "{{ $labels.conteneur }} : connexions a {{ $values.B | printf \"%.0f\" }} % du maximum",
    },
]


def api(base: str, token: str, methode: str, chemin: str, corps: dict | None = None) -> tuple[int, dict | list | str]:
    donnees = json.dumps(corps).encode("utf-8") if corps is not None else None
    req = urllib.request.Request(base.rstrip("/") + chemin, data=donnees, method=methode)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    # Sans cet en-tete, les regles creees par l'API sont verrouillees dans l'UI.
    req.add_header("X-Disable-Provenance", "true")
    try:
        with urllib.request.urlopen(req, timeout=30) as rep:
            brut = rep.read().decode("utf-8")
            return rep.status, (json.loads(brut) if brut else {})
    except urllib.error.HTTPError as exc:
        brut = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(brut)
        except ValueError:
            return exc.code, brut


def trouver_sources(base: str, token: str) -> dict[str, str]:
    """{"loki": uid, "prometheus": uid} ; prefere les data sources humanix-prod-*."""
    code, sources = api(base, token, "GET", "/api/datasources")
    if code != 200 or not isinstance(sources, list):
        sys.exit(f"Impossible de lister les data sources (HTTP {code}) : {sources}")
    choix: dict[str, str] = {}
    for type_ in ("loki", "prometheus"):
        candidats = [s for s in sources if s.get("type") == type_]
        preferes = [s for s in candidats if "humanix-prod" in (s.get("name") or "")]
        retenu = (preferes or candidats or [None])[0]
        if not retenu:
            sys.exit(f"Aucune data source de type {type_} dans ce Grafana.")
        choix[type_] = retenu["uid"]
        print(f"  data source {type_:<10} -> {retenu['name']} ({retenu['uid']})")
    return choix


def assurer_dossier(base: str, token: str) -> None:
    code, _ = api(base, token, "GET", f"/api/folders/{DOSSIER_UID}")
    if code == 200:
        return
    code, rep = api(base, token, "POST", "/api/folders", {"uid": DOSSIER_UID, "title": DOSSIER_TITRE})
    if code not in (200, 201):
        sys.exit(f"Creation du dossier impossible (HTTP {code}) : {rep}")
    print(f"  dossier « {DOSSIER_TITRE} » cree")


def secondes(duree: str) -> int:
    unite = duree[-1]
    valeur = int(duree[:-1])
    return valeur * {"s": 1, "m": 60, "h": 3600, "d": 86400}[unite]


def payload(regle: dict, sources: dict[str, str]) -> dict:
    uid = f"humanix-regle-{regle['n']}"
    fenetre = max(secondes(regle["intervalle"]) * 2, 600)
    modele_a: dict = {"refId": "A", "expr": regle["expr"], "instant": True, "range": False, "intervalMs": 1000, "maxDataPoints": 43200}
    if regle["source"] == "loki":
        modele_a["queryType"] = "instant"
    return {
        "uid": uid,
        "title": f"Regle {regle['n']} - {regle['titre']}",
        "ruleGroup": f"humanix-{regle['intervalle']}",
        "folderUID": DOSSIER_UID,
        "orgID": 1,
        "condition": "C",
        "for": regle["pendant"],
        "noDataState": regle["sans_donnee"],
        "execErrState": "Error",
        "labels": {"severity": regle["severite"], "humanix": "oui"},
        "annotations": {
            "summary": regle["resume"],
            "description": f"Regle {regle['n']} de docs/ALERTES-GRAFANA.md. Seuil : {regle['op']} {regle['seuil']}, pendant {regle['pendant']}.",
            "runbook_url": "https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/docs/ALERTES-GRAFANA.md",
        },
        "data": [
            {"refId": "A", "relativeTimeRange": {"from": fenetre, "to": 0}, "datasourceUid": sources[regle["source"]], "model": modele_a},
            {"refId": "B", "datasourceUid": "__expr__", "model": {"refId": "B", "type": "reduce", "reducer": "last", "expression": "A", "settings": {"mode": "dropNN"}}},
            {"refId": "C", "datasourceUid": "__expr__", "model": {"refId": "C", "type": "threshold", "expression": "B", "conditions": [{"evaluator": {"type": regle["op"], "params": [regle["seuil"]]}}]}},
        ],
    }


def principal() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="affiche les regles sans rien envoyer")
    ap.add_argument("--seulement", default="", help="numeros de regles, separes par des virgules (defaut : 8 a 18)")
    args = ap.parse_args()

    retenues = {int(x) for x in args.seulement.split(",") if x.strip()} if args.seulement else {r["n"] for r in REGLES}
    regles = [r for r in REGLES if r["n"] in retenues]

    if args.dry_run:
        sources = {"loki": "LOKI", "prometheus": "PROM"}
        for r in regles:
            print(json.dumps(payload(r, sources), ensure_ascii=False, indent=2))
        print(f"\n{len(regles)} regle(s), rien envoye (--dry-run).")
        return 0

    base = os.environ.get("GRAFANA_URL", "").strip()
    token = os.environ.get("GRAFANA_TOKEN", "").strip()
    if not base or not token:
        sys.exit("GRAFANA_URL et GRAFANA_TOKEN sont requis dans l'environnement.")

    print("Data sources :")
    sources = trouver_sources(base, token)
    assurer_dossier(base, token)

    groupes: dict[str, str] = {}
    for r in regles:
        corps = payload(r, sources)
        groupes[corps["ruleGroup"]] = r["intervalle"]
        code, existante = api(base, token, "GET", f"/api/v1/provisioning/alert-rules/{corps['uid']}")
        if code == 200:
            code, rep = api(base, token, "PUT", f"/api/v1/provisioning/alert-rules/{corps['uid']}", corps)
            action = "mise a jour"
        else:
            code, rep = api(base, token, "POST", "/api/v1/provisioning/alert-rules", corps)
            action = "creee"
        if code in (200, 201):
            print(f"  regle {r['n']:>2} {action:<11} : {r['titre']}")
        else:
            print(f"  regle {r['n']:>2} ECHEC (HTTP {code}) : {rep}")

    # L'intervalle d'evaluation se regle par groupe, pas par regle.
    for groupe, intervalle in groupes.items():
        code, rep = api(base, token, "PUT", f"/api/v1/provisioning/folder/{DOSSIER_UID}/rule-groups/{groupe}", {"interval": intervalle})
        etat = "ok" if code in (200, 201) else f"ECHEC HTTP {code} : {rep}"
        print(f"  groupe {groupe:<14} evalue toutes les {intervalle} : {etat}")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
