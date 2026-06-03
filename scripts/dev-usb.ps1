# USB + adb reverse setup for real device
# Run: pnpm dev:usb

Write-Host ""
Write-Host "=== USB real device setup ===" -ForegroundColor Cyan

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host "[ERROR] adb not found. Install Android SDK Platform-Tools." -ForegroundColor Red
  exit 1
}

$lines = & adb devices 2>&1 | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (-not $lines) {
  Write-Host "[ERROR] No device. Enable USB debugging and authorize this PC." -ForegroundColor Red
  Write-Host "  Settings -> Developer options -> USB debugging ON"
  exit 1
}

$real = $lines | Where-Object { $_ -notmatch 'emulator-' }
if ($real) {
  $serial = (@($real)[0] -split '\t')[0]
  Write-Host "[OK] Real device: $serial" -ForegroundColor Green
  & adb -s $serial reverse tcp:3000 tcp:3000
  & adb -s $serial reverse tcp:8081 tcp:8081
} else {
  Write-Host "[WARN] Only emulator connected. Plug in a real phone for USB test." -ForegroundColor Yellow
  & adb reverse tcp:3000 tcp:3000
  & adb reverse tcp:8081 tcp:8081
}

Write-Host "[OK] adb reverse: 3000 (API) + 8081 (Metro)" -ForegroundColor Green
& adb reverse --list

try {
  $metro = Invoke-WebRequest -Uri "http://127.0.0.1:8081/status" -UseBasicParsing -TimeoutSec 3
  if ($metro.Content -match 'running') {
    Write-Host "[OK] Metro is running on :8081" -ForegroundColor Green
  }
} catch {
  Write-Host "[WARN] Metro is NOT running! Start it first:" -ForegroundColor Yellow
  Write-Host "  cd apps/mobile && pnpm start" -ForegroundColor Yellow
  Write-Host "  (Without Metro you will see 'Unable to load script' red screen)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "App config: DEV_CONNECT_MODE = 'usb' -> http://127.0.0.1:3000" -ForegroundColor Cyan
Write-Host "Next: pnpm dev:all  (backend + Metro + adb + launch app)" -ForegroundColor Cyan
Write-Host ""
