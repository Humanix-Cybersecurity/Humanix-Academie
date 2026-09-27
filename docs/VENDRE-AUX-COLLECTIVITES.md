<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Vendre aux collectivités : ce qui change par rapport à une PME

> Rédigé le 2026-09-27 avant le salon des maires. Une mairie n'achète pas comme
> une PME : elle paie par mandat administratif, reçoit ses factures par Chorus
> Pro, et doit pouvoir montrer qu'elle a respecté le code de la commande
> publique. Rien de tout cela n'est bloquant, mais chaque point manqué retarde
> le paiement de plusieurs semaines.

## 1. Le paiement : pas de carte, un mandat

- Une collectivité ne paie **pas par carte bancaire** : le parcours Mollie
  (Starter, Pro) ne s'applique pas. On passe par un **devis puis une facture**
  réglée par **virement**, sur mandat administratif émis par l'ordonnateur et
  payé par le comptable public (trésorerie).
- Le délai global de paiement est de **30 jours** à réception de la facture
  conforme (code de la commande publique, art. R2192-10). Les intérêts
  moratoires et l'indemnité forfaitaire de 40 € sont dus de plein droit en cas
  de retard ; on ne les réclame pas au premier client, mais ils existent.
- Les collectivités ne récupèrent pas la TVA sur ce type de dépense : le
  **prix TTC est celui qui compte** pour elles. Les devis générés par
  `/superadmin/devis-revendeur` et les factures affichent HT et TTC.

## 2. La facture : Chorus Pro, obligatoirement

Depuis 2020, **tout fournisseur** d'une entité publique dépose ses factures sur
[Chorus Pro](https://portail.chorus-pro.gouv.fr) ; une facture envoyée par
courriel n'est pas réputée reçue. Le dépôt manuel d'un PDF suffit (nos factures
sont en Factur-X, que Chorus Pro lit directement).

Mentions à demander **au moment du devis**, sans quoi la facture est rejetée :

| Donnée                            | Pourquoi                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| **SIRET de la collectivité**      | Identifie le destinataire dans Chorus Pro (une commune a un SIRET, parfois un par budget). |
| **Numéro d'engagement juridique** | Obligatoire pour l'État et beaucoup de collectivités ; c'est le numéro de bon de commande. |
| **Code service**                  | Facultatif mais fréquent dans les intercommunalités et les villes.                         |

À faire côté produit : ajouter au bloc d'identité de facturation du tenant un
champ « référence de commande / numéro d'engagement », imprimé sur la facture.
Ce n'est pas encore fait au 2026-09-27.

## 3. Les seuils de la commande publique

- **Moins de 40 000 € HT** : la collectivité peut acheter sans publicité ni mise
  en concurrence formalisée (art. R2122-8). Elle doit quand même choisir une
  offre pertinente, faire bon usage des deniers publics et ne pas contracter
  systématiquement avec le même fournisseur. Un devis clair, daté, avec la
  grille et la durée, lui suffit.
- **Entre 40 000 et 90 000 € HT** : procédure adaptée avec publicité allégée.
  On n'y est pas.
- Une intercommunalité peut **acheter pour ses communes** (groupement de
  commandes ou mutualisation) : c'est le cas le plus intéressant pour la
  collection Mairies, un seul contrat pour plusieurs espaces.

## 4. Les pièces que la collectivité demandera

Pour tout contrat d'au moins **5 000 € HT**, l'acheteur doit vérifier notre
régularité (obligation de vigilance, Code du travail, art. L8222-1). Avoir prêts
en PDF :

- attestation de vigilance URSSAF (moins de six mois) ;
- attestation de régularité fiscale ;
- extrait Kbis (moins de trois mois) ;
- RIB ;
- attestation d'assurance responsabilité civile professionnelle (Hiscox) ;
- liste des sous-traitants traitant des données personnelles (page
  `/securite`, section sous-traitants).

## 5. Le volet données personnelles et accessibilité

- La collectivité est **responsable de traitement** ; Humanix est
  sous-traitant. On signe le DPA (modèle `docs/DPA-MODELE.md`) avant
  l'ouverture de l'espace, et on remet les deux trames d'analyse d'impact
  (`docs/AIPD-SCORING-COLLABORATEURS.md`,
  `docs/exposition-numerique/aipd-trame.md`) que son DPO instancie.
- Avant le premier exercice de simulation, les agents doivent être informés :
  la note d'information est dans la console
  (`/admin/conformite-rgpd/note-information`). Le comité social territorial
  (CST) joue le rôle du CSE.
- Les collectivités sont tenues au **RGAA** pour leurs outils numériques, y
  compris ceux fournis par un prestataire. Notre déclaration d'accessibilité
  (`/accessibilite`, auto-audit, conformité partielle) répond à la question ;
  un audit externe la rendrait opposable sans réserve.
- Hébergement en France (Scaleway Paris), aucun transfert hors UE, code
  AGPLv3 auditable : c'est ce qui compte pour une DSI de collectivité. Aucune
  qualification SecNumCloud n'est requise pour ce type de service.

## 6. Ce qu'on ne promet pas

- Aucune reconnaissance, agrément ou label public (ANSSI, CNIL) n'existe pour
  une plateforme de sensibilisation : on ne le laisse pas entendre.
- Le certificat remis aux agents est une attestation de suivi signée par
  Humanix, pas un titre reconnu par l'État.
- Humanix n'est pas organisme de formation déclaré ni certifié Qualiopi :
  l'abonnement n'ouvre pas droit à un financement formation.
