<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Trame AIPD - Veille d'exposition numérique des comptes salariés (Phase 2 B2B)

> **STATUT : TRAME À FAIRE VALIDER.** Analyse d'Impact relative à la Protection
> des Données. Ce document est une trame pré-remplie côté Humanix (sous-traitant)
> que le client (responsable de traitement) instancie et fait valider par son
> DPO / un juriste **avant toute activation** de la veille. Sans AIPD instanciée,
> la veille B2B est en **NO-GO**.
>
> Aligné sur la méthode CNIL (PIA). Le générateur AIPD existant de l'Académie
> (`/admin/dpo/aipd`) peut servir de point de départ instanciable par tenant.

---

## 1. Description du traitement

| Rubrique | Contenu |
|---|---|
| **Nom** | Veille d'exposition numérique des comptes professionnels |
| **Finalité** | Détecter les adresses email professionnelles de l'organisation présentes dans des fuites de données publiques, pour sécuriser les accès et déclencher une formation ciblée |
| **Responsable de traitement** | Le client (employeur) |
| **Sous-traitant** | Humanix (art. 28 RGPD), hébergement France |
| **Personnes concernées** | Salariés titulaires d'une adresse email du/des domaine(s) de l'organisation |
| **Catégories de données** | Adresse email pro ; présence/absence dans une fuite publique ; métadonnées de la fuite (date, types de données exposées) ; statut de remédiation |
| **Données sensibles (art. 9)** | **Aucune traitée intentionnellement.** Voir § 5 (risque résiduel). |

## 2. Base légale et nécessité

- **Base légale** : intérêt légitime de l'employeur (RGPD art. 6.1.f) à assurer la sécurité de son système d'information.
- **Test de mise en balance** : la finalité sécurité prime sur une atteinte minime aux droits (donnée déjà publique, périmètre pro uniquement, finalité non disciplinaire). À documenter formellement.
- **Nécessité / proportionnalité** : seules les adresses du domaine pro sont traitées ; aucune donnée personnelle au sens « vie privée » n'est collectée au-delà du strict constat d'exposition.

## 3. Mesures de protection (privacy-by-design)

| Mesure | Mise en œuvre |
|---|---|
| Minimisation | Stockage du strict nécessaire : référence de fuite + statut. Pas de contenu de fuite stocké. |
| Souveraineté | Hébergement France, aucun transfert hors UE. Matching contre base de fuites publiques souveraine. |
| Périmètre | Filtre automatique : tout email hors domaine du tenant → **suppression immédiate, non journalisée**. |
| Finalité non punitive | Inscrit au DPA et affiché dans l'UI : aucun usage disciplinaire/évaluation. |
| Validation humaine | Toute détection passe par une validation RSSI avant notification au salarié (anti-faux positif). |
| Transparence | Notice salariés diffusée (cf. `notice-transparence-salaries.md`) + info/consultation CSE. |
| Durée de conservation | Configurable par tenant, purge automatique à échéance. |
| Traçabilité | Audit log opposable (`EXPOSURE_DETECTED`, `EXPOSURE_TRAINING_ASSIGNED`). |
| Réversibilité | « Kill switch » : désactivation immédiate de la veille par tenant et par Humanix. |
| Droits des personnes | Accès/rectification/effacement/opposition via le DPO du tenant. |

## 4. Sous-traitance et flux

- **Humanix = sous-traitant** : DPA art. 28 signé avant activation, listant les sous-traitants ultérieurs éventuels (aucun hors UE).
- **Pas de sous-traitant US** pour la donnée sensible. (Le check *password* du tier gratuit utilise le k-anonymat HIBP - aucune donnée personnelle n'y circule, et il est **hors périmètre de cette AIPD B2B**.)

## 5. Analyse des risques

| Risque | Gravité | Vraisemblance | Mesures de réduction |
|---|---|---|---|
| Détection de données d'un tiers (non-salarié) | Élevée | Faible | Filtre domaine + suppression immédiate non journalisée |
| Faux positif notifié au salarié → stress injustifié | Moyenne | Moyenne | Validation RSSI obligatoire avant notification |
| Détournement à des fins disciplinaires | Élevée | Faible | Interdiction contractuelle (DPA) + UI + traçabilité |
| Donnée sensible incidemment révélée par une fuite | Élevée | Faible | Ne pas stocker le contenu de la fuite, seulement la référence |
| Réidentification via agrégats | Faible | Faible | Stats org. seulement ; pas de petits effectifs ré-identifiants |

## 6. Avis du DPO et décision

- [ ] Avis du DPO du client : « __________ »
- [ ] Test de mise en balance intérêt légitime documenté
- [ ] Notice salariés diffusée + CSE informé/consulté
- [ ] DPA art. 28 signé
- [ ] Durée de conservation paramétrée

**Décision d'activation (Go/No-Go) :** la veille n'est activée que si **les 5 cases ci-dessus sont cochées**. À défaut → **NO-GO**, on ne livre pas.

---

> Red lines hors périmètre de cette AIPD (NO-GO séparés tant que non blindés
> par leur propre analyse) : stealer logs / infostealers, veille VIP/dirigeants,
> alerting individuel temps réel. Cf. `roadmap.md`.
