# Parcours DPO — feuille de route

> **À qui on parle.** Pas à un juriste. Dans une TPE ou une PME, le rôle de DPO
> atterrit sur la RH, le RAF, parfois le QSE. Quelqu'un de compétent, à qui on a
> posé un chapeau supplémentaire sans mode d'emploi, et qui ouvre le RGPD pour
> tomber sur « article 30 » sans savoir si ça le concerne.
>
> **Ce qu'on lui apporte.** L'étincelle de départ. De quoi comprendre ce qu'on
> attend de lui, dans quel ordre, et faire le nécessaire **lui-même**.
>
> On ne fait pas à sa place. On rend clair.

---

## 1. Deux choses à ne pas confondre

Ce document a d'abord été écrit en mélangeant les deux. C'est l'erreur à ne pas
refaire : elles n'ont ni le même public, ni le même but.

### A. Notre conformité à nous — _déjà en place_

Ce que Humanix fait des données que le Client nous confie : DPA, hébergement,
rétention, journal d'audit, procédure de violation.

**Public** : le client qui veut s'assurer que **notre** outil ne lui crée pas de
problème. **But** : lever une objection à l'achat. **Où** : `/admin/dpo`,
`docs/DPA-MODELE.md`, `docs/PROCEDURE-VIOLATION-DONNEES.md`.

C'est fait, et ce n'est pas le sujet de cette feuille de route.

### B. L'accompagnement du DPO — _ce qu'on veut construire_

Aider une personne à mettre **son entreprise** en conformité. Rien à voir avec
nos traitements : on parle de sa paie, de sa vidéosurveillance, de son fichier
clients.

**Public** : la RH, le RAF ou le QSE qui hérite du sujet. **But** : qu'il sache
quoi faire lundi matin. **Où** : à construire.

> La confusion est facile, les deux vivant sous le mot « DPO ». Si on les
> mélange dans l'interface, la personne croira que cocher **nos** cases la met
> en conformité. Ce serait faux, et grave.

---

## 2. Le principe : l'étincelle, pas la béquille

Quelqu'un qui délègue sa conformité à un outil reste dépendant de l'outil.
Quelqu'un qui **comprend** ce qu'on attend de lui devient autonome — et c'est
exactement le métier de Humanix : la sensibilisation, pas le logiciel de
gestion.

Trois règles, qui doivent tenir sur chaque écran.

**Le français d'abord, l'article ensuite.** On n'ouvre pas par « article 30 ».
On ouvre par _« savez-vous lister ce que votre entreprise fait des données de
ses salariés ? »_. La référence légale vient après, pour qui veut vérifier.

**Une action par étape, faisable cette semaine.** « Tenez votre registre » est
une montagne qui paralyse. « Listez les cinq traitements les plus évidents » est
un pas qu'on fait un mardi après-midi.

**Dire quand ce n'est pas nous.** Vidéosurveillance, badgeuse, prospection : la
plupart des sujets sortent de notre périmètre. On dit où aller, franchement. Un
parcours qui prétend tout couvrir ment, et celui qui s'en aperçoit ne fait plus
confiance au reste.

---

## 3. Le parcours, dans la langue de celui qui le suit

L'ordre suit **ce qui débloque le reste**, pas la numérotation des articles : on
n'évalue pas le risque d'un traitement qu'on n'a pas recensé.

### Avant tout — l'étincelle

**« De quoi parle-t-on, au juste ? »**
Vingt minutes pour comprendre ce que le RGPD demande vraiment, sans jargon, et
pourquoi ça concerne une entreprise de douze personnes autant qu'un grand
groupe. Aucune tâche. Juste de quoi cesser d'avoir peur du sujet.

**« Suis-je vraiment DPO ? »**
Beaucoup portent le titre sans y être tenus, d'autres devraient et l'ignorent.
Trois questions suffisent à trancher.
↗️ [Outil de la CNIL](https://www.cnil.fr/fr/designation-dpo)

### Le socle — un mois de travail, réparti

**« Qu'est-ce que mon entreprise fait des données ? »**
Le registre. La pierre angulaire : sans lui, rien d'autre n'est évaluable.
**Premier pas concret** : lister cinq traitements évidents — paie, recrutement,
clients, badges, vidéo. Le reste viendra.
↗️ [Modèle CNIL, format tableur](https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement)

**« Les gens savent-ils ce que je fais de leurs données ? »**
L'information des personnes : mention au contrat de travail, sur les formulaires
du site, à l'entrée si vidéosurveillance.

**« Combien de temps je garde tout ça ? »**
Les durées de conservation. Le sujet où presque tout le monde est en faute, et
qui se règle avec un tableau.

**« Qui d'autre voit ces données ? »**
Les prestataires : paie, comptable, hébergeur, outils SaaS. Chacun devrait avoir
un contrat de sous-traitance.
✅ _Pour Humanix, c'est fourni_ — et ça sert d'exemple de ce à quoi ça ressemble.

### Ce qui se rejoue — la conformité n'est pas un projet

**« Que faire si quelqu'un demande ses données ? »**
Un mois pour répondre. Savoir quoi faire **avant** la première demande.

**« Et si je perds des données ? »**
72 heures pour notifier la CNIL. Savoir quoi faire à 3 h du matin.
✅ _Notre procédure sert de modèle_ — écrite pour être exécutée seul, sous stress.

**« Certains traitements sont-ils à risque ? »**
L'AIPD, et surtout : dans quels cas elle est obligatoire.
↗️ [Liste CNIL des traitements concernés](https://www.cnil.fr/fr/analyse-dimpact-relative-la-protection-des-donnees-publication-dune-liste-des-traitements-pour)

**« Comment je prouve tout ça ? »**
La responsabilité de démontrer. Ce qu'on sort si la CNIL appelle.

---

## 4. Ce qu'on livre pour la prochaine version

Une seule étape, complète. Un demi-parcours donnerait l'illusion d'un fil qui
s'interrompt — pire que rien pour quelqu'un qui cherche justement un fil.

### Le parcours guidé, avec suivi

**Réutiliser ce qui existe.** La plateforme sait déjà faire progresser quelqu'un
à travers un contenu ordonné : saisons, épisodes, progression, reprise là où on
s'est arrêté. Le parcours DPO est **un contenu de plus**, pas un module neuf.
C'est le choix le plus économe, et le plus cohérent avec le métier.

**L'état par étape**

```prisma
// CE QUI APPARTIENT A LA PERSONNE — part avec elle.
// « J'ai compris ce qu'est le RGPD », « j'ai suivi l'introduction ».
model EtapeApprentissageDpo {
  id     String   @id @default(cuid())
  userId String
  cle    String
  statut String   // a_faire | en_cours | fait
  majLe  DateTime @updatedAt

  @@unique([userId, cle])
}

// CE QUI DECRIT L'ENTREPRISE — reste, et sert au successeur.
// « Notre registre liste cinq traitements », « nos durees sont fixees ».
model EtapeConformiteTenant {
  id       String    @id @default(cuid())
  tenantId String
  cle      String
  statut   String    // a_faire | en_cours | fait | sans_objet
  note     String?   // « fait pour la paie, reste le recrutement »
  majPar   String?   // qui a change le statut, pour le journal d'audit
  majLe    DateTime  @updatedAt

  @@unique([tenantId, cle])
}
```

**Deux tables et non une colonne `portee`.** Un seul modele avec `userId`
nullable rendrait la contrainte d'unicite inoperante : PostgreSQL considere deux
`NULL` comme distincts, donc rien n'empecherait de creer dix fois la meme etape
d'entreprise.

Chaque etape du catalogue declare sa portee. L'interface les affiche dans le
meme fil -- la personne ne voit qu'un parcours -- mais elles ne vivent pas au
meme endroit, et ne disparaissent pas ensemble.

Le catalogue des étapes reste **dans le code** : c'est de la doctrine, elle suit
la loi, elle se relit et se diffe comme du contenu pédagogique.

**Ce que voit la personne**

- une étape à la fois, la suivante annoncée mais pas ouverte ;
- pour chacune : la question en français, pourquoi ça compte pour **son**
  entreprise, l'action concrète de la semaine, le modèle à télécharger, et la
  référence légale en bas — pour qui veut vérifier ;
- un « sans objet » assumé : une entreprise sans vidéosurveillance doit pouvoir
  écarter la question sans se sentir en faute ;
- une progression en **nombre d'étapes**, jamais en pourcentage de conformité.

**Ce qui ne doit surtout pas y figurer** : nos propres cases. Elles vivent sur
`/admin/dpo`, séparément, sous un intitulé qui ne prête pas à confusion —
_« Ce que Humanix fait de vos données »_, et non _« Votre conformité »_.

---

## 5. La suite, par ordre de valeur

**Les modèles téléchargeables.** Registre en tableur pré-structuré, tableau des
durées, mention d'information type, courrier de réponse à une demande d'accès.
C'est ce qui transforme une bonne intention en fichier rempli.

**Les rappels.** Une conformité se rejoue : revoir le registre chaque année,
relancer une AIPD quand un traitement change. Sur le canal déjà en place.

**Le dossier à présenter.** Un PDF daté reprenant le parcours, ses notes et ses
pièces. Ce qu'on montre à sa direction — ou à un contrôle.

**L'orientation vers un DPO externe.** Pour qui découvre en chemin que le sujet
le dépasse. Le reconnaître est un service, pas un aveu d'échec.

---

## 6. Ce qu'on ne fera pas, et pourquoi le dire

**Pas de score de conformité.** « 82 % conforme » est faux juridiquement et
dangereux commercialement. Un point manquant peut coûter plus que dix acquis.

**Pas de conseil juridique.** On explique, on structure, on oriente. On
n'interprète pas un cas particulier.

**Pas de registre hébergé chez nous.** Il appartient à l'entreprise et contient
ses traitements à elle. On fournit le modèle, elle le garde.

**Pas de duplication de CISO Assistant.** Il est déjà intégré et fait le
pilotage GRC pour qui en a besoin. Le parcours s'arrête où il commence.

---

## 7. Décisions prises

| Question                                         | Décision                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Contenu ou fonctionnalité ?                      | **Fonctionnalité** dédiée                                                  |
| Valider les étapes auprès de vrais DPO ?         | **Oui**, avant de figer l'ordre                                            |
| Quel palier ?                                    | **Starter** — donc l'offre gratuite                                        |
| Que devient la progression si la personne part ? | Elle supprime son compte ; à défaut, le nettoyage des inactifs s'en charge |

### Ce que « fonctionnalité » implique

On ne réutilise pas les mécaniques de saisons/épisodes : il faut donc écrire la
progression, la reprise et l'affichage. C'est plus de code, mais on gagne ce que
le contenu ne sait pas faire — statuts par étape, note libre, « sans objet »,
modèles téléchargeables, et un affichage qui n'a rien d'un cours.

### Ce que « Starter » implique

Le parcours est dans l'offre **gratuite** (≤ 5 sièges). C'est un choix
d'acquisition : la PME qui découvre le RGPD par ce chemin connaîtra Humanix
avant d'avoir besoin de sensibilisation. Il doit donc être autonome — utile
même pour quelqu'un qui n'achètera jamais.

### Ce que la progression nominative implique — à vérifier au moment de coder

`lib/data-retention.ts` **anonymise** les utilisateurs inactifs, il ne les
supprime pas : e-mail et nom sont vidés, **l'identifiant est conservé** pour
l'intégrité référentielle.

Les lignes `EtapeParcoursDpo` étant liées à `userId`, elles **survivraient**
attachées à un compte anonymisé. Il faut donc les supprimer explicitement lors
de l'anonymisation — sinon une progression fantôme reste en base, sans personne
derrière.

**TRANCHE : ce qui décrit l'entreprise reste au niveau du tenant.**

Le parcours mélange deux natures, et elles n'ont pas le même propriétaire :

- _« j'ai compris ce qu'est le RGPD »_ → appartient à la personne, part avec
  elle à l'anonymisation ;
- _« notre registre liste cinq traitements »_ → décrit **l'entreprise**, reste,
  et sert au successeur.

Le successeur ne repart donc pas de zéro : il retrouve où en est l'organisation,
et refait seulement son propre apprentissage. C'est exactement ce qu'on veut —
la mémoire de la conformité ne doit pas tenir dans une seule tête.

---

## 8. Reste à préciser

**La validation terrain des étapes.** Décidée, pas encore faite. Elle peut se
mener en parallèle de l'écriture : la structure ne dépend pas de l'ordre exact,
seul le catalogue changerait.

**Le nom donné à la chose.** « Parcours DPO » parle à quelqu'un qui se sait DPO.
La RH à qui on a posé le chapeau ne se reconnaîtra peut-être pas dedans —
« Mise en conformité RGPD, pas à pas » lui parlerait davantage. À décider avant
la première capture d'écran commerciale.
