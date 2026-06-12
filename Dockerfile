# ============= Multi-stage Dockerfile pour HumaniX Academy =============

# Stage 1 : dependencies
FROM node:25-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Stage 2 : builder
FROM node:25-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Garantit que content-pro/ existe au moins comme dossier vide. Si on
# builde depuis un fork OSS sans le submodule prive, le `COPY . .` ne
# l'a pas inclus. Le `COPY --from=builder /app/content-pro ./content-pro`
# du runner stage echouerait sans ce mkdir. Dans le cas commercial,
# le dossier existe deja avec son contenu — le mkdir est no-op.
RUN mkdir -p content-pro

# ---------------------------------------------------------------------------
# Materialise le catalogue COMMERCIAL avant `next build` (fix bug juin 2026).
# ---------------------------------------------------------------------------
# `prisma/catalog-saisons.ts` est un SYMLINK vers content-pro/prisma/. Le build
# serveur Next (webpack) ne resout pas ce symlink de maniere fiable pour le
# bundle : au runtime, loadCatalogSaisons() retombe alors sur le catalogue
# "demo" (5 saisons) MEME quand content-pro est present — d'ou un /superadmin/
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
# Build args pour les variables NEXT_PUBLIC_* — INDISPENSABLE pour Next.js.
# ---------------------------------------------------------------------------
# Pourquoi : Next.js inline les `process.env.NEXT_PUBLIC_*` dans le bundle JS
# AU BUILD (next build), pas au runtime. Les passer dans `environment:` cote
# docker-compose les rend visibles UNIQUEMENT au runtime du container — donc
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

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
# DATABASE_URL fictif pour le build (Prisma client gen + build Next).
# Aucune valeur sensible en ENV : AUTH_SECRET est injecté UNIQUEMENT au runtime
# (docker-compose / docker run -e). Cf. warning SecretsUsedInArgOrEnv.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN npx prisma generate
# AUTH_SECRET injecté uniquement le temps du build (pas persisté en layer)
RUN AUTH_SECRET="build-time-only-not-a-real-secret" npm run build

# Stage 3 : runner (production)
FROM node:25-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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
# La ligne ci-dessous le copie (vide) — les symlinks sont alors casses
# mais resolveContentRoot() de lib/episodes.ts detecte le cas et bascule
# sur content/saisons-demo/ (2 saisons demo CC BY-SA).
COPY --from=builder /app/content-pro ./content-pro
# lib/ et tsconfig.json necessaires au runtime du seed (tsx resoud les imports
# relatifs comme ../lib/levels depuis prisma/seed.ts)
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# scripts/ necessaire pour : npm run breaches:refresh (scrape observatoire),
# et tout futur job standalone tsx invocable via docker exec.
COPY --from=builder /app/scripts ./scripts
# Entrypoint avec permissions explicites (chmod 755, owner nextjs)
COPY --chmod=755 --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/docker-entrypoint.sh"]
