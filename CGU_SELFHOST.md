# Conditions d'utilisation - Humanix Académie Community Edition (self-host)

> **Version 1.0 · 4 mai 2026**
> Ce document accompagne le fichier [`LICENSE`](./LICENSE) et précise en
> langage accessible les obligations qui s'imposent à toute personne ou
> organisation qui télécharge, installe et exécute Humanix Académie en
> self-host.
>
> **⚠️ Ce document n'est pas un contrat.** Il vulgarise les exigences
> légales de la licence AGPL-3.0-or-later qui régit le code. En cas de
> divergence, le texte officiel de la licence (LICENSE) prévaut toujours.

---

## 1. Ce que vous pouvez faire (gratuitement, sans nous demander)

- Télécharger le code source depuis GitHub.
- Installer la plateforme sur vos propres serveurs (cloud, on-prem, VPS,
  Kubernetes, peu importe).
- L'utiliser pour sensibiliser vos collaborateurs, vos clients, votre
  famille, vos étudiants.
- La modifier, la traduire, la personnaliser, ajouter des modules
  pédagogiques propres à votre organisation.
- La redistribuer (dans le respect des conditions §3 ci-dessous).
- L'auditer ligne par ligne.
- L'utiliser dans un cadre commercial (ESN qui revend l'installation à
  ses clients PME, par exemple).

---

## 2. Aucune garantie, aucun support obligatoire

Le logiciel est fourni **« en l'état »** (clause AGPL §15-16) :

- Aucune garantie de fonctionnement.
- Aucune garantie de sécurité.
- Aucune obligation de support de notre part.
- Aucun SLA.

Le **support communautaire gratuit** est disponible sur :

- [GitHub Discussions](https://github.com/humanix-cybersecurity/humanix-academie/discussions)
- [Issues GitHub](https://github.com/humanix-cybersecurity/humanix-academie/issues)
  (pour les bugs reproductibles)
- [Discord communautaire](https://discord.gg/humanix) (à venir)

Si vous avez besoin de **support contractualisé** (SLA, hotline, audit,
RSSI externalisé), souscrivez à une offre Cloud payante ou Enterprise
sur [humanix-cybersecurity.fr/tarifs](https://humanix-cybersecurity.fr/tarifs),
ou contactez-nous à <contact@humanix-cybersecurity.fr>.

---

## 3. Vos obligations principales

### 3.1 Préserver la mention de licence

Si vous distribuez ou déployez Humanix (modifié ou non), vous devez
**conserver** :

- Le fichier [`LICENSE`](./LICENSE) à la racine.
- Le fichier [`NOTICE.md`](./NOTICE.md) à la racine.
- Toute mention de copyright dans les fichiers source.

### 3.2 Publier vos modifications si vous exposez Humanix comme service réseau

C'est la **clause clé de l'AGPL** (article 13). Si vous :

- Modifiez le code,
- ET déployez votre version modifiée comme **service en ligne**
  (interaction utilisateur via réseau - c'est le cas par construction
  pour Humanix qui est une application web),

→ alors vous devez **fournir aux utilisateurs** un moyen de récupérer le
**code source complet** de votre version modifiée, sous la même licence
AGPL.

En pratique : ajoutez un lien « Code source » dans le footer de votre
instance pointant vers votre fork public. C'est tout.

### 3.3 Ne pas usurper la marque Humanix

La marque « Humanix », « Humanix Académie », « Humanix Community
Edition » et le logo Hex sont des **marques déposées** de
Humanix-Cybersecurity SASU. Voir [`TRADEMARK.md`](./TRADEMARK.md) pour
le détail.

Vous pouvez :

- Mentionner « contient Humanix » dans votre intégration.
- Faire un lien vers le projet officiel.

Vous ne pouvez **pas** :

- Vendre un produit dont le nom intègre « Humanix » sans autorisation
  écrite.
- Utiliser le logo modifié.
- Enregistrer un domaine `*humanix*` sans autorisation.

### 3.4 Si vous contribuez en upstream

Toute contribution (Pull Request) au repo officiel
`github.com/humanix-cybersecurity/humanix-academie` requiert la
signature préalable du
[Contributor License Agreement (CLA)](.github/CLA.md). Un robot CLA
Assistant le déclenche automatiquement à votre première PR.

---

## 4. Données personnelles et RGPD (point critique)

### 4.1 Self-host = vous êtes seul responsable de traitement

Si vous installez Humanix Académie chez vous, vous devenez :

- **Responsable de traitement** au sens du RGPD pour toutes les données
  personnelles que la plateforme traite (vos collaborateurs, vos
  utilisateurs, etc.).
- Seul tenu d'établir votre propre politique de confidentialité.
- Seul tenu de gérer vos sous-traitants (hébergeur, mailer, etc.).
- Seul tenu de notifier la CNIL en cas de violation.

**Humanix-Cybersecurity n'est pas votre sous-traitant** dans ce mode.
Notre responsabilité s'arrête à fournir un logiciel correctement
conçu, qui respecte les principes de Privacy by Design.

### 4.2 Modèles fournis à titre indicatif

Pour vous aider, nous publions dans le repo :

- Un modèle de **politique de confidentialité** (`docs/PRIVACY_TEMPLATE.md`).
- Un modèle de **registre des traitements** (`docs/RECORDS_TEMPLATE.md`).
- Un modèle de **DPA** vide à compléter (`docs/DPA_TEMPLATE.md`).

Ces modèles sont des **points de départ**, pas des documents
contractuels prêts à signer. Faites-les relire par votre DPO ou un
avocat compétent.

---

## 5. Vous voulez du « plus » ?

Si vous avez besoin de :

| Besoin                                       | Où aller                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Hébergement managé                           | [Cloud Humanix Starter/Pro](https://humanix-cybersecurity.fr/tarifs) |
| Modules pédagogiques avancés (catalogue 30+) | Plans Cloud payants                                                                         |
| Phishing simulé avec infrastructure          | Plan Cloud Pro                                                                              |
| Pack NIS2 turnkey clé en main                | Plan Cloud Pro                                                                              |
| SSO entreprise (SAML, SCIM avancé)           | Plan Cloud Pro / Enterprise                                                                 |
| Audit cyber, formation, RSSI externalisé     | <contact@humanix-cybersecurity.fr> (services)                                               |
| Licence commerciale alternative à l'AGPL     | <contact@humanix-cybersecurity.fr>                                                          |

---

## 6. Contact

Pour toute question :

- **Communauté** : Discord ou GitHub Discussions
- **Bug reproductible** : GitHub Issues
- **Sécurité** : <security@humanix-cybersecurity.fr> (PGP recommandé)
- **Questions juridiques / commerciales** : <contact@humanix-cybersecurity.fr>

---

**Humanix-Cybersecurity SASU** · 16 Rue Joseph Loiret, 30100 Alès, France
SIREN 103 901 799 · contact@humanix-cybersecurity.fr
