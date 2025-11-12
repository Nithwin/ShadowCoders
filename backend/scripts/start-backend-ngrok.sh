#!/bin/bash
# Bash script to start both backend and ngrok
# Usage: ./scripts/start-backend-ngrok.sh

echo "========================================"
echo "  Starting Backend + ngrok Tunnel"
echo "========================================"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "Error: ngrok is not installed"
    echo "Install ngrok from: https://ngrok.com/download"
    echo "Or install via npm: npm install -g ngrok"
    exit 1
fi

# Get the backend directory
BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Backend directory: $BACKEND_DIR"
echo ""

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "Warning: .env file not found in $BACKEND_DIR"
    echo "Make sure your .env file is configured with:"
    echo "  - DATABASE_URL"
    echo "  - JWT_SECRET"
    echo "  - FRONTEND_ORIGIN (your Vercel URL)"
    echo ""
fi

# Start backend in background
echo "Starting backend server..."
cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start (5 seconds)..."
sleep 5

# Start ngrok in background
echo "Starting ngrok tunnel..."
ngrok http 4000 &
NGROK_PID=$!

echo ""
echo "========================================"
echo "  Backend and ngrok are starting!"
echo "========================================"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "ngrok PID: $NGROK_PID"
echo ""
echo "Next steps:"
echo "1. Wait for backend to start on http://localhost:4000"
echo "2. Check ngrok dashboard or visit http://localhost:4040 for the tunnel URL"
echo "3. Copy the ngrok URL and update Vercel environment variable:"
echo "   NEXT_PUBLIC_API_BASE_URL=https://your-ngrok-url.ngrok-free.app/api"
echo "4. Make sure FRONTEND_ORIGIN in backend .env matches your Vercel URL"
echo ""
echo "To stop: kill $BACKEND_PID $NGROK_PID"

# Wait for user interrupt
trap "kill $BACKEND_PID $NGROK_PID; exit" INT TERM
wait

