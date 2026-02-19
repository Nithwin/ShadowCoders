#!/bin/bash
# ============================================================
# Server 1 Setup Script — API + Frontend + DB + Redis
# ============================================================
# Run as root: sudo bash setup-server1.sh
# For Ubuntu 22.04 LTS

set -e

echo "========================================"
echo "ShadowCoders — Server 1 Setup"
echo "API + Frontend + PostgreSQL + Redis"
echo "========================================"

# ============================================================
# 1. SYSTEM UPDATE
# ============================================================
echo "[1/8] Updating system..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git build-essential

# ============================================================
# 2. NODE.JS 20 LTS
# ============================================================
echo "[2/8] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# ============================================================
# 3. PM2 (Process Manager)
# ============================================================
echo "[3/8] Installing PM2..."
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Create log directory
mkdir -p /var/log/pm2

# ============================================================
# 4. POSTGRESQL 16
# ============================================================
echo "[4/8] Installing PostgreSQL 16..."
if ! command -v psql &> /dev/null; then
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-16 postgresql-client-16
fi

# Configure PostgreSQL for performance
echo "[4/8] Configuring PostgreSQL..."
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
if [ -f "$PG_CONF" ]; then
    # Connection settings (handle 400 students + API pool)
    sed -i "s/#max_connections = 100/max_connections = 200/" $PG_CONF
    
    # Memory settings (for 8GB total RAM)
    sed -i "s/#shared_buffers = 128MB/shared_buffers = 2GB/" $PG_CONF
    sed -i "s/#effective_cache_size = 4GB/effective_cache_size = 4GB/" $PG_CONF
    sed -i "s/#work_mem = 4MB/work_mem = 16MB/" $PG_CONF
    sed -i "s/#maintenance_work_mem = 64MB/maintenance_work_mem = 256MB/" $PG_CONF
    
    # WAL settings
    sed -i "s/#wal_buffers = -1/wal_buffers = 64MB/" $PG_CONF
    sed -i "s/#checkpoint_completion_target = 0.9/checkpoint_completion_target = 0.9/" $PG_CONF
    
    # Logging (minimal in production)
    sed -i "s/#log_min_duration_statement = -1/log_min_duration_statement = 1000/" $PG_CONF  # Log queries > 1s
    
    systemctl restart postgresql
fi

# Create database and user
echo "[4/8] Creating database..."
sudo -u postgres psql -c "CREATE USER shadowcoders WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE shadowcoders OWNER shadowcoders;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE shadowcoders TO shadowcoders;" 2>/dev/null || true
echo "PostgreSQL configured"

# ============================================================
# 5. REDIS
# ============================================================
echo "[5/8] Installing Redis..."
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
fi

# Configure Redis
REDIS_CONF="/etc/redis/redis.conf"
if [ -f "$REDIS_CONF" ]; then
    # Bind to localhost only (security)
    sed -i "s/^bind .*/bind 127.0.0.1/" $REDIS_CONF
    
    # Set max memory (512MB for queue + cache)
    sed -i "s/# maxmemory <bytes>/maxmemory 512mb/" $REDIS_CONF
    sed -i "s/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" $REDIS_CONF
    
    # Disable snapshotting for better performance (queues are ephemeral)
    # Comment: If you want persistence, keep RDB defaults
    # sed -i "s/^save /# save /" $REDIS_CONF
    
    systemctl restart redis-server
    systemctl enable redis-server
fi
echo "Redis configured"

# ============================================================
# 6. NGINX
# ============================================================
echo "[6/8] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

# The nginx config will be symlinked from the project
echo "Nginx installed. Link config with:"
echo "  ln -sf /path/to/ShadowCoders/infra/nginx/shadowcoders.conf /etc/nginx/sites-enabled/"
echo "  nginx -t && systemctl reload nginx"

# ============================================================
# 7. FIREWALL
# ============================================================
echo "[7/8] Configuring firewall..."
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable
echo "Firewall configured"

# ============================================================
# 8. SYSTEM TUNING
# ============================================================
echo "[8/8] System tuning..."

# Increase file descriptors
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# Increase socket backlog
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf

# TCP keep-alive (detect dead connections faster)
echo "net.ipv4.tcp_keepalive_time = 60" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_intvl = 10" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_probes = 6" >> /etc/sysctl.conf

sysctl -p

echo ""
echo "========================================"
echo "Server 1 setup complete!"
echo "========================================"
echo ""
echo "NEXT STEPS:"
echo "1. Clone your repo to /opt/shadowcoders"
echo "2. Set up .env file in backend/"
echo "3. Update DATABASE_URL to: postgresql://shadowcoders:YOUR_STRONG_PASSWORD_HERE@localhost:5432/shadowcoders"
echo "4. Set REDIS_URL=redis://127.0.0.1:6379"
echo "5. cd backend && npm install && npx prisma migrate deploy && npm run build"
echo "6. cd frontend && npm install && npm run build"
echo "7. pm2 start infra/pm2/api.config.js"
echo "8. pm2 start infra/pm2/frontend.config.js"
echo "9. pm2 save && pm2 startup"
echo "10. Link nginx config and reload"
echo ""
