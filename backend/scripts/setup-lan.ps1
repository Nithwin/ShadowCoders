# PowerShell script to setup backend for LAN access on Windows
# Run this script in PowerShell (as Administrator for firewall rule)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setting up Backend for LAN Access" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if (-not $localIP) {
    Write-Host "[ERROR] Could not automatically detect IP address." -ForegroundColor Red
    Write-Host "Please run: node scripts/get-local-ip.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Detected Local IP: $localIP" -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "[WARNING] .env file not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
    } else {
        Write-Host "[ERROR] .env.example not found. Please create .env manually." -ForegroundColor Red
        exit 1
    }
}

# Update .env with LAN configuration
Write-Host "[INFO] Updating .env file..." -ForegroundColor Cyan

# Read .env file
$envContent = Get-Content .env -Raw

# Add or update ALLOWED_ORIGINS
if ($envContent -match "ALLOWED_ORIGINS=") {
    $envContent = $envContent -replace "ALLOWED_ORIGINS=.*", "ALLOWED_ORIGINS=http://localhost:3000,http://${localIP}:3000"
} else {
    $envContent += "`n# LAN Access Configuration`nALLOWED_ORIGINS=http://localhost:3000,http://${localIP}:3000`n"
}

# Set ALLOW_ALL_ORIGINS to true for easier LAN access (development only)
if ($envContent -match "ALLOW_ALL_ORIGINS=") {
    $envContent = $envContent -replace "ALLOW_ALL_ORIGINS=.*", "ALLOW_ALL_ORIGINS=true"
} else {
    $envContent += "ALLOW_ALL_ORIGINS=true`n"
}

# Write back to .env
Set-Content -Path .env -Value $envContent

Write-Host ""
Write-Host "[SUCCESS] Configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Backend will be accessible at:" -ForegroundColor Cyan
Write-Host "   http://${localIP}:4000" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] For frontend, set this environment variable:" -ForegroundColor Cyan
Write-Host "   NEXT_PUBLIC_API_BASE_URL=http://${localIP}:4000/api" -ForegroundColor White
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "[INFO] Adding Windows Firewall rule..." -ForegroundColor Cyan
    try {
        New-NetFirewallRule -DisplayName "Node.js Backend (Port 4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
        Write-Host "[SUCCESS] Firewall rule added!" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Could not add firewall rule automatically." -ForegroundColor Yellow
        Write-Host "   You may need to add it manually in Windows Firewall settings." -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] To allow connections through Windows Firewall, run this script as Administrator" -ForegroundColor Yellow
    Write-Host "   Or manually add a rule in Windows Firewall for port 4000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

