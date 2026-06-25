# eSSL device + MAMS cloud troubleshooting (run from your PC on same LAN as device)
param(
  [string]$DeviceIp = "192.168.1.17",
  [string]$Serial = "TFDB244700544",
  [string]$ApiHost = "mams-api-xvso.onrender.com",
  [string]$BioId = "3"
)

$ErrorActionPreference = "Continue"
$base = "https://$ApiHost/iclock"

Write-Host "`n=== 1. LAN: ping device $DeviceIp ===" -ForegroundColor Cyan
ping -n 2 $DeviceIp

Write-Host "`n=== 2. Cloud handshake (device registration) ===" -ForegroundColor Cyan
try {
  $hs = Invoke-WebRequest -Uri "$base/cdata?SN=$Serial&options=all" -UseBasicParsing
  Write-Host "OK $($hs.StatusCode) - MAMS knows serial $Serial"
  Write-Host $hs.Content
} catch {
  Write-Host "FAIL: $_" -ForegroundColor Red
}

Write-Host "`n=== 3. Simulate ATTLOG punch (bio $BioId) - proves MAMS ingestion ===" -ForegroundColor Cyan
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$body = "$BioId`t$ts`t0`t1`t0`t0`t0"
try {
  $post = Invoke-WebRequest -Uri "$base/cdata?SN=$Serial&table=ATTLOG" -Method POST -Body $body -ContentType "text/plain" -UseBasicParsing
  Write-Host "POST $($post.StatusCode) $($post.Content) at $ts"
  Write-Host "Check https://maksonhrms.netlify.app -> Attendance Log for employee with biometric $BioId"
} catch {
  Write-Host "FAIL: $_" -ForegroundColor Red
}

Write-Host "`n=== 4. getrequest endpoint (device polls this) ===" -ForegroundColor Cyan
try {
  $gr = Invoke-WebRequest -Uri "$base/getrequest?SN=$Serial" -UseBasicParsing
  Write-Host "GET $($gr.StatusCode) $($gr.Content)"
} catch {
  Write-Host "FAIL: $_" -ForegroundColor Red
}

Write-Host @"

=== Try on device (one change at a time, reboot device after each) ===

A) Server Address formats:
   - mams-api-xvso.onrender.com
   - mams-api-xvso.onrender.com:443
   Enable Domain: ON, HTTPS: ON, ADMS: ON

B) If still no punches after 5 min while Online in MAMS -> HTTPS bridge on this PC:
   1. ipconfig  -> note IPv4 (e.g. 192.168.1.50)
   2. From mams folder: node scripts/essl-http-bridge.js
   3. Windows Firewall: allow inbound TCP 8080
   4. Device: HTTPS OFF, Enable Domain OFF, Server Address: <your-pc-ip>:8080

C) PC software at $DeviceIp`:4370 (eTimeTrackLite / ZKTeco):
   - Confirm user $BioId exists and local attendance rows appear after you punch
   - If local log empty -> enrollment problem, not cloud

D) Device menu: System -> Date/Time -> enable NTP (pool.ntp.org), sync, reboot

E) Punch only when MAMS Devices shows Online; wait 3-5 minutes

"@ -ForegroundColor Yellow
