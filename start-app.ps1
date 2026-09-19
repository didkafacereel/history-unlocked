# History Unlocked - launcher
#
# Double-click "Start App.bat" (which runs this script). It checks the project,
# starts the Expo dev server, waits until it is actually serving, and then opens
# the app in a phone-sized window so it looks the way it will on a device.
#
# Stop the server with Ctrl+C in this window.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$Port = 8081
$Url = "http://localhost:$Port"

function Write-Head($text) { Write-Host "`n$text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "  $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  $text" -ForegroundColor Yellow }
function Write-Err($text)  { Write-Host "  $text" -ForegroundColor Red }

function Test-ServerUp {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Wait-ForServer([int]$TimeoutSeconds = 180) {
    Write-Host "  Bundling (first run can take a minute)" -NoNewline
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-ServerUp) { Write-Host ""; return $true }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    return $false
}

function Open-PhoneWindow {
    # A phone-shaped, chrome-less window: the app is designed for 9:16, and a
    # full-width desktop browser makes it look wrong.
    $chrome = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
    $edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'

    if (Test-Path $chrome) {
        Start-Process $chrome -ArgumentList '--new-window', '--window-size=430,932', "--app=$Url"
        Write-Ok "Opened in Chrome (phone-sized window)."
    } elseif (Test-Path $edge) {
        Start-Process $edge -ArgumentList '--new-window', '--window-size=430,932', "--app=$Url"
        Write-Ok "Opened in Edge (phone-sized window)."
    } else {
        Start-Process $Url
        Write-Ok "Opened in your default browser."
    }
    Write-Host "  Full URL: $Url  (open it normally if you want DevTools)" -ForegroundColor DarkGray
}

function Stop-Port {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conn) { Write-Ok "Nothing is running on port $Port."; return }
    foreach ($c in $conn) {
        try {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
            Write-Ok "Stopped process $($c.OwningProcess) on port $Port."
        } catch {
            Write-Err "Could not stop process $($c.OwningProcess): $($_.Exception.Message)"
        }
    }
}

# --- checks ---------------------------------------------------------------

Write-Host "==============================================" -ForegroundColor DarkCyan
Write-Host "  History Unlocked - launcher" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor DarkCyan

try {
    $nodeVersion = (& node -v) 2>$null
    Write-Ok "Node $nodeVersion"
} catch {
    Write-Err "Node.js was not found. Install it from https://nodejs.org and run this again."
    Read-Host "`nPress Enter to close"
    exit 1
}

if (-not (Test-Path 'node_modules')) {
    Write-Warn "Dependencies are missing - installing them now (one time, a few minutes)..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install failed."
        Read-Host "`nPress Enter to close"
        exit 1
    }
}

# --- menu -----------------------------------------------------------------

Write-Head "How do you want to view the app?"
Write-Host "  [1] Browser        - phone-sized window on this PC   (default)"
Write-Host "  [2] Your phone     - scan a QR code with Expo Go"
Write-Host "  [3] Android emulator"
Write-Host "  [4] Stop a running server (free port $Port)"
$choice = Read-Host "`nChoice [1]"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = '1' }

switch ($choice) {

    '1' {
        if (Test-ServerUp) {
            Write-Head "A server is already running on port $Port - reusing it."
            Open-PhoneWindow
            Write-Host "`n  (That server was started elsewhere, so no logs appear here.)" -ForegroundColor DarkGray
            Read-Host "`nPress Enter to close this window"
            exit 0
        }

        Write-Head "Starting the web dev server..."
        $proc = Start-Process -FilePath 'cmd.exe' `
            -ArgumentList '/c', "npx expo start --web --port $Port" `
            -NoNewWindow -PassThru

        if (Wait-ForServer) {
            Open-PhoneWindow
            Write-Host "`n  Server is running. Press Ctrl+C here to stop it.`n" -ForegroundColor DarkGray
        } else {
            Write-Err "The server did not come up in time. Check the messages above."
        }

        try { Wait-Process -Id $proc.Id } catch { }
    }

    '2' {
        Write-Head "Starting Expo for your phone..."
        Write-Host "  1. Install 'Expo Go' from the App Store / Google Play." -ForegroundColor DarkGray
        Write-Host "  2. Make sure the phone is on the SAME Wi-Fi as this PC." -ForegroundColor DarkGray
        Write-Host "  3. Scan the QR code below (iPhone: Camera app, Android: Expo Go)." -ForegroundColor DarkGray
        Write-Warn "Note: in-app purchases won't work in Expo Go - the app falls back to its"
        Write-Warn "test mode, which is exactly what you want for browsing."
        Write-Host ""
        & cmd /c "npx expo start"
    }

    '3' {
        Write-Head "Starting on the Android emulator..."
        Write-Host "  An emulator must already be created in Android Studio." -ForegroundColor DarkGray
        & cmd /c "npx expo start --android"
    }

    '4' {
        Write-Head "Stopping whatever holds port $Port..."
        Stop-Port
        Read-Host "`nPress Enter to close"
    }

    default {
        Write-Err "Unknown choice: $choice"
        Read-Host "`nPress Enter to close"
    }
}
