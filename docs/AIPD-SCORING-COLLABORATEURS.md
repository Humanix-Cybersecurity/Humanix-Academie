# Analyse d'appui à l'AIPD — Notation du risque cyber des collaborateurs

> **Ce document n'est PAS l'AIPD de Humanix-Cybersecurity.** C'est l'analyse
> que Humanix fournit à ses clients pour qu'ils mènent la leur.
>
> **Pourquoi cette distinction.** Les CGV positionnent Humanix en
> **sous-traitant** au sens de l'article 28 du RGPD ; le Client est
> responsable du traitement. L'AIPD de l'article 35 incombe donc au
> **responsable**, c'est-à-dire à chaque client. L'obligation de Humanix est
> de l'**assister** (art. 28.3.f) — ce que fait ce document, en décrivant le
> traitement avec une précision qu'aucun client ne pourrait atteindre seul,
> puisqu'elle vient du code.

> **État : TRAME À COMPLÉTER ET À VALIDER.** Ce document décrit le traitement
> tel que le code l'exécute réellement au 2026-08-14. Les sections marquées
> **⬜ À TRANCHER** appellent une décision de la direction, et l'ensemble doit
> être relu par un conseil juridique avant d'être opposable.
>
> Rédigé selon la méthode AIPD de la CNIL (contexte, principes fondamentaux,
> risques, validation).

## Pourquoi cette AIPD est nécessaire

L'article 35.3.a du RGPD vise « l'évaluation systématique et approfondie
d'aspects personnels concernant des personnes physiques, qui est fondée sur un
traitement automatisé ».

La CNIL considère qu'une AIPD est requise dès que **deux** de ses neuf critères
sont réunis. Ce traitement en réunit au moins trois :

| Critère CNIL           | Pourquoi il s'applique ici                                       |
| ---------------------- | ---------------------------------------------------------------- |
| Évaluation ou notation | Score 0-100 et verdict catégoriel par personne                   |
| Personnes vulnérables  | Salariés, en lien de subordination avec le destinataire du score |
| Croisement de données  | Progression pédagogique × résultats de phishing × groupe métier  |

**Aucune AIPD n'avait été menée au 2026-08-14.** C'est le premier constat de ce
document, et le motif de sa rédaction.

---

## 1. Description du traitement

### 1.1 Finalités

Le traitement poursuit deux finalités qu'il faut distinguer, car elles n'ont ni
la même base légale ni la même intensité :

1. **Suivre la progression pédagogique** d'un apprenant (modules suivis, scores
   de quiz). Finalité attendue d'une plateforme de formation.
2. **Évaluer l'exposition cyber individuelle d'un collaborateur et la restituer
   à son employeur**, y compris sous forme nominative, exportable et
   ordonnée. C'est cette seconde finalité qui déclenche l'AIPD.

### 1.2 Données traitées

Sources du score, telles que `lib/risk-score.ts` les lit :

| Donnée                            | Origine          | Remarque                                      |
| --------------------------------- | ---------------- | --------------------------------------------- |
| Modules complétés, scores de quiz | `Progress`       | `score`, `bestQuizScorePct`, `completedAt`    |
| Résultats de phishing simulé      | `PhishingResult` | **les 10 derniers** : cliqué, soumis, signalé |
| Groupe métier                     | `Group`          | compta, RH, dev, comex…                       |
| Saisons obligatoires du tenant    | `SaisonConfig`   | définit la couverture attendue                |

### 1.3 Logique de calcul

Score sur 100, où **100 = risque faible**. Un socle est ajusté par des
composantes pondérées `high` / `medium` / `low`, puis converti en verdict :

| Score | Verdict interne | Libellé affiché |
| ----- | --------------- | --------------- |
| ≥ 80  | `excellent`     | Excellent       |
| ≥ 60  | `bon`           | Bon             |
| ≥ 40  | `a_surveiller`  | À surveiller    |
| < 40  | `a_risque`      | **Vulnérable**  |

⚠️ **Deux points appellent une attention particulière.**

Le libellé **« Vulnérable »** qualifie une personne, pas un comportement. En
contexte de travail, cette formulation est difficile à défendre : elle décrit
un état supposé de l'individu plutôt qu'un constat sur une action.
**⬜ À TRANCHER** : reformuler, par exemple « Sensibilisation à renforcer ».

Le score est **pondéré par le métier** : `lib/risk-score.ts` ligne 202 indique
qu'un collaborateur de « compta/finance » est _pénalisé plus_ qu'un profil
générique. La justification opérationnelle est claire — ces fonctions sont plus
ciblées par la fraude. Mais deux personnes au comportement identique
obtiennent un score différent selon leur service, ce que l'AIPD doit assumer
explicitement et que l'information aux personnes doit énoncer.

### 1.4 Destinataires

| Destinataire                    | Accès                                                                                          | Support                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| L'employeur (rôles ADMIN, RSSI) | Score et verdict **nominatifs**                                                                | `/admin/users/at-risk`, `/admin/business` |
| L'employeur                     | **Export** de la liste                                                                         | `/api/admin/users/at-risk/export`         |
| Les collègues                   | Classement **nominatif sur les XP** obtenus en complétant des modules — **pas** le `riskScore` | `/classement`                             |
| Humanix (SUPERADMIN)            | Accès technique                                                                                | Support et exploitation                   |

### 1.5 Conséquences pour la personne

Un score bas déclenche des **relances ciblées** via
`/api/admin/users/at-risk/remind`, dont le code note qu'il _« bypasse
volontairement le filtre des 7 j »_ — la personne signalée peut donc être
relancée plus souvent que les autres.

**TRANCHÉ le 2026-08-14 : l'article 22 n'est pas engagé, sous une condition
que les CGV rendent contraignante.**

Le score ne déclenche aujourd'hui que des relances de sensibilisation. Ce n'est
pas une décision produisant des effets juridiques ou significatifs au sens de
l'article 22.

Pour que cela reste vrai indépendamment de l'usage qu'en ferait un client, les
CGV interdisent désormais contractuellement d'utiliser le score comme élément
d'une décision individuelle — évaluation professionnelle, mesure
disciplinaire, promotion, rémunération.

C'est le choix prudent : il coûte une clause, il ferme une dérive, et il se
plaide bien. Si un client souhaite malgré tout fonder des décisions sur ce
score, il sort du cadre contractuel et devient seul responsable d'organiser
l'intervention humaine que l'article 22.3 exige.

Question résiduelle pour le Client : Entretien, formation imposée, mention en évaluation
annuelle ? La réponse détermine si l'article 22 du RGPD — décision
automatisée produisant des effets significatifs — est engagé, et donc si un
droit à l'intervention humaine doit être organisé.

### 1.6 Durée de conservation

**TRANCHÉ le 2026-08-14 : aucune mesure nouvelle n'est nécessaire, et c'est
une bonne surprise du code.**

Vérification faite, **il n'existe aucun historique individuel de notation**.

`RiskScoreSnapshot` est agrégé **par tenant** : ses colonnes sont `userCount`,
`avgScore` et `atRiskCount`. Aucune donnée personnelle n'y figure — ce sont des
statistiques d'organisation, alimentées quotidiennement par le cron
`risk-snapshot` pour tracer une tendance.

La seule donnée personnelle est le **score courant**, porté par
`User.riskScore`. Il est écrasé à chaque recalcul et disparaît avec
l'utilisateur, y compris lors de l'anonymisation opérée par la purge RGPD.

Autrement dit : la notation d'un collaborateur ne laisse **aucune trace
rétrospective**. On ne peut pas reconstituer qu'une personne était mal notée il
y a six mois. C'est une limitation forte de l'intrusivité, obtenue par
conception, et elle doit être portée au crédit du traitement dans la mise en
balance.

⚠️ **À préserver.** Ajouter un jour un historique par utilisateur — pour tracer
une progression individuelle, par exemple — changerait la nature du traitement
et devrait repasser par ce document.

---

## 2. Nécessité et proportionnalité

### 2.1 Base légale — TRANCHÉ : intérêt légitime, pas NIS2

**Décision du 2026-08-14.**

La base invoquée jusqu'ici était **NIS2**. Elle ne tient pas, pour deux
raisons cumulatives.

D'abord, la directive (UE) 2022/2555 impose à son article 21.2.g des pratiques
d'hygiène cyber et de la **formation**. Elle n'impose ni la notation
individuelle, ni sa restitution nominative, ni un classement. Or l'article
6.1.c du RGPD exige que l'obligation légale invoquée impose _effectivement_ le
traitement en cause.

Ensuite, NIS2 oblige **l'entité** — le Client — et non son fournisseur.

**Base retenue : l'intérêt légitime du Client (art. 6.1.f).** Deux conséquences
que le Client doit assumer, et que Humanix doit lui permettre d'assumer :

- une **mise en balance documentée** (intérêt poursuivi, nécessité, impact,
  attentes raisonnables des personnes) — Humanix en fournit la trame ci-dessous ;
- un **droit d'opposition** (art. 21) ouvert à chaque collaborateur, qu'il faut
  pouvoir exercer concrètement.

NIS2 ne disparaît pas pour autant : elle devient le **contexte** qui nourrit la
mise en balance. Un employeur soumis à NIS2 a un intérêt d'autant plus légitime
à mesurer l'efficacité de la sensibilisation qu'il en répond juridiquement.

### 2.2 Minimisation

Le score se calcule sur les **10 derniers** résultats de phishing, ce qui borne
la rétroactivité. C'est un point favorable, à conserver et à documenter comme
une mesure de minimisation délibérée.

### 2.3 Le classement nominatif

**⬜ À TRANCHER — mais moins urgent qu'il n'y paraissait.**

Rectification d'une première version de ce document, qui présentait ce point
comme le plus exposé : **c'était inexact**. `/classement` n'ordonne pas sur le
`riskScore`. Il classe sur les **XP accumulés en complétant des modules**
pendant un challenge, et affiche nom, service et nombre d'épisodes
(`lib/challenge.ts`, `getChallengeIndividualRanking`).

C'est un palmarès de **mérite**, pas de vulnérabilité. Classer des collègues
sur ce qu'ils ont accompli n'a pas la portée de les classer sur leur faiblesse
supposée, et la pratique est courante et généralement admise en contexte de
challenge interne.

Ce qui reste néanmoins à arbitrer :

- la participation n'est **pas optionnelle** — tout collaborateur actif ayant
  complété au moins un module y figure ;
- le **service** est affiché à côté du nom, ce qui élargit l'information au-delà
  de la seule performance individuelle ;
- un collaborateur systématiquement en bas de classement reste identifiable
  comme tel par ses collègues, même si le critère est positif.

Une option de retrait individuel suffirait probablement à clore la question, et
son coût est faible. Elle n'a pas l'urgence des points suivants.

---

## 2.4 Là où l'exposition est réellement forte

Ce n'est pas le classement entre collègues, c'est la **restitution à
l'employeur** :

- `/admin/users/at-risk` liste nominativement les collaborateurs jugés
  vulnérables ;
- `/api/admin/users/at-risk/export` permet d'en sortir la liste ;
- le verdict le plus bas s'affiche **« Vulnérable »** ;
- les personnes signalées reçoivent des relances plus fréquentes que les
  autres.

C'est cette chaîne — notation, qualification, restitution hiérarchique,
conséquence — qui justifie l'AIPD, et non le palmarès.

---

## 3. Risques pour les personnes

| Risque                                   | Impact                                   | Mesures existantes                                   | **⬜ À compléter**                               |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Accès illégitime au score                | Jugement sur une personne hors contexte  | Cloisonnement par tenant, rôles, journal d'audit     | Restreindre l'export au seul RSSI ?              |
| Détournement de finalité par l'employeur | Usage en évaluation professionnelle      | Aucune                                               | Clause contractuelle d'interdiction dans les CGU |
| Modification indue                       | Score faussé                             | `computeRiskScore()` en lecture seule (`dbReadOnly`) | —                                                |
| Conservation excessive                   | Historique indéfini                      | `RiskScoreSnapshot`                                  | Fixer une durée                                  |
| Stigmatisation par le classement         | Atteinte à la réputation entre collègues | Aucune                                               | Cf. §2.3                                         |

Le **détournement de finalité** mérite d'être souligné : rien n'empêche
aujourd'hui un employeur d'utiliser le score en entretien annuel. Une
interdiction contractuelle explicite dans les CGU serait à la fois une mesure de
protection et un argument commercial.

---

## 4. Mesures déjà en place, à porter au crédit du traitement

- Calcul en **lecture seule** via un rôle PostgreSQL dédié (`dbReadOnly`)
- Cloisonnement strict par tenant
- Journalisation des accès et des exports (`AuditLog`)
- Fenêtre glissante de 10 résultats de phishing (minimisation)
- Anonymisation des comptes inactifs par la purge RGPD

---

## 5. Validation

**⬜ À COMPLÉTER après arbitrage des points ci-dessus.**

|                           |                              |
| ------------------------- | ---------------------------- |
| Responsable de traitement | Humanix-Cybersecurity (SASU) |
| Rédacteur                 |                              |
| Date de validation        |                              |
| Avis du conseil juridique |                              |
| Prochaine révision        |                              |

## 6. Faut-il désigner un DPO ? — analyse motivée

**Décision du 2026-08-14 : non, mais la question est datée et son réexamen
déclenché par un seuil chiffré.**

L'article 37.1.b vise les organismes dont les activités de base impliquent un
suivi « régulier et systématique **à grande échelle** » des personnes. Il
s'applique aux **sous-traitants** comme aux responsables — Humanix ne peut donc
pas s'en exonérer par sa qualité de sous-traitant.

Deux des trois conditions sont réunies, et il faut le dire clairement :

| Condition                      | Réunie ?                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| Activité de base               | **Oui.** Noter le risque cyber n'est pas accessoire, c'est le produit. |
| Suivi régulier et systématique | **Oui.** Le cron `risk-snapshot` recalcule quotidiennement.            |
| Grande échelle                 | **Non, à ce jour.** 4 tenants, 37 utilisateurs suivis au 2026-08-14.   |

La conclusion tient donc **entièrement au volume**, ce qui la rend fragile par
construction : elle cessera d'être vraie sans que rien ne le signale.

### Seuil de réexamen

La question est rouverte dès que **l'un** de ces seuils est franchi :

- **1 000 personnes suivies**, tous tenants confondus ;
- **50 tenants** ;
- l'ajout d'une donnée sensible au sens de l'article 9 dans le calcul du score.

Les deux premiers se mesurent en une requête. Le troisième est une décision
produit, qui devrait de toute façon passer par ce document.

⚠️ Les mentions légales affirment aujourd'hui qu'aucun DPO n'est requis « au
regard de l'article 37 ». C'est exact mais insuffisamment motivé : elles
devraient renvoyer à la présente analyse plutôt qu'énoncer une conclusion nue.

---

Rappel : Humanix-Cybersecurity n'a pas désigné de DPO, se jugeant hors du champ
de l'article 37 du RGPD (cf. mentions légales). **⬜ À VÉRIFIER** : l'article
37.1.b vise les organismes dont les activités de base impliquent un « suivi
régulier et systématique à grande échelle » des personnes. Un produit dont la
fonction est de noter en continu les collaborateurs de ses clients mérite que
cette conclusion soit réexaminée et écrite, plutôt que supposée.
