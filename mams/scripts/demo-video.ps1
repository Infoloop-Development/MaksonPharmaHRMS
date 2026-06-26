# MAMS biometric demo — run this ON CAMERA after punching on device
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MAMS Biometric Sync Demo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Device : 192.168.1.17" -ForegroundColor Gray
Write-Host "  Cloud  : maksonhrms.netlify.app" -ForegroundColor Gray
Write-Host ""

Set-Location $PSScriptRoot\..

if (-not (Test-Path "node_modules\node-zklib")) {
  Write-Host "Installing node-zklib (one-time)..." -ForegroundColor Yellow
  npm install node-zklib --no-save 2>$null
}

Write-Host "Syncing device punches to MAMS..." -ForegroundColor Green
node scripts\essl-device-sync-to-mams.cjs

Write-Host ""
Write-Host "Done! Refresh Attendance Log in the browser." -ForegroundColor Green
Write-Host ""
