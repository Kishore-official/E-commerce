# ---- Build Stage ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/eslint-config/ ./packages/eslint-config/
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared-types first, then the API
RUN pnpm --filter @ecommerce/shared-types build
RUN pnpm --filter @ecommerce/api build

# ---- Production Stage ----
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/eslint-config/ ./packages/eslint-config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/dist/ ./packages/shared-types/dist/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
