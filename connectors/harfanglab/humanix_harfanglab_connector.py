#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-harfanglab-connector
============================

Bridge bidirectionnel HarfangLab (EDR souverain français) ↔ Humanix Académie.

Sens 1 - push (Humanix → HarfangLab) :
    Pousse les preuves de conformité au format CEF dans le syslog
    HarfangLab pour enrichir les dashboards et corrélations EDR.

Sens 2 - pull (HarfangLab → Humanix) :
    Récupère les alertes HarfangLab récentes pour identifier les utilisateurs
    à risque et déclencher une campagne de sensibilisation Humanix ciblée
    via webhook (à configurer côté Humanix).

Pré-requis :
    - HarfangLab Manager avec API REST activée
    - User HarfangLab avec scope alerts:read

Licence : MIT.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta, timezone

try:
    import requests
except ImportError:
    print("ERREUR : 'requests' requis. pip install requests", file=sys.stderr)
    sys.exit(2)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("humanix-harfanglab")


def must_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise SystemExit(f"Variable d'environnement manquante : {key}")
    return value


# ---------------------------------------------------------------------------
# Sens 1 - Humanix CEF -> HarfangLab syslog
# ---------------------------------------------------------------------------
def push_humanix_to_harfanglab(framework: str, dry_run: bool) -> int:
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")
    syslog_endpoint = must_env("HARFANGLAB_SYSLOG_URL")

    log.info("Pull CEF Humanix...")
    r = requests.get(
        f"{base}/api/v1/evidence-export",
        params={"framework": framework, "format": "sentinel-cef-v1"},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    r.raise_for_status()
    cef_lines = [l for l in r.text.split("\n") if l.strip()]
    log.info("%d events CEF", len(cef_lines))

    if dry_run:
        log.info("[DRY-RUN] Premiere ligne CEF :")
        if cef_lines:
            log.info("  %s", cef_lines[0][:300])
        return 0

    # POST simple en JSON vers le syslog HTTP HarfangLab
    body = {"events": cef_lines, "source": "humanix-academie", "format": "cef"}
    r2 = requests.post(syslog_endpoint, json=body, timeout=30)
    if r2.status_code in (200, 202, 204):
        log.info("Push HarfangLab OK")
        return 0
    log.error("Push HarfangLab FAIL %s : %s", r2.status_code, r2.text[:200])
    return 1


# ---------------------------------------------------------------------------
# Sens 2 - HarfangLab alerts -> Humanix campagne ciblée
# ---------------------------------------------------------------------------
def pull_alerts_to_humanix(hours: int, dry_run: bool) -> int:
    hl_base = must_env("HARFANGLAB_BASE_URL").rstrip("/")
    hl_token = must_env("HARFANGLAB_API_TOKEN")
    humanix_base = must_env("HUMANIX_BASE_URL").rstrip("/")
    humanix_key = must_env("HUMANIX_API_KEY")

    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    log.info("Pull alertes HarfangLab depuis %s", since)

    r = requests.get(
        f"{hl_base}/api/data/alert/alert/Alert/",
        params={"limit": 200, "ordering": "-alert_time", "alert_time__gte": since},
        headers={"Authorization": f"Token {hl_token}"},
        timeout=30,
    )
    r.raise_for_status()
    alerts = r.json().get("results", [])
    log.info("%d alertes HarfangLab dans la fenetre", len(alerts))

    # Identifier les users a risque (par hostname/login)
    affected_users = set()
    for a in alerts:
        login = a.get("agent", {}).get("logged_user")
        if login:
            affected_users.add(login)

    log.info("%d utilisateurs distincts a sensibiliser", len(affected_users))

    if dry_run or not affected_users:
        for u in list(affected_users)[:10]:
            log.info("  - %s", u)
        return 0

    # Push vers Humanix (event interne `phishing.targeted_campaign_request`)
    body = {
        "source": "harfanglab",
        "logins": list(affected_users),
        "trigger_module": "phishing-vigilance",
        "reason": f"{len(alerts)} alertes EDR sur {hours}h",
    }
    r2 = requests.post(
        f"{humanix_base}/api/integrations/edr-trigger",
        json=body,
        headers={"Authorization": f"Bearer {humanix_key}"},
        timeout=30,
    )
    log.info("Push Humanix : %s", r2.status_code)
    return 0 if r2.status_code in (200, 202) else 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Humanix <-> HarfangLab")
    sub = parser.add_subparsers(dest="action", required=True)

    p_push = sub.add_parser("push", help="Humanix CEF -> HarfangLab syslog")
    p_push.add_argument("--framework", required=True)
    p_push.add_argument("--dry-run", action="store_true")

    p_pull = sub.add_parser("pull", help="HarfangLab alerts -> Humanix campagne")
    p_pull.add_argument("--hours", type=int, default=24)
    p_pull.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()
    if args.action == "push":
        return push_humanix_to_harfanglab(args.framework, args.dry_run)
    if args.action == "pull":
        return pull_alerts_to_humanix(args.hours, args.dry_run)
    return 2


if __name__ == "__main__":
    sys.exit(main())
