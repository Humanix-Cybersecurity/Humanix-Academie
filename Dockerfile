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
