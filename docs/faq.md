# FAQ - Humanix Académie Community Edition

Les 20 questions qui reviennent le plus souvent. Si la tienne n'y est pas,
ouvre une [discussion Q&A](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/q-a).

---

## Licence et modèle

### 1. Quelle est exactement la licence ? Puis-je l'utiliser dans mon entreprise ?

Humanix Académie Community Edition est sous **GNU Affero General Public
License v3.0 (AGPLv3)**. Tu peux :

- ✅ L'installer et l'utiliser en interne pour tes employés (gratuit)
- ✅ La modifier pour tes besoins (sans publier)
- ✅ La forker et y contribuer
- ⚠️ **Si tu l'héberges en SaaS pour des tiers**, tu dois redistribuer le
  code source (incluant tes modifs) sous AGPLv3
- ❌ Tu ne peux pas l'embarquer dans un produit fermé sans nous contacter
  pour une licence commerciale

Pour 99 % des PME qui veulent juste former leurs collaborateurs en interne,
**l'AGPL ne pose aucun problème**.

### 2. Pourquoi avoir choisi AGPL et pas Apache ou MIT ?

L'AGPL nous protège contre les concurrents qui prendraient notre code pour
le proposer en SaaS fermé sans contribuer en retour. C'est exactement le
choix qu'a fait **intuitem** pour CISO Assistant. Modèle éprouvé en
écosystème OSS cyber FR.

### 3. Si je modifie le code en interne, dois-je publier mes modifs ?

**Non, pas tant que tu l'utilises en interne**. L'AGPL ne déclenche
l'obligation de publication que si tu **redistribues** ou si tu
**proposes le service à des tiers** sur Internet (clause "network use").

Pour un usage 100 % interne (employés de ta société uniquement) : tu peux
modifier librement sans rien publier.

### 4. Puis-je acheter une licence commerciale pour ne pas être lié à l'AGPL ?

Oui. Humanix Cybersecurity propose un **dual-licensing** au cas par cas pour
les ESN qui veulent intégrer le code dans une offre fermée, ou pour les
grands comptes qui ont des contraintes juridiques avec l'AGPL.

Contact : `contact@humanix-cybersecurity.fr`

---

## Self-host vs Cloud

### 5. Quelle est la différence entre self-host gratuit et Cloud payant ?

| Critère         | Self-host (Community)               | Cloud (Découverte/Starter/...) |
| --------------- | ----------------------------------- | ------------------------------ |
| Prix            | 0 €                                 | 0 € à sur devis                |
| Installation    | Tu installes (Docker ou bare-metal) | Aucune, juste signup           |
| Maintenance     | Tu maintiens                        | Géré par Humanix               |
| Mises à jour    | Manuelles                           | Automatiques                   |
| Hébergement     | Chez toi (souverain par défaut)     | France garantie                |
| Support         | Communautaire (Discord, GitHub)     | Email/Chat selon palier        |
| Modules         | 5 de base + connecteur GRC          | 5 → 30+ selon palier           |
| Phishing simulé | Non inclus                          | Inclus dès Pro                 |
| SSO entreprise  | Non inclus                          | Inclus dès Essentielle         |
| SecNumCloud     | Non                                 | Inclus dès Enterprise          |

### 6. Quel est le coût réel du self-host ?

Estimation honnête pour une PME de 30 collaborateurs sur 1 an :

| Poste                               | Coût                        |
| ----------------------------------- | --------------------------- |
| Serveur (Scaleway DEV1-S, OVH Eco)  | 6-12 €/mois = ~120 €/an     |
| Domaine + DNS                       | ~12 €/an                    |
| Backups (S3 50 Go)                  | ~10 €/an                    |
| Temps admin (install + maintenance) | 2j/an × ~600 € = 1 200 €/an |
| **Total estimé**                    | **~1 350 €/an**             |

Comparaison Cloud Essentielle pour 30 sièges :

- 30 × 3 €/mois × 12 = **1 080 €/an** (-20 %)

→ Le Cloud est souvent **moins cher** que le self-host pour une PME sans
DSI interne. Le self-host devient pertinent au-delà de 100 sièges, ou si
tu as une DSI déjà payée.

---

## Installation et infrastructure

### 7. Combien de temps prend l'installation ?

| Mode                              | Temps         |
| --------------------------------- | ------------- |
| Docker Compose (déjà installé)    | **10-15 min** |
| Bare-metal Node + PostgreSQL      | 30-45 min     |
| Kubernetes (manifestes existants) | 1-2h          |
| Kubernetes from scratch           | 1 jour        |

### 8. Quels sont les prérequis matériels minimum ?

- 2 vCPU, 2 Go RAM, 5 Go SSD pour 50 utilisateurs
- 4 vCPU, 4 Go RAM, 20 Go SSD pour 500 utilisateurs
- Au-delà : profile real-world workload, c'est une app stateless qui scale
  bien horizontalement

### 9. Puis-je l'héberger sur Raspberry Pi ?

Techniquement oui (Pi 4/5 avec 4 Go RAM minimum), mais déconseillé pour la
production : performances variables, pas de redondance, pas adapté à plus
de 10 utilisateurs simultanés.

Pour du **lab perso**, du **test** ou pour **former une famille** (cf. mode
Cyber Famille intégré) : c'est largement suffisant.

### 10. Compatible avec Synology / TrueNAS / NAS ?

Oui via Docker Compose. Plusieurs utilisateurs l'ont fait tourner sur :

- Synology DS920+ et DS1621+
- TrueNAS Scale (apps Docker)
- QNAP avec Container Station

Performances correctes jusqu'à 50-100 utilisateurs.

---

## Production et sécurité

### 11. Est-ce vraiment prêt pour la production ?

Oui. La plateforme est en production interne chez Humanix Cybersecurity et
chez plusieurs clients pilotes depuis fin 2025. Elle inclut :

- Authentification multi-facteur (SSO + magic link)
- Multi-tenant scoping strict (vérifié par 13 tests d'isolation Vitest)
- Middleware edge sur `/admin/**` et `/api/admin/**` (rejet 401 si pas de session)
- Audit trail complet (table `AuditLog` append-only, hashage IP RGPD)
- Sauvegardes recommandées
- Conformité RGPD native (export portabilité art. 20 incluant simulations phishing)
- Chiffrement at-rest possible (config PostgreSQL)
- Headers HTTP sécurité (**CSP strict** avec connect-src whitelist FR/UE,
  HSTS preload, X-Frame DENY, frame-ancestors 'none', Permissions-Policy)
- Sanitization HTML générée par Mistral via **DOMPurify** (audit Cure53)
- Anti-SSRF whitelist (refus IP privées, `.local`, `.internal`)
- 446 tests Vitest sur les chemins critiques

**Pentest interne v1.1 (7 mai 2026)** : 25+ vecteurs testés depuis Exegol-rootme,
0 critique exploité. Voir [docs/SECURITY_AUDIT.md](./SECURITY_AUDIT.md) pour
le rapport d'audit interne complet et la version résumée publique sur
[/securite/rapport-audit](https://humanix-cybersecurity.fr/securite/rapport-audit).

Programme de divulgation responsable : [/.well-known/security.txt](https://humanix-cybersecurity.fr/.well-known/security.txt) (RFC 9116).

### 12. Comment exposer en HTTPS sur Internet ?

Le `docker-compose.yml` inclut **Caddy** comme reverse proxy avec **TLS auto
Let's Encrypt**. Tu n'as qu'à :

1. Pointer ton DNS sur l'IP du serveur (ex: `academie.tonentreprise.fr → 1.2.3.4`)
2. Ajuster le `Caddyfile` (pré-configuré avec un placeholder)
3. `docker compose up -d`
4. Caddy obtient le certificat TLS automatiquement au premier accès

### 13. Comment intégrer notre SSO Entra/Okta/Google ?

Le SSO entreprise (SAML/SCIM) est une feature **Cloud Enterprise**. En self-host
Community Edition, tu as :

- ✅ SSO Google Workspace (gratuit, configuration via Google Cloud Console)
- ✅ SSO Microsoft 365 / Entra ID (gratuit, app registration Azure)
- ❌ SAML 2.0 générique (Okta, Ping, etc.) → Cloud Enterprise

Configuration : variables `AUTH_GOOGLE_*` et `AUTH_MICROSOFT_ENTRA_*` dans
`.env` (cf. [configuration.md](./configuration.md)).

### 14. Quid des sauvegardes ?

Tu es responsable des sauvegardes en self-host. Procédure recommandée :

```bash
# Backup quotidien chiffré, rétention 7 jours
0 2 * * * docker compose exec -T postgres pg_dump -U humanix humanix \
  | gzip | gpg --encrypt --recipient backup@toi.fr \
  > /backups/humanix-$(date +\%Y\%m\%d).sql.gz.gpg

# Test mensuel de restauration sur un serveur de staging
```

Voir `infra/scripts/backup.sh` (à venir Sprint 4).

---

## Performance et scalabilité

### 15. Combien d'utilisateurs simultanés supporte une instance ?

Sur un serveur 4 vCPU / 4 Go RAM avec PostgreSQL bien tuné :

- **500 utilisateurs simultanés** sans problème
- **2 000 utilisateurs simultanés** avec Redis pour les sessions
- **10 000+** : passer en Kubernetes avec scaling horizontal

Au-delà de 5 000 sièges actifs, contact-nous pour un tuning expert.

### 16. La plateforme est-elle responsive / mobile ?

Oui, **mobile-first**. Tous les modules sont jouables sur smartphone (iOS et
Android, navigateurs récents). PWA installable sur le home screen.

### 17. Y a-t-il une app native iOS / Android ?

Pas pour l'instant. La PWA couvre 95 % des besoins. Une app native est
envisagée pour 2027 si la demande est forte.

---

## Intégrations

### 18. Compatible avec CISO Assistant (intuitem) ?

Oui, **intégration native** via le connecteur officiel
(`connectors/ciso-assistant/`). Voir
[docs/INTEGRATION_CISO_ASSISTANT.md](./INTEGRATION_CISO_ASSISTANT.md).

CISO Assistant peut puller les preuves de conformité Humanix (campagnes de
sensibilisation, scores, registres) en pur format OSCAL standard.

### 19. Compatible avec mon SIEM (Sentinel, Splunk, Sekoia) ?

Oui :

- **Microsoft Sentinel** : workbook officiel + KQL fournis
- **Splunk** : format HEC + SPL
- **Sekoia.io / QRadar / Wazuh / Graylog / Elastic** : format CEF v1
- **OSCAL** : format générique pour tout outil GRC compatible NIST

Voir [docs/INTEGRATIONS_ECOSYSTEME.md](./INTEGRATIONS_ECOSYSTEME.md).

### 20. Comment ajouter un module pédagogique custom ?

Trois options :

1. **Self-host** : crée un fichier dans `content/community/modules/<slug>.json`
   et redémarre l'app. Format documenté dans `content/README.md`.
2. **Marketplace** (Cloud Pro+) : utilise l'éditeur visuel via
   `/admin/modules`, soumets à modération, publie en interne.
3. **Contribuer à la communauté** : ouvre une PR avec ton module dans
   `content/community/modules/` du repo officiel pour que tous les
   self-hostés en bénéficient.

---

## Ce qui n'est PAS dans ce FAQ

- **Vulnérabilité de sécurité** : voir [SECURITY.md](../SECURITY.md), surtout
  pas une issue publique
- **Bug confirmé** : ouvre une [GitHub Issue](https://github.com/humanix-cybersecurity/humanix-academie/issues)
- **Contact commercial** : `contact@humanix-cybersecurity.fr`
- **Discussion live** : [GitHub Discussions](https://github.com/humanix-cybersecurity/humanix-academie/discussions) (Discord communautaire ouvre après le launch OSS du 26 mai 2026)

---

_FAQ vivante - révisée à chaque release majeure._
