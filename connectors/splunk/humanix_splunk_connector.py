#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-splunk-connector
========================

Pousse les preuves de conformité Humanix vers un Splunk HEC (HTTP Event Collector).

Usage :
    cp .env.sample .env
    # renseigner HUMANIX_*, SPLUNK_HEC_URL, SPLUNK_HEC_TOKEN
    python humanix_splunk_connector.py --framework ISO27001:2022 --dry-run

Pré-requis Splunk :
    Settings → Data inputs → HTTP Event Collector → New Token
    Source type recommandé : humanix:compliance:evidence
    Index recommandé : security_compliance (ou main)

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
log = logging.getLogger("humanix-splunk")

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


def fetch_humanix(framework: str) -> str:
    """Pull NDJSON depuis Humanix au format Splunk CIM."""
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")

    url = f"{base}/api/v1/evidence-export"
    log.info("GET %s (framework=%s, format=splunk-cim-v1)", url, framework)
    r = requests.get(
        url,
        params={"framework": framework, "format": "splunk-cim-v1"},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    if r.status_code == 401:
        raise SystemExit("Cle API Humanix invalide.")
    if r.status_code == 402:
        raise SystemExit("Plan tenant insuffisant : upgrade Essentielle requis.")
    if r.status_code == 429:
        raise SystemExit("Rate limit Humanix atteint. Retry plus tard.")
    r.raise_for_status()
    return r.text


def push_to_splunk(ndjson: str, dry_run: bool) -> tuple[int, int]:
    """Envoie le NDJSON vers Splunk HEC. Retourne (success, failure)."""
    hec_url = must_env("SPLUNK_HEC_URL").rstrip("/")
    hec_token = must_env("SPLUNK_HEC_TOKEN")
    verify_tls = os.environ.get("SPLUNK_VERIFY_TLS", "true").lower() != "false"

    lines = [l for l in ndjson.split("\n") if l.strip()]
    log.info("%d events a pousser vers Splunk HEC", len(lines))

    if dry_run:
        log.info("[DRY-RUN] Premiere ligne envoyee :")
        if lines:
            log.info("  %s", lines[0][:300])
        return len(lines), 0

    # HEC accepte plusieurs events dans un meme POST en concatenant les JSON
    # (avec ou sans newline entre eux). On envoie le NDJSON brut.
    success, failure = 0, 0
    endpoint = f"{hec_url}/services/collector/event"
    headers = {
        "Authorization": f"Splunk {hec_token}",
        "Content-Type": "application/json",
    }

    # Send par batch de 100 lignes (plus prudent que tout d'un coup)
    BATCH = 100
    for i in range(0, len(lines), BATCH):
        chunk = "\n".join(lines[i : i + BATCH])
        try:
            r = requests.post(
                endpoint,
                data=chunk,
                headers=headers,
                timeout=30,
                verify=verify_tls,
            )
            if r.status_code == 200:
                success += min(BATCH, len(lines) - i)
                log.info("  Batch %d : OK", i // BATCH + 1)
            else:
                failure += min(BATCH, len(lines) - i)
                log.warning(
                    "  Batch %d : FAIL %s %s",
                    i // BATCH + 1,
                    r.status_code,
                    r.text[:200],
                )
        except requests.RequestException as e:
            failure += min(BATCH, len(lines) - i)
            log.error("  Batch %d : exception %s", i // BATCH + 1, e)

    return success, failure


def main() -> int:
    parser = argparse.ArgumentParser(description="Humanix -> Splunk HEC")
    parser.add_argument(
        "--framework", required=True, choices=SUPPORTED_FRAMEWORKS,
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--output", help="Sauvegarde le NDJSON pull dans ce fichier (debug)"
    )
    args = parser.parse_args()

    ndjson = fetch_humanix(args.framework)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(ndjson)
        log.info("NDJSON ecrit dans %s", args.output)

    success, failure = push_to_splunk(ndjson, args.dry_run)

    log.info("=== RESUME ===")
    log.info("Framework  : %s", args.framework)
    log.info("Succes     : %d", success)
    log.info("Echecs     : %d", failure)
    log.info("Mode       : %s", "DRY-RUN" if args.dry_run else "LIVE")

    return 0 if failure == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
