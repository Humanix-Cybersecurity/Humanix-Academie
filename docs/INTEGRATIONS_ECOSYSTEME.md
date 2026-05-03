# Stratégie d'intégration à l'écosystème RSSI

> **Document validé** · 3 mai 2026
> **Pilote** : Florian DURANO, Humanix-Cybersecurity.
> **Posture** : hub-and-spoke avec priorité souveraineté française.

---

## Principe directeur — hub-and-spoke

Humanix Académie n'est pas une plateforme isolée. Notre rôle dans la stack du RSSI est d'être le **pilier facteur humain** qui s'intègre nativement à son écosystème (GRC, SIEM, IAM, ITSM, RH, CTI). Pour rester maintenable en solo, nous adoptons une logique **hub-and-spoke** :

- **Un endpoint pivot** (`/api/v1/evidence-export`) qui sait sortir N formats normalisés
- **Des connecteurs externes légers** (50-200 lignes chacun) qui consomment ces formats
- **Des standards ouverts** (OSCAL, SCIM v2, ECS, CEF, CIM) plutôt que des intégrations point-à-point

Bénéfice : on maintient 1 endpoint + 1 mapping GRC, on décline en 5-10 formats, et l'écosystème consomme. C'est exactement ce que font Vanta et Drata côté US, mais avec une forte composante souveraine FR/UE.

---

## Les 10 intégrations validées

### ✅ Sprint 10 — Standards pivots (LIVRÉ — mai 2026)

Effort cumulé faible, ROI maximal car débloque des dizaines d'outils en aval.

| # | Livrable | Statut |
|---|---|---|
| 1 | **`format=oscal-v1`** sur `/api/v1/evidence-export` (NIST 1.1.2 Assessment Results) | ✅ livré |
| 2 | **Webhook outbound `evidence.exported`** signé HMAC-SHA256 + page de doc publique `/integrations/webhooks` | ✅ livré |
| 3 | **SCIM v2 complet** (`/scim/v2/{ServiceProviderConfig,ResourceTypes,Users,Users/[id],Groups}`) + page de doc `/integrations/scim` | ✅ livré |
| 4 | **Hub `/integrations`** — vue agrégée des connecteurs (livrés + roadmap, filtre par origine FR/UE/US/Standard) | ✅ livré |

---

### ✅ Sprint 11 — Marché SIEM mainstream (LIVRÉ — mai 2026)

| # | Livrable | Statut |
|---|---|---|
| 4 | **Microsoft Sentinel** : workbook clé en main + Logs Ingestion API + format CEF + page `/integrations/sentinel` | ✅ livré |
| 5 | **Splunk HEC** : `format=splunk-cim-v1` (NDJSON) + connecteur Python + page `/integrations/splunk` + SPL queries | ✅ livré |
| 5b | **Format CEF générique** : aussi compatible QRadar, Sekoia, Elastic Security, Wazuh, Graylog | ✅ bonus |

---

### ✅ Sprint 12 — Levier commercial PME française (LIVRÉ — mai 2026) 🇫🇷

| # | Livrable | Statut |
|---|---|---|
| 6 | **Connecteur Lucca** — Python MIT, sync HR vers SCIM v2 + page `/integrations/lucca` | ✅ livré |
| 7 | **Plugin GLPI** — bridge Python, webhooks signés → tickets GLPI 10.x + page `/integrations/glpi` | ✅ livré |
| 8 | **CyberMalveillance.gouv.fr** — page liaison officielle + ressources intégrées + démarche de référencement en cours | ✅ livré |

---

### ✅ Sprint 13 — Souveraineté française (LIVRÉ — mai 2026) 🇫🇷

| # | Livrable | Statut |
|---|---|---|
| 9 | **Sekoia.io** — connecteur Python push CEF vers Intake API + page `/integrations/sekoia` | ✅ livré |
| 10 | **HarfangLab** — bridge bidirectionnel (push CEF + pull alertes pour campagnes ciblées) + page `/integrations/harfanglab` | ✅ livré |
| 11 | **Mailinblack / Vade** — bridge HTTP webhook → campagne Humanix ciblée < 5 min + page `/integrations/mailinblack-vade` | ✅ livré |

---

## Plan rythmé sur 12 mois (2026-2027)

| Période | Sprint | Livrable | Cocorico | US | Standard |
|---|---|---|---|---|---|
| Mai 2026 | 9 ✅ | CISO Assistant (connecteur livré) | — | — | ✅ |
| Juin 2026 | 10 | OSCAL + Webhook + SCIM | — | — | ✅✅✅ |
| Juil 2026 | 11 | Sentinel + Splunk | — | ✅✅ | — |
| Sept 2026 | 12 | Lucca + GLPI + CyberMalveillance | ✅✅✅ | — | — |
| Nov 2026 | 13 | Sekoia + HarfangLab + Mailinblack/Vade | ✅✅✅ | — | — |
| 2027 | 14+ | Élargissement opportuniste (Eramba, Vanta, Defender O365, Patrowl) | — | — | — |

**Total fin 2026 : 11 connecteurs natifs livrés.** Aucun concurrent (KnowBe4, Mantra, Hoxhunt, Phished) n'en a plus de 3.

---

## Politique d'extension

### Ce qui est dans la roadmap

Les 10 intégrations listées ci-dessus + CISO Assistant (déjà livré) = **11 intégrations natives** maintenues officiellement par Humanix-Cybersecurity.

### Ce qui n'y est pas

Tout le reste (Drata, Vanta, ServiceNow GRC, OneTrust, CrowdStrike, Cyberwatch, Tenable, Qualys, Wallix, ServiceNow ITSM, Workday, BambooHR, Okta Workflows, etc.) **ne fait pas l'objet d'un connecteur officiel par défaut**.

### Comment gérer une demande client hors liste

Trois cas de figure :

1. **Le client peut consommer un format pivot existant** (OSCAL, webhook signé, SCIM v2, CEF, CIM, ECS) → on lui fournit la doc, il développe son côté. Aucun effort Humanix.
2. **Le client veut un connecteur dédié pour son outil** → développement sur-mesure facturé en prestation séparée. Le connecteur reste propriété du client (ou peut être remonté en open-source si pertinent).
3. **L'outil est très répandu et plusieurs clients le demandent** → on l'ajoute à la roadmap pour la version suivante.

Cette politique permet de répondre à 100% des besoins sans s'engager à maintenir 30 codebases.

---

## Différenciants commerciaux générés

### Pour la page `/comparatif`

À ajouter ligne par ligne au fil des livraisons :

- ✅ Connecteur GRC natif (CISO Assistant) — **Humanix gagne face à 4 concurrents**
- 🟡 Format OSCAL-v1 standard NIST — **Humanix gagne**
- 🟡 SCIM v2 auto-provisioning — *équivaut* concurrents grand compte, **Humanix gagne** vs Mantra/Phished
- 🟡 Connecteur Sentinel + workbook clé en main — **Humanix gagne** (concurrents : doc PDF)
- 🟡 Connecteur Lucca / PayFit / GLPI — **Humanix seul gagnant**
- 🟡 Connecteur Sekoia / HarfangLab — **Humanix seul gagnant** (souveraineté)

### Argumentaire RSSI

> *« Le seul outil de sensibilisation cyber qui s'intègre nativement à votre stack souveraine — Sekoia, HarfangLab, GLPI, Lucca, CISO Assistant — sans dev custom. »*

C'est un positionnement unique sur le marché européen.

---

## Engagement de transparence

À chaque livraison de connecteur, mise à jour de :

- `INTEGRATIONS_ECOSYSTEME.md` (ce fichier)
- `ROADMAP_PRODUIT.md`
- Page publique `/integrations` (à créer en sprint 10) — index visuel de tous les connecteurs disponibles
- Ligne dédiée dans `/comparatif`

---

**Humanix-Cybersecurity** · Le hub d'interopérabilité cyber souverain · 🇫🇷 Made in France

Document mis à jour à chaque évolution de la stratégie connecteurs.
