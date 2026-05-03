#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-sentinel-connector
==========================

Pousse les preuves de conformité Humanix vers Microsoft Sentinel via la
Logs Ingestion API (méthode moderne recommandée par Microsoft).

Architecture côté Azure :
    Humanix → Logs Ingestion API → Data Collection Endpoint (DCE)
                                  → Data Collection Rule (DCR)
                                  → Custom Log Table (Humanix_CL)
    Sentinel lit ensuite Humanix_CL via KQL.

Pré-requis Azure :
    1. Créer un Log Analytics Workspace (ou en utiliser un existant)
    2. Créer une Data Collection Endpoint (DCE)
    3. Créer une Data Collection Rule (DCR) avec custom-log table
    4. Créer une App Registration (Service Principal) avec rôle
       'Monitoring Metrics Publisher' sur la DCR
    5. Récupérer : tenant_id, client_id, client_secret, dce_url,
       dcr_immutable_id, stream_name (ex: 'Custom-HumanixCompliance_CL')

Licence : MIT.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("ERREUR : 'requests' requis. pip install requests", file=sys.stderr)
    sys.exit(2)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("humanix-sentinel")

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


def get_azure_token() -> str:
    """OAuth2 Client Credentials flow pour la Logs Ingestion API."""
    tenant_id = must_env("AZURE_TENANT_ID")
    client_id = must_env("AZURE_CLIENT_ID")
    client_secret = must_env("AZURE_CLIENT_SECRET")

    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://monitor.azure.com/.default",
    }
    log.info("Auth Azure AD (tenant=%s, client=%s)", tenant_id, client_id[:8] + "...")
    r = requests.post(url, data=data, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def fetch_humanix_raw(framework: str) -> dict:
    """Pull format=raw pour avoir les structures complètes."""
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")
    url = f"{base}/api/v1/evidence-export"
    log.info("GET %s (framework=%s, format=raw)", url, framework)
    r = requests.get(
        url,
        params={"framework": framework, "format": "raw"},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    if r.status_code == 401:
        raise SystemExit("Cle API Humanix invalide.")
    if r.status_code == 402:
        raise SystemExit("Plan tenant insuffisant.")
    r.raise_for_status()
    return r.json()


def transform_for_sentinel(bundle: dict) -> list[dict]:
    """Transforme le bundle Humanix en lignes pour la table custom Sentinel."""
    tenant = bundle["tenant"]
    framework = bundle["framework"]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    rows = []
    for e in bundle["evidences"]:
        rows.append(
            {
                "TimeGenerated": now,
                "TenantId_s": tenant["id"],
                "TenantName_s": tenant["name"],
                "Framework_s": framework,
                "ControlRef_s": e["control_ref"],
                "ControlName_s": e["control_name"],
                "Category_s": e.get("category") or "",
                "Status_s": e["status"],
                "Score_d": float(e.get("score", 0)),
                "ArtifactsCount_d": len(e.get("artifacts", [])),
                "ScopeNote_s": e.get("scope_note") or "",
            }
        )
    return rows


def push_to_sentinel(rows: list[dict], dry_run: bool) -> tuple[int, int]:
    if not rows:
        return 0, 0

    if dry_run:
        log.info("[DRY-RUN] %d lignes seraient envoyees a Sentinel", len(rows))
        log.info("  Premiere ligne : %s", json.dumps(rows[0], indent=2))
        return len(rows), 0

    dce_url = must_env("AZURE_DCE_URL").rstrip("/")
    dcr_id = must_env("AZURE_DCR_IMMUTABLE_ID")
    stream = must_env("AZURE_STREAM_NAME")

    token = get_azure_token()
    endpoint = f"{dce_url}/dataCollectionRules/{dcr_id}/streams/{stream}?api-version=2023-01-01"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    log.info("POST %s (%d rows)", endpoint, len(rows))
    r = requests.post(endpoint, json=rows, headers=headers, timeout=60)
    if r.status_code in (200, 204):
        return len(rows), 0
    log.warning("Sentinel ingestion FAIL %s : %s", r.status_code, r.text[:300])
    return 0, len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Humanix -> Microsoft Sentinel")
    parser.add_argument("--framework", required=True, choices=SUPPORTED_FRAMEWORKS)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--output", help="Sauvegarde le payload Sentinel (debug)")
    args = parser.parse_args()

    bundle = fetch_humanix_raw(args.framework)
    rows = transform_for_sentinel(bundle)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2, ensure_ascii=False)
        log.info("Payload ecrit dans %s", args.output)

    success, failure = push_to_sentinel(rows, args.dry_run)

    log.info("=== RESUME ===")
    log.info("Framework : %s", args.framework)
    log.info("Rows      : %d", len(rows))
    log.info("Succes    : %d", success)
    log.info("Echecs    : %d", failure)
    log.info("Mode      : %s", "DRY-RUN" if args.dry_run else "LIVE")

    return 0 if failure == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
