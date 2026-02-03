# Quick Database Connection Test and Fix Script
# Run this with: .\check-db.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Database Connection Diagnostics" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check PostgreSQL Service
Write-Host "1. Checking PostgreSQL Service..." -ForegroundColor Yellow
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "   ✓ PostgreSQL Service: $($pgService.DisplayName)" -ForegroundColor Green
    Write-Host "   ✓ Status: $($pgService.Status)" -ForegroundColor Green
    if ($pgService.Status -ne "Running") {
        Write-Host "   ! Starting PostgreSQL..." -ForegroundColor Yellow
        Start-Service $pgService.Name
    }
} else {
    Write-Host "   ✗ PostgreSQL service not found!" -ForegroundColor Red
    Write-Host "   Please install PostgreSQL or check service name" -ForegroundColor Red
}
Write-Host ""

# 2. Check .env file
Write-Host "2. Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ .env file exists" -ForegroundColor Green
    $dbUrl = (Get-Content .env | Select-String "DATABASE_URL=").Line
    if ($dbUrl) {
        Write-Host "   ✓ DATABASE_URL found: $dbUrl" -ForegroundColor Green
    } else {
        Write-Host "   ✗ DATABASE_URL not found in .env!" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ .env file not found!" -ForegroundColor Red
}
Write-Host ""

# 3. Test connection with Node.js
Write-Host "3. Testing database connection..." -ForegroundColor Yellow
if (Test-Path "test-db.js") {
    node test-db.js
} else {
    Write-Host "   ! test-db.js not found, skipping connection test" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check common PostgreSQL issues
Write-Host "4. Common Issues Check..." -ForegroundColor Yellow
Write-Host "   • Default PostgreSQL port (5432): " -NoNewline
$portCheck = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
if ($portCheck.TcpTestSucceeded) {
    Write-Host "✓ Open" -ForegroundColor Green
} else {
    Write-Host "✗ Closed or blocked" -ForegroundColor Red
}
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Recommended Actions:" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "1. Verify PostgreSQL password: 'shadowcoders'" -ForegroundColor White
Write-Host "2. Check if database 'shadowcoders' exists" -ForegroundColor White
Write-Host "3. Try resetting PostgreSQL password:" -ForegroundColor White
Write-Host "   psql -U postgres -c " -NoNewline -ForegroundColor Gray
Write-Host '"ALTER USER postgres WITH PASSWORD ' -NoNewline -ForegroundColor Gray
Write-Host "'shadowcoders'" -NoNewline -ForegroundColor Gray
Write-Host ';"' -ForegroundColor Gray
Write-Host ""
