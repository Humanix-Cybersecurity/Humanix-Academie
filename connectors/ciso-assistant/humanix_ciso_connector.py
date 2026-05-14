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
    import urllib3
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
    verify_ssl: bool = True

    @classmethod
    def from_env_and_args(cls, args: argparse.Namespace) -> "Config":
        def must(key: str) -> str:
            value = os.environ.get(key)
            if not value:
                raise SystemExit(f"Variable d'environnement manquante : {key}")
            return value

        verify_ssl = os.environ.get("CISO_VERIFY_SSL", "true").lower() not in (
            "false", "0", "no",
        )
        return cls(
            humanix_base_url=must("HUMANIX_BASE_URL").rstrip("/"),
            humanix_api_key=must("HUMANIX_API_KEY"),
            ciso_base_url=must("CISO_BASE_URL").rstrip("/"),
            ciso_username=must("CISO_USERNAME"),
            ciso_password=must("CISO_PASSWORD"),
            framework=args.framework,
            dry_run=args.dry_run,
            timeout=args.timeout,
            verify_ssl=verify_ssl,
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
    r = requests.get(
        url, params=params, headers=headers, timeout=cfg.timeout,
        verify=cfg.verify_ssl,
    )
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
HUMANIX_FOLDER_NAME = "Humanix Académie"
HUMANIX_FOLDER_DESC = (
    "Preuves de conformité importées automatiquement depuis Humanix Académie "
    "(sensibilisation cyber + scoring par contrôle). Cf. "
    "https://humanix-cybersecurity.fr"
)


class CisoAssistantClient:
    """Client minimal pour l'API REST Django de CISO Assistant.

    CISO Assistant (intuitem) utilise :
      - Auth Knox : POST /api/iam/login/ avec {"username","password"}
        retourne {"token": "<hash>"}. Header subsequent : "Authorization: Token <hash>".
      - Modele Evidence avec champs requis : name, description, folder (FK).
        Status enum : draft, missing, in_review, approved, rejected, expired.
        Le champ "link" est un URL sur la revision (pas dans le payload create
        au niveau racine, mais accepte par EvidenceWriteSerializer via
        attachment/link special handling).
      - Cf. backend/core/serializers.py:EvidenceWriteSerializer.
    """

    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.token: str | None = None
        self.folder_id: str | None = None
        # Cache du listing des evidences du folder Humanix, peuple a la demande
        # pour eviter N appels GET /api/evidences/ pendant l'upsert loop.
        self._existing_by_name: dict[str, dict[str, Any]] | None = None
        if not cfg.verify_ssl:
            # Cert self-signed en local (HAProxy ou Caddy dev) : on supprime
            # les warnings InsecureRequestWarning qui spamment les logs.
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    def login(self) -> None:
        """Auth Knox via /api/iam/login/ (username = email du superuser)."""
        url = f"{self.cfg.ciso_base_url}/api/iam/login/"
        log.info("CISO Assistant login : %s", url)
        r = self.session.post(
            url,
            json={
                "username": self.cfg.ciso_username,
                "password": self.cfg.ciso_password,
            },
            timeout=self.cfg.timeout,
            verify=self.cfg.verify_ssl,
        )
        if r.status_code != 200:
            raise SystemExit(
                f"Login CISO Assistant echec : {r.status_code} {r.text[:200]}"
            )
        self.token = r.json().get("token") or r.json().get("access")
        if not self.token:
            raise SystemExit("Token CISO Assistant non retourne par /login.")
        self.session.headers.update({"Authorization": f"Token {self.token}"})

    def ensure_humanix_folder(self) -> str:
        """Cree ou retrouve le folder 'Humanix Academie' (requis sur Evidence)."""
        url = f"{self.cfg.ciso_base_url}/api/folders/"
        # 1. Lister pour voir si deja la
        r = self.session.get(url, timeout=self.cfg.timeout, verify=self.cfg.verify_ssl)
        r.raise_for_status()
        for folder in r.json().get("results", r.json() if isinstance(r.json(), list) else []):
            if folder.get("name") == HUMANIX_FOLDER_NAME:
                self.folder_id = folder["id"]
                log.info("Folder Humanix trouve : %s", self.folder_id)
                return self.folder_id
        # 2. Sinon, le creer (parent = ROOT folder global, defaut Django)
        r = self.session.post(
            url,
            json={"name": HUMANIX_FOLDER_NAME, "description": HUMANIX_FOLDER_DESC},
            timeout=self.cfg.timeout,
            verify=self.cfg.verify_ssl,
        )
        if r.status_code not in (200, 201):
            raise SystemExit(f"Creation folder echouee : {r.status_code} {r.text[:200]}")
        self.folder_id = r.json()["id"]
        log.info("Folder Humanix cree : %s", self.folder_id)
        return self.folder_id

    def _load_existing_evidences(self) -> None:
        """Liste les evidences du folder Humanix, indexees par name.

        CISO Assistant impose name unique par scope -- on ne peut pas POST
        deux fois la meme evidence. Pour rester idempotent (cron quotidien),
        on charge la liste une fois et on PATCH si name matche, sinon POST.
        """
        url = f"{self.cfg.ciso_base_url}/api/evidences/"
        r = self.session.get(
            url, params={"folder": self.folder_id}, timeout=self.cfg.timeout,
            verify=self.cfg.verify_ssl,
        )
        r.raise_for_status()
        data = r.json()
        results = data.get("results", data if isinstance(data, list) else [])
        self._existing_by_name = {ev["name"]: ev for ev in results if "name" in ev}
        log.info("Cache evidences : %d entries existantes dans le folder Humanix",
                 len(self._existing_by_name))

    def _find_existing(self, name: str) -> dict[str, Any] | None:
        if self._existing_by_name is None:
            self._load_existing_evidences()
        return (self._existing_by_name or {}).get(name)

    def upsert_evidence(self, evidence: dict[str, Any]) -> dict[str, Any] | None:
        """Cree ou met a jour une evidence dans CISO Assistant (idempotent).

        Idempotence : GET by name dans le folder Humanix -> PATCH si existe,
        POST sinon. Permet d'executer le connecteur en cron sans creer de
        doublons. En mode dry-run, on ne fait que logger.
        """
        ref = evidence["control_ref"]
        artifact_url = next(
            (a["url"] for a in evidence.get("artifacts", []) if "url" in a),
            None,
        )
        # CISO Assistant valide "link" comme URLField Django : il exige une URL
        # absolue (http/https). Les artifacts Humanix sont retournes en URL
        # relative (commencant par "/") -- on prefixe avec humanix_base_url.
        if artifact_url and artifact_url.startswith("/"):
            artifact_url = f"{self.cfg.humanix_base_url}{artifact_url}"
        # CISO Assistant n'a pas de champ libre "metadata" : on embedded tout
        # dans la description en markdown lisible humain ET parsable.
        description = (
            f"Source automatique : Humanix Académie\n"
            f"Référentiel : {self.cfg.framework}\n"
            f"Contrôle Humanix : {ref}\n"
            f"Score Humanix : {evidence.get('score', 'n/a')}/100\n"
            f"Statut conformité Humanix : {evidence['status']}\n"
            f"Synchronisé : {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n"
        )
        name = f"Humanix · {ref} · {evidence.get('control_name', ref)}"[:255]
        payload = {
            "name": name,
            "description": description,
            "status": map_status_to_ciso(evidence["status"]),
            "folder": self.folder_id,
        }
        if artifact_url:
            # EvidenceWriteSerializer accepte "link" qui est attache a la revision.
            payload["link"] = artifact_url

        if self.cfg.dry_run:
            log.info(
                "[DRY-RUN] upsert name=%s status=%s",
                payload["name"], payload["status"],
            )
            return None

        existing = self._find_existing(name)
        if existing:
            url = f"{self.cfg.ciso_base_url}/api/evidences/{existing['id']}/"
            r = self.session.patch(
                url, json=payload, timeout=self.cfg.timeout,
                verify=self.cfg.verify_ssl,
            )
            verb = "PATCH"
        else:
            url = f"{self.cfg.ciso_base_url}/api/evidences/"
            r = self.session.post(
                url, json=payload, timeout=self.cfg.timeout,
                verify=self.cfg.verify_ssl,
            )
            verb = "POST"

        if r.status_code in (200, 201):
            log.info("OK   %s %s -> evidence %s", verb, ref, r.json().get("id"))
            return r.json()
        log.warning("FAIL %s %s : %s %s", verb, ref, r.status_code, r.text[:300])
        return None


def map_status_to_ciso(humanix_status: str) -> str:
    """Mapping statut conformite Humanix -> statut workflow CISO Assistant.

    Sémantiquement différent : Humanix exprime un état de conformité
    (compliant/partial/non_compliant/not_assessed), CISO Assistant exprime
    un état de revue du document de preuve (draft/in_review/approved/rejected).
    Convention retenue :
      - compliant     -> approved   (preuve validée par l'engine Humanix)
      - partial       -> in_review  (à examiner manuellement par le RSSI)
      - non_compliant -> rejected   (preuve insuffisante)
      - not_assessed  -> draft      (pas encore évalué)
    """
    return {
        "compliant": "approved",
        "partial": "in_review",
        "non_compliant": "rejected",
        "not_assessed": "draft",
    }.get(humanix_status, "draft")


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
        ciso.ensure_humanix_folder()

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
