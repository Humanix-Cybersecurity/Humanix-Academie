# Marketplace HumaniX Academy — Charte de sécurité et politique de contenu

> Position de principe : la marketplace HumaniX **ne peut pas être moins exigeante** que le reste de la plateforme. Sur la cybersécurité, le moindre laxisme tue la crédibilité — et peut introduire de vraies vulnérabilités. Cette page documente nos garde-fous techniques et nos règles éditoriales.

## 🎯 Principes directeurs

1. **Zéro code exécutable côté communauté.** Aucun module ne peut introduire de HTML, JS, MDX ou URL externe. Le contenu est exclusivement du **texte structuré**.
2. **Modération humaine obligatoire.** Aucun module ne devient public sans validation explicite par un SUPERADMIN HumaniX.
3. **Intégrité cryptographique.** Chaque module publié est signé par un hash SHA-256 calculé sur son payload normalisé. Toute altération invalide la signature.
4. **Audit trail complet.** Soumission, modération, installation, désinstallation : chaque action est journalisée dans `Event` avec horodatage et acteur.
5. **Isolation multi-tenant stricte.** Un module installé dans une organisation ne fuite jamais vers une autre.
6. **Permissions verrouillées.** Soumettre = ADMIN ou SUPERADMIN. Modérer = SUPERADMIN seul.
7. **Désinstallation non destructive.** Un module désinstallé ne supprime pas les progressions des apprenants (preuve de formation conservée pour conformité).

## 🛡️ Garde-fous techniques

### Validation du payload (côté serveur, à chaque soumission)

Le payload est validé par un schéma Zod strict (`lib/marketplace/schema.ts`) :

| Champ              | Contrainte                                                   |
| ------------------ | ------------------------------------------------------------ |
| Titre module       | 5–80 caractères, pas de `<` `>`                              |
| Description        | 20–400 caractères, pas de HTML                               |
| Slug               | regex `[a-z0-9-]`, 3–50 caractères                           |
| Emoji              | 1–4 caractères                                               |
| Catégorie          | Enum strict (10 valeurs autorisées)                          |
| Difficulté         | `easy` / `medium` / `hard`                                   |
| Langue             | `fr` uniquement (V1, contrôle qualité linguistique)          |
| Licence            | `CC_BY` ou `CC_BY_SA` (communauté), `PROPRIETARY` (officiel) |
| Nombre d'épisodes  | 1–10                                                         |
| Scénario d'épisode | 50–2000 caractères, pas de HTML                              |
| Choix par épisode  | 2–4, IDs uniques, ≥ 1 issue "good"                           |
| Quiz par épisode   | 1–5 questions, 2–4 choix, exactement 1 bonne réponse         |
| Points par choix   | -30 à +50                                                    |

Toute violation entraîne un refus immédiat avec liste détaillée des erreurs renvoyée à l'auteur.

### Sanitization

Le schéma rejette explicitement :

- Toute balise HTML (`<script>`, `<a>`, etc.)
- Les caractères `&` et `;` consécutifs (entités HTML)
- Les chevrons et esperluettes brutes dans les champs sensibles

React échappe par défaut tout texte injecté dans le DOM. **Aucun `dangerouslySetInnerHTML` n'est utilisé** sur du contenu marketplace.

### Hash d'intégrité (SHA-256)

À chaque sauvegarde de brouillon ou modification, le serveur calcule un **hash déterministe** du payload :

1. Sérialisation JSON canonique (clés triées récursivement)
2. SHA-256 hex (64 caractères)
3. Stocké dans `MarketplaceModule.contentHash`

Au moment de l'approbation, le modérateur recompute le hash et **rejette automatiquement** s'il a changé entre la soumission et la modération. Garantit qu'on ne peut pas approuver une version, puis muter le contenu silencieusement.

### Rate limiting

- **5 soumissions max par auteur par 24h.**
- Les soumissions sont scopées par `userId`, pas IP — empêche les contournements simples.
- Limite vérifiée côté serveur dans `submitForReview`.

### Permissions

| Action                                  | Rôle requis                            |
| --------------------------------------- | -------------------------------------- |
| Voir le marketplace (lecture catalogue) | ADMIN, SUPERADMIN                      |
| Soumettre / éditer un brouillon         | ADMIN, SUPERADMIN (auteur uniquement)  |
| Installer un module sur son tenant      | ADMIN, SUPERADMIN                      |
| Désinstaller un module                  | ADMIN, SUPERADMIN                      |
| **Modérer (approuver / refuser)**       | **SUPERADMIN seul**                    |
| Marquer un module comme "officiel"      | SUPERADMIN seul (via création directe) |

Vérifications faites dans chaque Server Action via `requireAdmin()` / `requireModerator()`.

### Isolation multi-tenant

- Une saison "marketplace" est créée avec `Saison.tenantId = currentTenantId`.
- Le filtrage côté apprenant utilise `WHERE tenantId IS NULL OR tenantId = currentTenantId`.
- Aucun moyen pour un tenant A de voir / installer / modifier un module installé sur tenant B.
- L'API REST publique (`/api/v1/saisons`) applique le même filtre via la clé d'API liée au tenant.

## 📜 Politique de contenu

### Critères d'approbation

Un module est approuvé si :

1. **Exactitude technique cyber.** Aucune information erronée, dépassée ou dangereuse. Le contenu doit refléter les bonnes pratiques actuelles (ANSSI, NIS2, CNIL, RGPD).
2. **Pédagogie.** Scénario crédible, choix non triviaux mais clairs, débrief apportant une vraie compréhension (pas juste un rappel de la "bonne réponse").
3. **Pas de marketing déguisé.** Aucune promotion d'un produit ou marque, aucune mention commerciale d'un éditeur (sauf pour citer un standard reconnu).
4. **Pas de contenu discriminatoire.** Pas de stéréotypes de genre, d'âge, d'origine, de profession ou de handicap.
5. **Originalité.** Contenu original ou citations explicites (avec source) de documents publics. Pas de plagiat.
6. **Format respecté.** Longueurs respectées, langue française correcte, pas de hors-sujet.

### Critères de refus

Un module est refusé si :

- Information cyber **erronée ou dangereuse** (ex : "donne ton mot de passe à l'IT pour vérifier")
- Promotion d'un outil commercial sans valeur pédagogique ajoutée
- Propos politiques, religieux, polémiques
- Contenu copié sans citation ni autorisation
- Format ne respecte pas les contraintes (longueur, structure)
- Doublon évident d'un module existant

Le motif de refus (≥ 10 caractères) est **toujours communiqué** à l'auteur, qui peut corriger et resoumettre.

### Cas particuliers

- **Phishing simulé / scénarios offensifs** : autorisés s'ils sont **encadrés pédagogiquement** (cadre légal, pas de tutoriel d'attaque exploitable).
- **Données fictives uniquement** : pas de mentions de vraies entreprises clientes ou collègues nommés.
- **Cas concrets** : autorisés s'ils sont anonymisés (entreprise X, ville Y).

## ⚖️ Cadre légal

### Propriété intellectuelle

- L'auteur **conserve la propriété intellectuelle** de son module.
- Il **accorde une licence** (CC-BY, CC-BY-SA) qui autorise les autres tenants à l'installer.
- HumaniX (la plateforme) n'acquiert **pas la propriété** du contenu communauté.
- Les modules officiels (isOfficial=true) sont sous licence propriétaire HumaniX.

### Responsabilité

- HumaniX **modère mais ne valide pas** la véracité technique au sens strict (pas un certificateur).
- L'utilisateur installant un module est responsable de son adéquation à son contexte.
- HumaniX peut **retirer un module** approuvé qui s'avère problématique a posteriori (mécanisme de signalement V2).

### RGPD

- Aucun module ne peut contenir de données personnelles d'individus identifiables.
- Les exemples doivent utiliser des prénoms factices, des sociétés génériques, des chiffres ronds.
- Les modules approuvés sont **publics par défaut** dans le marketplace inter-tenants.

## 🔄 Cycle de vie d'un module

```
  DRAFT (auteur édite)
    │
    │ submitForReview()
    ↓
  PENDING_REVIEW (file de modération SUPERADMIN)
    │
    ├── approveModule() → APPROVED (visible dans marketplace)
    │       │
    │       │ installModule()
    │       ↓
    │     Installé sur tenant N (Saison clonée scopée)
    │       │
    │       │ uninstallModule()
    │       ↓
    │     Désinstallé (Saison désactivée, progressions conservées)
    │
    └── rejectModule(reason) → REJECTED (auteur peut corriger + resoumettre)
```

## 🚨 Que faire en cas de problème ?

### Vous trouvez un module problématique

- Contactez le SUPERADMIN de votre instance HumaniX
- Fournissez : slug du module, nature du problème (technique / éthique / légal)
- Le SUPERADMIN peut passer le module en `DEPRECATED` (V2 : signalement self-service)

### Vous suspectez une vulnérabilité dans la marketplace

- **N'exploitez pas la vulnérabilité.**
- Signalez-la à : `security@humanix.fr` (à mettre en place)
- Programme bug bounty : V2

### Votre module est refusé

- Lisez le motif communiqué par le modérateur
- Corrigez les points soulevés
- Resoumettez (rate-limit : 5 soumissions par 24h)

## 📊 Métriques de transparence

Toute organisation peut, via l'API `/api/v1/saisons`, voir les modules installés sur son tenant avec :

- Hash d'intégrité
- Auteur
- Date d'approbation
- Modérateur ayant approuvé
- Licence

Les statistiques d'installation par module sont publiques.

## 🛣️ Roadmap sécurité

- ✅ V1 : modération humaine, hash SHA-256, isolation tenant, audit trail
- 🔜 V2 : signalement utilisateurs, signature numérique GPG des modules officiels, rétention logs 12 mois
- 🔜 V3 : bug bounty privé, audit externe annuel, certification d'intégrité publique (RFC 7517 JWKs)

---

_Document maintenu à jour avec le code source de la plateforme. Dernière révision : version v0.5._
