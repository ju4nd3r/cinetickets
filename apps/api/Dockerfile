# Multi-stage Dockerfile for @cinetickets/api
# Stage 1: Base
FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile || pnpm install

# Stage 3: Builder
FROM dependencies AS builder
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @cinetickets/shared build
RUN pnpm --filter @cinetickets/api prisma:generate
RUN pnpm --filter @cinetickets/api build

# Stage 4: Production runner
FROM node:20-alpine AS runner
RUN apk add --no-cache curl openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3000

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --chown=appuser:appgroup pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY --chown=appuser:appgroup packages/shared/package.json ./packages/shared/
COPY --chown=appuser:appgroup apps/api/package.json ./apps/api/

# Copy built artifacts and source/prisma schemas
COPY --chown=appuser:appgroup --from=builder /app/packages/shared ./packages/shared
COPY --chown=appuser:appgroup --from=builder /app/apps/api ./apps/api

# Install production dependencies and generate Prisma client
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
RUN pnpm --filter @cinetickets/api prisma:generate

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["sh", "-c", "pnpm --filter @cinetickets/api prisma:migrate && pnpm --filter @cinetickets/api prisma:seed && node apps/api/dist/index.js"]
