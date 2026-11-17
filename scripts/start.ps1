$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    $packages = Get-AppxPackage -Name '*CodexPrimaryRuntime*' -ErrorAction SilentlyContinue | Sort-Object Version -Descending
    foreach ($package in $packages) {
        $candidate = Join-Path $package.InstallLocation 'dependencies\node\bin\node.exe'
        if (Test-Path -LiteralPath $candidate) { $node = $candidate; break }
    }
}
if (-not $node) {
    Write-Host 'Node.js was not found. Install Node.js 24.13+ or start this app from Codex.'
    Read-Host 'Press Enter to exit'; exit 1
}
Write-Host 'Starting QIDU private library. Keep this window open while reading.'
Start-Process 'http://localhost:4180'
& $node (Join-Path $PSScriptRoot '..\server\index.mjs')
if ($LASTEXITCODE -ne 0) { Read-Host 'Press Enter to exit' }


