# humanix-mcp-server

Serveur **MCP (Model Context Protocol)** pour exposer les données Humanix Académie aux agents IA modernes - **approche souveraine first**.

> Premier - et à ce jour seul - MCP server natif d'une plateforme de Security Awareness Training / Human Risk Management européenne.

## Posture : souveraineté avant tout

MCP est un **protocole ouvert** (spécification publiée fin 2024, adoptée par
de multiples LLM et clients desktop). Notre serveur respecte la spec sans
aucune dépendance propriétaire. **Ordre de préférence pour les clients IA** :

1. **Mistral (souverain FR)** - via Le Chat, ou tout client MCP-aware le branchant.
2. **Local (zéro Cloud Act)** :
   - **LM Studio** (macOS / Windows / Linux) - client MCP natif depuis fin 2024.
   - **Anything LLM** (desktop multi-plateforme) - support MCP natif.
   - **Ollama** - via passerelle MCP (Ollama n'a pas de support MCP natif
     à ce jour, mais des clients comme Continue.dev ou des bridges
     `mcp-server-ollama` s'en chargent).
3. **Sur demande (propriétaires US)** : ChatGPT, Claude Desktop, Gemini.
   Fonctionnent - Humanix expose **uniquement** la spec MCP standard - mais
   ne sont pas mis en avant. Le RSSI souverain a le choix d'y aller ou pas.

## À quoi ça sert

Vous êtes RSSI, DPO ou consultant cyber. Vous utilisez un client IA pour
rédiger des rapports, préparer un COMEX, ou auditer une démarche cyber.
Avec ce connecteur :

- **vous demandez à votre agent IA** : *« Qui dans Marketing n'a pas compris la politique de mots de passe ? »*
- l'agent appelle `humanix_team_module_performance(module="mots-de-passe", team="marketing")` via MCP
- vous obtenez la réponse **dans la conversation** : *« 2 utilisateurs (pseudonymisés) en échec, scores 55% et 48%. Je suggère une session de rappel. »*

Le serveur expose **6 outils read-only** :

| Outil MCP | Usage |
|---|---|
| `humanix_evidence_export` | Preuves vivantes par framework (ISO 27001, NIS2, RGPD, ANSSI HG, NIST CSF) |
| `humanix_users_at_risk` | Top N utilisateurs avec score de risque humain le plus élevé |
| `humanix_compliance_score` | Score conformité humaine par framework, breakdown par contrôle |
| `humanix_recent_campaigns` | Campagnes phishing/awareness des N derniers jours |
| `humanix_team_module_performance` | Drill-down : completion + quiz d'une équipe sur un module, top failing users pseudonymisés (RGPD-safe) |
| `humanix_recommend_modules_for_threat` | Recommande 1-5 modules Humanix adaptés à une menace identifiée par votre analyse de risque |

**Read-only par design** : un agent IA n'a pas l'autorité humaine pour
modifier l'état d'un programme de sensibilisation. Les écritures restent
dans `/admin`.

## Pré-requis

- Node.js 20+
- Une clé API Humanix (plan Pro ou supérieur - générer dans `/admin/api-keys`)
- Un client MCP-aware. Compatible avec **tout client conforme à la spec MCP 1.0** :
  - Mistral via passerelle MCP, LM Studio, Anything LLM (souverains / locaux)
  - mcp-cli, Cursor, Continue.dev (outils de dev)
  - Claude Desktop, ChatGPT (via plugin tiers), Gemini (en option)

## Installation rapide

### Option A - npx (recommandé)

```bash
npx humanix-mcp-server
```

### Option B - installation locale (build statique)

```bash
git clone https://github.com/humanix-cybersecurity/humanix-academie
cd humanix-academie/connectors/mcp-server
npm install
npm run build
node dist/index.js
```

## Configuration des clients (priorité souveraine)

### LM Studio (local, recommandé pour confidentialité maximale)

Édite la config MCP de LM Studio (`Settings → Developer → MCP Servers`) :

```json
{
  "mcpServers": {
    "humanix": {
      "command": "npx",
      "args": ["humanix-mcp-server"],
      "env": {
        "HUMANIX_API_KEY": "hxa_xxxxxxxxxxxxxxxx",
        "HUMANIX_BASE_URL": "https://votre-tenant.humanix-cybersecurity.fr"
      }
    }
  }
}
```

Charge un modèle local (Mistral 7B / Mixtral / Llama-3-8B), relance LM
Studio. L'icône 🔧 apparaît dans le chat : Humanix est branché, vos
données ne sortent jamais de votre poste.

### Anything LLM (local)

Même format JSON dans `Settings → Agent Skills → MCP Servers`. Pointer
sur un modèle local ou un endpoint Mistral cloud (Le Chat API) pour
rester dans un cadre souverain UE.

### Mistral via passerelle MCP

Si vous utilisez Le Chat ou l'API Mistral, branchez un client MCP-aware
intermédiaire (Continue.dev, ou un bridge custom) qui consume notre
serveur MCP côté stdio et expose les tools à Mistral via function calling
standard. Le code de bridge est trivial (~50 lignes Python).

### Ollama (via passerelle)

Ollama n'a **pas de support MCP natif** à ce jour. Solution : utiliser
un client MCP-aware externe qui fait pont (Continue.dev VSCode, ou un
script qui interroge Ollama via REST en parallèle). On suit l'évolution
du support natif côté Ollama.

### Clients propriétaires US (sur demande)

Les clients Claude Desktop, ChatGPT (plugin) et Gemini fonctionnent
avec n'importe quel serveur MCP conforme - y compris le nôtre - sans
configuration spécifique côté Humanix. Mais en posture souveraine, nous
**ne les recommandons pas en first** : vos requêtes traversent les
infrastructures américaines. À utiliser en connaissance de cause.

### Variables d'environnement

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `HUMANIX_API_KEY` | ✅ | - | Clé API Humanix (commence par `hxa_`) |
| `HUMANIX_BASE_URL` | ❌ | `https://app.humanix-cybersecurity.fr` | URL de votre instance Humanix |

## Exemples de prompts

> *« Donne-moi le score de conformité humaine NIS2 et explique-moi les 3 contrôles les plus en retard. »*

> *« Liste les 10 utilisateurs les plus à risque, propose un plan de remédiation par profil. »*

> *« Qui dans l'équipe Comptabilité n'a pas compris la politique de mots de passe ? »*

> *« Mon analyse de risque CISO Assistant a identifié 'fraude au président' comme critique. Quels modules Humanix recommandez-vous ? »*

> *« Exporte les preuves OSCAL ISO 27001:2022 du tenant et propose-moi un mapping vers les contrôles CIS v8. »*

## Sécurité

- **Auth** : tous les appels portent un `Authorization: Bearer <HUMANIX_API_KEY>`. Les clés sont gérées dans `/admin/api-keys` avec rate limit, audit trail et révocation immédiate.
- **Read-only** : aucun outil n'expose une mutation. Le périmètre est volontairement réduit.
- **Pseudonymisation** : `humanix_team_module_performance` retourne des hashes SHA-256 (12 chars) au lieu d'emails. Pas de PII brute exposée à l'agent IA.
- **Pas de stockage local** : le MCP server n'écrit rien, ne cache rien, ne télémétrise rien.
- **Souverain par défaut** : votre tenant Humanix est sur Scaleway Paris ou en self-host AGPLv3. Le client MCP est de votre choix - notre recommandation pousse au local / souverain UE.
- **Logs sur stderr** : le protocole MCP utilise stdout pour les messages, donc nos logs sont sur stderr (capturés par votre client MCP dans son répertoire de logs habituel).

## Tests & développement

```bash
npm install
npm test         # tests unitaires Vitest
npm run lint     # tsc --noEmit
npm run dev      # tsx hot-reload
npm run build    # genère dist/
```

Coverage cible 80% sur la logique de `tools.ts` (validation arguments, dispatch, erreurs API).

## Licence

MIT - utilisable librement, intégrable dans tout outil tiers (commercial inclus) sans contagion AGPL. Le serveur MCP est volontairement publié sous une licence permissive pour maximiser l'écosystème souverain européen.

Le **cœur de Humanix Académie** reste sous AGPLv3 (cf. `LICENSE` à la racine du repo).

## Contribuer

PRs bienvenues ! En particulier :

- **Plus d'outils MCP** : exposer `humanix_certificates`, `humanix_phishing_templates`, `humanix_team_completion_history` (toujours read-only).
- **Outils write-with-confirmation** : MCP supporte des prompts de confirmation user - on pourrait ajouter `humanix_send_reminder` qui demande explicitement avant d'envoyer.
- **Bridges pour Ollama / Mistral** : un mini-projet de passerelle MCP→Ollama serait très utile pour la communauté FR.
- **Bench performance** : les appels concurrents sont actuellement sériels.

Cf. [CONTRIBUTING.md](../../CONTRIBUTING.md) à la racine du repo Humanix Académie.

## Roadmap

- **0.2** (juin 2026) : tools write-with-confirmation (envoyer relance, créer campagne)
- **0.3** : prompts MCP pré-construits (audit COMEX, rapport NIS2, plan remédiation)
- **0.4** : resources MCP (exposer les MDX modules comme ressources lisibles par l'agent)
- **1.0** : intégration de référence dans l'écosystème souverain (catalogue Mistral, partenariat LM Studio FR)

---

**Humanix-Cybersecurity** · Souverain par défaut, libre par conviction, branchable partout.
