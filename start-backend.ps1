# ShadowCoders Backend Startup Script
# This script ensures all services are ready before starting

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  ShadowCoders Backend Startup" -ForegroundColor Cyan  
Write-Host "=====================================" -ForegroundColor Cyan

# Step 1: Check PostgreSQL
Write-Host "`n[1/4] Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "      ✓ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "      ✗ PostgreSQL is not running!" -ForegroundColor Red
    Write-Host "      Starting PostgreSQL..." -ForegroundColor Yellow
    if ($pgService) {
        Start-Service $pgService.Name
        Start-Sleep -Seconds 2
        Write-Host "      ✓ PostgreSQL started" -ForegroundColor Green
    } else {
        Write-Host "      ✗ PostgreSQL service not found!" -ForegroundColor Red
        Write-Host "      Please install PostgreSQL first." -ForegroundColor Red
        exit 1
    }
}

# Step 2: Navigate to backend
Write-Host "`n[2/4] Navigating to backend directory..." -ForegroundColor Yellow
Set-Location -Path "backend" -ErrorAction Stop
Write-Host "      ✓ In backend directory" -ForegroundColor Green

# Step 3: Generate Prisma Client
Write-Host "`n[3/4] Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "      ! Prisma generation had warnings (continuing...)" -ForegroundColor Yellow
}

# Step 4: Start the server
Write-Host "`n[4/4] Starting backend server..." -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
