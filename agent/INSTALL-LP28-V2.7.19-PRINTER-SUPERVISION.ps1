param(
    [ValidateSet("LOLA","NINA","GABIN")]
    [Parameter(Mandatory=$true)]
    [string]$BoothName
)

$ErrorActionPreference="Stop"
$PackDir="C:\LP28-Agent-Pack"
$AgentFile=Join-Path $PackDir "LP28-Agent-Pack.ps1"
$ModuleSource=Join-Path $PSScriptRoot "LP28-DNP-Supervision.ps1"
$ModuleTarget=Join-Path $PackDir "LP28-DNP-Supervision.ps1"
$StartupDir=[Environment]::GetFolderPath("Startup")
$Launcher=Join-Path $StartupDir "LP28-Printer-Supervision.cmd"
$ConfigFile=Join-Path $env:LOCALAPPDATA "LP28BoothAgent\config.json"
$stamp=Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "LP28 Agent V2.7.19 - supervision imprimante" -ForegroundColor Cyan
Write-Host "Borne : $BoothName" -ForegroundColor Cyan

if(-not (Test-Path $AgentFile)){
    throw "Agent LP28 principal introuvable : $AgentFile"
}
if(-not (Test-Path $ModuleSource)){
    throw "Module de supervision introuvable à côté de l'installateur : $ModuleSource"
}
if(-not (Test-Path $ConfigFile)){
    throw "Configuration LP28 introuvable : $ConfigFile"
}

$cfg=Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
if([string]::IsNullOrWhiteSpace([string]$cfg.apiKey)){
    Write-Warning "La clé API LP28 est absente. L'installation peut continuer, mais la supervision ne communiquera pas avec LP28 Admin tant que BOOTH_AGENT_API_KEY n'est pas renseignée localement."
}

Copy-Item $AgentFile "$AgentFile.bak-$stamp" -Force
Copy-Item $ConfigFile "$ConfigFile.bak-$stamp" -Force
Copy-Item $ModuleSource $ModuleTarget -Force

# Conserve toute la configuration existante et ne modifie que l'identité de la borne si nécessaire.
$cfg.boothName=$BoothName
$cfg | ConvertTo-Json -Depth 20 | Set-Content $ConfigFile -Encoding UTF8

$launcherContent=@"
@echo off
timeout /t 135 /nobreak >nul
start "LP28 Printer Supervision" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$ModuleTarget" -BoothName $BoothName
"@
Set-Content -Path $Launcher -Value $launcherContent -Encoding ASCII

# Nettoie uniquement une ancienne instance du sidecar, jamais l'agent principal.
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
Where-Object {
    $_.Name -eq "powershell.exe" -and
    $_.CommandLine -like "*$ModuleTarget*"
} | ForEach-Object {
    try{ Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop }catch{}
}

Start-Process powershell.exe -ArgumentList @(
    "-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden",
    "-File",('"'+$ModuleTarget+'"'),"-BoothName",$BoothName
)

Write-Host "" 
Write-Host "Installation terminée." -ForegroundColor Green
Write-Host "Agent principal conservé : $AgentFile"
Write-Host "Supervision imprimante : $ModuleTarget"
Write-Host "Démarrage automatique : $Launcher"
Write-Host "Configuration : $ConfigFile"
Write-Host "Journal : $env:LOCALAPPDATA\LP28BoothAgent\dnp-supervision.log"
Write-Host "" 
Write-Host "Aucun secret n'a été écrasé par l'installateur." -ForegroundColor Yellow
