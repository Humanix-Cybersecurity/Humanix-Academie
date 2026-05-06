# Convention de branches

> **TL;DR** : on ne pousse jamais directement sur `main`. Tout passe par PR
> depuis `develop` (ou une branche feature) → vers `testing` → vers `main`.

## Schéma

```
                              merge PR (review)
feat/xxx ────► develop ──────────────────────────► testing ───────► main
   ↑                                                  ↑              ↑
   │                                                  │              │
"branche dev jetable"           "QA / pre-prod stable"    "production / release"
```

| Branche      | Rôle                                                | Push direct |
|--------------|-----------------------------------------------------|-------------|
| `main`       | Code de production. Reflète ce qui tourne en live.  | ❌ Jamais   |
| `testing`    | Recette / pré-prod. Stabilisation avant `main`.     | ❌ Jamais   |
| `develop`    | Intégration continue des features en cours.         | ❌ Jamais   |
| `feat/xxx`   | Branche de travail individuelle (jetable).          | ✅ Auteur   |
| `fix/xxx`    | Correctif pré-merge. Idem.                          | ✅ Auteur   |
| `chore/xxx`  | Maintenance, refacto, doc.                          | ✅ Auteur   |

## Workflow standard

1. **Créer une branche feature depuis `develop`** :

   ```bash
   git checkout develop
   git pull
   git checkout -b feat/ma-feature
   ```

2. **Travailler, commiter, pousser la branche feature**.

3. **Ouvrir une PR vers `develop`** :

   ```bash
   gh pr create --base develop --title "feat: ma feature"
   ```

4. **Une fois mergé sur `develop`**, on stabilise sur `testing` :
   - Périodiquement, ouvrir une PR `develop` → `testing` (release candidate).
   - QA, recette, tests d'intégration.

5. **Mettre en production** : PR `testing` → `main`.
   - Tag de release après merge (`v0.x.y`).

## Signature DCO

Tous les commits doivent être signés DCO (Developer Certificate of Origin) :

```bash
git commit -s -m "votre message"
# ou en chaîne :
git rebase --signoff main
```

Le check CI `DCO signed-off-by check` rejette les commits non signés.

## Protection des branches

**Statut actuel** : la branch protection GitHub native n'est pas activée car
le repo est privé sur un plan GitHub Free (la feature est réservée aux repos
publics ou aux plans GitHub Team / Pro / Enterprise).

Options pour l'activer :
1. **Rendre le repo public** (cohérent avec le projet OSS / AGPL).
2. **Upgrade vers GitHub Team** (4 \$/utilisateur/mois).
3. Migrer le repo sur GitLab (qui propose la protection gratuite sur le plan Free).

En attendant, la convention ci-dessus est appliquée par discipline. Les
reviewers PR doivent vérifier qu'aucun commit n'arrive directement sur
`main` / `develop` / `testing` sans passer par une PR.

## Cas particulier : hotfix prod

Pour un correctif urgent en production :

```bash
git checkout main
git checkout -b fix/hotfix-xxx
# correction + commit signoff
gh pr create --base main --title "fix: hotfix xxx"
```

Après merge sur `main`, **rebase ou cherry-pick le hotfix** sur `develop` et
`testing` pour les garder synchronisées :

```bash
git checkout develop && git cherry-pick <sha-hotfix>
git checkout testing && git cherry-pick <sha-hotfix>
```
