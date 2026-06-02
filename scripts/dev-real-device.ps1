# Real device dev setup: adb reverse + connectivity hints
# Run from repo root: pnpm dev:real-device

$ErrorActionPreference = "Stop"
$LanIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -match 'WLAN|Wi-Fi|Ethernet' -and $_.IPAddress -notmatch '^169\.254' } |
  Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $LanIp) { $LanIp = 'YOUR_LAN_IP' }

Write-Host ""
Write-Host "=== economic real device setup ===" -ForegroundColor Cyan
Write-Host "LAN IP (WLAN): $LanIp"
Write-Host ""

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host "[WARN] adb not found. Install Android SDK Platform-Tools." -ForegroundColor Yellow
} else {
  $lines = & adb devices 2>&1 | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
  if (-not $lines) {
    Write-Host "[WARN] No authorized device. Enable USB debugging on phone." -ForegroundColor Yellow
  } else {
    $lines | ForEach-Object { Write-Host "[OK] device: $_" -ForegroundColor Green }
    & adb reverse tcp:3000 tcp:3000
    & adb reverse tcp:8081 tcp:8081
    Write-Host "[OK] adb reverse 3000 + 8081" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "--- App config (apps/mobile/src/config/api.ts) ---" -ForegroundColor Cyan
Write-Host "  USB:  DEV_CONNECT_MODE = 'usb'"
Write-Host "  WiFi: DEV_CONNECT_MODE = 'lan', DEV_LAN_HOST = '$LanIp'"
Write-Host ""
Write-Host "--- Server .env (WiFi mode) ---" -ForegroundColor Cyan
Write-Host "  PUBLIC_BASE_URL=http://${LanIp}:3000"
Write-Host ""
Write-Host "--- Terminals ---" -ForegroundColor Cyan
Write-Host "  1) pnpm dev:server"
Write-Host "  2) cd apps/mobile && pnpm start"
Write-Host "  3) cd apps/mobile && pnpm android"
Write-Host ""

try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/v1/upload/mode" -UseBasicParsing -TimeoutSec 3
  Write-Host "[OK] Backend up HTTP $($r.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "[!] Start backend first: pnpm dev:server" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checklist: SMS login | SSO kick | AI image+OSS | map location" -ForegroundColor Cyan
Write-Host ""
