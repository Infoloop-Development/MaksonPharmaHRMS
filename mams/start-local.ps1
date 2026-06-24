# MAMS local dev — run from mams folder:  .\start-local.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$ApiPort = 3001
$WebPort = 5173
Set-Location $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js not found. Install Node 20+ from https://nodejs.org" -ForegroundColor Red
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

function Wait-ForUrl([string]$Url, [int]$MaxSeconds = 60) {
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

function Ensure-MongoRunning {
  $mongoPort = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
  if ($mongoPort) {
    Write-Host "MongoDB already listening on 27017." -ForegroundColor Green
    return
  }

  $mongod = @(
    "${env:ProgramFiles}\MongoDB\Server\8.3\bin\mongod.exe",
    "${env:ProgramFiles}\MongoDB\Server\8.0\bin\mongod.exe",
    "${env:ProgramFiles}\MongoDB\Server\7.0\bin\mongod.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1

  if (-not $mongod) {
    Write-Host "WARNING: MongoDB not running on 27017 and mongod.exe not found." -ForegroundColor Yellow
    Write-Host "Install MongoDB Server (winget install MongoDB.Server) or set MONGO_URI in mams-server\.env"
    return
  }

  $dataPath = "$Root\.mongo-data"
  if (-not (Test-Path $dataPath)) { New-Item -ItemType Directory -Path $dataPath | Out-Null }

  Write-Host "Starting local MongoDB..." -ForegroundColor Yellow
  Start-Process -FilePath $mongod -ArgumentList @("--dbpath", $dataPath, "--port", "27017") -WindowStyle Hidden
  Start-Sleep -Seconds 4
}

Ensure-MongoRunning

Write-Host ""
Write-Host "Clearing stale dev servers on ports $ApiPort and $WebPort..." -ForegroundColor Yellow
Stop-PortListener $ApiPort
Stop-PortListener $WebPort
Start-Sleep -Seconds 1

$env:NODE_OPTIONS = "--dns-result-order=ipv4first"

Write-Host "Starting API (port $ApiPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "`$env:NODE_OPTIONS='--dns-result-order=ipv4first'; Set-Location '$Root'; npm run dev:server"
)

Write-Host "Waiting for API health..." -ForegroundColor Yellow
if (-not (Wait-ForUrl "http://localhost:$ApiPort/api/health" 90)) {
  Write-Host ""
  Write-Host "ERROR: API did not start on http://localhost:$ApiPort" -ForegroundColor Red
  Write-Host "Check the API terminal window. Common fixes:"
  Write-Host "  - Set mams-server\.env MONGO_URI=mongodb://localhost:27017/mams_dev"
  Write-Host "  - Run: npm run seed"
  pause
  exit 1
}
Write-Host "API is healthy." -ForegroundColor Green

Write-Host "Starting web (port $WebPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$Root'; npm run dev:web"
)

Write-Host "Waiting for Vite..." -ForegroundColor Yellow
if (-not (Wait-ForUrl "http://localhost:$WebPort" 60)) {
  Write-Host ""
  Write-Host "ERROR: Web dev server did not start on http://localhost:$WebPort" -ForegroundColor Red
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

try {
  Start-Process "http://localhost:$WebPort/login"
} catch {
  Write-Host "Open http://localhost:$WebPort/login in your browser manually."
}

pause
