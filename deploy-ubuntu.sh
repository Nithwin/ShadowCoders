#!/bin/bash
set -e

# ShadowCoders - One-Click Installer for Ubuntu
# Requirements: Ubuntu 20.04+ (or compatible Debian-based OS)

echo "========================================================"
echo "   ShadowCoders - Exam Server Installer (Ubuntu)        "
echo "========================================================"

# 1. Update & Install System Dependencies
echo "[1/6] Installing System Dependencies (Node.js, Java, Python, Postgres, Redis)..."
sudo apt-get update
sudo apt-get install -y curl wget git build-essential

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Java JDK (Default)
sudo apt-get install -y default-jdk

# Install Python3
sudo apt-get install -y python3

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Redis
sudo apt-get install -y redis-server

# Install PM2 for process management
sudo npm install -g pm2

echo "System dependencies installed."


# 2. Database Setup
echo "[2/6] Configuring Database..."
# Check if user 'shadowcoders' exists, if not create it
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='shadowcoders'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER shadowcoders WITH PASSWORD 'shadow_password';"
    sudo -u postgres psql -c "CREATE DATABASE shadow_db OWNER shadowcoders;"
    echo "Database 'shadow_db' created with user 'shadowcoders'."
else
    echo "Database user already exists."
fi

# 3. Environment Variable Configuration
echo "[3/6] Configuring Environment Variables..."
# Detect CPU Cores for Optimization
CPU_CORES=$(nproc)
CONCURRENCY=$((CPU_CORES - 1))
if [ "$CONCURRENCY" -lt 1 ]; then CONCURRENCY=1; fi

cat > .env <<EOF
# Generated .env
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://shadowcoders:shadow_password@localhost:5432/shadow_db?schema=public"
REDIS_URL="redis://localhost:6379"

# Security Secrets (Generate random)
JWT_SECRET="$(openssl rand -hex 32)"
SESSION_SECRET="$(openssl rand -hex 32)"

# Execution Optimization
MAX_CONCURRENT_EXECUTIONS=$CONCURRENCY
MAX_QUEUE_SIZE=2000
EXECUTION_OS=linux

# Next.js Public Vars
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
EOF

# Copy .env to backend and frontend if needed (assuming single repo structure)
cp .env backend/.env
cp .env frontend/.env.local 

echo "Environment configured. Max Concurrent Execution set to: $CONCURRENCY"


# 4. Backend Build
echo "[4/6] Building Backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

# 5. Frontend Build
echo "[5/6] Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Startup Script
echo "[6/6] Finalizing Startup..."

cat > start_server.sh <<EOF
#!/bin/bash
cd backend
pm2 start dist/main.js --name "shadow-backend"
cd ../frontend
pm2 start "npm start" --name "shadow-frontend"
pm2 save
echo "Server started! Access at http://localhost:3000"
EOF

chmod +x start_server.sh

echo "========================================================"
echo "   Installation Complete!                               "
echo "   To start the server, run: ./start_server.sh          "
echo "========================================================"
