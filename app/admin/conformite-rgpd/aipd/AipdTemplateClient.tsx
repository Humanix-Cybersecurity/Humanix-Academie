"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Composant client pour la zone Markdown copiable de l'AIPD generator.
//
// Pourquoi un client component ? Pour le bouton "Copier dans le presse-papier"
// qui necessite navigator.clipboard (cote browser).
//
// La logique reste minimale : afficher un <pre> avec le template, plus deux
// actions (Copier / Telecharger en .md). Pas de stockage cote serveur - le
// DPO travaille dans son outil.

import { useState } from "react";

const AIPD_TEMPLATE = `# AIPD - [Nom du traitement]

> Analyse d'Impact à la Protection des Données, conforme article 35 RGPD.
>
> **Responsable de traitement :** [Nom organisation]
> **DPO :** [Nom DPO]
> **Date de rédaction :** [JJ/MM/AAAA]
> **Date de prochaine revue :** [JJ/MM/AAAA + 1 an]
> **Statut :** Brouillon · En revue · Validé · Archivé

---

## 1. Description du traitement

### 1.1. Finalité(s) précise(s)
[Décrire pourquoi ce traitement existe - pas en termes commerciaux mais en
termes RGPD. Exemple : "Scorer les prospects pour prioriser le commercial
B2B" et non "Améliorer le service client".]

### 1.2. Acteurs
- **Responsable de traitement :** [Organisation]
- **Sous-traitants :** [Liste des sous-traitants directs avec localisation]
- **Sous-traitants ultérieurs :** [Liste des sous-traitants des sous-traitants]
- **Destinataires des données :** [Qui reçoit les données ? Internes / externes]

### 1.3. Données traitées
| Catégorie | Données précises | Source | Sensibilité |
|---|---|---|---|
| Identité | Nom, prénom, email | Formulaire site | Standard |
| Comportement | Pages visitées, clics | Cookies analytics | Standard |
| [à remplir] | [à remplir] | [à remplir] | [Standard / Sensible] |

### 1.4. Flux de données
[Schéma textuel ou diagramme : qui pousse à qui, par quel canal, avec quelle
fréquence]

### 1.5. Durée de conservation
[Pour chaque catégorie de données : durée active + durée d'archivage +
justification métier ou légale]

### 1.6. Base légale (article 6)
- [ ] 6.1.a Consentement (specifier comment recueilli)
- [ ] 6.1.b Exécution du contrat
- [ ] 6.1.c Obligation légale (préciser le texte)
- [ ] 6.1.d Sauvegarde des intérêts vitaux
- [ ] 6.1.e Mission d'intérêt public
- [ ] 6.1.f Intérêts légitimes (joindre le LIA)

---

## 2. Nécessité et proportionnalité

### 2.1. Test de nécessité
[Le traitement est-il vraiment nécessaire pour atteindre la finalité ? Quelle
alternative moins intrusive a été considérée ?]

### 2.2. Test de proportionnalité (minimisation des données)
[Toutes les données collectées sont-elles strictement nécessaires ? Y a-t-il
des champs "au cas où" qui pourraient être supprimés ?]

### 2.3. Information des personnes
[Comment les personnes sont-elles informées du traitement ? Mention au
formulaire ? Politique de confidentialite ? Notification individuelle ?]

### 2.4. Exercice des droits
[Comment les personnes peuvent-elles exercer leurs droits (accès,
rectification, effacement, opposition, portabilité) ? Quel canal ? Quel délai
de réponse ?]

---

## 3. Analyse de risques

> Pour chaque menace, évaluer la **gravité** (1=négligeable à 4=maximale) et
> la **vraisemblance** (1=peu probable à 4=quasi-certaine).

### 3.1. Accès illégitime aux données
**Sources possibles :** [interne malveillant, externe, accidentel]
**Gravité :** [1-4]
**Vraisemblance :** [1-4]
**Impacts pour les personnes :** [Décrire concrètement]

### 3.2. Modification non désirée des données
**Sources possibles :** [interne, externe, accidentel]
**Gravité :** [1-4]
**Vraisemblance :** [1-4]
**Impacts pour les personnes :** [Décrire concrètement]

### 3.3. Disparition / indisponibilité des données
**Sources possibles :** [panne, attaque, suppression accidentelle]
**Gravité :** [1-4]
**Vraisemblance :** [1-4]
**Impacts pour les personnes :** [Décrire concrètement]

---

## 4. Mesures de mitigation

### 4.1. Mesures techniques
- [ ] Chiffrement des données au repos (AES-256 ou équivalent)
- [ ] Chiffrement des données en transit (TLS 1.2+)
- [ ] Contrôle d'accès par rôles (least privilege)
- [ ] Journalisation des accès (article 30 RGPD + ISO 27001 A.12.4)
- [ ] Sauvegardes immuables / hors-ligne (3-2-1)
- [ ] Pseudonymisation / anonymisation quand possible
- [ ] Tests de pénétration réguliers
- [ ] Détection d'anomalies (DLP, SIEM)

### 4.2. Mesures organisationnelles
- [ ] Formation des collaborateurs concernés
- [ ] Procédure de gestion des demandes RGPD
- [ ] DPA signés avec sous-traitants (article 28)
- [ ] Liste des sous-traitants ultérieurs vérifiée
- [ ] Procédure de gestion des fuites (72h CNIL)
- [ ] Audit interne annuel
- [ ] Revue périodique de l'AIPD

### 4.3. Risque résiduel après mesures
| Menace | Risque initial | Risque résiduel | Acceptable ? |
|---|---|---|---|
| Accès illégitime | [G x V] | [G x V] | Oui / Non |
| Modification | [G x V] | [G x V] | Oui / Non |
| Disparition | [G x V] | [G x V] | Oui / Non |

---

## 5. Cas particuliers

### 5.1. Transferts hors UE
- [ ] Pas de transfert hors UE
- [ ] Transfert vers un pays à décision d'adéquation : [pays + lien décision]
- [ ] Transfert avec CCT + TIA : [joindre TIA]
- [ ] Transfert avec BCR : [référence BCR]

### 5.2. Profilage / décisions automatisées (article 22)
- [ ] Pas de profilage / décision automatisée
- [ ] Profilage avec intervention humaine effective
- [ ] Décision automatisée avec garanties article 22.3

### 5.3. AI Act (si applicable)
- [ ] Hors champ AI Act
- [ ] Risque limité (transparence)
- [ ] Haut risque (annexe III) - obligations du déployeur (article 26), à partir du 2 décembre 2027

---

## 6. Validation

### 6.1. Avis du DPO
[Avis circonstancie du DPO sur la conformité et l'opportunité du traitement]

### 6.2. Décision du responsable de traitement
- [ ] Mise en oeuvre approuvée
- [ ] Mise en oeuvre approuvée sous réserve des mesures suivantes : [liste]
- [ ] Consultation préalable CNIL requise (article 36)
- [ ] Mise en oeuvre rejetée

**Date de validation :** [JJ/MM/AAAA]
**Signataires :** [Nom DG] · [Nom DPO]

---

## 7. Suivi

### 7.1. Date de prochaine revue
[JJ/MM/AAAA + 1 an, ou plus court si traitement evolutif]

### 7.2. Indicateurs de suivi
- Nombre de demandes RGPD reçues : [à tracer]
- Incidents déclarés : [à tracer]
- Fuites détectées : [à tracer]
- Modifications du traitement : [à tracer]

---

> AIPD rédigée selon la méthodologie CNIL (PIA Guide v2). Modèle Humanix
> Académie - open source AGPLv3, librement réutilisable et adaptable.
`;

export default function AipdTemplateClient() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AIPD_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([AIPD_TEMPLATE], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aipd-template-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition shadow-sm"
        >
          <span aria-hidden="true">{copied ? "✓" : "📋"}</span>
          {copied ? "Copie !" : "Copier dans le presse-papier"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-primary-500 dark:text-accent-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition"
        >
          <span aria-hidden="true">⬇</span>
          Télécharger en .md
        </button>
      </div>

      <pre className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-xs leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
        {AIPD_TEMPLATE}
      </pre>
    </div>
  );
}
