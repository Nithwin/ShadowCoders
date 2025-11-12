# PowerShell script to start ngrok tunnel for the backend
# Usage: .\scripts\start-ngrok.ps1 [port]
# Default port: 4000

param(
    [int]$Port = 4000
)

Write-Host "Starting ngrok tunnel on port $Port..." -ForegroundColor Green
Write-Host "Make sure your backend is running on http://localhost:$Port" -ForegroundColor Yellow
Write-Host ""

# Check if ngrok is installed
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "Error: ngrok is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install ngrok from: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "Or install via Chocolatey: choco install ngrok" -ForegroundColor Yellow
    exit 1
}

# Start ngrok
Write-Host "Starting ngrok..." -ForegroundColor Cyan
ngrok http $Port

