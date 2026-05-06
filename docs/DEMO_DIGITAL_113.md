# Demo runbook — Digital 113 · 21 mai 2026

> Document de scene. Imprimable, glissable dans la poche. 3 versions de demo
> (5 / 10 / 20 minutes) selon le format alloue, plus le plan de repli si quelque
> chose lache en live.

---

## TL;DR — la promesse a tenir

Faire ressentir, en moins d'un quart d'heure, les **3 différenciateurs clés** :

1. **MCP server FR** — premier mover SAT/HRM (Claude Desktop parle a la plateforme en direct).
2. **Vishing souverain** — Mistral (Paris) + Piper TTS (local), 100 % FR/UE, vs OpenAI/AWS US des concurrents.
3. **Open source AGPLv3** — code public le 26 mai, repo GitHub, contrat lisible (cf. `/lancement-oss`).

Les autres atouts (RGAA, Pack NIS2, ecosysteme connecteurs FR) restent en reserve si l'auditeur creuse.

---

## Pre-vol — checklist 60 minutes avant l'intervention

- [ ] Connexion internet stable testee (4G operateur en backup, 1 Go disponible)
- [ ] `npm run build` réussi sur la machine démo
- [ ] `npm run dev` lance, ports 3000 disponibles
- [ ] Claude Desktop ouvert avec le MCP `humanix` connecté (vérifier l'icône clé de bricolage 🔧 dans le composeur)
- [ ] Tenant demo `tenant-d113` initialise avec les 7 utilisateurs fixtures (cf. `prisma/seed-tenant-d113.ts`)
- [ ] Une cle API Humanix valide dans `~/Library/Application Support/Claude/claude_desktop_config.json`
- [ ] Browser pret avec 4 onglets : `/lancement-oss`, `/admin`, `/admin/vishing`, [GitHub repo](https://github.com/Humanix-Cybersecurity/Humanix-Academie)
- [ ] Casque + micro testes. Volume verifie pour Piper TTS.
- [ ] Slide deck en backup (PDF) sur cle USB en cas de panne complete

---

## Version 5 minutes — pitch flash

Pour un slot rapide entre deux speakers ou un cafe corner.

**1. Le constat (45 s)**
> "90 % des cyberattaques contre une PME francaise passent par un humain. 90 % des outils pour former cet humain viennent des Etats-Unis et coutent 8 000 € a 30 000 € par an. Humanix Academie comble ce vide — francais, libre, accessible."

**2. Le coup de force MCP (1 min 30)**

Naviguer vers Claude Desktop. Lancer en direct :

> "Claude, donne-moi le top 5 des utilisateurs avec le score de risque humain le plus eleve dans mon tenant Humanix."

Resultat attendu en 3 s : Claude appelle `humanix_users_at_risk(limit=5)`, retourne une liste lisible. **Premier MCP server SAT/HRM au monde** — l'argument tombe seul.

**3. Le coup de force vishing souverain (1 min 30)**

Naviguer vers `/admin/vishing`. Selectionner template "fake-direction", service "Compta", difficulte "medium". Cliquer "Generer". Mistral (Paris) renvoie le script en 4-6 s. Cliquer "Ecouter" pour declencher Piper TTS (local). Le speaker entend la voix synthetique en francais.

> "Cette stack — Mistral Paris + Piper en local — est la seule 100 % FR/UE pour les attaques par voix. Adaptive Security et Hoxhunt utilisent OpenAI ou AWS US — Cloud Act."

**4. Le contrat OSS (1 min)**

Switcher sur `/lancement-oss`. Le compte a rebours s'affiche.

> "Le 26 mai 2026, tout le code passe en AGPLv3. Repo public, fork autorise, 4 engagements traces. Si vous voulez auditer la plateforme avant signature, vous le ferez ligne par ligne."

**5. Le CTA (30 s)**

> "Demo gratuite sur app.humanix-cybersecurity.fr/demo. Repo deja publie sur github.com/Humanix-Cybersecurity. Une question ?"

---

## Version 10 minutes — atelier court

On garde la structure 5 min + on ajoute :

**6. Photo claire de la maturite (2 min)**

Naviguer vers `/audit-flash`. Demarrer le diagnostic en 5 questions devant le public. Afficher le resultat — vocabulaire bienveillant ("photo claire", "leviers", pas "score de risque"). Commenter :

> "Notre approche pedagogique est fondamentalement differente : on ne fait pas peur, on fait grandir. Les concurrents americains poussent la peur ('clickrate 27 %, vous etes en danger'). Nous on dit 'voici 3 leviers a ta portee aujourd'hui'."

**7. Conformite cartes sur table (2 min)**

Naviguer vers `/comparatif`. Scroll jusqu'au chapitre "Conformite & souverainete".

> "On dit franchement ce qu'on fait mieux que nos concurrents, ce qu'on fait equivalent, et ce qu'on apprend d'eux. Aucune autre suite cyber francaise ne le fait."

---

## Version 20 minutes — masterclass

On garde la structure 10 min + on ajoute :

**8. Module pedagogique vivant (3 min)**

Naviguer vers `/saisons/donnees-sensibles/03-fuite-72h`. Faire vivre le scenario : decision en 3 choix, debrief. Le speaker se met dans la peau du DPO.

> "12 saisons, 4 saisons completes a 6 episodes expert (phishing, mots de passe, donnees sensibles, teletravail). Cible Q3 2026 : 30 modules expert. Chaque module est un scenario terrain, pas une slide PowerPoint warmup."

**9. Connecteurs souverains (3 min)**

Naviguer vers `/integrations`. Mentionner les 6 connecteurs FR : Sekoia, HarfangLab, Mailinblack, Vade, Lucca, GLPI.

> "Aucune suite americaine n'a ces connecteurs. Et notre connecteur natif CISO Assistant (intuitem) est le pont vers la conformite gouvernance — ecosysteme cyber souverain francais coherent."

**10. Self-host en 10 minutes (4 min)**

Switcher au terminal. Lancer :

```bash
git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie
cd Humanix-Academie
docker-compose up -d
```

Pendant que ca tourne, expliquer le modele : code libre, expertise payante. Trois revenus : audit (RSSI externalise), formation (Qualiopi), hosting manage. Calque sur intuitem, Filigran, Centreon.

A la fin du `docker-compose up`, le navigateur s'ouvre sur `http://localhost:3000`. Demo live qu'**une PME peut deployer en 10 minutes, sans m'en demander la permission**.

---

## Plans de repli (si quelque chose lache)

### MCP Claude Desktop ne repond pas

**Probable** : token API expire, reseau coupe, Claude Desktop pas relance.

**Repli** :
1. Montrer le repo `connectors/mcp-server/` directement sur GitHub.
2. Lire la liste des 4 outils dans `tools.ts` lignes 46-124.
3. Pivot rhetorique : "MCP, c'est l'avenir du SAT/HRM. On est premier mover. Voici le code, on est en avance — meme si la demo live se prend les pieds dans son cable USB, le code, lui, est solide."

### Mistral (vishing) renvoie 503 ou timeout

**Probable** : API Mistral en mainenance, quota atteint, reseau lent.

**Repli** :
1. Avoir un script vishing de demo pre-genere sauvegarde sur disque (`docs/demo-assets/sample-vishing-script.json`).
2. Copier-coller dans Piper TTS qui tourne en local — la partie souverainete (TTS local) reste la valeur.
3. Pivot rhetorique : "L'API Mistral est centralisee, mais le TTS Piper tourne en local — meme avec le cloud Mistral down, votre vishing local fonctionne. C'est ca, la souverainete pratique."

### Le serveur Next.js plante

**Probable** : memoire serveur insuffisante, build cache corrompu, port occupe.

**Repli** :
1. Avoir un screencast 90 s pre-enregistre dans `docs/demo-assets/screencast-d113-fallback.mp4`.
2. Le projeter pendant qu'on relance en arriere-plan.
3. Pivot rhetorique : "Sur scene, on prend le risque. C'est aussi ca, le software libre — on assume nos bugs en public et on les corrige en public."

### Le compte a rebours `/lancement-oss` montre J-22 et il reste 0

**Improbable mais a savoir** : la page bascule automatiquement en mode "C'est lance" apres le 26 mai 09:00 +02:00. Si tu fais la demo pre-launch (J-5 au 21 mai), tu verras "5 jours" — c'est correct.

---

## Phrases-cles a memoriser

> "Je passe ma plateforme en open source, pas par charite — par strategie."

> "Les Americains ont 10 ans d'avance sur le marketing. On a 10 ans d'avance sur la conformite et la souverainete."

> "Premier MCP server SAT/HRM au monde. Premier vishing francais en stack souveraine. Premier comparatif honnete a citer ses concurrents avec liens directs."

> "Je n'ai pas leve un sou. Pas de VC qui poussent dans le dos. C'est plus tranquille pour faire les choses bien."

---

## Apres l'intervention

- [ ] Recuperer les cartes de visite physiques avec consentement explicite
- [ ] Importer dans HubSpot / pipedrive avec source `digital-113-2026`
- [ ] Envoyer un message LinkedIn personnel sous 48 h, avec un lien vers `/lancement-oss` et le repo GitHub
- [ ] Rebondir sur les questions du public dans un thread LinkedIn dans la semaine
- [ ] Compter les etoiles GitHub gagnees post-event (objectif : +20 sous 48 h)

---

## Inventaire materiel jour J

- [ ] Laptop (charge 100 %, chargeur en sac)
- [ ] Adaptateur HDMI / USB-C / VGA (les 3, on ne sait jamais)
- [ ] Cle USB avec slide deck PDF + screencast fallback
- [ ] 4G partage operateur (forfait illimite verifie)
- [ ] Casque audio si vishing en demo audible
- [ ] Cartes de visite (50, format souverain FR si possible)
- [ ] Stickers Humanix Academie (si imprimes)
- [ ] Bouteille d'eau (la voix est l'outil principal)

---

**Bonne demo. Hex veille.**
