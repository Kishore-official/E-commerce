#!/bin/sh
set -e

echo "=== E-commerce All-in-One Startup ==="

# ---- 1. Replace URL placeholders in Next.js builds ----
API_URL="${API_BASE_URL:-http://localhost:3000}"
STOREFRONT_URL="${API_URL}"
VENDOR_URL="${API_URL}/vendor"
ADMIN_URL="${API_URL}/admin"

echo "Replacing URL placeholders:"
echo "  API_URL:        ${API_URL}/api/v1"
echo "  STOREFRONT_URL: ${STOREFRONT_URL}"
echo "  VENDOR_URL:     ${VENDOR_URL}"
echo "  ADMIN_URL:      ${ADMIN_URL}"

# Replace all placeholders in built JS files
find /app/frontend -name "*.js" -type f -exec sed -i \
  -e "s|__API_URL_PLACEHOLDER__/api/v1|${API_URL}/api/v1|g" \
  -e "s|__API_URL_PLACEHOLDER__|${API_URL}|g" \
  -e "s|__STOREFRONT_URL_PLACEHOLDER__|${STOREFRONT_URL}|g" \
  -e "s|__VENDOR_URL_PLACEHOLDER__|${VENDOR_URL}|g" \
  -e "s|__ADMIN_URL_PLACEHOLDER__|${ADMIN_URL}|g" \
  {} + 2>/dev/null || true

# ---- 2. Start nginx (reverse proxy on port 3000) ----
echo "Starting nginx on port 3000..."
nginx -c /app/nginx.conf

# ---- 3. Diagnostics: verify API dist exists ----
echo "Checking API entry point..."
if [ -f /app/apps/api/dist/main.js ]; then
  echo "  OK: /app/apps/api/dist/main.js exists"
else
  echo "  ERROR: /app/apps/api/dist/main.js NOT FOUND"
  ls -la /app/apps/api/dist/ 2>/dev/null || echo "  dist/ directory does not exist"
fi

echo "Checking node_modules..."
if [ -d /app/node_modules ]; then
  echo "  OK: /app/node_modules exists"
else
  echo "  ERROR: /app/node_modules NOT FOUND"
fi

# ---- 4. Start NestJS API on port 4000 ----
echo "Starting API on port 4000..."
cd /app
API_PORT=4000 node apps/api/dist/main.js 2>&1 &
API_PID=$!

# Give API a moment and check if it's still alive
sleep 3
if kill -0 $API_PID 2>/dev/null; then
  echo "  API process is running (PID: $API_PID)"
else
  echo "  ERROR: API process died immediately!"
  echo "  Attempting to run API in foreground to capture error..."
  API_PORT=4000 node apps/api/dist/main.js 2>&1 || true
  echo "  API foreground run completed with exit code: $?"
fi

# ---- 5. Start Next.js frontends ----
echo "Starting Storefront on port 4001..."
NEXT_PUBLIC_API_URL="${API_URL}/api/v1" HOSTNAME=0.0.0.0 PORT=4001 node /app/frontend/storefront/apps/storefront/server.js 2>&1 &
SF_PID=$!

echo "Starting Vendor Portal on port 4002..."
HOSTNAME=0.0.0.0 PORT=4002 node /app/frontend/vendor/apps/vendor/server.js 2>&1 &
VD_PID=$!

echo "Starting Admin Panel on port 4003..."
HOSTNAME=0.0.0.0 PORT=4003 node /app/frontend/admin/apps/admin/server.js 2>&1 &
AD_PID=$!

echo ""
echo "=== All services started ==="
echo "  nginx (proxy):  port 3000"
echo "  API:            port 4000"
echo "  Storefront:     port 4001"
echo "  Vendor:         port 4002 (/vendor)"
echo "  Admin:          port 4003 (/admin)"
echo ""

# ---- 6. Wait for any process to exit ----
wait $API_PID $SF_PID $VD_PID $AD_PID
