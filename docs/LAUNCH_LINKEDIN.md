# Post LinkedIn de lancement OSS — brouillons à affiner

> Brouillons préparés le 17 mai 2026, à affiner par Florian avant le 21 mai.
> Le ton, le rythme et la signature personnelle doivent rester les tiens.

---

## Version A — "Honnête, sobre, fondateur" (recommandée)

> 1500 caractères — bon format pour la portée organique LinkedIn

Aujourd'hui, j'ouvre le code source d'Humanix Académie.

Humanix, c'est une plateforme française de sensibilisation cyber qu'on
construit depuis presque 2 ans. L'objectif : que la cybersécurité au
quotidien arrête d'être un truc d'experts pour devenir un réflexe
naturel — pour TOUS les collaborateurs, pas que pour le RSSI.

À partir d'aujourd'hui, le code est entièrement public sous AGPLv3 sur
github.com/Humanix-Cybersecurity/Humanix-Academie.

Pourquoi ouvrir ? Trois raisons :

🇫🇷 **La souveraineté n'est pas une promesse, c'est un audit possible.**
Si on vend de la cyber souveraine, on doit pouvoir prouver chaque ligne
de code. Le rendre public, c'est laisser n'importe quel RSSI vérifier
ce qu'on raconte.

🤝 **L'écosystème cyber français est trop fragmenté.** intuitem
(CISO Assistant), Sekoia, HarfangLab, Mailinblack, Lucca, GLPI — on
n'a aucune chance face aux GAFAM si on ne s'interconnecte pas. On
fournit déjà 5 connecteurs natifs (OSCAL, SCIM, Splunk CIM, Sentinel
CEF, CISO Assistant). Plus de fournisseurs avec lesquels brancher,
plus d'utilisateurs servis.

🎓 **La sensibilisation cyber doit être un bien commun.** Le contenu
pédagogique reste curaté et commercial (modèle open core), mais la
plateforme — l'app Next.js, les modules de base, le mode Enquêteur
gratuit, le Pack NIS2 lite — tout ça appartient à la communauté
maintenant.

→ Repo : github.com/Humanix-Cybersecurity/Humanix-Academie
→ Démo : demo.humanix-cybersecurity.fr
→ Manifeste : humanix-cybersecurity.fr/manifeste

Si tu es RSSI, DSI, DPO, ou contributeur cyber, je serais heureux que
tu ailles regarder, que tu me dises ce qui cloche, ou que tu forkes.

#cybersecurité #opensource #souveraineté #NIS2 #RGPD
#MadeInFrance #AGPLv3

---

## Version B — "Pédagogique, axée différenciateurs" (plus long)

> 2500 caractères — meilleur engagement si tu vises les commentaires
> techniques

Après 2 ans de développement, j'ouvre aujourd'hui le code source
d'Humanix Académie sous licence AGPLv3.

📌 Le contexte
On vend de la sensibilisation cyber aux PME et ETI françaises depuis
2024. Le marché est dominé par 3-4 acteurs US (KnowBe4, Mantra, Hoxhunt)
qui font tous la même chose : du phishing simulé + des modules vidéo
classiques. Notre pari : faire différent, en France, et de manière
inspectable.

📌 Ce qu'on ouvre aujourd'hui
- Toute la plateforme Next.js 16 (front + back + API)
- Le moteur de modules MDX + quiz + scoring
- Le **Mode Enquêteur** : apprentissage par découverte guidée (on te
  montre un mail, tu coches ce qui est louche → premier mover sur ce
  format)
- 3 enquêtes + 5 modules pédagogiques de base sous CC BY-SA
- Le Pack NIS2 v1 (4 documents signables) et le **diagnostic public
  30 questions** mappé sur les articles de la directive
- Les connecteurs souverains : Sekoia, HarfangLab, Mailinblack, Lucca,
  GLPI, CISO Assistant (intuitem)
- Les formats standards : OSCAL v1.1.2, SCIM v2, Splunk CIM, Sentinel
  CEF, webhooks signés HMAC-SHA256

📌 Ce qui reste commercial
- 27 saisons premium (180 modules avec scénarios crafted, persona-
  specific, IA générative)
- 27 enquêtes premium (Mode Enquêteur extension)
- Pack NIS2 v2 (score per-article temps réel + rapport annuel autorité
  compétente)
- Cloud SaaS managé Scaleway Paris

📌 Posture sécurité du produit lui-même
On a pris le temps de durcir l'app avant de l'ouvrir :
- Architecture Zero-Trust / Least Privilege
- Image Postgres custom avec rôle read-only auto-provisionné
- CSP nonce per-request (Strict CSP Google)
- WebAuthn passkey-first
- 49 fichiers de tests vitest
- Audits externes publics (Mozilla Observatory, Security Headers,
  SSL Labs) sur humanix-cybersecurity.fr/securite/audits-externes
- Rapport d'audit interne v1.5 daté + signé, public

→ github.com/Humanix-Cybersecurity/Humanix-Academie

Si tu es contributeur ou client potentiel : merci d'aller regarder.
Toute issue, toute PR, tout retour d'expérience est précieux.

#cybersecurité #opensource #AGPLv3 #souveraineté #NIS2
#MadeInFrance #cyberhygiène #RSSI #DPO

---

## Version C — "Court et viral" (test A/B)

> 600 caractères — pour relancer 2-3 jours après la version A

Je viens d'ouvrir le code source d'Humanix Académie.

2 ans de travail. AGPLv3.

→ Une plateforme française de sensibilisation cyber
→ Mode Enquêteur unique sur le marché (apprentissage par découverte)
→ Pack NIS2 + diagnostic 30 questions + rapport annuel autorité
→ Connecteurs souverains : Sekoia, HarfangLab, Lucca, GLPI, CISO Assistant

Le code se regarde, se forke, se challenge.

🔗 github.com/Humanix-Cybersecurity/Humanix-Academie

#opensource #cybersécurité #MadeInFrance #AGPLv3

---

## Tips publication

- **Meilleur créneau LinkedIn** : mardi-jeudi 8h-10h (heure FR). Le 21
  mai est un jeudi → ✅ optimal.
- **Premier commentaire** : ajoute-le toi-même 30 secondes après la
  publication avec un lien direct vers le repo (l'algorithme LinkedIn
  pénalise les liens dans le post initial).
- **Engagement précoce** : ping personnellement 5-10 contacts proches
  (intuitem / Mathieu, CSIN, ANSSI, contacts RSSI) avant publication
  pour qu'ils commentent dans la première heure.
- **Image hero** : utilise la capture du repo public + score Mozilla
  Observatory A+ (assemblage visuel "preuve").
- **Hashtags** : 5-7 maximum (au-delà LinkedIn pénalise). #cybersécurité
  #opensource #souveraineté #NIS2 #MadeInFrance c'est solide.
- **Mention organisations** : `@intuitem` (CISO Assistant), `@ANSSI` si
  pertinent, `@FrenchTech`. Tag les humains qui ont contribué ou
  inspiré.

## Préparation 48h avant

- [ ] Photos / screenshots prêts (3-5)
- [ ] Vidéo démo 60s (optionnel mais boost massif l'engagement)
- [ ] Ping individuel des early commentateurs envoyé en DM
- [ ] Page épinglée sur ton profil mise à jour
- [ ] Compte X de l'entreprise prêt à relayer
- [ ] Hashtag Slack/Discord interne pour l'équipe `#humanix-launch`
