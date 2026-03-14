# ─── Stage 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy root workspace files + all workspace package.json files
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci

# ─── Stage 2: Build Next.js ─────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env var for API URL
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules node_modules

# Copy workspace sources needed for build (contracts is imported by web)
COPY package.json tsconfig.json ./
COPY packages/contracts/ packages/contracts/
COPY apps/web/ apps/web/

# Build Next.js
WORKDIR /app/apps/web
RUN npm run build

# ─── Stage 3: Production image ──────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy full monorepo structure needed at runtime
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/package.json apps/web/package.json
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages/contracts packages/contracts
COPY --from=builder /app/package.json package.json

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

WORKDIR /app/apps/web
CMD ["npm", "start"]
