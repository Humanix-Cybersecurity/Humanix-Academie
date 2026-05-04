# humanix-mcp-server

Serveur **MCP (Model Context Protocol)** pour exposer les données Humanix Académie aux agents IA modernes (Claude Desktop, Mistral via passerelle, GPT via passerelle).

> Premier — et à ce jour seul — MCP server natif d'une plateforme de Security Awareness Training / Human Risk Management.

## À quoi ça sert

Vous êtes RSSI ou consultant cyber. Vous utilisez Claude Desktop ou un autre client MCP pour rédiger des rapports, préparer des COMEX, ou auditer une démarche cyber. Avec ce connecteur :

- **vous demandez à Claude** : « Quels sont les 5 utilisateurs les plus à risque ce mois-ci chez Humanix ? »
- Claude appelle `humanix_users_at_risk(limit=5)` via MCP
- vous obtenez les réponses **dans la conversation**, sans copier-coller

Le serveur expose **4 outils read-only** :

| Outil MCP                       | Usage                                                                       |
| ------------------------------- | --------------------------------------------------------------------------- |
| `humanix_evidence_export`       | Preuves vivantes par framework (ISO 27001, NIS2, RGPD, ANSSI HG, NIST CSF) |
| `humanix_users_at_risk`         | Top N utilisateurs avec score de risque humain le plus élevé                |
| `humanix_compliance_score`      | Score conformité humaine par framework, breakdown par contrôle              |
| `humanix_recent_campaigns`      | Campagnes phishing/awareness des N derniers jours                           |

**Read-only par design** : un agent IA n'a pas l'autorité humaine pour modifier l'état d'un programme de sensibilisation. Les écritures restent dans `/admin`.

## Pré-requis

- Node.js 20+
- Une clé API Humanix (plan Essentielle ou supérieur — `/admin/api-keys`)
- Un client MCP : Claude Desktop, Cursor, mcp-cli, ou tout autre client compatible MCP 1.0

## Installation rapide

### Option A — npx (recommandé)

```bash
npx humanix-mcp-server
```

### Option B — installation locale

```bash
git clone https://github.com/humanix-cybersecurity/humanix-academie
cd humanix-academie/connectors/mcp-server
npm install
npm run build
node dist/index.js
```

## Configuration Claude Desktop

Édite `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows) :

```json
{
  "mcpServers": {
    "humanix": {
      "command": "npx",
      "args": ["humanix-mcp-server"],
      "env": {
        "HUMANIX_API_KEY": "hk_xxxxxxxxxxxxxxxx",
        "HUMANIX_BASE_URL": "https://votre-tenant.humanix-cybersecurity.fr"
      }
    }
  }
}
```

Redémarre Claude Desktop. Tu vois apparaître l'icône 🔧 dans le composeur de message : Humanix est branché.

### Variables d'environnement

| Variable             | Obligatoire | Défaut                                            | Description                        |
| -------------------- | ----------- | ------------------------------------------------- | ---------------------------------- |
| `HUMANIX_API_KEY`    | ✅          | —                                                 | Clé API Humanix (commence par `hk_`) |
| `HUMANIX_BASE_URL`   | ❌          | `https://app.humanix-cybersecurity.fr`            | URL de votre instance Humanix      |

## Exemples de prompts (côté Claude Desktop)

> Donne-moi le score de conformité humaine NIS2 et explique-moi les 3 contrôles les plus en retard.

> Liste les 10 utilisateurs les plus à risque, et propose-moi un plan de remédiation par profil.

> Prépare-moi un slide COMEX synthèse des campagnes phishing du dernier trimestre, focus sur le service Compta.

> Exporte les preuves OSCAL ISO 27001:2022 du tenant et propose-moi un mapping vers les contrôles CIS v8.

## Sécurité

- **Auth** : tous les appels portent un `Authorization: Bearer <HUMANIX_API_KEY>`. Les clés sont gérées dans `/admin/api-keys` avec rate limit, audit trail et révocation immédiate.
- **Read-only** : aucun outil n'expose une mutation. Le périmètre est volontairement réduit.
- **Pas de stockage local** : le MCP server n'écrit rien, ne cache rien, ne télémétrise rien.
- **Souverain par défaut** : votre tenant Humanix est sur Scaleway Paris ou en self-host AGPLv3. Ce connecteur n'introduit pas de dépendance Cloud Act.
- **Logs sur stderr** : le protocole MCP utilise stdout, donc les logs sont sur stderr (capturés par Claude Desktop dans `~/Library/Logs/Claude/mcp*.log`).

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

MIT — utilisable librement, intégrable dans tout outil tiers (commercial inclus) sans contagion AGPL. Le serveur MCP est volontairement publié sous une licence permissive pour maximiser l'écosystème.

Le **cœur de Humanix Académie** reste sous AGPLv3 (cf. `LICENSE` à la racine du repo).

## Contribuer

PRs bienvenues ! En particulier :

- **Plus d'outils MCP** : exposer `humanix_certificates`, `humanix_phishing_templates`, `humanix_module_recommendations` (toujours read-only).
- **Outils write-with-confirmation** : MCP supporte des prompts de confirmation user — on pourrait ajouter `humanix_send_reminder` qui demande explicitement avant d'envoyer.
- **Bench performance** : les appels concurrents sont actuellement sériels.

Cf. [CONTRIBUTING.md](../../CONTRIBUTING.md) à la racine du repo Humanix Académie.

## Roadmap

- **0.2** (juin 2026) : ajout d'outils write-with-confirmation (envoyer relance, créer campagne)
- **0.3** : prompts MCP pré-construits (audit COMEX, rapport NIS2, plan remédiation)
- **0.4** : resources MCP (exposer les MDX modules comme ressources lisibles par l'agent)
- **1.0** : co-marketing avec Anthropic dans la galerie MCP officielle

---

**Humanix-Cybersecurity** · Souverain par défaut, libre par conviction, branchable partout.
