<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Courrier ANSSI — trame de prise de contact

> **Document de travail** : trame pour une première prise de contact
> formelle avec l'ANSSI. À adapter selon le canal choisi (email
> direct, courrier postal, ou via le SGDSN).

---

## Choix du canal

**Option A — Email** vers le pôle "Soutien & Innovation" de l'ANSSI :
`contact.innovation [@] ssi.gouv.fr` (à confirmer via l'annuaire ANSSI).
**Délai de réponse moyen** : 2 à 4 semaines.

**Option B — Courrier postal** signé pour conserver une trace formelle :

> ANSSI — Pôle Soutien & Innovation
> 51 Boulevard de la Tour-Maubourg
> 75007 Paris

**Option C — Via Digital 113** ou un membre du réseau French Tech qui
a déjà eu des échanges avec l'ANSSI (recommandation chaude > froide).

---

## Trame du courrier

```
[En-tête : papier à en-tête Humanix Cybersecurity SASU]

Toulouse, le [date]

Objet : Demande d'entretien — Solution OSS française de sensibilisation
        cyber, candidate à reconnaissance ANSSI

Madame, Monsieur,

Humanix Cybersecurity SASU édite Humanix Académie, une plateforme open
source (AGPLv3) française de sensibilisation à la cybersécurité destinée
aux PME et ETI. Lancée publiquement en mai 2026 avec un audit Triple A+
externe (Mozilla Observatory 110/100, Security Headers 6/6, SSL Labs PQC
ready), elle couvre aujourd'hui 200+ modules pédagogiques alignés sur
les référentiels ANSSI Hygiène, NIS2, RGPD, ISO 27001 et NIST CSF.

Notre démarche s'inscrit dans la même logique que Pix pour les
compétences numériques : créer un référentiel français reconnu pour la
sensibilisation cyber du facteur humain. Nous nous adressons à vos
services pour explorer ensemble la possibilité d'une reconnaissance
officielle qui ferait du Certificat Humanix une preuve opposable de
sensibilisation, utilisable :

- par les dirigeants d'entités essentielles et importantes au sens
  NIS2 pour démontrer leur conformité à l'obligation de formation ;
- par les assureurs cyber pour calibrer leurs primes et exclusions ;
- par les PME pour mesurer objectivement leur maturité humaine cyber.

Nos engagements vis-à-vis de l'État et de la souveraineté numérique :

  1. Code source intégralement public sous licence AGPL-3.0-or-later
     (audit par tout tiers possible à tout moment) ;
  2. Hébergement souverain en France (Scaleway Paris), IA française
     (Mistral), paiement européen régulé DNB (Mollie), zéro
     dépendance Cloud Act américain ;
  3. Mapping technique vers les 42 mesures du Guide Hygiène ANSSI
     publié dans le dépôt code (fichier lib/mapping-grc.ts), traçable
     et versionné ;
  4. Conformité RGS B (cryptographie Ed25519, TLS 1.3 + PQC, HSTS
     preload, headers sécurité conformes aux recommandations ANSSI).

Nous aimerions vous présenter Humanix Académie au cours d'un entretien
de 45 à 60 minutes, à votre convenance, en visio ou en présentiel à
Paris. Cet échange nous permettrait d'identifier :

- les critères d'éligibilité à une reconnaissance ANSSI éventuelle ;
- les écarts à combler côté Humanix (technique, gouvernance,
  pédagogique) pour répondre à ces critères ;
- les modalités d'un dialogue continu pour un dossier formel d'agrément.

Vous trouverez en pièce jointe :

- Notre dossier de présentation technique (15 pages) ;
- Le rapport d'audit sécurité Triple A+ ;
- Le mapping GRC complet (Hygiène ANSSI, NIS2, RGPD) ;
- Notre URL de démonstration publique : humanix-cybersecurity.fr/demo.

Je reste à votre entière disposition pour toute information
complémentaire et vous prie d'agréer, Madame, Monsieur, l'expression
de mes salutations distinguées.

[Signature manuscrite]

Florian Durano
Fondateur — Humanix Cybersecurity SASU
contact@humanix-cybersecurity.fr
+33 [téléphone direct]
SIRET [numéro SIRET]
```

---

## Pièces jointes à préparer

1. **Dossier de présentation technique** (15 pages PDF) — synthèse :
   - Architecture (Next.js + PostgreSQL + Prisma)
   - Sécurité défense en profondeur
   - Format pédagogique des modules MDX
   - Catalogue (200+ modules cartographiés)
   - Cas clients existants (sans révéler de noms confidentiels)

2. **Rapport audit Triple A+** — à récupérer depuis `docs/SECURITY_AUDIT.md`
   et le formater en PDF brandé.

3. **Mapping GRC complet** — export depuis `lib/mapping-grc.ts` en PDF
   tabulaire (Référentiel | Contrôle | Module Humanix couvrant).

4. **Démo en ligne** : URL `humanix-cybersecurity.fr/demo` avec
   comptes pré-remplis (déjà existant).

---

## Suivi du dossier

| Étape | Statut | Date cible |
| ----- | ------ | ---------- |
| Préparation dossier technique | À faire | Q3 2026 |
| Validation interne du courrier | À faire | Q3 2026 |
| Envoi du courrier | À faire | Q3 2026 |
| Premier entretien | À planifier | Q3 2026 |
| Dossier formel d'agrément | À planifier | Q4 2026 |
| Reconnaissance officielle | Visée | 2027 |

---

## Notes stratégiques

**Ton du courrier** : professionnel, factuel, peu "vendeur". L'ANSSI
est une agence d'État, pas un client. On ne vend pas, on présente une
opportunité de collaboration utile à l'écosystème français.

**À NE PAS faire** :

- Promettre des chiffres qu'on ne peut pas tenir
- Comparer ouvertement aux concurrents américains (Knowbe4, etc.)
- Demander un agrément avant d'avoir engagé le dialogue
- Mentionner les leviers commerciaux (assurance, etc.) dans ce premier
  contact — c'est la suite de la conversation

**À FAIRE** :

- Insister sur la **souveraineté** (Scaleway, Mistral, Mollie UE)
- Mettre en avant l'**OSS** (code auditable par l'ANSSI elle-même)
- Référencer leur propre travail (Guide Hygiène, mesures NIS2)
- Proposer un **entretien**, pas un agrément immédiat
