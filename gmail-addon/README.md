<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Add-on Gmail Humanix — « Signaler un phishing »

Parité fonctionnelle avec le plugin Outlook : un bouton « Signaler comme
phishing » dans Gmail qui transmet les **métadonnées** du mail suspect à
votre instance Humanix (`POST /api/phishing/report`). L'employé gagne des
points, le RSSI reçoit l'alerte (webhook + dashboard).

Contrairement à Outlook (manifest XML chargé dans le client), un add-on Gmail
est un **Google Workspace Add-on** qui tourne dans Google Apps Script, côté
Google. Il n'y a donc rien à héberger côté Humanix : on déploie le script
ci-dessous dans votre tenant Google Workspace.

> Minimisation RGPD : seules les métadonnées (expéditeur, objet, longueur)
> sont envoyées. Le corps du mail n'est jamais transmis ni stocké.

## Fichiers

- `appsscript.json` — manifest du Workspace Add-on (scopes + déclencheurs).
- `Code.gs` — logique de l'add-on (carte contextuelle + envoi du signalement).

## Pré-requis

- Un compte **Google Workspace** avec les droits d'administration (pour un
  déploiement à toute l'organisation) ou un compte simple (pour un test perso).
- Le domaine de votre instance Humanix. En self-host, éditez la constante
  `HUMANIX_BASE_URL` en tête de `Code.gs`.

## Déploiement (test individuel)

1. Ouvrez https://script.google.com → **Nouveau projet**.
2. Collez le contenu de `Code.gs` dans `Code.gs`.
3. Menu ⚙ **Paramètres du projet** → cochez « Afficher le fichier manifeste
   `appsscript.json` », puis collez le contenu de `appsscript.json`.
4. Adaptez `HUMANIX_BASE_URL` dans `Code.gs` si self-host.
5. **Déployer** → **Tester les déploiements** → type **Module complémentaire
   Google Workspace** → **Installer**.
6. Ouvrez Gmail, ouvrez un email : l'add-on Humanix apparaît dans le volet
   latéral droit avec le bouton « Signaler comme phishing ».

## Déploiement (toute l'organisation)

Via le **Google Workspace Marketplace SDK** (projet Google Cloud) :

1. Associez le projet Apps Script à un projet Google Cloud standard.
2. Activez le **Google Workspace Marketplace SDK**.
3. Configurez la fiche (App Configuration → Add-on, OAuth scopes ci-dessus),
   puis publiez en **diffusion interne** (privée à votre domaine).
4. Dans la **console d'admin Google** → Apps → Marketplace → installez l'add-on
   pour toute l'organisation ou une UO ciblée.

Doc Google : https://developers.google.com/workspace/add-ons/gmail

## Développement avec clasp (optionnel)

```bash
npm i -g @google/clasp
clasp login
clasp create --type standalone --title "Humanix - Signaler un phishing"
# copiez appsscript.json + Code.gs dans le dossier, puis :
clasp push
```

## Sécurité

- L'authentification se fait par **email professionnel** (`Session.getActiveUser`)
  : l'utilisateur doit exister et être actif sur Humanix, sinon `403`.
- Rate limit côté serveur : **30 signalements/heure/utilisateur**.
- Aucun secret n'est stocké dans l'add-on (pas de clé API) : l'endpoint
  identifie l'utilisateur par son email Workspace.
