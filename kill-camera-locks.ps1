# Force kill all processes that might be using camera
Write-Host "`n=== Killing Camera Processes ===" -ForegroundColor Cyan

# Kill Windows Camera app
Write-Host "`n1. Stopping Windows Camera app..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like '*WindowsCamera*'} | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill all browser processes
Write-Host "2. Stopping ALL browsers..." -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.ProcessName -like '*chrome*' -or 
    $_.ProcessName -like '*firefox*' -or 
    $_.ProcessName -like '*msedge*'
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait for processes to fully terminate
Write-Host "3. Waiting for processes to terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Kill video apps
Write-Host "4. Stopping video/communication apps..." -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.ProcessName -like '*teams*' -or 
    $_.ProcessName -like '*zoom*' -or 
    $_.ProcessName -like '*skype*'
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Now open ONLY ONE browser window and go to:" -ForegroundColor White
Write-Host "http://localhost:3001/student/exams/cml92763p0002lodogqmgrv4m`n" -ForegroundColor Cyan
