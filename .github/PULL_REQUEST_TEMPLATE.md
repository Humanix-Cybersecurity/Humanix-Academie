<!--
Merci de contribuer à Humanix Académie !

Avant de soumettre, vérifie :
- [ ] Tu as lu CONTRIBUTING.md
- [ ] Tu as signé tes commits avec DCO (-s)
- [ ] Ton code passe `npm run check` (lint + typecheck + tests)
- [ ] Tu as ajouté/mis à jour des tests si pertinent
- [ ] Tu as mis à jour la documentation si pertinent
-->

## Pourquoi ?

Quel problème cette PR résout, ou quelle valeur elle apporte. Lien vers
l'issue si applicable (ex: `Closes #123`).

## Comment ?

Approche choisie en 2-3 lignes. Mentionne les alternatives écartées si
pertinent.

## Type de changement

- [ ] Bugfix (corrige un comportement incorrect)
- [ ] Feature (ajoute une nouvelle fonctionnalité)
- [ ] Refactor (changement interne sans impact fonctionnel)
- [ ] Performance (amélioration mesurable des perfs)
- [ ] Documentation (uniquement de la doc)
- [ ] Build / CI / Tooling
- [ ] Breaking change (nécessite une migration utilisateur)

## Tests effectués

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:e2e` (si UI)
- [ ] Test manuel : décris le scénario testé

## Captures d'écran

Si la PR touche l'UI, ajoute **avant / après** :

| Avant | Après |
|---|---|
| (capture) | (capture) |

## Breaking changes

Si applicable, décris :
- Ce qui change pour les utilisateurs / self-hostés / API consumers
- La procédure de migration
- La compat ascendante (combien de versions on peut passer d'un coup)

## Dépendances

- [ ] Cette PR n'ajoute pas de nouvelle dépendance npm
- [ ] Si elle en ajoute, j'ai vérifié la licence (compatible AGPLv3)
- [ ] Si elle en ajoute, j'ai vérifié `npm audit` (zéro vuln HIGH/CRITICAL)

## Notes pour les reviewers

Toute information utile pour la review : zones sensibles, hypothèses, parties
encore à finaliser, etc.

## Checklist finale

- [ ] Mon titre suit Conventional Commits (ex: `feat(dashboard): ...`)
- [ ] Mes commits sont signés DCO
- [ ] J'ai mis à jour `CHANGELOG.md` si pertinent
- [ ] J'ai testé en mode démo (`DEMO_MODE=true`) si UI
