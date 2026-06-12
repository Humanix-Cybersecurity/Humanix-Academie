# infra/haproxy/certs

Dossier de certificats TLS, monte en read-only dans le container HAProxy en
mode dev (`docker-compose.dev.yml`) et en prod (Let's Encrypt).

## En dev (auto-genere par scripts/start.sh)

Le script `scripts/start.sh` genere automatiquement un certificat local via
[mkcert](https://github.com/FiloSottile/mkcert) :

- `humanix.local.pem` : bundle cert + key concatenes (format attendu par
  HAProxy via la directive `bind ssl crt /chemin/vers/cert.pem`)
- `humanix.local.pem.crt` et `humanix.local.pem.key` : versions separees
  (utiles pour debug ou autre outillage)

Le CA local mkcert est installe une fois dans le trust store OS / browser
via `mkcert -install`. Aucun warning "site non securise" n'apparait dans
Chrome / Firefox / Safari sur la machine ou le CA est trust.

**Le fichier .pem est git-ignored** (cf. `.gitignore`) - chaque dev genere
le sien.

## En prod - wildcard via acme.sh + DNS-01 Scaleway

Le `haproxy.cfg` de prod attend un fichier **`wildcard.pem`** qui couvre
`humanix-academie.fr` ET `*.humanix-academie.fr` (multi-tenancy par subdomain :
chaque tenant a son sous-domaine `acme.humanix-academie.fr`, donc un cert
wildcard est obligatoire).

Pourquoi DNS-01 et pas HTTP-01 : Let's Encrypt n'emet pas de wildcard sur
HTTP-01. Le challenge DNS-01 cree un TXT record `_acme-challenge` que
Scaleway DNS expose, ACME le verifie, et le cert tombe.

Procedure (une fois par machine, l'auto-renewal se met en crontab) :

```bash
# 1. acme.sh installe avec email valide
curl https://get.acme.sh | sh -s email=florian@humanix-cybersecurity.fr

# 2. Token API Scaleway scope DNS Zone read+write (console IAM)
export SCALEWAY_API_TOKEN="<secret-key-scaleway>"

# 3. Issue wildcard (Let's Encrypt prod, cle ECDSA P-256 plus rapide que RSA)
~/.acme.sh/acme.sh --issue \
  --dns dns_scaleway \
  -d humanix-academie.fr \
  -d '*.humanix-academie.fr' \
  --server letsencrypt \
  --keylength ec-256

# 4. Install dans le format HAProxy + hot-reload zero downtime
~/.acme.sh/acme.sh --install-cert -d humanix-academie.fr --ecc \
  --fullchain-file /tmp/fullchain.pem \
  --key-file /tmp/privkey.pem \
  --reloadcmd "cat /tmp/fullchain.pem /tmp/privkey.pem > /opt/humanix-prod/infra/haproxy/certs/wildcard.pem && chmod 600 /opt/humanix-prod/infra/haproxy/certs/wildcard.pem && docker compose -f /opt/humanix-prod/docker-compose.yml exec -T haproxy kill -USR2 1"
```

L'auto-renewal Let's Encrypt (90 jours) est ajoute a `crontab -e` par
acme.sh automatiquement. Aucune intervention manuelle ensuite.

**Le fichier `wildcard.pem` est git-ignored** (cf. `.gitignore`) - il ne
quitte jamais la machine de prod.

## Format HAProxy

HAProxy attend un fichier `.pem` qui contient le certificat ET la cle privee
concatenes :

```pem
-----BEGIN CERTIFICATE-----
... cert ici ...
-----END CERTIFICATE-----
-----BEGIN PRIVATE KEY-----
... cle privee ici ...
-----END PRIVATE KEY-----
```

`scripts/start.sh` produit ce format automatiquement.
