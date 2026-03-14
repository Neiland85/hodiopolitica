# ─── Stage 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm ci

# ─── Stage 2: Build (compile TypeScript to JavaScript) ───────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY --from=deps /app/node_modules node_modules
RUN npx tsc --outDir dist --declaration false --declarationMap false --sourceMap false

# ─── Stage 3: Production image ──────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Production dependencies only (reinstall without dev deps)
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev && npm cache clean --force

# Compiled JavaScript from builder (no TypeScript in production)
COPY --from=builder /app/dist ./dist

# Data files (read-only)
COPY data/ data/

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hodiopolitica -u 1001
USER hodiopolitica

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "dist/apps/api/server/server.js"]
