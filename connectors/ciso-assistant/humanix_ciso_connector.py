#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-ciso-connector
======================

Connecteur autonome qui synchronise les preuves de conformite (evidence) entre
Humanix Academie et une instance CISO Assistant (intuitem).

Mode d'emploi :
    1. cp .env.sample .env
    2. Renseigner HUMANIX_API_KEY, HUMANIX_BASE_URL, CISO_BASE_URL,
       CISO_USERNAME, CISO_PASSWORD
    3. python humanix_ciso_connector.py --framework ISO27001:2022 --dry-run
    4. Si OK : retirer --dry-run, ajouter en cron quotidien

Licence : MIT (utilisable librement sans contagion AGPL).
Auteur  : Humanix-Cybersecurity (Florian DURANO).
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from typing import Any

try:
    import requests
except ImportError:
    print("ERREUR : 'requests' requis. pip install requests", file=sys.stderr)
    sys.exit(2)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("humanix-ciso")

SUPPORTED_FRAMEWORKS = (
    "ISO27001:2022",
    "NIS2",
    "RGPD",
    "ANSSI-HG",
    "NIST-CSF",
)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
@dataclass
class Config:
    humanix_base_url: str
    humanix_api_key: str
    ciso_base_url: str
    ciso_username: str
    ciso_password: str
    framework: str
    dry_run: bool
    timeout: int = 30

    @classmethod
    def from_env_and_args(cls, args: argparse.Namespace) -> "Config":
        def must(key: str) -> str:
            value = os.environ.get(key)
            if not value:
                raise SystemExit(f"Variable d'environnement manquante : {key}")
            return value

        return cls(
            humanix_base_url=must("HUMANIX_BASE_URL").rstrip("/"),
            humanix_api_key=must("HUMANIX_API_KEY"),
            ciso_base_url=must("CISO_BASE_URL").rstrip("/"),
            ciso_username=must("CISO_USERNAME"),
            ciso_password=must("CISO_PASSWORD"),
            framework=args.framework,
            dry_run=args.dry_run,
            timeout=args.timeout,
        )


# ---------------------------------------------------------------------------
# Humanix client
# ---------------------------------------------------------------------------
def fetch_evidence_bundle(cfg: Config) -> dict[str, Any]:
    """Pull le bundle d'evidence depuis Humanix."""
    url = f"{cfg.humanix_base_url}/api/v1/evidence-export"
    params = {"framework": cfg.framework, "format": "ciso-assistant-v1"}
    headers = {"Authorization": f"Bearer {cfg.humanix_api_key}"}

    log.info("GET %s (framework=%s)", url, cfg.framework)
    r = requests.get(url, params=params, headers=headers, timeout=cfg.timeout)
    if r.status_code == 401:
        raise SystemExit("Cle API Humanix invalide ou revoquee.")
    if r.status_code == 402:
        raise SystemExit("Plan tenant insuffisant : upgrade Essentielle requis.")
    if r.status_code == 429:
        retry = r.headers.get("Retry-After", "60")
        raise SystemExit(f"Rate limit Humanix atteint. Retry dans {retry}s.")
    r.raise_for_status()

    bundle = r.json()
    log.info(
        "Bundle recu : %d controles, %d compliants, %d non-evalues",
        bundle["summary"]["total_controls"],
        bundle["summary"]["compliant"],
        bundle["summary"]["total_controls"] - bundle["summary"]["assessed_controls"],
    )
    return bundle


# ---------------------------------------------------------------------------
# CISO Assistant client
# ---------------------------------------------------------------------------
class CisoAssistantClient:
    """Client minimal pour l'API REST Django de CISO Assistant."""

    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.token: str | None = None

    def login(self) -> None:
        """Authentification via /api/iam/login/ (Django REST Framework token)."""
        url = f"{self.cfg.ciso_base_url}/api/iam/login/"
        log.info("CISO Assistant login : %s", url)
        r = self.session.post(
            url,
            json={
                "username": self.cfg.ciso_username,
                "password": self.cfg.ciso_password,
            },
            timeout=self.cfg.timeout,
        )
        r.raise_for_status()
        self.token = r.json().get("token") or r.json().get("access")
        if not self.token:
            raise SystemExit("Token CISO Assistant non retourne par /login.")
        self.session.headers.update({"Authorization": f"Token {self.token}"})

    def upsert_evidence(self, evidence: dict[str, Any]) -> dict[str, Any] | None:
        """Cree ou met a jour une evidence dans CISO Assistant.

        En mode dry-run, on ne fait que logger.
        """
        ref = evidence["control_ref"]
        payload = {
            "name": f"Humanix - {ref} - {evidence['control_name']}",
            "description": (
                f"Source automatique : Humanix Academie. "
                f"Score : {evidence.get('score', 'n/a')}. "
                f"Statut : {evidence['status']}."
            ),
            "status": map_status_to_ciso(evidence["status"]),
            "external_url": next(
                (a["url"] for a in evidence["artifacts"] if "url" in a),
                None,
            ),
            "metadata": {
                "humanix_control_ref": ref,
                "framework": self.cfg.framework,
                "score": evidence.get("score"),
                "imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        }

        if self.cfg.dry_run:
            log.info("[DRY-RUN] upsert evidence %s -> %s", ref, payload["status"])
            return None

        url = f"{self.cfg.ciso_base_url}/api/evidences/"
        r = self.session.post(url, json=payload, timeout=self.cfg.timeout)
        if r.status_code in (200, 201):
            log.info("OK   upsert %s", ref)
            return r.json()
        log.warning("FAIL upsert %s : %s %s", ref, r.status_code, r.text[:200])
        return None


def map_status_to_ciso(humanix_status: str) -> str:
    """Mapping statut Humanix -> statut CISO Assistant."""
    return {
        "compliant": "compliant",
        "partial": "partially_compliant",
        "non_compliant": "non_compliant",
        "not_assessed": "not_assessed",
    }.get(humanix_status, "not_assessed")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Synchronise Humanix Academie -> CISO Assistant",
    )
    parser.add_argument(
        "--framework",
        required=True,
        choices=SUPPORTED_FRAMEWORKS,
        help="Referentiel de conformite a synchroniser",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simule la synchronisation sans rien ecrire dans CISO Assistant",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Timeout HTTP en secondes (defaut : 30)",
    )
    parser.add_argument(
        "--output",
        help="Si fourni, ecrit le bundle Humanix dans ce fichier JSON (debug)",
    )
    args = parser.parse_args()

    cfg = Config.from_env_and_args(args)

    # 1. Pull Humanix
    bundle = fetch_evidence_bundle(cfg)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(bundle, f, indent=2, ensure_ascii=False)
        log.info("Bundle ecrit dans %s", args.output)

    # 2. Push CISO Assistant
    ciso = CisoAssistantClient(cfg)
    if not cfg.dry_run:
        ciso.login()

    success, failure = 0, 0
    for evidence in bundle["evidences"]:
        result = ciso.upsert_evidence(evidence)
        if cfg.dry_run or result is not None:
            success += 1
        else:
            failure += 1

    log.info("=== RESUME ===")
    log.info("Tenant       : %s", bundle["tenant"]["name"])
    log.info("Framework    : %s", bundle["framework"]["ref"])
    log.info("Synchronises : %d", success)
    log.info("Echecs       : %d", failure)
    log.info("Mode         : %s", "DRY-RUN" if cfg.dry_run else "LIVE")

    return 0 if failure == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
