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

> Analyse d'Impact a la Protection des Données, conforme article 35 RGPD.
>
> **Responsable de traitement :** [Nom organisation]
> **DPO :** [Nom DPO]
> **Date de redaction :** [JJ/MM/AAAA]
> **Date de prochaine revue :** [JJ/MM/AAAA + 1 an]
> **Statut :** Brouillon · En revue · Valide · Archive

---

## 1. Description du traitement

### 1.1. Finalite(s) precise(s)
[Decrire pourquoi ce traitement existe - pas en termes commerciaux mais en
termes RGPD. Exemple : "Scorer les prospects pour prioriser le commercial
B2B" et non "Ameliorer le service client".]

### 1.2. Acteurs
- **Responsable de traitement :** [Organisation]
- **Sous-traitants :** [Liste des sous-traitants directs avec localisation]
- **Sous-traitants ulterieurs :** [Liste des sous-traitants des sous-traitants]
- **Destinataires des données :** [Qui recoit les données ? Internes / externes]

### 1.3. Données traitees
| Catégorie | Données precises | Source | Sensibilite |
|---|---|---|---|
| Identite | Nom, prenom, email | Formulaire site | Standard |
| Comportement | Pages visitees, clics | Cookies analytics | Standard |
| [a remplir] | [a remplir] | [a remplir] | [Standard / Sensible] |

### 1.4. Flux de données
[Schema textuel ou diagramme : qui pousse a qui, par quel canal, avec quelle
fréquence]

### 1.5. Duree de conservation
[Pour chaque catégorie de données : duree active + duree d'archivage +
justification metier ou legale]

### 1.6. Base legale (article 6)
- [ ] 6.1.a Consentement (specifier comment recueilli)
- [ ] 6.1.b Execution du contrat
- [ ] 6.1.c Obligation legale (preciser le texte)
- [ ] 6.1.d Sauvegarde des interets vitaux
- [ ] 6.1.e Mission d'interet public
- [ ] 6.1.f Interets legitimes (joindre le LIA)

---

## 2. Necessite et proportionnalite

### 2.1. Test de necessite
[Le traitement est-il vraiment necessaire pour atteindre la finalite ? Quelle
alternative moins intrusive a ete consideree ?]

### 2.2. Test de proportionnalite (minimisation des données)
[Toutes les données collectees sont-elles strictement necessaires ? Y a-t-il
des champs "au cas ou" qui pourraient être supprimes ?]

### 2.3. Information des personnes
[Comment les personnes sont-elles informees du traitement ? Mention au
formulaire ? Politique de confidentialite ? Notification individuelle ?]

### 2.4. Exercice des droits
[Comment les personnes peuvent-elles exercer leurs droits (accès,
rectification, effacement, opposition, portabilite) ? Quel canal ? Quel delai
de reponse ?]

---

## 3. Analyse de risques

> Pour chaque menace, evaluer la **gravite** (1=negligeable a 4=maximale) et
> la **vraisemblance** (1=peu probable a 4=quasi-certaine).

### 3.1. Acces illegitime aux données
**Sources possibles :** [interne malveillant, externe, accidentel]
**Gravite :** [1-4]
**Vraisemblance :** [1-4]
**Impacts pour les personnes :** [Decrire concretement]

### 3.2. Modification non desiree des données
**Sources possibles :** [interne, externe, accidentel]
**Gravite :** [1-4]
**Vraisemblance :** [1-4]
**Impacts pour les personnes :** [Decrire concretement]

### 3.3. Disparition / indisponibilite des données
**Sources possibles :** [panne, attaque, suppression accidentelle]
**Gravite :** [1-4]
**Vraisemblance :** [1-4]
**Impacts pour les personnes :** [Decrire concretement]

---

## 4. Mesures de mitigation

### 4.1. Mesures techniques
- [ ] Chiffrement des données au repos (AES-256 ou equivalent)
- [ ] Chiffrement des données en transit (TLS 1.2+)
- [ ] Controle d'accès par roles (least privilege)
- [ ] Journalisation des accès (article 30 RGPD + ISO 27001 A.12.4)
- [ ] Sauvegardes immuables / hors-ligne (3-2-1)
- [ ] Pseudonymisation / anonymisation quand possible
- [ ] Tests de penetration reguliers
- [ ] Detection d'anomalies (DLP, SIEM)

### 4.2. Mesures organisationnelles
- [ ] Formation des collaborateurs concernes
- [ ] Procedure de gestion des demandes RGPD
- [ ] DPA signes avec sous-traitants (article 28)
- [ ] Liste des sous-traitants ulterieurs verifiee
- [ ] Procedure de gestion des fuites (72h CNIL)
- [ ] Audit interne annuel
- [ ] Revue periodique de l'AIPD

### 4.3. Risque residuel après mesures
| Menace | Risque initial | Risque residuel | Acceptable ? |
|---|---|---|---|
| Acces illegitime | [G x V] | [G x V] | Oui / Non |
| Modification | [G x V] | [G x V] | Oui / Non |
| Disparition | [G x V] | [G x V] | Oui / Non |

---

## 5. Cas particuliers

### 5.1. Transferts hors UE
- [ ] Pas de transfert hors UE
- [ ] Transfert vers un pays a decision d'adequation : [pays + lien decision]
- [ ] Transfert avec CCT + TIA : [joindre TIA]
- [ ] Transfert avec BCR : [reference BCR]

### 5.2. Profilage / decisions automatisees (article 22)
- [ ] Pas de profilage / decision automatisee
- [ ] Profilage avec intervention humaine effective
- [ ] Decision automatisee avec garanties article 22.3

### 5.3. AI Act (si applicable)
- [ ] Hors champ AI Act
- [ ] Risque limite (transparence)
- [ ] Risque eleve (annexe III) - marquage CE requis

---

## 6. Validation

### 6.1. Avis du DPO
[Avis circonstancie du DPO sur la conformité et l'opportunite du traitement]

### 6.2. Decision du responsable de traitement
- [ ] Mise en oeuvre approuvee
- [ ] Mise en oeuvre approuvee sous reserve des mesures suivantes : [liste]
- [ ] Consultation prealable CNIL requise (article 36)
- [ ] Mise en oeuvre rejetee

**Date de validation :** [JJ/MM/AAAA]
**Signataires :** [Nom DG] · [Nom DPO]

---

## 7. Suivi

### 7.1. Date de prochaine revue
[JJ/MM/AAAA + 1 an, ou plus court si traitement evolutif]

### 7.2. Indicateurs de suivi
- Nombre de demandes RGPD recues : [a tracer]
- Incidents declares : [a tracer]
- Fuites detectees : [a tracer]
- Modifications du traitement : [a tracer]

---

> AIPD redigee selon la methodologie CNIL (PIA Guide v2). Modèle Humanix
> Academie - open source AGPLv3, librement reutilisable et adaptable.
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
          Telecharger en .md
        </button>
      </div>

      <pre className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-xs leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
        {AIPD_TEMPLATE}
      </pre>
    </div>
  );
}
