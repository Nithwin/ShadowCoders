#!/bin/bash
# ============================================================
# Deployment Script — Zero-Downtime Deploy
# ============================================================
# Usage: ./deploy.sh [server1|server2|all]
# Run from the project root on the target server

set -e

DEPLOY_TARGET="${1:-all}"
PROJECT_DIR="/opt/shadowcoders"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo "========================================"
echo "Deploying ShadowCoders — $DEPLOY_TARGET"
echo "Timestamp: $TIMESTAMP"
echo "========================================"

# Pull latest code
echo "[1] Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

deploy_server1() {
    echo ""
    echo "--- Deploying Server 1 (API + Frontend) ---"
    
    # Backend
    echo "[2] Building backend..."
    cd $PROJECT_DIR/backend
    npm ci --production=false
    npx prisma generate
    npx prisma migrate deploy
    npm run build
    
    # Frontend
    echo "[3] Building frontend..."
    cd $PROJECT_DIR/frontend
    npm ci --production=false
    npm run build
    
    # Reload PM2 (zero-downtime with cluster mode)
    echo "[4] Reloading services..."
    pm2 reload shadowcoders-api --update-env
    pm2 reload shadowcoders-frontend --update-env
    
    # Reload nginx
    echo "[5] Reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "Server 1 deployed!"
}

deploy_server2() {
    echo ""
    echo "--- Deploying Server 2 (Workers) ---"
    
    # Worker
    echo "[2] Building worker..."
    cd $PROJECT_DIR/worker
    npm ci --production=false
    npm run build
    
    # Rebuild Docker image if Dockerfile changed
    echo "[3] Rebuilding sandbox image..."
    cd $PROJECT_DIR
    docker build -t shadowcoders-sandbox -f docker/sandbox/Dockerfile.sandbox docker/sandbox/
    
    # Restart workers (graceful — PM2 waits for active jobs)
    echo "[4] Restarting workers..."
    pm2 restart shadowcoders-worker --update-env
    
    echo "Server 2 deployed!"
}

case $DEPLOY_TARGET in
    server1)
        deploy_server1
        ;;
    server2)
        deploy_server2
        ;;
    all)
        deploy_server1
        deploy_server2
        ;;
    *)
        echo "Usage: $0 [server1|server2|all]"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "Deployment complete!"
echo "========================================"
echo ""
echo "Verify with:"
echo "  pm2 status"
echo "  curl http://localhost:4000/api/healthz"
echo "  curl http://localhost:4000/api/queue/status"
echo ""
