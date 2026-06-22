# MAMS local dev — run:  .\start-local.ps1
# Or right-click → Run with PowerShell

$ErrorActionPreference = "Stop"

$NodeDir = "C:\Users\Parag Mehta\tools\node-v22.22.3-win-x64"
$env:PATH = "$NodeDir;$env:PATH"

$Root = $PSScriptRoot
$ApiPort = 3001
$WebPort = 5173
Set-Location $Root

if (-not (Test-Path "$NodeDir\node.exe")) {
  Write-Host "ERROR: Node not found at $NodeDir" -ForegroundColor Red
  Write-Host "Install Node 20+ or update NodeDir in start-local.ps1"
  pause
  exit 1
}

Write-Host "Node: $(node -v)  npm: $(npm -v)" -ForegroundColor Green
Write-Host "Project: $Root" -ForegroundColor Green

if (-not (Test-Path "$Root\node_modules")) {
  Write-Host "Installing dependencies (first time)..." -ForegroundColor Yellow
  npm install
}

function Stop-PortListener([int]$Port) {
  $pids = @(
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
  )
  foreach ($procId in $pids) {
    if ($procId -and $procId -gt 0) {
      Write-Host "Stopping process $procId on port $Port..." -ForegroundColor Yellow
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Test-PortListening([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Wait-ForUrl([string]$Url, [int]$MaxSeconds = 45) {
  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  return $false
}

Write-Host ""
Write-Host "Clearing stale dev servers on ports $ApiPort and $WebPort..." -ForegroundColor Yellow
Stop-PortListener $ApiPort
Stop-PortListener $WebPort
Start-Sleep -Seconds 1

Write-Host "Starting API (port $ApiPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "`$env:PATH = '$NodeDir;' + `$env:PATH; Set-Location '$Root'; npm run dev:server"
)

Write-Host "Waiting for API health..." -ForegroundColor Yellow
if (-not (Wait-ForUrl "http://localhost:$ApiPort/api/health" 60)) {
  Write-Host ""
  Write-Host "ERROR: API did not start on http://localhost:$ApiPort" -ForegroundColor Red
  Write-Host "Check the API terminal window for errors (MongoDB URI, port in use, etc.)."
  pause
  exit 1
}
Write-Host "API is healthy." -ForegroundColor Green

Write-Host "Starting web (port $WebPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "`$env:PATH = '$NodeDir;' + `$env:PATH; Set-Location '$Root'; npm run dev:web"
)

Write-Host "Waiting for Vite..." -ForegroundColor Yellow
if (-not (Wait-ForUrl "http://localhost:$WebPort" 60)) {
  Write-Host ""
  Write-Host "ERROR: Web dev server did not start on http://localhost:$WebPort" -ForegroundColor Red
  Write-Host "Check the web terminal window for errors."
  pause
  exit 1
}
Write-Host "Vite is ready." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Open:  http://localhost:$WebPort/login" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Login:" -ForegroundColor White
Write-Host "  hr.admin@makson-group.com / makson2026"
Write-Host "  org.admin@makson-group.com / makson2026"
Write-Host ""
Write-Host "If you see a white screen: F12 -> Console, or click Clear session on the error page."
Write-Host "Keep the two server windows open while you work."
Write-Host ""

try {
  Start-Process "http://localhost:$WebPort/login"
} catch {
  Write-Host "Open http://localhost:$WebPort/login in your browser manually."
}

pause
