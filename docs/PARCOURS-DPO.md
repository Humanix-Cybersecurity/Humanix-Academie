# Parcours DPO — feuille de route

> **Le constat, tel qu'il a été formulé :** des DPO perdus face à leur rôle, qui
> ne savent pas quoi faire ni où donner de la tête.
>
> Ce n'est pas un manque d'outils. Le marché en est plein. C'est un manque
> **d'ordre** : personne ne leur dit _par quoi commencer_, _ce qui est fait_, et
> _ce qui reste_.

---

## 1. La contrainte qui gouverne tout le reste

Avant toute fonctionnalité, une question : **de quoi Humanix a-t-il le droit de
se mêler ?**

Humanix Académie est **sous-traitant** (RGPD art. 28). Le Client est
responsable de traitement. Cette asymétrie n'est pas un détail juridique, elle
décide de ce qu'on peut construire :

| On peut                                                    | On ne peut pas                    |
| ---------------------------------------------------------- | --------------------------------- |
| Fournir ce qu'on détient comme sous-traitant (art. 28.3.h) | Être le DPO du Client             |
| Donner des modèles, une structure, un suivi                | Tenir **son** registre à sa place |
| Pré-remplir ce qui relève de notre traitement              | Qualifier **sa** conformité       |
| Renvoyer vers les textes et les autorités                  | Donner un conseil juridique       |

**Conséquence de conception :** chaque point du parcours porte un verdict
explicite, et l'un des trois seulement.

```
✅ HUMANIX LE FAIT        → avec le lien vers la preuve dans la plateforme
🤝 HUMANIX VOUS AIDE      → modèle, générateur, pré-remplissage
↗️  HORS PÉRIMÈTRE         → l'outil ou l'autorité compétente, nommément
```

Le troisième verdict est le plus important. **Un parcours qui prétend tout
couvrir ment**, et un DPO qui s'en aperçoit ne fait plus confiance au reste.
Dire « ceci n'est pas notre rôle, allez là » achète plus de crédibilité que
n'importe quelle fonctionnalité.

---

## 2. Ce qui existe déjà, et qu'il suffit de relier

L'inventaire est plus fourni qu'il n'y paraît — le problème n'est pas l'absence
d'outils, c'est qu'ils sont **dispersés et sans ordre** :

| Existant                          | Où                                    | Ce qu'il couvre      |
| --------------------------------- | ------------------------------------- | -------------------- |
| File des demandes d'effacement    | `/admin/dpo`                          | art. 17              |
| Générateur d'AIPD                 | `/admin/dpo/aipd`                     | art. 35              |
| Rétention configurable + aperçu   | `/admin/dpo/retention`                | art. 5.1.e           |
| Journal d'audit complet           | `/admin/audit`                        | art. 30.2, art. 32   |
| DPA modèle                        | `docs/DPA-MODELE.md`                  | art. 28.3            |
| Procédure de violation + registre | `docs/PROCEDURE-VIOLATION-DONNEES.md` | art. 33/34           |
| Analyse d'appui sur la notation   | `docs/AIPD-SCORING-COLLABORATEURS.md` | art. 35 (assistance) |
| Intégration CISO Assistant        | `/admin/integrations/ciso-assistant`  | GRC complet          |

**Rien de tout cela n'est présenté comme un chemin.** Un DPO qui arrive sur
`/admin/dpo` voit un tableau de bord, pas une marche à suivre.

---

## 3. Le parcours : douze points, dans l'ordre

L'ordre n'est pas alphabétique ni chronologique : il suit **ce qui bloque le
reste**. On ne peut pas évaluer un risque sur un traitement qu'on n'a pas
recensé.

### Fondations — sans elles, le reste est bâti sur du sable

**1. Suis-je obligé de désigner un DPO ?** (art. 37)
Beaucoup en désignent un sans y être tenus, d'autres devraient et l'ignorent.
↗️ _Hors périmètre_ — [outil d'aide à la décision CNIL](https://www.cnil.fr/fr/designation-dpo).

**2. Mon DPO a-t-il les moyens de sa fonction ?** (art. 38)
Indépendance, rattachement, temps alloué, absence de conflit d'intérêts.
🤝 _On aide_ — questionnaire d'auto-évaluation, sans notation.

**3. Le registre des activités de traitement** (art. 30)
La pierre angulaire. Sans lui, aucune des étapes suivantes n'a de base.
🤝 _On aide_ — on pré-remplit la ligne « sensibilisation cyber » avec ce que
nous traitons réellement ; le Client ajoute les siennes.
↗️ [Modèle CNIL](https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement).

### Le traitement Humanix — ce dont nous répondons

**4. Le contrat de sous-traitance est-il signé ?** (art. 28)
✅ _Nous le fournissons_ — `docs/DPA-MODELE.md`, à faire relire par un conseil.

**5. Où sont hébergées les données, et qui y accède ?** (art. 28, ch. V)
✅ _Nous répondons_ — hébergement France, sous-traitants ultérieurs listés,
aucun transfert hors UE. Pré-rempli depuis la configuration réelle.

**6. Combien de temps les données sont-elles conservées ?** (art. 5.1.e)
✅ _Nous répondons_ — `/admin/dpo/retention` montre la configuration **et** ce
que le prochain passage supprimera.

**7. Les personnes sont-elles informées ?** (art. 13)
🤝 _On aide_ — la politique de confidentialité couvre le traitement Humanix ;
au Client d'informer ses collaborateurs de **sa** finalité.

### Les obligations vivantes — celles qui se rejouent

**8. Une AIPD est-elle nécessaire, et est-elle faite ?** (art. 35)
🤝 _On aide_ — générateur, plus notre analyse d'appui sur la notation du risque.
↗️ [Liste CNIL des traitements soumis à AIPD](https://www.cnil.fr/fr/analyse-dimpact-relative-la-protection-des-donnees-publication-dune-liste-des-traitements-pour).

**9. Sais-je répondre à une demande de droit en un mois ?** (art. 12 à 22)
✅ _Partiellement_ — la file d'effacement existe. **À étendre** : accès,
portabilité, rectification, opposition, avec le délai d'un mois décompté.

**10. Que se passe-t-il en cas de violation ?** (art. 33/34)
✅ _Nous le fournissons_ — procédure écrite pour être exécutée seul la nuit,
registre modèle, et notification sous 48 h contractuelles.

**11. Comment est démontrée la sécurité ?** (art. 32)
✅ _Nous répondons_ — journal d'audit, chiffrement des sauvegardes, immuabilité
WORM, cloisonnement testé.

**12. Comment démontrer tout cela à un contrôle ?** (art. 5.2)
🤝 _On aide_ — export du parcours en dossier daté.
↗️ Pour un pilotage GRC complet : **CISO Assistant**, déjà intégré.

---

## 4. Ce qui est déployable pour la prochaine version

Je propose **une seule étape**, mais complète et autonome. Un demi-parcours
livré serait pire que rien : il donnerait l'illusion d'un fil conducteur qui
s'interrompt.

### Étape 1 — Le parcours, avec état persistant

**Le modèle**

```prisma
model EtapeConformite {
  id         String   @id @default(cuid())
  tenantId   String
  cle        String   // "registre-traitements", "dpa-signe", ...
  statut     String   // a_faire | en_cours | fait | sans_objet
  note       String?  // le DPO écrit pourquoi, pas seulement quoi
  echeance   DateTime?
  majPar     String?
  majLe      DateTime @updatedAt
  @@unique([tenantId, cle])
}
```

Le catalogue des douze points reste **dans le code**, pas en base : c'est de la
doctrine, elle évolue avec la loi et doit être versionnée, relue, diffée.

**La page** — `/admin/dpo/parcours`

- les douze points dans l'ordre, groupés par section ;
- pour chacun : l'article, le lien vers le texte, ce qu'il faut faire, le
  verdict, et l'action ;
- un statut modifiable, avec une note libre ;
- une progression honnête : `7/12`, et non un pourcentage flatteur.

**Le pré-remplissage** — c'est ce qui fait la différence avec une checklist
statique. Les points 5, 6, 10 et 11 se remplissent **depuis l'état réel du
système**, pas depuis une déclaration : la rétention affichée est celle
configurée, l'hébergement est celui qui tourne. Un DPO qui voit une réponse
tirée de la machine, avec son lien de preuve, cesse d'être dans le déclaratif.

**Estimation** : un modèle, une page, un catalogue TypeScript, des tests sur le
calcul de progression et sur le pré-remplissage. Livrable en une itération.

---

## 5. La suite, par ordre de valeur

**Étape 2 — Les demandes de droits, complètes** (art. 12 à 22)
Étendre la file d'effacement à l'accès, la portabilité, la rectification et
l'opposition. Chaque demande porte son **échéance à un mois** et une alerte
avant expiration. C'est l'obligation la plus fréquemment ratée, et la plus
visible en cas de plainte.

**Étape 3 — Le registre des traitements**
Éditable, avec nos lignes pré-remplies. Export CSV et PDF. C'est le document
qu'une autorité demande en premier.

**Étape 4 — Le dossier de conformité exportable**
Un PDF daté rassemblant le parcours, ses preuves et ses notes. Ce que le DPO
présente à sa direction ou à un contrôle.

**Étape 5 — Les rappels**
Échéances qui approchent, AIPD à revoir, DPA non signé. Sur le canal de
notification déjà en place.

---

## 6. Ce qu'on ne fera pas, et pourquoi le dire

**Pas de score de conformité global.** Un « 82 % conforme » est faux
juridiquement et dangereux commercialement : la conformité n'est pas une
moyenne, et un point manquant peut coûter plus que dix points acquis.

**Pas de conseil juridique.** On lie les textes, on structure, on suit. On
n'interprète pas. La frontière doit rester lisible pour le DPO lui-même.

**Pas de registre imposé.** Le registre appartient au responsable de
traitement. On le pré-remplit sur notre part, jamais au-delà.

**Pas de duplication de CISO Assistant.** Il est déjà intégré et fait le
pilotage GRC. Le parcours DPO l'alimente, il ne le concurrence pas.

---

## 7. Ce qui reste à trancher avant de coder

1. **Le parcours est-il visible en palier Starter**, ou réservé à Pro ? Il sert
   l'argument commercial autant que le Client.
2. **Les douze points sont-ils les bons ?** Ils sont proposés depuis le texte,
   pas depuis le terrain. Les confronter à deux ou trois DPO réels avant de les
   figer coûterait une semaine et éviterait de livrer un ordre théorique.
3. **Qui peut modifier un statut ?** DPO et RSSI, ou ADMIN aussi ? Le journal
   d'audit tracera dans tous les cas.
