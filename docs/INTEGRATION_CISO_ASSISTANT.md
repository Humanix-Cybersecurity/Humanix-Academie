# Intégration CISO Assistant ↔ Humanix Académie

> **Statut** : livré (sprint 9, mai 2026).
> **Page publique** : [`/integrations/ciso-assistant`](./app/integrations/ciso-assistant/page.tsx)
> **Connecteur** : [`connectors/ciso-assistant/`](./connectors/ciso-assistant/)

## Pourquoi

[CISO Assistant](https://github.com/intuitem/ciso-assistant-community) (intuitem, AGPL, 🇫🇷) est l'outil GRC open-source en croissance chez les RSSI PME/ETI. Il couvre la conformité (ISO 27001, NIS2, RGPD, ANSSI) mais **pas le facteur humain**. Humanix le complète sans empiéter - co-marketing plutôt que concurrence.

## Architecture en place

Approche **Pull** : CISO Assistant interroge `/api/v1/evidence-export` avec une clé API tenant Humanix, reçoit un bundle JSON de preuves vivantes (statut + score + artefacts par contrôle).

## Endpoint - formats supportés

| Format                       | Usage                                               |
| ---------------------------- | --------------------------------------------------- |
| `ciso-assistant-v1` (défaut) | Intégration CISO Assistant native                   |
| `oscal-v1`                   | Standard NIST - débloque Eramba, RegScale, OpenSCAP |
| `splunk-cim-v1`              | NDJSON HEC-compatible                               |
| `sentinel-cef-v1`            | CEF - Sentinel, QRadar, Sekoia, Wazuh, Graylog      |
| `raw`                        | JSON brut Humanix (debug)                           |

## Mapping référentiels → données Humanix

Voir [`lib/mapping-grc.ts`](./lib/mapping-grc.ts) - 5 frameworks documentés :

- **ISO 27001:2022** - A.5.1, A.5.24, A.6.3, A.6.6, A.6.8, A.7.7, A.8.7
- **NIS2** - art. 21.2.a/b/g/i, art. 23
- **RGPD** - art. 5, 25, 28, 30, 32, 33, 39
- **ANSSI Hygiène Informatique** - M1, M2, M3, M11, M22, M30, M40
- **NIST CSF v2** - PR.AT-01/02 (autres en v1.1)

Chaque contrôle est associé à un seuil de conformité explicite et à des artefacts (score, certificats, Pack NIS2, registre, audit trail). Les contrôles hors scope sont listés explicitement par framework - engagement de transparence.

## Sécurité

- Authentification : clé API tenant SHA-256 (modèle `ApiKey`)
- Plan-gating : `pro` minimum (anciennement `essentielle`)
- Rate limit : 10 req/h par tenant
- Audit trail : event `evidence.exported` à chaque appel
- Pas de PII brute : seulement liens vers artefacts + métriques agrégées

## Connecteur Python (MIT)

`connectors/ciso-assistant/humanix_ciso_connector.py` - pull bundle Humanix, push vers `/api/evidences/` de CISO Assistant. Mode dry-run, support cron, gestion d'erreurs.

## Webhook outbound (push v1.1)

Event `evidence.exported` signé HMAC-SHA256 - voir [`/integrations/webhooks`](./app/integrations/webhooks/page.tsx).

## Bénéfices

- **Commercial** : différenciant unique (aucun acteur sensibilisation FR n'a ça)
- **Communauté** : visibilité gratuite si PR sur la `frameworks-library` open-source
- **Stratégique** : positionnement « partenaire écosystème »

---

**Humanix-Cybersecurity** · Le hub GRC souverain.
