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

## En prod

Le certificat doit etre fourni par Let's Encrypt (recommande), ou un
fournisseur commercial. Le format attendu par HAProxy reste le meme :
bundle `cert + key` dans un seul `.pem`.

Procedure recommandee : Caddy en sidecar pour ACME, qui ecrit le cert dans
ce dossier. Voir `docs/installation.md` section "Mise en prod TLS".

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
