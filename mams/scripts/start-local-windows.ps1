# Start MAMS local stack on Windows (portable Node + MongoDB).
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/start-local-windows.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

$nodeDir = "C:\Users\Parag Mehta\tools\node-v22.22.3-win-x64"
$mongoDir = "C:\Users\Parag Mehta\tools\mongodb-win32-x86_64-windows-7.0.19"
$mongoData = Join-Path $mongoDir "data"

if (-not (Test-Path $nodeDir)) {
  Write-Error "Node not found at $nodeDir. Install Node.js 22+ or update this script."
}
$env:Path = "$nodeDir;$env:Path"

function Test-PortOpen([int]$Port) {
  return (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
}

if (-not (Test-PortOpen 27017)) {
  if (-not (Test-Path (Join-Path $mongoDir "bin\mongod.exe"))) {
    Write-Error "MongoDB not found at $mongoDir. Re-run setup or install MongoDB locally."
  }
  if (-not (Test-Path $mongoData)) {
    New-Item -ItemType Directory -Path $mongoData | Out-Null
  }
  Start-Process -FilePath (Join-Path $mongoDir "bin\mongod.exe") `
    -ArgumentList "--dbpath `"$mongoData`" --port 27017" -WindowStyle Hidden
  Start-Sleep -Seconds 6
}

Set-Location $repoRoot

if (-not (Test-PortOpen 3001)) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot'; `$env:Path='$nodeDir;' + `$env:Path; npm run dev:server"
}

if (-not (Test-PortOpen 5173)) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot'; `$env:Path='$nodeDir;' + `$env:Path; npm run dev:web"
}

Write-Host ""
Write-Host "MAMS local stack"
Write-Host "  Web:    http://localhost:5173"
Write-Host "  API:    http://localhost:3001"
Write-Host "  Login:  hr.admin@makson-group.com / makson2026"
Write-Host ""
