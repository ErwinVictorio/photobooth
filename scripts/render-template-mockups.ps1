param(
    [string]$BrowserPath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$designRoot = Join-Path $projectRoot 'Docs/template-mockups'
$profilePath = Join-Path $projectRoot 'artifacts/template-review/render-profile'
if (-not (Test-Path -LiteralPath $BrowserPath)) { throw 'Provide a Chromium browser with -BrowserPath.' }
Get-ChildItem -LiteralPath $designRoot -Filter '*.svg' | ForEach-Object {
    [xml]$document = Get-Content -LiteralPath $_.FullName -Raw
    $width = [int]$document.svg.width
    $height = [int]$document.svg.height
    $imagePath = Join-Path $designRoot ($_.BaseName + '.png')
    $uri = [System.Uri]::new($_.FullName).AbsoluteUri
    $browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', "--window-size=$width,$height", "--screenshot=`"$imagePath`"", "--user-data-dir=`"$profilePath`"", "`"$uri`"")
    $process = Start-Process -FilePath $BrowserPath -ArgumentList $browserArgs -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(20000)) { $process.Kill(); throw "Rendering timed out: $($_.Name)" }
    if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $imagePath)) { throw "Could not render $($_.Name)" }
    Write-Output "Rendered $($_.BaseName): $width x $height"
}
