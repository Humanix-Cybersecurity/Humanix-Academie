# Demo assets — partenaire externe (printemps 2026)

Assets de fallback utilises si la demo live rencontre un obstacle. Voir
[`../DEMO_DIGITAL_113.md`](../DEMO_DIGITAL_113.md) pour le runbook complet.

## Inventaire

| Fichier | Usage | Quand le sortir |
|---|---|---|
| `sample-vishing-script.json` | Script vishing pre-genere (template fake-direction Compta medium) | Si l'API Mistral est down ou met plus de 8 s a repondre |
| `screencast-demo-fallback.mp4` | Screencast 90 s pre-enregistre du flow demo complet | Si Next.js plante ou que docker-compose se prend les pieds |

## Comment regenerer le sample vishing

Pour rafraichir le fichier `sample-vishing-script.json` apres une modification
du prompt Mistral ou de la stack TTS :

1. Lancer le serveur Next.js : `npm run dev`
2. Aller sur `/admin/vishing`
3. Selectionner le template **fake-direction**, service **Compta**, difficulte **medium**
4. Cliquer "Generer"
5. Copier la reponse JSON depuis l'inspecteur reseau (`/api/admin/vishing/generate`)
6. Coller dans `sample-vishing-script.json` en gardant le bloc `_meta` au sommet

## Comment enregistrer le screencast fallback

A faire au moins 48 h avant partenaire externe :

1. Tenant demo `tenant-demo` initialise avec donnees fixtures
2. OBS Studio en mode "fenetre" : capture du browser uniquement (pas la barre de menu)
3. Sequence en 90 s :
   - 0-15 s : page `/lancement-oss` avec compte a rebours
   - 15-30 s : Claude Desktop avec l'icone MCP 🔧 visible, prompt `users at risk top 5`
   - 30-50 s : `/admin/vishing` generation + ecoute Piper TTS (couper l'audio si trop long)
   - 50-70 s : `/comparatif` chapitre Souverainete
   - 70-90 s : `/audit-flash` photo claire de la maturite
4. Export H.264 1080p, max 50 Mo, sauvegarde sur cle USB et NAS

## Note ethique

Les scripts vishing sont marques `FORMATION` dans leur `_meta` et leur
contexte. Ils ne doivent JAMAIS etre utilises comme template d'attaque
reelle. Le repo Humanix est public sous AGPLv3 — la transparence sur ces
scripts fait partie de notre engagement de souverainete par defaut.
