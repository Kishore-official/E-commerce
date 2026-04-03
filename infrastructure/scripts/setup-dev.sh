#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== E-commerce Platform Dev Setup ==="

# 1. Check prerequisites
echo ""
echo "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo "Error: docker is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: node is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required but not installed. Run: npm install -g pnpm"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js >= 20 required. Found: $(node -v)"
  exit 1
fi

echo "All prerequisites met."

# 2. Copy env file if not exists
echo ""
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "Creating .env from .env.example..."
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
else
  echo ".env file already exists, skipping."
fi

# 3. Start infrastructure
echo ""
echo "Starting Docker infrastructure..."
cd "$PROJECT_ROOT/infrastructure/docker"
docker compose up -d

echo "Waiting for services to be healthy..."
docker compose wait postgres redis 2>/dev/null || sleep 10

# 4. Install dependencies
echo ""
echo "Installing dependencies..."
cd "$PROJECT_ROOT"
pnpm install

# 5. Build shared packages
echo ""
echo "Building shared packages..."
pnpm --filter @ecommerce/shared-types build

# 6. Done
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Services running:"
echo "  PostgreSQL:            localhost:5432"
echo "  Redis:                 localhost:6379"
echo "  OpenSearch:            localhost:9200"
echo "  OpenSearch Dashboards: localhost:5601"
echo "  MinIO (S3):            localhost:9000"
echo "  MinIO Console:         localhost:9001"
echo ""
echo "Next steps:"
echo "  pnpm dev          # Start all apps in dev mode"
echo "  pnpm build        # Build all packages"
echo "  pnpm test         # Run all tests"
