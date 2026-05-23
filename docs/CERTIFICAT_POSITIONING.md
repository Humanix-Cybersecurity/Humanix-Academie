<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Certificat Humanix — Positionnement commercial assureurs

> **Document de référence pour les rendez-vous courtiers, souscripteurs cyber
> et mutuelles régionales.** À adapter en PDF brandé pour les présentations
> formelles. Source de vérité : page publique [/certificat](https://humanix-academie.fr/certificat).

---

## 1. Le problème côté assureur cyber

**Constat 2026** : 85 % des sinistres cyber sur les PME françaises
proviennent d'une erreur humaine (clic sur phishing, mot de passe faible,
escroquerie au président, BEC). Source : Hiscox France, rapport sectoriel 2026.

**Conséquence pour les souscripteurs** :

- Refus de couverture ou exclusions strictes pour les PME sans preuve de
  sensibilisation
- Augmentation des primes (× 2 à × 3 sur 24 mois sur certains segments)
- Franchises majorées (parfois multipliées par 5 sur les sinistres BEC)
- Risque de répétabilité élevé (un employé qui clique aujourd'hui cliquera
  demain s'il n'est pas formé)

**Le besoin** : un outil de mesure du risque humain qui soit
**objectif, opposable, et vérifiable** au moment de la souscription **ET**
en cours de contrat.

---

## 2. La proposition Humanix Académie

Le **Certificat de sensibilisation Humanix** apporte 4 garanties que ne
peuvent pas offrir les solutions de e-learning classiques (Knowbe4,
Proofpoint, MetaCompliance).

### Garantie 1 — Inviolable cryptographiquement

- Signature **Ed25519** sur clé publique vérifiable
- Hash SHA-256 du contenu certifié inclus dans le PDF
- Pas de modification a posteriori possible sans casser la signature
- Vérification automatisable en 1 seconde via SDK fourni

### Garantie 2 — Quantitatif et exploitable

Le certificat tenant inclut :

- **% de l'effectif certifié** (calculé sur l'effectif déclaré tenant)
- **Score moyen** des certifications (0-100, basé sur les quiz)
- **Date d'émission** et **date d'expiration** (12 mois)
- **Distribution des certifications par service** (RH, compta, dev,
  direction, etc.) — informatif pour cibler les efforts post-sinistre
- **Distribution des certifications par module** (phishing, NIS2,
  fraude au président, etc.) — utile pour ajuster les exclusions

### Garantie 3 — Intégrable côté SI assureur

- **API REST publique** documentée OpenAPI
- **Webhooks sortants signés HMAC-SHA256** sur événement
  certification (nouveau certificat, expiration imminente, score
  agrégé qui passe un seuil)
- **Export OSCAL v1.1.2** (NIST) pour les outils GRC
- Format JSON et XML standards, pas de propriétaire

### Garantie 4 — Renouvellement traçable

- Expiration à 12 mois
- Notification automatique au tenant 30 jours avant
- Renouvellement = re-certification, pas reconduction tacite (donc
  l'apprenant DOIT refaire les modules à jour)
- Historique conservé : audit log des certifications passées
  consultable

---

## 3. Barème de réduction de prime cyber — proposition

Le barème ci-dessous est une **proposition de discussion**, à finaliser
avec chaque assureur partenaire selon son scoring interne.

| % effectif certifié | Réduction de prime cyber cible | Critère |
| ------------------- | ------------------------------ | ------- |
| < 50 %              | Aucune réduction               | Below threshold |
| 50 % — 70 %         | **−10 %** sur prime annuelle   | Seuil minimal d'engagement |
| 70 % — 85 %         | **−20 %** sur prime annuelle   | Maturité moyenne |
| 85 % — 95 %         | **−30 %** sur prime annuelle   | Maturité avancée |
| ≥ 95 %              | **−40 %** sur prime annuelle   | Excellence + franchise réduite de 50 % sur sinistre BEC |

**Conditions** :

- Effectif déclaré tenant à valider via DSN (recoupement)
- Certificat doit être renouvelé annuellement (sinon retour au niveau
  inférieur)
- Score moyen minimum 70/100 (l'effectif doit avoir vraiment compris,
  pas juste cliqué)
- En cas de sinistre, la franchise est ajustée selon la maturité au
  moment du sinistre (pas à la souscription) — incite l'entreprise à
  maintenir l'effort

---

## 4. Cas d'usage concrets

### Courtier en cyber pour PME 50-250 salariés

**Avant Humanix** : refus de souscription pour 30 % des dossiers
faute de preuve de sensibilisation. Discussions interminables avec
chaque assureur pour faire passer un dossier "border".

**Avec Humanix** : présentation du certificat tenant au moment de la
souscription. Décision assureur en quelques heures au lieu de
plusieurs semaines. Taux d'acceptation passé de 70 % à 92 % chez les
courtiers pilotes (chiffre cible, à confirmer).

### Mutuelle régionale Occitanie

**Avant Humanix** : pression budgétaire forte sur les remboursements
de sinistres cyber, qui ont explosé (× 5 sur 2 ans). Tentation de
sortir du segment PME-TPE.

**Avec Humanix** : programme de sensibilisation gratuit ou subventionné
proposé en pack avec la souscription. Les PME formées coûtent 4 fois
moins en sinistres (moyenne sur les programmes équivalents Pix
Cyber + Cybermalveillance.gouv.fr — à confirmer avec une étude
conjointe Humanix + mutuelle).

### ETI obligée NIS2 secteur santé

**Avant Humanix** : risque réglementaire fort, panique pré-audit,
solutions ponctuelles à 8 000 € + coût interne RH.

**Avec Humanix** : déploiement self-host ou cloud en 1 jour, audit
trail complet, mapping NIS2 préétabli, certificat opposable. Coût
récurrent stable, équipe RSSI focused sur les vrais enjeux.

---

## 5. Pourquoi cela marche

### Effet rétroactif vertueux

1. L'assureur exige le certificat → la PME se forme
2. L'effectif formé est moins risqué → moins de sinistres
3. Moins de sinistres → l'assureur peut baisser ses primes
4. Primes plus basses → plus de PME assurées
5. Plus de PME assurées → l'écosystème français cyber-résilient

### Effet de marché en cours

- **NIS2** crée l'obligation légale (sanctions jusqu'à 10 M€ ou 2 % CA)
- **Loi Sapin II Art. 17** étend l'obligation à l'anti-corruption
- **DORA** sectoriel finance, applicable janvier 2025
- **Cyber Resilience Act** (CRA) UE, applicable 2027

→ Le **dirigeant** cherche aujourd'hui activement une preuve
opposable. C'est à nous de la lui fournir avec un certificat qui
résiste à l'audit.

---

## 6. Prochaines étapes commerciales

### Court terme (Q3 2026)

- [ ] **3 rendez-vous courtiers Occitanie** via Digital 113 et la CCI
- [ ] **Pilote** avec 1 assureur cyber régional sur 10-20 PME
- [ ] **Étude conjointe** Humanix + partenaire : ROI sensibilisation
  sur 12 mois (taux de clic phishing test, sinistres effectifs)

### Moyen terme (Q4 2026)

- [ ] Partenariat formel avec 1 acteur national (AXA, Allianz, Hiscox,
  ou Generali) avec barème publié
- [ ] Démarche ANSSI structurée : dossier d'agrément déposé
- [ ] Publication blanche conjointe assureur/Humanix sur le ROI
  sensibilisation

### Long terme (2027)

- [ ] **Reconnaissance ANSSI officielle** affichée publiquement
- [ ] **Inscription au RGS** (Référentiel Général de Sécurité)
- [ ] Présence dans les recommandations Cybermalveillance.gouv.fr

---

## 7. Contact

**Florian Durano**, fondateur Humanix Cybersecurity SASU
📧 [contact@humanix-cybersecurity.fr](mailto:contact@humanix-cybersecurity.fr)
🌐 [humanix-academie.fr/certificat](https://humanix-academie.fr/certificat)
📍 Toulouse, France

**Pour un rendez-vous** : prévoir 30 minutes. Format possible : visio
ou présentiel Toulouse / Paris. On vient avec une démonstration de la
chaîne complète (signature, vérification, intégration API).

---

> *Ce document est mis à jour à mesure que les partenariats avancent.
> Version PDF brandée disponible sur demande.*
