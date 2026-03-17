$ErrorActionPreference = "SilentlyContinue"

function Stop-ByPort($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Stop-ByPort 5173
Stop-ByPort 8080
Stop-ByPort 8545

Write-Host "Stopped listeners on ports 5173, 8080, 8545 (if running)."
