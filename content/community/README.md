# content/community/

Espace réservé aux **modules pédagogiques contribués par la communauté**.

> Tu veux ajouter un module ? C'est ici que ça se passe. La review se concentre sur la qualité pédagogique et la fiabilité technique du contenu.

## Différence avec `content/saisons/`

| Dossier              | Maintenu par                  | Périmètre                                                                                  |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `content/saisons/`   | Équipe Humanix (mainteneurs)  | Modules officiels de la **Community Edition**, alignés sur le catalogue marketing publié.  |
| `content/community/` | Contributeurs externes        | Modules proposés par la communauté, validés par review puis disponibles dans la marketplace. |

Les deux dossiers sont **sous AGPLv3** côté code et **CC BY-SA 4.0** côté contenu pédagogique (texte, scénarios, quiz). Cette double licence est documentée dans `LICENSES.md` à la racine.

## Structure d'un module

Chaque module = un fichier `.mdx` autonome. Convention de nommage : `<saison-slug>-<episode-slug>.mdx` ou un dossier `<slug>/index.mdx` si tu fournis des assets associés.

Exemple :

```
content/community/
├── README.md                          ← ce fichier
├── _template.mdx                      ← squelette pour démarrer
├── nis2-checklist-pme/
│   ├── index.mdx
│   └── poster-a3.png
└── deepfake-vocal-ceo-fraud.mdx
```

## Frontmatter obligatoire

```yaml
---
title: "Le faux SMS de la livraison"
durationMinutes: 6
persona: "tous-collaborateurs"            # tous | direction | rh | compta | dev | admin
objective: "Detecter un smishing en moins de 5 secondes"
xpReward: 50
difficulty: "easy"                         # easy | medium | hard
author:
  name: "Pseudo ou nom complet"
  url: "https://github.com/contributeur"   # optionnel
contentLicense: "CC-BY-SA-4.0"             # imposé pour la marketplace
scenario: |
  ...
choices: [ ... ]                           # min 3, max 6 (cf. _template.mdx)
debrief: ...
quiz: [ ... ]                              # min 3 questions
---
```

Le frontmatter doit être complet pour passer la review. Toute donnée personnelle réelle (nom, email, téléphone, SIREN) sera systématiquement retoquée.

## Workflow de review

1. **Fork le repo** + branche `feat/community-<saison>-<episode>`.
2. **Ajoute ton module** dans `content/community/`.
3. **Ouvre une PR** avec la checklist du template.
4. **Review** :
   - **Pédagogique** : 1 mainteneur + idéalement 1 contributeur expérimenté
   - **Technique** : frontmatter valide, MDX qui rend, pas de PII, pas de balise unsafe
   - **Qualité linguistique** : français correct, ton adapté au persona
5. **Merge** : ton module rejoint la marketplace après validation par l'équipe Humanix.

Délai cible : 7 jours ouvrés. Si plus long, ping `contact@humanix-cybersecurity.fr`.

## Plan-gating et accessibilité

Les modules `content/community/` sont chargeables par tous les plans **dès qu'ils sont validés** (palier Pro+ requis pour la marketplace, cf. `lib/plans.ts:FEATURE_MIN_PLAN.marketplace`). Pour les utilisateurs en plan inférieur, ils restent visibles en preview avec un badge "marketplace contributeur".

## Reconnaissance

Tout contributeur dont au moins 1 module est mergé entre dans la liste `/experts` publique avec son nom + bio + lien vers son repo.

À 5 modules mergés, tu es invité au programme **Maintainer** (cf. `CONTRIBUTING.md`).

## Licence du contenu pédagogique

Le contenu pédagogique (scénarios, quiz, debrief) est sous **CC BY-SA 4.0**. Cette licence permet :

- ✅ Réutilisation commerciale (par toi ou un tiers)
- ✅ Modification et adaptation
- ⚠️ **Redistribution sous la même licence** (ShareAlike)
- ⚠️ **Attribution obligatoire** (citer le contributeur original)

Si tu n'es pas d'accord avec cette licence, ne contribue pas dans ce dossier - utilise plutôt ton propre repo et fais-en la promotion via les Discussions.

---

**Humanix-Cybersecurity** · Souverain par défaut, libre par conviction, contribuable par design.
