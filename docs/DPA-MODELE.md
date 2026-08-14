# Accord de traitement des données (DPA) — modèle

> **État : MODÈLE À VALIDER JURIDIQUEMENT AVANT SIGNATURE.**
>
> Rédigé le 2026-08-14 sur la structure imposée par l'article 28.3 du RGPD.
> Les CGV rendent ce document obligatoire (« Sans DPA signé, la prestation SaaS
> ne… ») alors qu'il n'existait pas : vos clients ne pouvaient donc pas
> contracter conformément à vos propres conditions.
>
> ⚠️ Ce modèle est un point de départ sérieux, pas un contrat prêt à signer.
> Il doit être relu par un conseil, en particulier sur les articles 6
> (responsabilité) et 9 (fin du contrat).

---

## Entre les parties

**Le Responsable de traitement** (ci-après « le Client ») : l'entité souscrivant
à Humanix Académie, telle que désignée au bon de commande.

**Le Sous-traitant** : Humanix-Cybersecurity, SASU au capital de 100 €, SIREN
103 901 799, RCS Nîmes, siège 16 rue Joseph Loiret, 30100 Alès.

Le présent accord complète les Conditions Générales de Vente et prévaut sur
elles en cas de contradiction relative aux données personnelles.

---

## 1. Objet et rôles

Le Client confie au Sous-traitant le traitement de données personnelles
nécessaires à la fourniture de la plateforme de sensibilisation à la
cybersécurité Humanix Académie.

**Le Client est responsable de traitement.** Il détermine les finalités et les
moyens, choisit la base légale, et informe les personnes concernées.

**Le Sous-traitant agit sur instruction documentée** du Client, au sens de
l'article 28 du RGPD.

⚠️ **Le Client reste seul responsable de l'AIPD** prévue à l'article 35 lorsque
le traitement l'exige — ce qui est le cas de la notation individuelle du risque
cyber. Le Sous-traitant l'assiste au titre de l'article 28.3.f en fournissant
l'analyse d'appui documentée dans `docs/AIPD-SCORING-COLLABORATEURS.md`.

## 2. Catégories de données et de personnes

**Personnes concernées** : les collaborateurs du Client inscrits sur la
plateforme.

**Données traitées** :

| Catégorie                   | Exemples                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| Identification              | nom, adresse électronique professionnelle, service, groupe métier      |
| Usage pédagogique           | modules suivis, scores de quiz, dates de complétion                    |
| Sensibilisation au phishing | résultats de campagnes simulées (ouvert, cliqué, signalé)              |
| Évaluation                  | score de risque cyber individuel (0-100) et son verdict                |
| Technique                   | journaux d'accès, empreinte d'adresse IP (`ipHash`), agent utilisateur |

**Aucune donnée sensible** au sens de l'article 9 n'est traitée. Le Client
s'interdit d'en introduire, notamment via les champs libres.

## 3. Durée

Le présent accord s'applique pendant toute la durée de l'abonnement, et survit
à sa résiliation pour les obligations de restitution, de suppression et de
confidentialité.

## 4. Obligations du Sous-traitant (art. 28.3)

**a) Instructions documentées.** Ne traiter les données que sur instruction du
Client, y compris pour tout transfert hors Union européenne. Le Sous-traitant
informe immédiatement le Client s'il estime qu'une instruction constitue une
violation du RGPD.

**b) Confidentialité.** Les personnes autorisées à traiter les données sont
soumises à une obligation de confidentialité.

**c) Sécurité (art. 32).** Les mesures techniques et organisationnelles sont
détaillées en annexe 2. Elles incluent le chiffrement des sauvegardes, le
cloisonnement strict par client, la journalisation des accès et le principe de
moindre privilège.

**d) Sous-traitance ultérieure.** Cf. article 5.

**e) Assistance aux droits des personnes.** Le Sous-traitant met à disposition
du Client les fonctions permettant de répondre aux demandes d'accès, de
rectification, d'effacement, de portabilité, de limitation et d'opposition, et
l'assiste pour toute demande qu'il ne pourrait satisfaire seul.

**f) Assistance à la conformité.** Le Sous-traitant assiste le Client pour les
articles 32 à 36 : sécurité, notification de violation, AIPD, consultation
préalable.

**g) Sort des données en fin de contrat.** Cf. article 9.

**h) Audit.** Le Sous-traitant met à disposition du Client toute information
nécessaire pour démontrer le respect de l'article 28, et permet la réalisation
d'audits.

## 5. Sous-traitants ultérieurs

Le Client autorise de façon générale le recours aux sous-traitants ultérieurs
listés ci-dessous. Toute adjonction ou remplacement fait l'objet d'une
**notification écrite au moins 30 jours à l'avance**, le Client disposant d'un
droit d'opposition motivé pendant ce délai.

**Sous-traitants ultérieurs — ils traitent les données des collaborateurs du
Client :**

| Sous-traitant | Localisation   | Rôle                                                |
| ------------- | -------------- | --------------------------------------------------- |
| Scaleway SAS  | France         | Hébergement, sauvegardes, infrastructure            |
| Scaleway TEM  | France (Paris) | Envois transactionnels (lien de connexion, alertes) |

**Aucun transfert hors Union européenne** n'a lieu dans le cadre de ces
traitements. Scaleway est un opérateur de droit français.

⚠️ **Ne sont PAS des sous-traitants ultérieurs**, contrairement à ce que
suggérait une rédaction antérieure des CGV : Mollie, Qonto, Dougs et Hiscox.
Ces prestataires n'accèdent pas aux données des collaborateurs du Client. Ils
interviennent sur les données de **facturation et de gestion de
Humanix-Cybersecurity**, pour lesquelles cette dernière agit en qualité de
**responsable de traitement** et non de sous-traitant. Les mentionner ici
promettrait au Client un droit d'opposition sur des traitements qui ne le
concernent pas.

## 6. Violation de données

Le Sous-traitant notifie le Client **sans délai injustifié et au plus tard sous
48 heures** après en avoir pris connaissance, en fournissant la nature de la
violation, les catégories et le nombre approximatif de personnes concernées,
les conséquences probables et les mesures prises.

La notification à l'autorité de contrôle et aux personnes concernées incombe au
Client, en sa qualité de responsable.

## 7. Localisation et transferts

Les données sont hébergées **exclusivement en France**, chez Scaleway. Aucun
transfert hors de l'Union européenne n'est effectué.

Le Sous-traitant s'engage à informer le Client avant tout changement, et à
mettre en place les garanties appropriées du chapitre V du RGPD le cas échéant.

## 8. Usage du score de risque individuel

Le Client s'engage à n'utiliser le score de risque calculé par la plateforme
qu'à des fins de **sensibilisation et de pilotage collectif**.

Il s'interdit de le retenir comme élément d'une décision individuelle,
notamment en matière d'évaluation professionnelle, disciplinaire, de promotion,
de rémunération ou de rupture du contrat de travail.

Cet engagement maintient le traitement hors du champ de l'article 22 du RGPD.
Un Client s'en écartant deviendrait seul responsable d'organiser le droit à
l'intervention humaine prévu à l'article 22.3.

## 9. Fin du contrat

Au terme de la prestation, le Client dispose de **30 jours** pour exporter ses
données via les fonctions prévues à cet effet.

Passé ce délai, le Sous-traitant procède à la **suppression définitive** des
données, sauvegardes comprises, dans un délai maximal de **90 jours**
correspondant au cycle de rotation des sauvegardes chiffrées.

⚠️ **Point à valider juridiquement.** Les archives de journaux d'audit déposées
sous verrou d'immuabilité (WORM, 366 jours) ne peuvent techniquement pas être
supprimées avant l'expiration de ce verrou — c'est précisément leur fonction.
Le Client doit en être informé **avant** signature, et cette conservation doit
être justifiée par une obligation légale de conservation des traces (LCEN,
NIS2). À défaut, il y a contradiction entre l'engagement de suppression et le
dispositif technique.

## 10. Droit applicable

Droit français. Tribunal de commerce de Nîmes.

---

## Annexe 1 — Instructions documentées du Client

Le Client instruit le Sous-traitant de traiter les données aux seules fins de :

1. fournir l'accès à la plateforme et suivre la progression pédagogique ;
2. réaliser des campagnes de sensibilisation au phishing simulé ;
3. calculer et restituer un score de risque cyber, dans les limites de
   l'article 8 ;
4. produire des rapports de conformité et de pilotage ;
5. assurer la sécurité, la traçabilité et le support technique.

Toute autre finalité requiert une instruction écrite complémentaire.

## Annexe 2 — Mesures de sécurité (art. 32)

| Mesure                      | Mise en œuvre                                                    |
| --------------------------- | ---------------------------------------------------------------- |
| Cloisonnement               | Isolation stricte par client, contrôlée par tests automatisés    |
| Authentification            | Clé publique ou lien à usage unique ; second facteur disponible  |
| Chiffrement en transit      | TLS                                                              |
| Chiffrement des sauvegardes | `age` (Curve25519), clé privée jamais présente sur le serveur    |
| Immuabilité des sauvegardes | Object Lock COMPLIANCE, 30 jours, irrévocable                    |
| Archivage des journaux      | Chiffré, verrou 366 jours                                        |
| Journalisation              | Accès et exports tracés, conservation paramétrable par le Client |
| Moindre privilège           | Rôle PostgreSQL en lecture seule pour les calculs                |
| Restauration                | Éprouvée de bout en bout, avec vérification d'intégrité          |
| Isolation d'exécution       | Conteneurs sans démon privilégié (rootless)                      |

## Annexe 3 — Signatures

|           | Client | Humanix-Cybersecurity |
| --------- | ------ | --------------------- |
| Nom       |        |                       |
| Qualité   |        |                       |
| Date      |        |                       |
| Signature |        |                       |
