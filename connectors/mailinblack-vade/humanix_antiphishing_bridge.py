#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-antiphishing-bridge
===========================

Microservice HTTP qui réceptionne les notifications anti-phishing souverains FR
(Mailinblack, Vade Secure) et déclenche une campagne de sensibilisation Humanix
ciblée pour les utilisateurs concernés.

Logique :
    Mailinblack/Vade détecte un phishing  -->  POST /webhook/<vendor>
                                                    |
                                                    v
                                  identifie les destinataires concernes
                                                    |
                                                    v
                                  POST /api/integrations/edr-trigger
                                  (Humanix : campagne ciblee)

Pré-requis :
    - Mailinblack ou Vade Secure avec webhook sortant configuré
    - Endpoint Humanix /api/integrations/edr-trigger (à venir)
    - Clé API Humanix (Essentielle+)

Licence : MIT.

Lancement :
    pip install -r requirements.txt
    cp .env.sample .env
    python humanix_antiphishing_bridge.py
"""
from __future__ import annotations

import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    import requests
except ImportError:
    print("ERREUR : 'requests' requis. pip install requests", file=sys.stderr)
    sys.exit(2)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("humanix-antiphishing")


def must_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise SystemExit(f"Variable d'environnement manquante : {key}")
    return value


# ---------------------------------------------------------------------------
# Normalisation par vendor
# ---------------------------------------------------------------------------
def normalize_mailinblack(payload: dict) -> dict:
    """
    Mailinblack envoie typiquement :
        {
          "event": "phishing.detected",
          "recipients": ["a@x.fr", "b@x.fr"],
          "subject": "...",
          "from": "fake@bad.com",
          "verdict": "phishing"
        }
    """
    return {
        "vendor": "mailinblack",
        "logins": payload.get("recipients", []),
        "subject": payload.get("subject", ""),
        "from_address": payload.get("from", ""),
        "verdict": payload.get("verdict", "unknown"),
    }


def normalize_vade(payload: dict) -> dict:
    """
    Vade Secure envoie typiquement :
        {
          "type": "ThreatDetection",
          "recipients": [{"email": "a@x.fr"}, ...],
          "category": "phishing",
          "subject": "...",
          "sender": "fake@bad.com"
        }
    """
    recipients = payload.get("recipients", [])
    if isinstance(recipients, list) and recipients and isinstance(recipients[0], dict):
        recipients = [r.get("email", "") for r in recipients if r.get("email")]
    return {
        "vendor": "vade",
        "logins": recipients,
        "subject": payload.get("subject", ""),
        "from_address": payload.get("sender", ""),
        "verdict": payload.get("category", "unknown"),
    }


# ---------------------------------------------------------------------------
# Push Humanix
# ---------------------------------------------------------------------------
def push_to_humanix(normalized: dict, dry_run: bool = False) -> bool:
    base = must_env("HUMANIX_BASE_URL").rstrip("/")
    api_key = must_env("HUMANIX_API_KEY")

    body = {
        "source": normalized["vendor"],
        "logins": normalized["logins"],
        "trigger_module": "phishing-vigilance",
        "reason": (
            f"Phishing detecte par {normalized['vendor']} : "
            f"de={normalized.get('from_address', 'n/a')} "
            f"sujet={normalized.get('subject', 'n/a')[:80]}"
        ),
    }

    if dry_run:
        log.info("[DRY-RUN] POST Humanix : %s", json.dumps(body, ensure_ascii=False)[:300])
        return True

    r = requests.post(
        f"{base}/api/integrations/edr-trigger",
        json=body,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    if r.status_code in (200, 202):
        log.info("Humanix campagne ciblee declenchee pour %d users", len(body["logins"]))
        return True
    log.warning("Humanix push FAIL %s : %s", r.status_code, r.text[:200])
    return False


# ---------------------------------------------------------------------------
# HTTP server
# ---------------------------------------------------------------------------
class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # pragma: no cover
        log.info("%s - %s", self.address_string(), format % args)

    def do_POST(self) -> None:
        length = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        if self.path == "/webhook/mailinblack":
            normalized = normalize_mailinblack(payload)
        elif self.path == "/webhook/vade":
            normalized = normalize_vade(payload)
        else:
            self.send_error(404)
            return

        if not normalized["logins"]:
            self.send_response(204)
            self.end_headers()
            return

        ok = push_to_humanix(normalized)
        if ok:
            self.send_response(202)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode())
        else:
            self.send_error(502, "Humanix push failed")


def main() -> int:
    port = int(os.environ.get("PORT", "8081"))
    host = os.environ.get("HOST", "0.0.0.0")
    log.info("humanix-antiphishing-bridge up on %s:%d", host, port)
    HTTPServer((host, port), WebhookHandler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
