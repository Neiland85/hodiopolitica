# ─── Stage 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev

# ─── Stage 2: Build ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY data/ data/
COPY --from=deps /app/node_modules node_modules
RUN npx tsc --noEmit

# ─── Stage 3: Production image ──────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install only production deps + ts-node for runtime
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm ci && npm cache clean --force

# Copy source (ts-node runs TypeScript directly)
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY data/ data/

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hodiopolitica -u 1001
USER hodiopolitica

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["npx", "ts-node", "apps/api/server/server.ts"]
