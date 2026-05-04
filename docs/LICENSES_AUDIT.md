# Audit des licences des dépendances

> Vérification de compatibilité de toutes les dépendances npm avec la licence
> AGPLv3 d'Humanix Académie Community Edition.
>
> **Dernière exécution** : 3 mai 2026 (à refaire à chaque ajout de dépendance majeure).
> **Outil** : `npx license-checker` v25.0+
> **Résultat** : ✅ **Aucune incompatibilité détectée**.

---

## Synthèse

Sur **549 packages** scannés (production + devDependencies + transitif) :

| Licence       | Nombre | Compatibilité AGPLv3                                                                                                               |
| ------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| MIT           | 463    | ✅ Permissive, totalement compatible                                                                                               |
| ISC           | 31     | ✅ Permissive, équivalente à MIT                                                                                                   |
| Apache-2.0    | 29     | ✅ Permissive avec patent grant                                                                                                    |
| BSD-2-Clause  | 12     | ✅ Permissive                                                                                                                      |
| BSD-3-Clause  | 6      | ✅ Permissive                                                                                                                      |
| MPL-2.0       | 2      | ✅ Compatible weak copyleft (Mozilla)                                                                                              |
| Python-2.0    | 1      | ✅ Permissive                                                                                                                      |
| CC0-1.0       | 1      | ✅ Public domain                                                                                                                   |
| BlueOak-1.0.0 | 1      | ✅ Copyfree, équivalente MIT                                                                                                       |
| 0BSD          | 1      | ✅ Public domain équivalent                                                                                                        |
| MIT AND ISC   | 1      | ✅ Double licence permissive                                                                                                       |
| UNLICENSED    | 1      | ℹ️ C'est notre propre projet (`humanix-academie@0.3.0`) — corrigé en ajoutant `"license": "AGPL-3.0-or-later"` dans `package.json` |

**Aucune dépendance** sous licence GPLv2/v3 stricte, AGPL, BUSL, SSPL, ou
licence non-OSI qui poserait un problème de compatibilité.

---

## Détail des dépendances notables

### MPL-2.0 (2 packages — compat OK)

- **`axe-core@4.11.3`** — moteur d'audit accessibilité (a11y testing)
- **`next-mdx-remote@5.0.0`** — rendu MDX (modules pédagogiques)

La MPL-2.0 (Mozilla Public License) est explicitement compatible avec
l'AGPLv3 selon la [FSF License List](https://www.gnu.org/licenses/license-list.html#MPL-2.0).
Elle est "weak copyleft" : ne contamine que les fichiers MPL eux-mêmes,
pas le projet entier.

### Apache-2.0 (29 packages — compat OK)

L'Apache-2.0 inclut un **patent grant** explicite, ce qui est positif pour
nos contributeurs. Compatibilité AGPLv3 confirmée par la FSF.

Exemples : `tslib`, `caniuse-lite`, `oauth4webapi`, etc.

---

## Comment refaire l'audit

```bash
cd humanix-academie

# Synthèse rapide
npx license-checker --summary

# Liste détaillée
npx license-checker --csv > licenses.csv

# Vérifier qu'AUCUN package n'est dans une licence interdite
npx license-checker \
  --excludePackages "humanix-academie" \
  --failOn 'GPL-2.0;GPL-3.0;BUSL-1.1;SSPL-1.0;Commons-Clause'
# Si exit code != 0, il y a un problème → bloquer l'ajout de la dep
```

---

## Politique d'ajout de dépendances

Pour toute nouvelle dépendance ajoutée au projet (PR ou commit direct) :

### ✅ Licences acceptées sans question

- MIT, ISC, BSD (2-Clause, 3-Clause), 0BSD, BlueOak-1.0.0
- Apache-2.0 (avec patent grant)
- MPL-2.0 (weak copyleft compatible)
- CC0-1.0 (public domain)
- WTFPL, Unlicense (avec prudence sur le légal)

### ⚠️ Licences à valider au cas par cas

- LGPL-2.1, LGPL-3.0 : compatible mais ajoute des contraintes de linking
- MS-PL : peut poser problème selon le contexte

### ❌ Licences interdites (ne PAS ajouter au projet)

- **GPL-2.0 strict** : incompatible avec AGPLv3
- **GPL-3.0 strict** : compatible techniquement mais redondant
- **BUSL-1.1** : pas open source au sens OSI
- **SSPL-1.0** : pas open source au sens OSI
- **Commons Clause** : restriction commerciale non-OSS
- **Elastic License v2** : pas open source au sens OSI
- **Confluent Community License** : pas open source au sens OSI
- **JSON License** : "shall be used for Good, not Evil" — ambigüe
- **Tout proprietaire** : par définition incompatible

### En cas de doute

1. Vérifier sur la [FSF License List](https://www.gnu.org/licenses/license-list.html)
2. Vérifier sur la [OSI License List](https://opensource.org/licenses)
3. En cas d'urgence, ouvrir une issue GitHub avec le tag `licensing` pour
   discussion communautaire
4. Pour validation juridique formelle : `contact@humanix-cybersecurity.fr`

---

## Risque résiduel

Aucun risque légal identifié à ce jour. L'audit a été fait dépendances
production + devDependencies + transitive. Il sera refait :

- À chaque release majeure d'Humanix
- À chaque ajout de dépendance avec licence non triviale (MPL, LGPL, etc.)
- Tous les 6 mois en routine
- Automatiquement par la CI (étape `license-check` dans `.github/workflows/`)

---

## Annexe — fichier NOTICE (à venir)

Pour respecter l'esprit de la clause Apache-2.0 §4(d), un fichier `NOTICE`
sera généré à chaque release majeure listant tous les composants tiers et
leur copyright respectif. Cette pratique est optionnelle mais recommandée
pour les éditeurs OSS responsables.

Génération :

```bash
npx license-checker --csv \
  --customPath licenses-template.json \
  > NOTICE.csv
# Puis transformation manuelle ou via script en NOTICE.md
```

À planifier pour la release v1.1 (juin 2026).

---

_Audit réalisé selon les bonnes pratiques OpenChain ISO/IEC 5230:2020._
