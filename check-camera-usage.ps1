# Check which processes might be using the camera
Write-Host "`n=== Checking for Camera Usage ===" -ForegroundColor Cyan

# Check browser processes
Write-Host "`n1. Browser Processes:" -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.ProcessName -like '*chrome*' -or 
    $_.ProcessName -like '*firefox*' -or 
    $_.ProcessName -like '*msedge*' -or
    $_.ProcessName -like '*brave*'
} | Select-Object Id, ProcessName, MainWindowTitle | Format-Table -AutoSize

# Check video/communication apps
Write-Host "`n2. Video/Communication Apps:" -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.ProcessName -like '*teams*' -or 
    $_.ProcessName -like '*zoom*' -or 
    $_.ProcessName -like '*skype*' -or
    $_.ProcessName -like '*discord*' -or
    $_.ProcessName -like '*slack*'
} | Select-Object Id, ProcessName, MainWindowTitle | Format-Table -AutoSize

Write-Host "`n=== Instructions ===" -ForegroundColor Green
Write-Host "1. Close ALL browser tabs except ONE" -ForegroundColor White
Write-Host "2. Close any video apps (Zoom, Teams, etc.)" -ForegroundColor White
Write-Host "3. Hard refresh the browser (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "4. If error persists, restart the browser completely`n" -ForegroundColor White
