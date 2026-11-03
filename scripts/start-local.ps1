# Local preview of Przystań (Windows PowerShell 5.1+ / PowerShell 7).
#
#   .\scripts\start-local.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1   # if script execution is blocked
#
# Installs dependencies if needed (npm ci), builds the app, starts `vite preview` on all network
# interfaces and opens the browser. Prints the local link and the Wi-Fi link for a phone.
# Note: over plain http on an IP address the PWA cannot be installed and the service worker does
# not run – the phone link is only a layout preview. Stop with Ctrl+C.

param(
    [int]$Port = 4173,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error 'Node.js (npm) is not installed: https://nodejs.org/'
}

if (-not (Test-Path 'node_modules')) {
    Write-Host '==> npm ci' -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host '==> npm run build' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# IPv4 addresses of active Wi-Fi / Ethernet adapters (skips loopback, APIPA and virtual adapters)
$ips = @()
try {
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and
            $_.InterfaceAlias -notmatch 'vEthernet|VirtualBox|VMware|Loopback|WSL|Hyper-V|Bluetooth'
        } |
        Sort-Object -Property @{ Expression = { if ($_.InterfaceAlias -match 'Wi-?Fi|WLAN') { 0 } else { 1 } } } |
        Select-Object -ExpandProperty IPAddress
} catch {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.ToString() -notlike '127.*' } |
        ForEach-Object { $_.ToString() }
}

$local = "http://localhost:$Port/"
Write-Host ''
Write-Host "Lokalnie:      $local" -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "Sieć Wi-Fi:    http://${ip}:$Port/   (telefon w tej samej sieci)" -ForegroundColor Green }
Write-Host 'Uwaga: przez http na adresie IP instalacja PWA i service worker nie działają – to tylko podgląd układu.' -ForegroundColor Yellow
Write-Host 'Jeśli telefon nie łączy się: zezwól Node.js w Zaporze systemu Windows (sieć prywatna).' -ForegroundColor Yellow
Write-Host ''

if (-not $NoBrowser) { Start-Process $local }

npx vite preview --host --port $Port --strictPort
