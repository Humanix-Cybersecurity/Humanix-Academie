# Cycle de vie du bucket `humanix-archives-audit`

`lifecycle-humanix-archives-audit.json` est la configuration de référence du
seul bucket Object Storage du projet. Elle est versionnée ici parce qu'une
règle posée à la main dans une console est une règle que personne ne relit.

## Ce que le bucket contient

Un seul bucket, deux préfixes, deux durées. C'est possible parce que la
rétention Object Lock se pose **objet par objet au dépôt**, et que le bucket
n'a **aucune règle de rétention par défaut**.

| Préfixe | Contenu | Écrit par | Verrou WORM |
| --- | --- | --- | --- |
| `postgres/` | dumps PostgreSQL chiffrés `age` | `scripts/backup-db.sh` | 30 jours |
| `auditlog/` | journaux d'audit mensuels chiffrés `age` | `scripts/archive-audit-logs.sh` | 366 jours |

## Le verrou n'efface pas

C'est la confusion à ne pas faire. L'Object Lock **interdit la suppression**
pendant sa durée ; il ne supprime rien à son terme. Sans les règles de ce
fichier, les objets s'accumuleraient indéfiniment, ce qui est une
non-conformité RGPD à part entière (art. 5.1.e, limitation de conservation).

Les deux mécanismes sont complémentaires :

- le **verrou** garantit qu'on ne peut pas effacer trop tôt ;
- le **cycle de vie** garantit qu'on efface bien assez tard.

## Pourquoi deux clauses par préfixe, et pas une

Le bucket est **versionné** — c'est une condition d'Object Lock, pas une
option qu'on aurait choisie.

Sur un bucket versionné, `Expiration.Days` ne supprime pas. Il pose un
**marqueur de suppression** : l'objet disparaît des listings ordinaires, la
version reste stockée, et reste facturée. Une configuration qui s'arrêterait
là donnerait toutes les apparences d'une rotation en place pendant que la
facture grossit.

D'où l'enchaînement, pour `postgres/` :

| Jour | Événement |
| --- | --- |
| 0 | dépôt de l'objet, verrou COMPLIANCE de 30 jours |
| 30 | le verrou expire, la suppression redevient possible |
| 31 | `Expiration.Days` pose le marqueur, la version devient non courante |
| 32 | `NoncurrentVersionExpiration` supprime réellement la version |

Le même enchaînement pour `auditlog/`, décalé à 367 et 368 jours.

**Toujours un jour APRÈS la fin du verrou.** Une expiration réglée avant ne
supprimerait rien : l'objet est protégé, et le cycle de vie ne peut pas passer
outre un verrou COMPLIANCE. La marge d'un jour absorbe aussi l'imprécision du
déclenchement, le balayage n'étant pas garanti à l'heure près.

Les règles `*-menage-marqueurs` retirent les marqueurs devenus orphelins.
`ExpiredObjectDeleteMarker` ne peut pas cohabiter avec `Days` dans la même
clause `Expiration`, d'où une règle distincte plutôt qu'un champ de plus.

## Appliquer

La console ne sait pas exprimer `NoncurrentVersionExpiration`. Il faut passer
par l'API, avec une identité qui porte `ObjectStorageFullAccess` : la clé
d'application dédiée à l'archivage n'a que le dépôt d'objets, elle ne suffit
pas ici.

```bash
aws --endpoint-url https://s3.fr-par.scw.cloud --region fr-par \
  s3api put-bucket-lifecycle-configuration \
  --bucket humanix-archives-audit \
  --lifecycle-configuration file://infra/s3/lifecycle-humanix-archives-audit.json
```

## Vérifier, parce que l'API peut accepter sans appliquer

Un `put` réussi ne prouve rien. Un champ non pris en charge peut être ignoré
**en silence** : l'appel renvoie 200, la règle est enregistrée amputée, et on
croit avoir une rotation qu'on n'a pas. On relit donc toujours :

```bash
aws --endpoint-url https://s3.fr-par.scw.cloud --region fr-par \
  s3api get-bucket-lifecycle-configuration \
  --bucket humanix-archives-audit
```

Ce qui doit apparaître dans la réponse :

- les **quatre** règles, toutes en `"Status": "Enabled"` ;
- `NoncurrentVersionExpiration` présent sur `postgres-expiration-31j` **et**
  sur `auditlog-expiration-367j`.

Si `NoncurrentVersionExpiration` manque à la relecture, la rotation est
incomplète : les versions non courantes ne seront jamais supprimées et le
stockage croîtra sans fin. Le contournement est alors un ménage périodique par
`list-object-versions` puis `delete-object --version-id`, à n'écrire que si le
cas se présente vraiment.

## État

| Date | État |
| --- | --- |
| 2026-08-13 | bucket créé, Object Lock actif, versionnement actif, **aucune règle de cycle de vie** (`NoSuchLifecycleConfiguration`) |
