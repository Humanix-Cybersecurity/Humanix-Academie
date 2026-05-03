#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-sekoia-connector
========================

Pousse les preuves de conformité Humanix vers Sekoia.io (SIEM/XDR souverain
français) via leur Intake API.

Logique :
    Humanix /api/v1/evidence-export?format=sentinel-cef-v1
        |
        v
    Sekoia Intake API (https://intake.sekoia.io)
        |
        v  (parser Sekoia: CEF generic ou parser custom Humanix)
        v
    Sekoia Operations Center : alerting, dashboards, corrélation

Pré-requis Sekoia.io :
    1. Compte Sekoia.io
    2. Operations Center → Intakes → Add Intake
       Format : ArcSight CEF (ou parser personnalisé Humanix)
       Récupérer l'INTAKE_KEY (UUID)

Licence : MIT.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

try:
    import requests
except ImportError:
    print("ERREUR : 'requests' requis. pip install requests", file=sys.stderr)
    sys.exit(2)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("humanix-sekoia")

SUPPORTED_FRAMEWORKS = (
    "ISO27001:2022",
    "NIS2",
    "RGPD",
    "ANSSI-HG",
    "NIST-CSF",
)


def must_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise SystemExit(f"Variable d'environnement manquante : {key}")
    return value


def fetch_humanix_cef(framework: str) -> str:
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")
    url = f"{base}/api/v1/evidence-export"
    log.info("GET %s (framework=%s, format=sentinel-cef-v1)", url, framework)
    r = requests.get(
        url,
        params={"framework": framework, "format": "sentinel-cef-v1"},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.text


def push_to_sekoia(cef_payload: str, dry_run: bool) -> tuple[int, int]:
    intake_key = must_env("SEKOIA_INTAKE_KEY")
    intake_url = os.environ.get("SEKOIA_INTAKE_URL", "https://intake.sekoia.io")

    lines = [l for l in cef_payload.split("\n") if l.strip()]
    log.info("%d events CEF a pousser vers Sekoia", len(lines))

    if dry_run:
        log.info("[DRY-RUN] Premiere ligne CEF :")
        if lines:
            log.info("  %s", lines[0][:300])
        return len(lines), 0

    # Sekoia Intake API : POST JSON {intake_key, jsonevent: [{event: "..."}]}
    success, failure = 0, 0
    BATCH = 50
    for i in range(0, len(lines), BATCH):
        chunk = lines[i : i + BATCH]
        body = {
            "intake_key": intake_key,
            "jsonevent": [{"event": line} for line in chunk],
        }
        try:
            r = requests.post(
                f"{intake_url}/batch",
                json=body,
                timeout=30,
            )
            if r.status_code in (200, 202):
                success += len(chunk)
                log.info("  Batch %d : OK (%d events)", i // BATCH + 1, len(chunk))
            else:
                failure += len(chunk)
                log.warning("  Batch %d : FAIL %s %s", i // BATCH + 1, r.status_code, r.text[:200])
        except requests.RequestException as e:
            failure += len(chunk)
            log.error("  Batch %d : exception %s", i // BATCH + 1, e)

    return success, failure


def main() -> int:
    parser = argparse.ArgumentParser(description="Humanix -> Sekoia.io")
    parser.add_argument("--framework", required=True, choices=SUPPORTED_FRAMEWORKS)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cef = fetch_humanix_cef(args.framework)
    success, failure = push_to_sekoia(cef, args.dry_run)

    log.info("=== RESUME ===")
    log.info("Framework : %s", args.framework)
    log.info("Succes    : %d", success)
    log.info("Echecs    : %d", failure)
    log.info("Mode      : %s", "DRY-RUN" if args.dry_run else "LIVE")
    return 0 if failure == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
