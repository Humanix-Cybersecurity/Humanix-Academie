#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
humanix-glpi-bridge
===================

Microservice HTTP qui réceptionne les webhooks Humanix et crée des tickets
GLPI via l'API REST officielle.

Logique :
    Humanix webhook ----[HMAC-SHA256]----> /webhook (ce serveur)
                                              |
                                              v
                                     POST /apirest.php/Ticket
                                     (GLPI)

Cas d'usage typique :
    - phishing.reported : un user signale un mail suspect → ticket GLPI
      "Phishing à analyser" sur la file "Sécurité"
    - phishing.campaign_completed : ticket de synthèse de la campagne
    - evidence.exported : (optionnel) ticket d'audit "Bundle GRC mensuel"

Pré-requis :
    - GLPI 10.x avec API REST activée (Setup > General > API)
    - Un user technique GLPI avec App-Token
    - Une file (Entity) ouverte aux tickets cyber

Licence : MIT.

Lancement :
    pip install -r requirements.txt
    cp .env.sample .env
    python humanix_glpi_bridge.py
    # Ecoute sur 0.0.0.0:8080 par defaut
"""
from __future__ import annotations

import hashlib
import hmac
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
log = logging.getLogger("humanix-glpi")


def must_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise SystemExit(f"Variable d'environnement manquante : {key}")
    return value


# ---------------------------------------------------------------------------
# Verification HMAC
# ---------------------------------------------------------------------------
def verify_signature(raw: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# GLPI client
# ---------------------------------------------------------------------------
class GlpiClient:
    """Client minimal pour l'API REST GLPI 10.x."""

    def __init__(self) -> None:
        self.base = must_env("GLPI_BASE_URL").rstrip("/")
        self.app_token = must_env("GLPI_APP_TOKEN")
        self.user_token = must_env("GLPI_USER_TOKEN")
        self.entity_id = int(os.environ.get("GLPI_ENTITY_ID", "0"))
        self.session_token: str | None = None

    def init_session(self) -> None:
        r = requests.get(
            f"{self.base}/apirest.php/initSession",
            headers={
                "App-Token": self.app_token,
                "Authorization": f"user_token {self.user_token}",
            },
            timeout=15,
        )
        r.raise_for_status()
        self.session_token = r.json()["session_token"]

    def kill_session(self) -> None:
        if not self.session_token:
            return
        try:
            requests.get(
                f"{self.base}/apirest.php/killSession",
                headers=self._headers(),
                timeout=10,
            )
        except requests.RequestException:
            pass

    def _headers(self) -> dict[str, str]:
        return {
            "App-Token": self.app_token,
            "Session-Token": self.session_token or "",
            "Content-Type": "application/json",
        }

    def create_ticket(
        self,
        title: str,
        content: str,
        category_completename: str | None = None,
        urgency: int = 3,
    ) -> int | None:
        """Crée un ticket GLPI. Retourne l'ID, ou None en cas d'erreur."""
        payload: dict[str, object] = {
            "input": {
                "name": title[:250],
                "content": content,
                "type": 1,  # 1 = Incident, 2 = Request
                "urgency": urgency,
                "entities_id": self.entity_id,
            }
        }
        if category_completename:
            payload["input"]["itilcategories_completename"] = category_completename  # type: ignore

        r = requests.post(
            f"{self.base}/apirest.php/Ticket",
            json=payload,
            headers=self._headers(),
            timeout=20,
        )
        if r.status_code in (200, 201):
            data = r.json()
            return data.get("id") if isinstance(data, dict) else None
        log.warning("GLPI ticket create FAIL %s : %s", r.status_code, r.text[:200])
        return None


# ---------------------------------------------------------------------------
# Routing event Humanix -> ticket GLPI
# ---------------------------------------------------------------------------
def event_to_ticket(event: str, payload: dict) -> tuple[str, str, int]:
    """Retourne (titre, content_html, urgency 1-5)."""
    data = payload.get("data", {}) if isinstance(payload, dict) else {}
    tenant = payload.get("tenantId", "?")

    if event == "phishing.reported":
        return (
            f"[Humanix] Phishing signalé par {data.get('userName', 'utilisateur')}",
            f"<p><strong>Tenant</strong> : {tenant}</p>"
            f"<p><strong>Source</strong> : {data.get('source', 'inconnue')}</p>"
            f"<p><strong>Expéditeur</strong> : {data.get('fromAddress', 'n/a')}</p>"
            f"<p><strong>Sujet</strong> : {data.get('subject', 'n/a')}</p>"
            f"<p>Mail signalé via Humanix Académie. À analyser par le SOC / IT.</p>",
            2,  # urgent
        )

    if event == "phishing.campaign_completed":
        return (
            f"[Humanix] Campagne phishing terminée — {data.get('campaignTitle', '')}",
            f"<p><strong>Tenant</strong> : {tenant}</p>"
            f"<p><strong>Envois</strong> : {data.get('sentTo', 0)}</p>"
            f"<p><strong>Cliqué</strong> : {data.get('clicked', 0)}</p>"
            f"<p><strong>Signalé</strong> : {data.get('reported', 0)}</p>"
            f"<p><strong>Taux de signalement</strong> : {(data.get('reportRate', 0) * 100):.1f} %</p>",
            3,
        )

    if event == "evidence.exported":
        return (
            f"[Humanix] Bundle GRC exporté — {data.get('framework', '')}",
            f"<p><strong>Tenant</strong> : {tenant}</p>"
            f"<p><strong>Framework</strong> : {data.get('framework', 'n/a')}</p>"
            f"<p><strong>Format</strong> : {data.get('format', 'n/a')}</p>"
            f"<p><strong>Contrôles évalués</strong> : {data.get('controls_count', 0)}</p>"
            f"<p>Pour audit interne / conformité périodique.</p>",
            4,
        )

    # Fallback
    return (
        f"[Humanix] Event {event}",
        f"<pre>{json.dumps(payload, indent=2, ensure_ascii=False)[:2000]}</pre>",
        4,
    )


# ---------------------------------------------------------------------------
# Serveur HTTP
# ---------------------------------------------------------------------------
class WebhookHandler(BaseHTTPRequestHandler):
    secret: str = ""
    glpi: GlpiClient | None = None

    def log_message(self, format: str, *args) -> None:  # pragma: no cover
        log.info("%s - %s", self.address_string(), format % args)

    def do_POST(self) -> None:
        if self.path != "/webhook":
            self.send_error(404)
            return

        length = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(length)

        signature = self.headers.get("x-humanix-signature") or ""
        if not verify_signature(raw, signature, self.secret):
            log.warning("Signature HMAC invalide depuis %s", self.address_string())
            self.send_error(401, "Invalid signature")
            return

        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        event = payload.get("event") or self.headers.get("x-humanix-event") or "unknown"
        title, content, urgency = event_to_ticket(event, payload)

        try:
            self.glpi.init_session()  # type: ignore
            ticket_id = self.glpi.create_ticket(  # type: ignore
                title, content, urgency=urgency
            )
        finally:
            self.glpi.kill_session()  # type: ignore

        if ticket_id:
            log.info("Ticket GLPI #%d cree pour event=%s", ticket_id, event)
            self.send_response(202)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "ticket_id": ticket_id}).encode())
        else:
            self.send_error(502, "GLPI ticket creation failed")


def main() -> int:
    secret = must_env("HUMANIX_WEBHOOK_SECRET")
    port = int(os.environ.get("PORT", "8080"))
    host = os.environ.get("HOST", "0.0.0.0")

    WebhookHandler.secret = secret
    WebhookHandler.glpi = GlpiClient()

    log.info("humanix-glpi-bridge up on %s:%d", host, port)
    HTTPServer((host, port), WebhookHandler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
