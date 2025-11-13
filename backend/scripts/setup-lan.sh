#!/bin/bash

# Script to setup backend for LAN access
# This script helps configure the backend to be accessible on your local network

echo "=========================================="
echo "🌐 Setting up Backend for LAN Access"
echo "=========================================="
echo ""

# Get local IP address
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo "")

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not automatically detect IP address."
    echo "Please run: node scripts/get-local-ip.js"
    exit 1
fi

echo "📍 Detected Local IP: $LOCAL_IP"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Update .env with LAN configuration
echo "📝 Updating .env file..."

# Add or update ALLOWED_ORIGINS to include local IP
if grep -q "ALLOWED_ORIGINS" .env; then
    # Update existing ALLOWED_ORIGINS
    sed -i.bak "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:3000,http://${LOCAL_IP}:3000|" .env
else
    # Add new ALLOWED_ORIGINS
    echo "" >> .env
    echo "# LAN Access Configuration" >> .env
    echo "ALLOWED_ORIGINS=http://localhost:3000,http://${LOCAL_IP}:3000" >> .env
fi

# Set ALLOW_ALL_ORIGINS to true for easier LAN access (development only)
if grep -q "ALLOW_ALL_ORIGINS" .env; then
    sed -i.bak "s|ALLOW_ALL_ORIGINS=.*|ALLOW_ALL_ORIGINS=true|" .env
else
    echo "ALLOW_ALL_ORIGINS=true" >> .env
fi

echo ""
echo "✅ Configuration updated!"
echo ""
echo "📱 Backend will be accessible at:"
echo "   http://${LOCAL_IP}:4000"
echo ""
echo "📝 For frontend, set this environment variable:"
echo "   NEXT_PUBLIC_API_BASE_URL=http://${LOCAL_IP}:4000/api"
echo ""
echo "⚠️  Make sure Windows Firewall allows connections on port 4000"
echo "   Run this command as Administrator:"
echo "   netsh advfirewall firewall add rule name=\"Node.js Backend\" dir=in action=allow protocol=TCP localport=4000"
echo ""
echo "=========================================="

