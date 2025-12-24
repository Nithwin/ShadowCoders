#!/bin/bash

# Deployment Script for ShadowCoders
echo "=========================================="
echo "🚀 Starting Deployment/Update Process"
echo "=========================================="

# 1. Pull latest code
echo "📦 Pulling latest changes from git..."
git pull origin main

# 2. Install Dependencies (Backend)
echo "📥 Installing Backend Dependencies..."
cd backend
npm install

# 3. Update Database Schema (THE REQUESTED PRISMA COMMAND)
echo "🗄️  Syncing Database Schema..."
# Use db push for prototyping/fast iteration (allows data loss if schema changes drastically)
# For strict production with migrations, use: npx prisma migrate deploy
npx prisma db push

# 4. Build Backend
echo "🏗️  Building Backend..."
npm run build

# 5. Install Dependencies & Build Frontend
echo "✨ Installing & Building Frontend..."
cd ../frontend
npm install
npm run build

# 6. Restart Server (using PM2 if available, otherwise manual check)
echo "🔄 Restarting Application..."
cd ..

if command -v pm2 &> /dev/null; then
    echo "Using PM2 to restart..."
    pm2 restart shadowcoders-backend || pm2 start backend/dist/index.js --name shadowcoders-backend
else
    echo "⚠️  PM2 not found. Please manually restart your node server."
    echo "Run: npm run start"
fi

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
