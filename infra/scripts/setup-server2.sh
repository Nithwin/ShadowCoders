#!/bin/bash
# ============================================================
# Server 2 Setup Script — Worker Pool
# ============================================================
# Run as root: sudo bash setup-server2.sh
# For Ubuntu 22.04 LTS

set -e

echo "========================================"
echo "ShadowCoders — Server 2 Setup"
echo "Worker Pool + Docker Sandbox"
echo "========================================"

# ============================================================
# 1. SYSTEM UPDATE
# ============================================================
echo "[1/6] Updating system..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git build-essential

# ============================================================
# 2. NODE.JS 20 LTS
# ============================================================
echo "[2/6] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"

# ============================================================
# 3. PM2
# ============================================================
echo "[3/6] Installing PM2..."
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
mkdir -p /var/log/pm2

# ============================================================
# 4. DOCKER
# ============================================================
echo "[4/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Install Docker CE
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
fi

# Add current user to docker group
usermod -aG docker $SUDO_USER 2>/dev/null || true

# Configure Docker daemon for sandbox workload
echo "[4/6] Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64,
      "Soft": 64
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 32,
      "Soft": 32
    }
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

systemctl restart docker
systemctl enable docker
echo "Docker configured"

# ============================================================
# 5. BUILD SANDBOX IMAGE
# ============================================================
echo "[5/6] Building sandbox Docker image..."

# Create a temp Dockerfile if project isn't cloned yet
SANDBOX_DIR="/tmp/sandbox-build"
mkdir -p $SANDBOX_DIR

cat > $SANDBOX_DIR/Dockerfile <<'DOCKERFILE'
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install compilers and runtimes for C, C++, Java, Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jdk-headless \
    python3 \
    coreutils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -g 1000 sandbox && \
    useradd -u 1000 -g sandbox -m -s /bin/sh sandbox

# Create working directory
RUN mkdir -p /sandbox && chown sandbox:sandbox /sandbox

WORKDIR /sandbox
USER sandbox

CMD ["/bin/sh"]
DOCKERFILE

docker build -t shadowcoders-sandbox $SANDBOX_DIR
rm -rf $SANDBOX_DIR
echo "Sandbox image built"

# Pre-pull to warm cache
echo "Warming Docker cache with test run..."
echo 'int main() { return 0; }' > /tmp/test.c
docker run --rm --network none --memory 64m --cpus 0.25 \
  -v /tmp/test.c:/sandbox/test.c:ro \
  shadowcoders-sandbox \
  /bin/sh -c "gcc /sandbox/test.c -o /tmp/a.out && /tmp/a.out"
rm -f /tmp/test.c
echo "Docker sandbox verified"

# ============================================================
# 6. SYSTEM TUNING
# ============================================================
echo "[6/6] System tuning..."

# Increase file descriptors
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# Docker-specific: Increase inotify watchers
echo "fs.inotify.max_user_watches = 524288" >> /etc/sysctl.conf
echo "fs.inotify.max_user_instances = 512" >> /etc/sysctl.conf

sysctl -p

# Firewall: Only allow SSH and Redis from Server 1
ufw allow 22/tcp
# Allow Redis connections from Server 1 IP (replace with actual IP)
# ufw allow from SERVER1_IP to any port 6379
ufw --force enable

echo ""
echo "========================================"
echo "Server 2 setup complete!"
echo "========================================"
echo ""
echo "NEXT STEPS:"
echo "1. Clone the repo to /opt/shadowcoders"
echo "2. Create worker/.env with REDIS_URL pointing to Server 1"
echo "3. cd worker && npm install && npm run build"
echo "4. pm2 start infra/pm2/worker.config.js"
echo "5. pm2 save && pm2 startup"
echo ""
echo "IMPORTANT:"
echo "- REDIS_URL should point to Server 1: redis://SERVER1_IP:6379"
echo "- On Server 1, update Redis config to bind to 0.0.0.0 or Server 2's IP"
echo "- On Server 1, add firewall rule: ufw allow from SERVER2_IP to any port 6379"
echo ""
