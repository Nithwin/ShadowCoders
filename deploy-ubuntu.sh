#!/bin/bash
# ============================================================
# ShadowCoders Unified Setup Script (Ubuntu)
# ============================================================
# This script sets up the entire platform on a single machine.
# Usage: sudo bash deploy-ubuntu.sh

set -e

echo "🚀 Starting ShadowCoders Unified Setup..."

# 1. System Dependencies
echo "📦 Installing system dependencies..."
apt-get update
apt-get install -y curl wget git build-essential postgresql redis-server docker.io jq

# 2. Node.js & PM2
echo "🟢 Installing Node.js & PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2

# 3. Database Setup
echo "🐘 Configuring PostgreSQL..."
DB_PASS=$(openssl rand -base64 12)
sudo -u postgres psql -c "CREATE USER shadowcoders WITH PASSWORD '$DB_PASS' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE shadowcoders OWNER shadowcoders;" 2>/dev/null || true
echo "✅ Database created with user 'shadowcoders'"

# 4. Docker Sandbox
echo "🐳 Building Docker sandbox..."
SANDBOX_DIR="./docker/sandbox"
if [ -d "$SANDBOX_DIR" ]; then
    docker build -t shadowcoders-sandbox:latest -f "$SANDBOX_DIR/Dockerfile.sandbox" "$SANDBOX_DIR"
else
    docker build -t shadowcoders-sandbox:latest -f worker/Dockerfile.sandbox worker/ 2>/dev/null || \
    echo "⚠️ Dockerfile.sandbox not found at expected paths. Please build it manually."
fi

# 5. Environment Files
echo "📝 Generating .env files..."
JWT_SECRET=$(openssl rand -base64 32)

# Backend .env
cat > backend/.env <<EOF
PORT=4000
NODE_ENV=production
LOCAL_DATABASE_URL=postgresql://shadowcoders:$DB_PASS@localhost:5432/shadowcoders
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=$JWT_SECRET
FRONTEND_ORIGIN=http://localhost:3000
EXECUTION_OS=linux
EOF

# Worker .env
cat > worker/.env <<EOF
REDIS_URL=redis://127.0.0.1:6379
DOCKER_IMAGE=shadowcoders-sandbox:latest
WORKER_CONCURRENCY=1
HEALTH_PORT=9100
NODE_ENV=production
EOF

# Frontend .env.local
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
EOF

# 6. Application Build
echo "🏗️ Building application (this may take a few minutes)..."
npm run build

# 7. Start Services
echo "🚀 Launching with PM2..."
pm2 start infra/pm2/unified.config.js

echo "=========================================================="
echo "🎉 Setup Complete!"
echo "=========================================================="
echo "API: http://localhost:4000"
echo "Frontend: http://localhost:3000"
echo "Database Password: $DB_PASS"
echo "=========================================================="
echo "Run 'pm2 status' to check service health."
