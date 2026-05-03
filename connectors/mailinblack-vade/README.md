# humanix-antiphishing-bridge

Bridge bidirectionnel entre **Mailinblack** / **Vade Secure** (anti-phishing souverain 🇫🇷) et **Humanix Académie**.

## Boucle vertueuse

1. Un mail de phishing arrive dans la messagerie d'un collaborateur.
2. **Mailinblack** ou **Vade** le détecte et le bloque.
3. Le webhook sortant de l'outil tape sur ce bridge.
4. Le bridge identifie les destinataires concernés et déclenche une campagne de sensibilisation Humanix ciblée pour eux dans la journée.

> Résultat : vos collaborateurs apprennent à reconnaître les techniques exactes que les attaquants utilisent contre eux, en temps quasi-réel.

## Pré-requis

- Mailinblack ou Vade Secure avec webhooks sortants activés
- Clé API Humanix (Essentielle+)
- Endpoint Humanix `/api/integrations/edr-trigger` (à venir, MVP)

## Installation

```bash
pip install -r requirements.txt
cp .env.sample .env
# renseigner HUMANIX_API_KEY
```

## Lancement

```bash
set -a && source .env && set +a
python humanix_antiphishing_bridge.py
# Écoute sur :8081
```

Pour la prod, déployer derrière un reverse proxy HTTPS et exposer :

- `https://humanix-antiphishing.exemple.fr/webhook/mailinblack`
- `https://humanix-antiphishing.exemple.fr/webhook/vade`

## Configuration côté Mailinblack

Console admin → Webhooks → Ajouter :
- URL : `https://humanix-antiphishing.exemple.fr/webhook/mailinblack`
- Événements : `phishing.detected`

## Configuration côté Vade

Vade Secure for M365 → Webhook Configuration → Add :
- Endpoint : `https://humanix-antiphishing.exemple.fr/webhook/vade`
- Type : `ThreatDetection`

## Licence

MIT.
