# Demo assets

Assets de fallback utilises si une demo live rencontre un obstacle.

## Inventaire

| Fichier | Usage | Quand le sortir |
|---|---|---|
| `sample-vishing-script.json` | Script vishing pre-genere (template fake-direction Compta medium) | Si l'API Mistral est down ou met plus de 8 s a repondre |

## Comment regenerer le sample vishing

Pour rafraichir le fichier `sample-vishing-script.json` apres une modification
du prompt Mistral ou de la stack TTS :

1. Lancer le serveur Next.js : `npm run dev`
2. Aller sur `/admin/vishing`
3. Selectionner le template **fake-direction**, service **Compta**, difficulte **medium**
4. Cliquer "Generer"
5. Copier la reponse JSON depuis l'inspecteur reseau (`/api/admin/vishing/generate`)
6. Coller dans `sample-vishing-script.json` en gardant le bloc `_meta` au sommet

## Note ethique

Les scripts vishing sont marques `FORMATION` dans leur `_meta` et leur
contexte. Ils ne doivent JAMAIS etre utilises comme template d'attaque
reelle. La transparence sur ces scripts fait partie de l'engagement de
souverainete par defaut du projet.
