#!/bin/bash
# ============================================================
# ShadowCoders Unified Setup Script (Ubuntu)
# ============================================================
# This script sets up the entire platform on a single machine.
# Usage: sudo bash deploy-ubuntu.sh

set -e

INVOKER_USER="${SUDO_USER:-$USER}"
INVOKER_HOME="$(getent passwd "$INVOKER_USER" | cut -d: -f6)"

run_as_invoker() {
    if [ "$(id -un)" = "$INVOKER_USER" ]; then
        "$@"
    else
        sudo -u "$INVOKER_USER" "$@"
    fi
}

normalize_project_ownership() {
    # Ensure previously root-created artifacts do not break non-root builds.
    local paths=(
        backend/node_modules
        backend/dist
        backend/tsconfig.tsbuildinfo
        frontend/node_modules
        frontend/.next
        worker/node_modules
        worker/dist
        worker/tsconfig.tsbuildinfo
        backend/.env
        frontend/.env.local
        worker/.env
    )

    for p in "${paths[@]}"; do
        if [ -e "$p" ]; then
            chown -R "$INVOKER_USER":"$INVOKER_USER" "$p" 2>/dev/null || true
        fi
    done

    # Force-remove stale incremental cache that may be root-owned from prior sudo builds.
    rm -f backend/tsconfig.tsbuildinfo 2>/dev/null || true
    rm -f worker/tsconfig.tsbuildinfo 2>/dev/null || true
}

detect_pkg_manager() {
    local os_id=""
    local os_like=""

    if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        os_id="${ID:-}"
        os_like="${ID_LIKE:-}"
    fi

    # Prefer dnf on Fedora/RHEL-family systems even if apt-get is also installed.
    if [[ "$os_id" =~ ^(fedora|rhel|centos|rocky|almalinux)$ ]] || [[ "$os_like" =~ (rhel|fedora) ]]; then
        if command -v dnf >/dev/null 2>&1; then
            echo "dnf"
            return
        fi
    fi

    if command -v apt-get >/dev/null 2>&1; then
        echo "apt"
    elif command -v dnf >/dev/null 2>&1; then
        echo "dnf"
    else
        echo "unsupported"
    fi
}

ensure_services_running() {
    local pkg_manager="$1"

    # PostgreSQL setup differs by distro
    if [ "$pkg_manager" = "dnf" ]; then
        if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
            postgresql-setup --initdb || true
        fi
        systemctl enable --now postgresql || true
    else
        systemctl enable --now postgresql || true
    fi

    # Redis service name can vary
    systemctl enable --now redis 2>/dev/null || systemctl enable --now redis-server 2>/dev/null || true

    # Docker service
    systemctl enable --now docker || true
}

configure_postgres_auth() {
    local pkg_manager="$1"
    local hba_file=""

    if [ "$pkg_manager" = "dnf" ]; then
        hba_file="/var/lib/pgsql/data/pg_hba.conf"
    else
        hba_file="$(ls /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | head -n1)"
    fi

    if [ -z "$hba_file" ] || [ ! -f "$hba_file" ]; then
        echo "⚠️ Could not locate pg_hba.conf; skipping auth configuration"
        return
    fi

    if grep -q "# SHADOWCODERS_LOCAL_AUTH" "$hba_file"; then
        return
    fi

    echo "🔐 Configuring PostgreSQL local auth for shadowcoders user..."
    local tmp_file
    tmp_file="$(mktemp)"

    cat > "$tmp_file" <<'EOF'
# SHADOWCODERS_LOCAL_AUTH
local   shadowcoders   shadowcoders                            md5
host    shadowcoders   shadowcoders   127.0.0.1/32            md5
host    shadowcoders   shadowcoders   ::1/128                 md5
EOF

    cat "$hba_file" >> "$tmp_file"
    cp "$tmp_file" "$hba_file"
    rm -f "$tmp_file"

    systemctl reload postgresql 2>/dev/null || systemctl restart postgresql || true
}

echo "🚀 Starting ShadowCoders Unified Setup..."

normalize_project_ownership

# 1. System Dependencies
echo "📦 Installing system dependencies..."
PKG_MANAGER="$(detect_pkg_manager)"
echo "🔎 Detected package manager: $PKG_MANAGER"

if [ "$PKG_MANAGER" = "apt" ]; then
    apt-get update
    apt-get install -y curl wget git build-essential postgresql redis-server docker.io jq
elif [ "$PKG_MANAGER" = "dnf" ]; then
    dnf -y install curl wget git gcc gcc-c++ make postgresql-server postgresql redis docker jq
else
    echo "❌ Unsupported Linux distribution: neither apt-get nor dnf is available"
    exit 1
fi

ensure_services_running "$PKG_MANAGER"
configure_postgres_auth "$PKG_MANAGER"

# 2. Node.js & PM2
echo "🟢 Installing Node.js & PM2..."
if ! command -v node &> /dev/null; then
    if [ "$PKG_MANAGER" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        dnf -y install nodejs npm
    fi
fi
if command -v pm2 >/dev/null 2>&1; then
    echo "✅ PM2 already installed"
else
    npm install -g pm2
fi

# 3. Database Setup
echo "🐘 Configuring PostgreSQL..."
DB_PASS=$(openssl rand -hex 16)

# Create or update role with current generated password.
sudo -u postgres psql <<SQL
DO
\$do\$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shadowcoders') THEN
        ALTER ROLE shadowcoders WITH LOGIN PASSWORD '${DB_PASS}' CREATEDB;
    ELSE
        CREATE ROLE shadowcoders WITH LOGIN PASSWORD '${DB_PASS}' CREATEDB;
    END IF;
END
\$do\$;
SQL

# Create DB if missing, then ensure ownership/privileges are correct.
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'shadowcoders'" | grep -q 1 || \
  sudo -u postgres createdb -O shadowcoders shadowcoders

sudo -u postgres psql -c "ALTER DATABASE shadowcoders OWNER TO shadowcoders;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE shadowcoders TO shadowcoders;"
sudo -u postgres psql -d shadowcoders -c "GRANT ALL ON SCHEMA public TO shadowcoders; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shadowcoders; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shadowcoders; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shadowcoders; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shadowcoders;"
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
USE_SUPABASE=false
DATABASE_URL=postgresql://shadowcoders:$DB_PASS@localhost:5432/shadowcoders?schema=public
LOCAL_DATABASE_URL=postgresql://shadowcoders:$DB_PASS@localhost:5432/shadowcoders
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=$JWT_SECRET
FRONTEND_ORIGIN=http://localhost:3000
EXECUTION_OS=linux
AI_PROVIDER=local
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
echo "📦 Installing and building backend..."
run_as_invoker npm install --prefix backend
run_as_invoker npm run build --prefix backend

echo "📦 Installing and building frontend..."
run_as_invoker npm install --prefix frontend
run_as_invoker npm run build --prefix frontend

echo "📦 Installing and building worker..."
run_as_invoker npm install --prefix worker
run_as_invoker npm run build --prefix worker

# 7. Start Services
echo "🚀 Launching with PM2..."
run_as_invoker env HOME="$INVOKER_HOME" PM2_HOME="$INVOKER_HOME/.pm2" pm2 start infra/pm2/unified.config.js
run_as_invoker env HOME="$INVOKER_HOME" PM2_HOME="$INVOKER_HOME/.pm2" pm2 save

# Configure PM2 startup on boot (best effort, non-fatal)
if command -v systemctl >/dev/null 2>&1; then
    pm2 startup systemd -u "$INVOKER_USER" --hp "$INVOKER_HOME" >/dev/null 2>&1 || true
fi

echo "=========================================================="
echo "🎉 Setup Complete!"
echo "=========================================================="
echo "API: http://localhost:4000"
echo "Frontend: http://localhost:3000"
echo "Database Password: $DB_PASS"
echo "=========================================================="
echo "Run 'pm2 status' to check service health."
