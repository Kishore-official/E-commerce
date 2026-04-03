# =============================================================================
# Multi-stage Dockerfile: API + Storefront + Vendor + Admin (all-in-one)
# =============================================================================

# ---------- Stage 1: Build everything ----------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json tsconfig.base.json ./

# Copy all packages
COPY packages/ ./packages/

# Copy all apps
COPY apps/ ./apps/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter @ecommerce/shared-types build

# Build API
RUN pnpm --filter @ecommerce/api build

# Build frontends with standalone output for production
# URLs will be replaced at runtime via placeholder replacement in docker-start.sh
ENV NEXT_PUBLIC_API_URL=__API_URL_PLACEHOLDER__/api/v1
ENV NEXT_PUBLIC_STOREFRONT_URL=__STOREFRONT_URL_PLACEHOLDER__
ENV NEXT_PUBLIC_VENDOR_URL=__VENDOR_URL_PLACEHOLDER__
ENV NEXT_PUBLIC_ADMIN_URL=__ADMIN_URL_PLACEHOLDER__

# Enable standalone output + skip TS errors in production build
RUN sed -i 's/const nextConfig = {/const nextConfig = { output: "standalone", typescript: { ignoreBuildErrors: true },/' apps/storefront/next.config.mjs

# Vendor needs basePath: /vendor (served behind nginx at /vendor/*)
RUN sed -i 's/const nextConfig = {/const nextConfig = { output: "standalone", basePath: "\/vendor", typescript: { ignoreBuildErrors: true },/' apps/vendor/next.config.mjs

# Admin needs basePath: /admin (served behind nginx at /admin/*)
RUN sed -i 's/const nextConfig = {/const nextConfig = { output: "standalone", basePath: "\/admin", typescript: { ignoreBuildErrors: true },/' apps/admin/next.config.mjs

RUN pnpm --filter @ecommerce/storefront build
RUN pnpm --filter @ecommerce/vendor build
RUN pnpm --filter @ecommerce/admin build

# ---------- Stage 2: Production ----------
FROM node:20-alpine AS production

# Install nginx
RUN apk add --no-cache nginx

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace config for pnpm install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY apps/api/package.json ./apps/api/

# Install production deps for API
RUN pnpm install --frozen-lockfile --prod

# Copy API build
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Next.js standalone builds + static assets
COPY --from=builder /app/apps/storefront/.next/standalone ./frontend/storefront/
COPY --from=builder /app/apps/storefront/.next/static ./frontend/storefront/apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./frontend/storefront/apps/storefront/public

COPY --from=builder /app/apps/vendor/.next/standalone ./frontend/vendor/
COPY --from=builder /app/apps/vendor/.next/static ./frontend/vendor/apps/vendor/.next/static

COPY --from=builder /app/apps/admin/.next/standalone ./frontend/admin/
COPY --from=builder /app/apps/admin/.next/static ./frontend/admin/apps/admin/.next/static

# Copy nginx config and startup script
COPY nginx.conf ./nginx.conf
COPY docker-start.sh ./docker-start.sh
RUN sed -i 's/\r$//' ./docker-start.sh && chmod +x ./docker-start.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["./docker-start.sh"]
