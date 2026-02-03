# Start ShadowCoders for Mobile Development
# This script starts both backend and frontend on your local IP

Write-Host "🚀 Starting ShadowCoders for Mobile Access..." -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "10.*" -or $_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    Write-Host "❌ Could not detect local IP address" -ForegroundColor Red
    exit 1
}

Write-Host "📱 Your Local IP: $localIP" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://${localIP}:3000" -ForegroundColor Green
Write-Host "  Backend:  http://${localIP}:4000" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Use these URLs on your mobile device (must be on same WiFi)" -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "✅ Servers are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
