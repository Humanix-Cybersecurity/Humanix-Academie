# Procédure — violation de données personnelles

> **Engagement contractuel : notifier le Client sous 48 heures** après avoir eu
> connaissance d'une violation (DPA, article 6). C'est plus strict que
> l'article 33.2 du RGPD, qui parle d'un « délai injustifié » sans le chiffrer.
>
> Cet engagement a été pris volontairement le 2026-08-14. Le présent document
> est ce qui le rend tenable — sans lui, ce serait une promesse en l'air.
>
> **Écrit pour être exécuté seul, la nuit, sous stress.** D'où le format :
> des étapes courtes, dans l'ordre, avec les commandes déjà écrites.

---

## Ce qui déclenche cette procédure

Une **violation de données personnelles** est, au sens de l'article 4(12), toute
atteinte à la **confidentialité**, à l'**intégrité** ou à la **disponibilité**
de données personnelles — accidentelle ou illicite.

Les trois comptent. On pense spontanément au vol de données ; une base
irrécupérable ou des données corrompues en sont aussi.

Déclenchent la procédure, sans hésiter :

- accès non autorisé à la base ou à une sauvegarde ;
- fuite d'identifiants (clé SSH, `CRON_SECRET`, clé S3, mot de passe SMTP) ;
- envoi d'un courriel au mauvais destinataire contenant des données ;
- perte de données sans restauration possible ;
- compromission d'un poste ayant accès à la production ;
- cloisonnement entre clients rompu — un client voit les données d'un autre.

**En cas de doute, on déclenche.** Une procédure ouverte puis close sans suite
coûte une heure. Une violation qualifiée trop tard coûte l'engagement
contractuel, et la confiance.

---

## Heure zéro

Le délai de 48 heures court à partir du moment où **vous avez connaissance** de
la violation — pas de sa survenue, pas de sa confirmation complète.

**Notez l'heure immédiatement**, avant toute investigation. C'est la première
chose qu'un client ou une autorité vous demandera, et la mémoire la reconstruit
mal.

```bash
date -u +"Heure zero : %Y-%m-%dT%H:%M:%SZ" | tee -a ~/violations/journal.txt
```

---

## Étape 1 — Contenir, avant de comprendre (0 à 2 h)

L'ordre compte : on arrête l'hémorragie avant de diagnostiquer.

**Si des identifiants sont compromis**, les révoquer d'abord :

```bash
# Clés SSH : retirer la cle suspecte de ~/.ssh/authorized_keys
# Cle S3 : revoquer depuis la console Scaleway
# CRON_SECRET, AUTH_SECRET : regenerer dans /etc/humanix/ puis redeployer
```

**Si un accès non autorisé est en cours**, couper l'accès public plutôt que
d'observer :

```bash
ssh -t humanix@humanix-academie.fr 'sudo ufw deny 443 && sudo ufw status'
```

⚠️ Cela met le service hors ligne. C'est un arbitrage assumé : une indisponibilité
se rattrape, une exfiltration non.

**Préserver les traces avant qu'elles ne tournent.** Les journaux ont une
rétention ; une investigation qui commence trois jours plus tard trouve un
journal vide.

```bash
ssh -t humanix@humanix-academie.fr 'sudo journalctl --since "24 hours ago" > /tmp/violation-journal.txt && podman logs humanix-prod-app --since 24h > /tmp/violation-app.txt && sudo tar czf /tmp/violation-traces.tgz /tmp/violation-*.txt /var/log/haproxy.log'
```

Puis rapatrier l'archive **hors de la machine concernée**.

---

## Étape 2 — Qualifier (2 à 12 h)

Quatre questions, dans cet ordre. Écrire les réponses au fur et à mesure dans
le registre, même incomplètes.

**Y a-t-il eu des données personnelles ?** Si non, ce n'est pas une violation au
sens du RGPD — mais on documente quand même l'incident.

**Lesquelles, et combien de personnes ?** Consulter le tableau des données
traitées au DPA, article 2. Un ordre de grandeur suffit à ce stade.

**Quels clients sont touchés ?** Le cloisonnement par tenant limite en principe
la portée. Le vérifier plutôt que le supposer.

```bash
ssh humanix@humanix-academie.fr 'podman exec -i humanix-prod-postgres sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -At -F\"|\"" <<< "select t.name, count(u.id) from \"Tenant\" t left join \"User\" u on u.\"tenantId\" = t.id group by t.name;"'
```

**Quel risque pour les personnes ?** Un score de risque cyber divulgué n'a pas
la portée d'un mot de passe. C'est cette évaluation qui déterminera si le
Client doit notifier les personnes concernées (art. 34).

---

## Étape 3 — Notifier le Client (avant 48 h)

**C'est le Client qui notifie la CNIL, pas vous.** Vous êtes sous-traitant : votre
obligation est de l'informer, la sienne est de décider et de déclarer (art. 33.2).

Ne pas attendre d'avoir tout compris. Une première notification incomplète, dans
les délais, vaut mieux qu'une notification complète hors délai — et l'article
33.4 prévoit explicitement l'information par phases.

**Destinataires** : les ADMIN et RSSI du tenant concerné.

```bash
ssh humanix@humanix-academie.fr 'podman exec -i humanix-prod-postgres sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -At" <<< "select u.email from \"User\" u join \"Tenant\" t on t.id = u.\"tenantId\" where t.name = '"'"'NOM_DU_CLIENT'"'"' and u.role in ('"'"'ADMIN'"'"','"'"'RSSI'"'"') and u.email is not null;"'
```

**Contenu minimal** (art. 33.3) :

1. la nature de la violation, les catégories et le nombre approximatif de
   personnes et d'enregistrements concernés ;
2. le point de contact — `rgpd@humanix-cybersecurity.fr` ;
3. les conséquences probables ;
4. les mesures prises et celles proposées au Client.

⚠️ **Ne pas utiliser la plateforme elle-même** pour notifier si c'est elle qui
est compromise. Un courriel depuis un canal indépendant.

---

## Étape 4 — Consigner (obligatoire, art. 33.5)

Le registre des violations est **une obligation légale**, et il vaut preuve.
Il se tient même pour les violations non notifiées — la CNIL peut le demander.

Un fichier par violation, sous `~/violations/AAAA-MM-JJ-slug.md`, sur le modèle
de `docs/REGISTRE-VIOLATIONS-MODELE.md`.

Le remplir **au fil de l'eau**, pas à la fin. Une chronologie reconstruite deux
jours plus tard est fausse, et cela se voit.

---

## Ce qui manque encore, et qu'il faut regarder en face

**La détection.** Cette procédure suppose que vous _savez_ qu'une violation a eu
lieu. Aujourd'hui, rien ne vous alerte : les journaux partent vers Loki, mais
aucune règle ne déclenche de notification. Un accès anormal à 3 h du matin
n'atteindra personne avant votre prochaine connexion.

C'est le maillon faible, et il rend le délai de 48 heures théorique : il ne
court qu'à partir de votre _connaissance_, mais un client attend légitimement
que cette connaissance soit rapide.

**Pistes, par coût croissant** : une alerte Grafana sur les échecs
d'authentification et les exports massifs ; une surveillance de l'intégrité des
fichiers (AIDE est installé, son rapport n'est pas lu) ; une astreinte
téléphonique réelle.

**Le point de contact côté Client.** Notifier les ADMIN suppose que leurs
adresses sont à jour et lues. Le DPA devrait exiger un contact de sécurité
désigné, distinct des comptes de la plateforme — un client dont la plateforme
est inaccessible ne lira pas une notification qui y transite.

---

## Aide-mémoire

| Quand         | Quoi                                                        |
| ------------- | ----------------------------------------------------------- |
| Immédiatement | Noter l'heure zéro                                          |
| 0 – 2 h       | Contenir, révoquer, préserver les traces                    |
| 2 – 12 h      | Qualifier : données, personnes, clients, risque             |
| Avant 48 h    | **Notifier les Clients concernés**                          |
| En continu    | Consigner au registre                                       |
| Après         | Compléter, corriger la cause, mettre à jour cette procédure |
