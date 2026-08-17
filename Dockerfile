# ============= Multi-stage Dockerfile pour HumaniX Academy =============

# Stage 1 : dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Stage 2 : builder
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Garantit que content-pro/ existe au moins comme dossier vide. Si on
# builde depuis un fork OSS sans le submodule prive, le `COPY . .` ne
# l'a pas inclus. Le `COPY --from=builder /app/content-pro ./content-pro`
# du runner stage echouerait sans ce mkdir. Dans le cas commercial,
# le dossier existe deja avec son contenu - le mkdir est no-op.
RUN mkdir -p content-pro

# ---------------------------------------------------------------------------
# Materialise le catalogue COMMERCIAL avant `next build` (fix bug juin 2026).
# ---------------------------------------------------------------------------
# `prisma/catalog-saisons.ts` est un SYMLINK vers content-pro/prisma/. Le build
# serveur Next (webpack) ne resout pas ce symlink de maniere fiable pour le
# bundle : au runtime, loadCatalogSaisons() retombe alors sur le catalogue
# "demo" (5 saisons) MEME quand content-pro est present - d'ou un /superadmin/
# catalog qui affiche "source: demo / content-pro ABSENT" alors que la BDD a
# bien le commercial (seede par le boot en tsx, qui lui suit le symlink).
#
# Fix deterministe : si content-pro est present a CE build, on remplace le
# symlink par le VRAI fichier (deref). C'est un fichier de DONNEES pur (aucun
# import) -> aucune resolution relative a casser. Webpack bundle alors un
# module local normal -> le runtime resout "commercial".
# En mode OSS (content-pro absent), on ne touche a rien -> demo, comportement
# attendu pour un fork public.
RUN if [ -f content-pro/prisma/catalog-saisons.ts ]; then \
      rm -f prisma/catalog-saisons.ts && \
      cp content-pro/prisma/catalog-saisons.ts prisma/catalog-saisons.ts && \
      echo "[build] catalog commercial materialise (symlink -> fichier reel)"; \
    else \
      echo "[build] content-pro absent -> catalog demo (mode OSS)"; \
    fi

# ---------------------------------------------------------------------------
# Build args pour les variables NEXT_PUBLIC_* - INDISPENSABLE pour Next.js.
# ---------------------------------------------------------------------------
# Pourquoi : Next.js inline les `process.env.NEXT_PUBLIC_*` dans le bundle JS
# AU BUILD (next build), pas au runtime. Les passer dans `environment:` cote
# docker-compose les rend visibles UNIQUEMENT au runtime du container - donc
# invisibles dans le bundle deja construit.
# Solution : declarer chaque var en ARG ici (avant `npm run build`) puis la
# repromouvoir en ENV pour que `next build` la voie. Cote docker-compose,
# elles sont passees via `build.args:` (cf. docker-compose.yml).
# Defaut "" pour ne pas casser le build si une var n'est pas fournie.
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_APP_NAME=""
ARG NEXT_PUBLIC_BASE_URL=""
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=""
ARG NEXT_PUBLIC_PLAUSIBLE_API_HOST=""
ARG NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT=""
ARG NEXT_PUBLIC_MATOMO_URL=""
ARG NEXT_PUBLIC_MATOMO_SITE_ID=""

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ENV NEXT_PUBLIC_PLAUSIBLE_API_HOST=$NEXT_PUBLIC_PLAUSIBLE_API_HOST
ENV NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT=$NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT
ENV NEXT_PUBLIC_MATOMO_URL=$NEXT_PUBLIC_MATOMO_URL
ENV NEXT_PUBLIC_MATOMO_SITE_ID=$NEXT_PUBLIC_MATOMO_SITE_ID

# --- Mode OSS PUR ----------------------------------------------------------
#
# `npm run build` commence par resoudre les quatre modules de contenu
# commercial (cf. scripts/resoudre-contenu-optionnel.ts). Ils sont des symlinks vers le submodule
# prive content-pro/ : absents d'un fork AGPLv3, absents aussi de l'image OSS
# publiee sur GHCR, qui est construite SANS content-pro par conception.
#
# Sans cette declaration, le build ECHOUE (code 3) plutot que de produire
# silencieusement une image au catalogue reduit. C'est voulu : le cas
# dangereux est une image COMMERCIALE construite sans content-pro, qui
# demarrerait avec 5 saisons au lieu de 63 sans que rien ne le signale.
#
# Le workflow docker-publish.yml passe HUMANIX_OSS=true. Un build commercial
# ne le passe PAS, et beneficie donc du garde-fou.
ARG HUMANIX_OSS=""
ENV HUMANIX_OSS=$HUMANIX_OSS

ENV NEXT_TELEMETRY_DISABLED=1

# Prisma interroge son serveur de versions a chaque invocation de la CLI, et
# affiche un encart « Update available » dans la sortie de build.
#
# Deux raisons de le couper, et la seconde compte davantage que la premiere :
#
#   1. Le bruit. L'encart apparait a chaque construction, y compris en CI, et
#      finit par masquer ce qu'on cherche vraiment dans les journaux.
#
#   2. L'appel RESEAU. Une construction d'image doit dependre de ses entrees,
#      pas d'un service tiers joignable. Cet appel la rend sensible a une panne
#      externe et empeche toute construction hors ligne.
#
# CHECKPOINT_DISABLE coupe la verification elle-meme, pas seulement son
# affichage. La montee vers Prisma 7 reste a faire, et se decidera sur le
# CHANGELOG plutot que sur un encart de build : 58 fichiers importent
# @prisma/client, et @auth/prisma-adapter n'a pas declare la 7 comme testee.
ENV CHECKPOINT_DISABLE=1
ENV SKIP_ENV_VALIDATION=1
# DATABASE_URL fictif pour le build (Prisma client gen + build Next).
# Aucune valeur sensible en ENV : AUTH_SECRET est injecté UNIQUEMENT au runtime
# (docker-compose / docker run -e). Cf. warning SecretsUsedInArgOrEnv.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN npx prisma generate
# AUTH_SECRET injecté uniquement le temps du build (pas persisté en layer)
RUN AUTH_SECRET="build-time-only-not-a-real-secret" npm run build

# ---------------------------------------------------------------------------
# Compilation des scripts de démarrage
# ---------------------------------------------------------------------------
#
# docker-entrypoint.sh appelle six scripts TypeScript au boot (migrations,
# seed du catalogue, bootstrap admin, import des fuites). Ils tournaient via
# `npx tsx`, ce qui imposait d'embarquer tsx dans l'image runtime, donc
# esbuild, donc son binaire Go : à lui seul, 30 des 38 alertes de sécurité
# du dépôt le 2026-08-12, dans un binaire qui ne sert plus rien une fois le
# build terminé.
#
# On les compile ici, dans le stage `builder` où esbuild a toute sa place, en
# bundles autonomes. Le runtime n'a plus besoin que de `node`.
#
# `--packages=external` : on ne bundle QUE le code local. Les vrais paquets
# npm (@prisma/client, zod) restent des imports résolus à l'exécution, donc
# aucune duplication et le moteur natif de Prisma continue de fonctionner.
#
# CE N'ETAIT PAS POSSIBLE AVANT le 2026-08-13. prisma/seed-data-loader.ts
# chargeait le catalogue commercial par un `require()` dynamique, que le
# bundling cassait EN SILENCE : 58 saisons devenaient 5, sans erreur. La
# résolution est désormais statique, et vérifiée identique dans les trois
# modes d'exécution.
RUN npx esbuild \
      scripts/migrate-legacy-trial.ts \
      scripts/migrate-4-tiers-pivot.ts \
      scripts/seed-catalog.ts \
      scripts/bootstrap-admin.ts \
      scripts/scrape-breaches.ts \
      prisma/seed.ts \
      --bundle --platform=node --format=esm --target=node22 \
      --packages=external --tsconfig=tsconfig.json \
      --outdir=dist-scripts --out-extension:.js=.mjs \
  && echo "[build] scripts de demarrage compiles :" \
  && ls -la dist-scripts/scripts dist-scripts/prisma

# Stage 3 : runner (production)
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Meme raison que dans le stage builder : docker-entrypoint.sh invoque la CLI
# Prisma a CHAQUE demarrage (db execute, db push, db seed). Sans cela, chaque
# redemarrage de conteneur declencherait un appel reseau vers Prisma et
# afficherait l'encart de mise a jour dans les journaux de production.
ENV CHECKPOINT_DISABLE=1

# Utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# On copie ce qui est strictement nécessaire pour exécuter
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/content ./content
# content-pro/ : submodule prive contenant le catalogue commercial (saisons,
# library articles, anecdotes, enquetes Premium du Mode Enqueteur).
#
# Cas "instance commerciale" : `COPY . .` du builder a inclus content-pro/
# avec son contenu. La ligne ci-dessous le copie tel quel dans le runner,
# et les symlinks dans content/ et lib/ resolvent vers les fichiers reels.
#
# Cas "OSS pur" (fork sans content-pro) : on a fait `mkdir -p content-pro`
# dans le builder pour garantir qu'il existe au moins comme dossier vide.
# La ligne ci-dessous le copie (vide) - les symlinks sont alors casses
# mais resolveContentRoot() de lib/episodes.ts detecte le cas et bascule
# sur content/saisons-demo/ (2 saisons demo CC BY-SA).
COPY --from=builder /app/content-pro ./content-pro
# Scripts de demarrage COMPILES (cf. stage builder). Ils remplacent le trio
# lib/ + tsconfig.json + scripts/ que le runtime devait embarquer pour que tsx
# puisse resoudre les imports a la volee.
COPY --from=builder /app/dist-scripts ./dist-scripts
# Entrypoint avec permissions explicites (chmod 755, owner nextjs)
COPY --chmod=755 --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh

# ---------------------------------------------------------------------------
# Elagage des dependances de DEVELOPPEMENT
# ---------------------------------------------------------------------------
#
# Le `COPY node_modules` ci-dessus amene TOUT l'arbre du builder, outillage de
# compilation compris. Mesure du 2026-08-12 : l'image de production embarquait
# le binaire Go d'esbuild, tire par tsx, a l'origine de 30 des 38 alertes de
# securite du depot.
#
# Deux conditions rendent cet elagage possible :
#
#   1. `prisma` est passe en `dependencies`. Ce n'est pas un outil de
#      developpement dans ce modele de deploiement : docker-entrypoint.sh
#      l'invoque a CHAQUE demarrage (db push, db execute, db seed).
#
#   2. Les scripts de demarrage sont desormais COMPILES : plus besoin de tsx,
#      donc plus d'esbuild.
#
# `--legacy-peer-deps` : OBLIGATOIRE, meme raison que dans le stage `deps`.
# Sans lui, npm refait la resolution complete de l'arbre, bute sur le conflit
# de peer dependencies du projet et echoue en ERESOLVE, alors qu'il n'a qu'a
# SUPPRIMER des dossiers. Les deux commandes doivent porter les memes drapeaux.
#
# `--ignore-scripts` : on elague, on ne reconstruit rien.
RUN npm prune --omit=dev --ignore-scripts --legacy-peer-deps \
  && npm cache clean --force \
  && echo "[build] outillage de build retire de l image runtime"

# npm lui-meme est retire, et l'ORDRE compte : `npm prune` ci-dessus en a
# encore besoin.
#
# Mesure du 2026-08-13 sur l'image publiee : les 8 dernieres vulnerabilites
# rapportees par Trivy etaient TOUTES dans
# /usr/local/lib/node_modules/npm/node_modules -- les dependances que npm
# embarque, dans l'image node:24-alpine elle-meme. Aucune ne venait de nos
# dependances, et aucune n'etait corrigeable par notre gestion de paquets :
# il fallait changer d'image de base, ou retirer npm.
#
# Rien a l'execution n'en a besoin : docker-entrypoint.sh appelle desormais
# ./node_modules/.bin/prisma et ./node_modules/.bin/next par leur chemin, et
# la commande de seed declaree dans prisma.config.ts est `node
# dist-scripts/prisma/seed.mjs` -- du node pur.
#
# Consequence a connaitre : plus aucun `npm`, `npx` ni `yarn` dans un shell
# de debogage sur ce conteneur. Pour installer quoi que ce soit a chaud, il
# faut reconstruire l'image -- ce qui est le comportement recherche.
RUN rm -rf /usr/local/lib/node_modules/npm \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
  && echo "[build] npm retire de l image runtime"

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/docker-entrypoint.sh"]
