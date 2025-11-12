# PowerShell script to start both backend and ngrok
# Usage: .\scripts\start-backend-ngrok.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Backend + ngrok Tunnel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "Error: ngrok is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install ngrok from: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "Or install via Chocolatey: choco install ngrok" -ForegroundColor Yellow
    exit 1
}

# Get the backend directory
$backendDir = Split-Path -Parent $PSScriptRoot
$backendDir = Resolve-Path $backendDir

Write-Host "Backend directory: $backendDir" -ForegroundColor Gray
Write-Host ""

# Check if .env file exists
$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Warning: .env file not found in $backendDir" -ForegroundColor Yellow
    Write-Host "Make sure your .env file is configured with:"
    Write-Host "  - DATABASE_URL"
    Write-Host "  - JWT_SECRET"
    Write-Host "  - FRONTEND_ORIGIN (your Vercel URL)"
    Write-Host ""
}

# Start backend in a new window
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm run dev" -WindowStyle Normal

# Wait for backend to start
Write-Host "Waiting for backend to start (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start ngrok in a new window
Write-Host "Starting ngrok tunnel..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 4000" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend and ngrok are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for backend to start on http://localhost:4000" -ForegroundColor White
Write-Host "2. Check ngrok window for the tunnel URL (e.g., https://abc123.ngrok-free.app)" -ForegroundColor White
Write-Host "3. Copy the ngrok URL and update Vercel environment variable:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_API_BASE_URL=https://your-ngrok-url.ngrok-free.app/api" -ForegroundColor Yellow
Write-Host "4. Make sure FRONTEND_ORIGIN in backend .env matches your Vercel URL" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window (backend and ngrok will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

