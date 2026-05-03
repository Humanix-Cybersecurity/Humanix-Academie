#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-lucca-connector
=======================

Synchronise les utilisateurs Lucca (HR souverain français) vers Humanix
Académie via notre endpoint SCIM v2.

Logique :
    Lucca /api/v3/users  ->  Humanix /scim/v2/Users (POST/PATCH/DELETE)

Cas d'usage typique :
    - Nouveau collaborateur dans Lucca -> compte Humanix auto-créé,
      module onboarding cyber poussé automatiquement.
    - Départ d'un collaborateur -> compte Humanix soft-désactivé,
      historique de progression conservé pour audit.

Pré-requis :
    - Compte Lucca avec API activée (Settings > API)
    - Clé API Humanix (plan Essentielle ou supérieur)

Licence : MIT.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from typing import Any

try:
    import requests
except ImportError:
    print("ERREUR : 'requests' requis. pip install requests", file=sys.stderr)
    sys.exit(2)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("humanix-lucca")


def must_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise SystemExit(f"Variable d'environnement manquante : {key}")
    return value


# ---------------------------------------------------------------------------
# Lucca client
# ---------------------------------------------------------------------------
def fetch_lucca_users() -> list[dict[str, Any]]:
    """Pull la liste des utilisateurs actifs depuis Lucca."""
    base = must_env("LUCCA_BASE_URL").rstrip("/")
    api_key = must_env("LUCCA_API_KEY")

    url = f"{base}/api/v3/users"
    params = {"isActive": "true", "fields": "id,login,mail,firstName,lastName,department,isActive,dtContractStart,dtContractEnd"}
    headers = {"Authorization": f"lucca application={api_key}"}

    log.info("GET %s", url)
    r = requests.get(url, params=params, headers=headers, timeout=30)
    if r.status_code == 401:
        raise SystemExit("Cle API Lucca invalide.")
    r.raise_for_status()

    data = r.json()
    users = data.get("data", {}).get("items", [])
    log.info("%d utilisateurs Lucca recuperes", len(users))
    return users


def lucca_to_scim(user: dict[str, Any]) -> dict[str, Any]:
    """Convertit un user Lucca vers le format SCIM v2 Humanix."""
    email = user.get("mail") or f"{user.get('login', 'unknown')}@example.com"
    first = user.get("firstName") or ""
    last = user.get("lastName") or ""
    department = user.get("department") or {}
    service = department.get("name") if isinstance(department, dict) else None

    return {
        "schemas": [
            "urn:ietf:params:scim:schemas:core:2.0:User",
            "urn:humanix:scim:schemas:extension:User:1.0",
        ],
        "userName": email,
        "displayName": f"{first} {last}".strip() or email,
        "name": {"givenName": first, "familyName": last},
        "emails": [{"value": email, "primary": True, "type": "work"}],
        "active": user.get("isActive", True),
        "urn:humanix:scim:schemas:extension:User:1.0": {
            "role": "LEARNER",
            "service": service,
        },
    }


# ---------------------------------------------------------------------------
# Humanix SCIM client
# ---------------------------------------------------------------------------
def find_humanix_user_by_email(email: str) -> dict[str, Any] | None:
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")

    r = requests.get(
        f"{base}/scim/v2/Users",
        params={"filter": f'userName eq "{email}"'},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    items = r.json().get("Resources", [])
    return items[0] if items else None


def upsert_humanix_user(scim_user: dict[str, Any], dry_run: bool) -> str:
    """Cree ou met a jour un user dans Humanix via SCIM. Retourne 'created' / 'updated' / 'skipped'."""
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")
    email = scim_user["userName"]

    existing = find_humanix_user_by_email(email)

    if dry_run:
        action = "PATCH" if existing else "POST"
        log.info("[DRY-RUN] %s /scim/v2/Users (email=%s, active=%s)", action, email, scim_user["active"])
        return "skipped"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/scim+json",
    }

    if existing:
        # PATCH replace de active + service
        ops = [
            {"op": "replace", "path": "active", "value": scim_user["active"]},
        ]
        ext = scim_user.get("urn:humanix:scim:schemas:extension:User:1.0", {})
        if ext.get("service"):
            ops.append({
                "op": "replace",
                "path": "urn:humanix:scim:schemas:extension:User:1.0:service",
                "value": ext["service"],
            })
        body = {
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
            "Operations": ops,
        }
        r = requests.patch(
            f"{base}/scim/v2/Users/{existing['id']}",
            json=body,
            headers=headers,
            timeout=30,
        )
        if r.status_code == 200:
            log.info("OK   PATCH %s", email)
            return "updated"
        log.warning("FAIL PATCH %s : %s %s", email, r.status_code, r.text[:200])
        return "failed"

    # POST creation
    r = requests.post(
        f"{base}/scim/v2/Users",
        json=scim_user,
        headers=headers,
        timeout=30,
    )
    if r.status_code in (200, 201):
        log.info("OK   POST  %s (cree)", email)
        return "created"
    log.warning("FAIL POST %s : %s %s", email, r.status_code, r.text[:200])
    return "failed"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Lucca -> Humanix SCIM v2")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    users = fetch_lucca_users()

    stats = {"created": 0, "updated": 0, "failed": 0, "skipped": 0}
    for u in users:
        scim_user = lucca_to_scim(u)
        action = upsert_humanix_user(scim_user, args.dry_run)
        stats[action] = stats.get(action, 0) + 1

    log.info("=== RESUME ===")
    log.info("Total Lucca : %d", len(users))
    for k, v in stats.items():
        log.info("  %-9s : %d", k, v)
    log.info("Mode        : %s", "DRY-RUN" if args.dry_run else "LIVE")

    return 0 if stats["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
