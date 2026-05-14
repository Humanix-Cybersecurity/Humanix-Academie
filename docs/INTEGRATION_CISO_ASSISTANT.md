# Intégration CISO Assistant ↔ Humanix Académie

> **Statut** : connecteur validé bout-en-bout contre CISO Assistant Community (mai 2026).
> **Page publique** : [`/integrations/ciso-assistant`](./app/integrations/ciso-assistant/page.tsx)
> **Connecteur** : [`connectors/ciso-assistant/`](./connectors/ciso-assistant/)

## Pourquoi

[CISO Assistant](https://github.com/intuitem/ciso-assistant-community) (intuitem, AGPL, 🇫🇷) est l'outil GRC open-source en croissance chez les RSSI PME/ETI. Il couvre la conformité (ISO 27001, NIS2, RGPD, ANSSI) mais **pas le facteur humain**. Humanix le complète sans empiéter - co-marketing plutôt que concurrence.

## Principe d'intégration : zero modification côté CISO Assistant

Humanix s'adapte 100% à l'API existante de CISO Assistant Community. Aucun
code à écrire, aucune dépendance à ajouter, aucun endpoint à exposer côté
intuitem. Le connecteur Python d'Humanix pull les preuves chez Humanix,
résout les écarts sémantiques, et POST/PATCH sur l'API REST publique de
CISO Assistant.

## Architecture en place

Connecteur Python autonome qui :
1. Pull `/api/v1/evidence-export` côté Humanix (bundle JSON multi-framework)
2. Auth Knox côté CISO Assistant (`POST /api/iam/login/`)
3. Crée ou récupère un folder `"Humanix Académie"` (`GET/POST /api/folders/`)
4. Pour chaque contrôle : upsert idempotent (`GET /api/evidences/?folder=...` → `PATCH` si name match, sinon `POST`)

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

`connectors/ciso-assistant/humanix_ciso_connector.py` - pull bundle Humanix, push vers `/api/evidences/` de CISO Assistant. Mode dry-run, support cron, gestion d'erreurs, **upsert idempotent** (run quotidien sans doublon).

### Écarts schéma absorbés côté Humanix (zero impact intuitem)

Découverts en validant le connecteur contre CISO Assistant Community v2.x. Tous résolus côté connecteur Python :

| Champ | Humanix natif | CISO Assistant attend | Adaptation |
|---|---|---|---|
| Statut | `compliant`/`partial`/`non_compliant`/`not_assessed` (conformité) | `draft`/`missing`/`in_review`/`approved`/`rejected`/`expired` (workflow document) | Mapping : compliant→approved, partial→in_review, non_compliant→rejected, not_assessed→draft |
| `folder` (FK) | Inexistant | Requis sur Evidence | Connecteur crée/retrouve un folder "Humanix Académie" au boot |
| `link` (URL) | Renvoyé comme URL relative (`/api/...`) | URLField Django : exige absolue | Connecteur préfixe avec `HUMANIX_BASE_URL` |
| `metadata` (JSON libre) | Bundle riche envoyé | Inexistant côté CISO Assistant | Embeddé dans `description` en markdown lisible |
| Unicité `name` par scope | Pas de contrainte | Une seule evidence par name+folder | Connecteur GET-by-name puis PATCH si existe, POST sinon |

### Authentification

Auth Knox standard côté CISO Assistant : `POST /api/iam/login/` avec `{username, password}` → token. Header subsequent `Authorization: Token <hash>`. Compatible Knox 4.x et 5.x.

### Test bout-en-bout

Validé contre CISO Assistant Community lancé via `bash docker-compose.sh` (HTTPS 8443, backend Django + Caddy + Qdrant + Huey). Un run typique :

```
Bundle reçu : 7 contrôles, 6 compliants, 0 non-évalués
Folder Humanix trouvé : 3a16f5af-8c88-49ca-8f7b-cb73ab169380
Cache evidences : 7 entries existantes
OK PATCH A.5.1   -> evidence 511ae193-5f71-4652-88c1-4dee3c8e03d6
OK PATCH A.5.24  -> evidence e00b4c3e-119d-44ae-93d5-a6a8c545bcfd
OK PATCH A.6.3   -> evidence b5624c3b-19f2-4738-bbab-44221b4898bf
OK PATCH A.6.6   -> evidence 0900357c-9e27-4049-a30f-735657a7586b
OK PATCH A.6.8   -> evidence 1e5bb182-d1b3-4c6b-816f-2ef31a9d5c58
OK PATCH A.7.7   -> evidence 55ed380a-8ae9-4b00-b0d7-26de77b75325
OK PATCH A.8.7   -> evidence 2b255a86-2b26-4a0f-a9f3-54087ea71af0
Synchronisés : 7 / Échecs : 0
```

## Webhook outbound (push v1.1)

Event `evidence.exported` signé HMAC-SHA256 - voir [`/integrations/webhooks`](./app/integrations/webhooks/page.tsx).

## Bénéfices

- **Commercial** : différenciant unique (aucun acteur sensibilisation FR n'a ça)
- **Communauté** : visibilité gratuite si PR sur la `frameworks-library` open-source
- **Stratégique** : positionnement « partenaire écosystème »

---

**Humanix-Cybersecurity** · Le hub GRC souverain.
