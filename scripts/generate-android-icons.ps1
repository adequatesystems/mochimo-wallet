# PowerShell script to generate Android launcher icons from the official Mochimo PNG
# Requires ImageMagick installed and available in PATH (use 'magick' command)

$ErrorActionPreference = 'Stop'

# Path to the source icon (official Mochimo icon, preferably 128x128 or higher)
$src = "..\public\icons\icon-128.png"

# Output folders for each density
$base = "..\android\app\src\main\res"
$targets = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $targets.Keys) {
    $size = $targets[$folder]
    $outdir = Join-Path $base $folder
    if (!(Test-Path $outdir)) { New-Item -ItemType Directory -Path $outdir | Out-Null }
    $outfile = Join-Path $outdir "ic_launcher.png"
    Write-Host "Generating $outfile ($size x $size)"
    magick convert $src -resize ${size}x${size} $outfile
}

Write-Host "\nFatto! Le icone sono state generate e sovrascritte nelle cartelle mipmap-*"
Write-Host "Se vuoi anche la versione tonda (ic_launcher_round.png), copia o ripeti il comando cambiando nome file."
