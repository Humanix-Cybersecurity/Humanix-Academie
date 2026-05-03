# Plugin Outlook — Humanix Académie

Add-in Office qui ajoute un bouton **« Signaler à Humanix »** dans le ruban Outlook. Le clic envoie le mail au backend Humanix → +5 coins pour l'utilisateur, événement `phishing_external_report` dans le dashboard, webhook `phishing.reported` déclenché.

## Architecture

```
Outlook (web/desktop/mobile)
   └── Lit manifest.xml (déposé dans Microsoft 365 admin center ou AppSource)
       └── Charge taskpane : https://humanix-cybersecurity.fr/outlook/taskpane.html
           └── POST https://humanix-cybersecurity.fr/api/phishing/report
                  ↓
              Next.js (CORS strict allowlist Outlook)
                  ↓
              BDD Event + Webhook + +5 coins
```

## Fichiers livrés

| Fichier | Rôle |
|---|---|
| `outlook-addin/manifest.xml` | Manifeste Office Add-in (à finaliser : GUID, icônes) |
| `public/outlook/taskpane.html` | Page chargée dans Outlook (Office.js + UI) |
| `public/outlook/icon-{16,32,64,80,128}.png` | **À créer** : icônes du bouton (déclinaisons logo Humanix) |
| `app/api/phishing/report/route.ts` | Endpoint qui reçoit les signalements (CORS Outlook, rate limit, audit, +coins, webhook) |

## Étapes pour finaliser et publier

### 1. Générer un GUID unique pour le manifest

Remplacer `00000000-0000-0000-0000-000000000000` par un vrai GUID :

```bash
node -e "console.log(crypto.randomUUID())"
```

Coller le résultat dans la balise `<Id>` de `manifest.xml`.

### 2. Créer les icônes

Décliner le logo `public/logo-humanix-academie-512.png` aux tailles 16, 32, 64, 80, 128 pixels et déposer dans `public/outlook/`. Format PNG transparent. Pour générer rapidement :

```bash
# avec ImageMagick
for size in 16 32 64 80 128; do
  magick public/logo-humanix-academie-512.png -resize ${size}x${size} public/outlook/icon-${size}.png
done
```

### 3. Tester en local (side-loading)

Outlook Web :
1. Ouvrir Outlook → Paramètres → Mes compléments → Personnalisé → Importer le manifest
2. Le bouton apparaît dans le ruban d'un mail ouvert

Outlook Desktop :
1. Activer Developer Mode dans `regedit` (HKCU\Software\Microsoft\Office\16.0\WEF\Developer)
2. Pointer vers le manifest local

### 4. Distribution

**Option A — Internal only (recommandé pour PME)**

Microsoft 365 Admin Center → **Settings → Integrated apps → Upload custom apps → Office Add-in** → Upload `manifest.xml` → Assigner aux groupes/utilisateurs cibles.

**Option B — AppSource (Microsoft Store)**

Plus long (validation Microsoft 4-8 semaines), mais visibilité publique. Documentation : https://learn.microsoft.com/office/dev/store/submit-to-appsource-via-partner-center

### 5. Configurer le backend

Pas de config supplémentaire requise — la route `/api/phishing/report` est déjà active en production avec :
- CORS allowlist : outlook.office.com, outlook.office365.com, outlook.live.com
- Rate limit 30 signalements/h/user
- Authn par email professionnel (l'user doit exister en BDD)

## Sécurité

- **CORS strict** : seules les origines Outlook officielles sont autorisées
- **Pas d'auth NextAuth** dans la route (impossible depuis l'add-in) : on identifie l'user par son email pro envoyé dans le payload, vérifié en BDD
- **Rate limit anti-abuse** : 30 reports/heure/user
- **Pas de stockage du body complet** : on ne sauvegarde que les métadonnées (from, subject, receivedAt) + longueur du body. Le contenu lui-même n'est pas persisté pour ne pas dupliquer les données mail dans notre BDD (RGPD principe de minimisation).
- **Webhook fire-and-forget** : si le webhook tenant échoue, le signalement reste enregistré

## Effets côté Humanix Académie

Quand un user signale :
- ✅ +5 coins ajoutés instantanément
- ✅ Événement `phishing_external_report` dans le dashboard /admin/business (visible en Live Attack Map)
- ✅ Webhook `phishing.reported` envoyé sur les canaux Slack/Teams configurés
- ✅ riskScore individuel rafraîchi (+5 typiquement, le user devient un "signaleur")

## TODO V2 (post-publication)

- [ ] Bouton « Mauvaise idée — annuler signalement » dans les 30 secondes (anti-clic accidentel)
- [ ] Affichage du score user après signalement (« vous êtes le 3ᵉ signaleur du mois »)
- [ ] Mode "spear-phishing detected" : si le mail correspond à un template piégé en cours de campagne (corrélation avec PhishingResult), feedback éducatif immédiat
- [ ] Support Gmail (manifeste équivalent Google Workspace Add-on)
