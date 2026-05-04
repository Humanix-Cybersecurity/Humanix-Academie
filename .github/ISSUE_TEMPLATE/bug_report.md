---
name: Bug report
about: Signaler un bug pour que nous puissions le corriger
title: "[Bug] "
labels: ["bug", "needs-triage"]
assignees: []
---

<!--
Avant d'ouvrir cette issue, vérifie qu'aucune issue similaire n'existe déjà :
https://github.com/humanix-cybersecurity/humanix-academie/issues?q=is%3Aissue

Pour les vulnérabilités de sécurité : NE PAS ouvrir d'issue publique.
Voir SECURITY.md → security@humanix-cybersecurity.fr
-->

## Description du bug

Décris clairement et concisément le bug que tu rencontres.

## Comportement attendu

Ce qui devrait se passer normalement.

## Comportement observé

Ce qui se passe réellement (avec le message d'erreur si possible).

## Étapes pour reproduire

1. Aller sur '...'
2. Cliquer sur '...'
3. Faire défiler jusqu'à '...'
4. Voir l'erreur

## Captures d'écran

Si applicable, ajoute des captures d'écran pour expliquer le problème.

## Environnement

| Item                   | Valeur                                       |
| ---------------------- | -------------------------------------------- |
| Version Humanix        | (ex: `v1.0.0` ou commit hash)                |
| Mode de déploiement    | (ex: Docker Compose, bare-metal, Kubernetes) |
| OS hôte                | (ex: Ubuntu 24.04 LTS, macOS 14.5)           |
| Version Node.js        | (`node --version`)                           |
| Version PostgreSQL     | (`psql --version`)                           |
| Navigateur (si bug UI) | (ex: Firefox 138, Chrome 134)                |

## Logs pertinents

```
Colle ici les logs (sans données sensibles)
docker compose logs app | tail -50
```

## Configuration

```env
# Colle ici les variables d'environnement pertinentes
# (SANS les secrets : retire AUTH_SECRET, DATABASE_URL, etc.)
NEXT_PUBLIC_APP_URL=https://...
DEMO_MODE=...
```

## Contexte additionnel

Toute autre information utile (ex: ça marchait avant la version X, les
collaborateurs concernés, etc.)
