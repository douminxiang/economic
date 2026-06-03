# One-click dev: adb reverse + backend + Metro (+ optional app launch)
# Run from repo root: pnpm dev:all

param(
  [switch]$Restart,
  [switch]$NoLaunch
)

$ErrorActionPreference = 'Continue'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Get-PortOwner($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  return $conn
}

function Stop-Port($port) {
  $pids = Get-PortOwner $port
  if (-not $pids) { return $false }
  foreach ($pid in @($pids)) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 1
  return $true
}

function Test-Service($url, $timeoutSec = 3) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSec
    return @{ Ok = $true; Response = $r }
  } catch {
    return @{ Ok = $false; Response = $null }
  }
}

function Wait-ForService($name, $url, $maxSec = 90) {
  $deadline = (Get-Date).AddSeconds($maxSec)
  while ((Get-Date) -lt $deadline) {
    if ((Test-Service $url 2).Ok) { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

Write-Host ""
Write-Step "=== economic dev:all ==="
Write-Host "Root: $Root"
Write-Host ""

# --- adb reverse ---
Write-Step "[1/4] USB adb reverse"
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Warn "adb not found — skip reverse (emulator/WiFi only)"
} else {
  $lines = & adb devices 2>&1 | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
  if (-not $lines) {
    Write-Warn "No device connected — skip reverse"
  } else {
    $real = $lines | Where-Object { $_ -notmatch 'emulator-' }
    if ($real) {
      $serial = (@($real)[0] -split '\t')[0]
      Write-Ok "Real device: $serial"
      & adb -s $serial reverse tcp:3000 tcp:3000
      & adb -s $serial reverse tcp:8081 tcp:8081
    } else {
      Write-Ok "Emulator connected"
      & adb reverse tcp:3000 tcp:3000
      & adb reverse tcp:8081 tcp:8081
    }
    & adb reverse --list
  }
}

Write-Host ""

# --- optional restart ---
if ($Restart) {
  Write-Step "Restart: stopping old Metro (:8081) and backend (:3000)"
  if (Stop-Port 8081) { Write-Ok "Stopped process on :8081" }
  if (Stop-Port 3000) { Write-Ok "Stopped process on :3000" }
  Write-Host ""
}

# --- backend ---
Write-Step "[2/4] Backend API (:3000)"
$backendCheck = Test-Service 'http://127.0.0.1:3000' 3
$backendUp = $backendCheck.Ok
if ($backendUp -and -not $Restart) {
  Write-Ok "Backend already running"
} else {
  Start-Process powershell -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "Set-Location '$Root'; Write-Host '=== Backend (pnpm dev:server) ===' -ForegroundColor Cyan; pnpm dev:server"
  ) | Out-Null
  Write-Ok "Backend starting in new window..."
  if (-not (Wait-ForService 'Backend' 'http://127.0.0.1:3000' 120)) {
    Write-Err "Backend did not start within 120s — check MySQL (phpstudy) and the backend window"
  } else {
    Write-Ok "Backend ready"
  }
}

Write-Host ""

# --- Metro ---
Write-Step "[3/4] Metro bundler (:8081)"
$metroCheck = Test-Service 'http://127.0.0.1:8081/status' 3
$metroUp = $metroCheck.Ok
$metroResp = $metroCheck.Response
if ($metroUp -and ($metroResp.Content -match 'running') -and -not $Restart) {
  Write-Ok "Metro already running"
} else {
  $mobileDir = Join-Path $Root 'apps\mobile'
  Start-Process powershell -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "Set-Location '$mobileDir'; Write-Host '=== Metro (pnpm start) ===' -ForegroundColor Cyan; pnpm start"
  ) | Out-Null
  Write-Ok "Metro starting in new window..."
  if (-not (Wait-ForService 'Metro' 'http://127.0.0.1:8081/status' 90)) {
    Write-Err "Metro did not start within 90s"
  } else {
    Write-Ok "Metro ready"
  }
}

Write-Host ""

# --- launch app ---
Write-Step "[4/4] Launch app on device"
if ($NoLaunch) {
  Write-Warn "Skipped (-NoLaunch)"
} elseif (-not $adb) {
  Write-Warn "adb not found — open app manually"
} else {
  $lines = & adb devices 2>&1 | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
  if ($lines) {
    $real = $lines | Where-Object { $_ -notmatch 'emulator-' }
    if ($real) {
      $serial = (@($real)[0] -split '\t')[0]
      & adb -s $serial shell am force-stop com.economic.mobile 2>$null
      Start-Sleep -Milliseconds 800
      & adb -s $serial shell am start -n com.economic.mobile/.MainActivity
    } else {
      & adb shell am force-stop com.economic.mobile 2>$null
      Start-Sleep -Milliseconds 800
      & adb shell am start -n com.economic.mobile/.MainActivity
    }
    Write-Ok "App launched — Reload on device if needed (shake -> Reload)"
  } else {
    Write-Warn "No device — install/open app manually"
  }
}

Write-Host ""
Write-Step "=== Ready ==="
Write-Host "  Backend : http://127.0.0.1:3000"
Write-Host "  Metro   : http://127.0.0.1:8081"
Write-Host "  Mobile  : DEV_CONNECT_MODE = 'usb' in apps/mobile/src/config/api.ts"
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  pnpm dev:all --Restart   # kill old ports and restart"
Write-Host "  pnpm dev:all --NoLaunch  # start services only, no app launch"
Write-Host "  Re-plug USB -> pnpm dev:usb"
Write-Host ""
