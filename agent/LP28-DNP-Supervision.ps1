param(
    [ValidateSet("LOLA","NINA","GABIN")]
    [string]$BoothName = "",
    [int]$IntervalSeconds = 5,
    [switch]$Once
)

$ErrorActionPreference = "Stop"
$AgentVersion = "2.7.19"
$AppDir = Join-Path $env:LOCALAPPDATA "LP28BoothAgent"
$ConfigFile = Join-Path $AppDir "config.json"
$LogFile = Join-Path $AppDir "dnp-supervision.log"
$HfpStatusFile = "C:\DNP\HotFolderPrint\Logs\printer_status.txt"
$DefaultApi = "https://location-photobooth-28-suite.onrender.com"

function Write-LP28Log([string]$Message){
    try{
        if(-not (Test-Path $AppDir)){ New-Item -ItemType Directory -Path $AppDir -Force | Out-Null }
        Add-Content -Path $LogFile -Value ("{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"),$Message) -Encoding UTF8
    }catch{}
}

function Get-LP28Config {
    if(-not (Test-Path $ConfigFile)){ throw "Configuration LP28 introuvable : $ConfigFile" }
    $cfg = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if([string]::IsNullOrWhiteSpace($cfg.api)){ $cfg.api = $DefaultApi }
    if([string]::IsNullOrWhiteSpace($script:BoothName)){ $script:BoothName = ([string]$cfg.boothName).Trim().ToUpperInvariant() }
    if($script:BoothName -notin @("LOLA","NINA","GABIN")){ throw "Nom de borne invalide. Utiliser LOLA, NINA ou GABIN." }
    if([string]::IsNullOrWhiteSpace([string]$cfg.apiKey)){ throw "Clé API LP28 absente de config.json. Renseigner BOOTH_AGENT_API_KEY localement sur la borne." }
    return $cfg
}

function Convert-LP28DnpStatus([string]$RawStatus){
    $raw = ([string]$RawStatus).Trim().ToUpperInvariant()
    if([string]::IsNullOrWhiteSpace($raw)){
        return [pscustomobject]@{ severity="OFFLINE"; label="État DNP indisponible"; color="GRAY" }
    }
    switch($raw){
        "STATUS_OK"        { return [pscustomobject]@{ severity="OK";       label="Prête";          color="GREEN"  } }
        "STATUS_COVEROPEN" { return [pscustomobject]@{ severity="WARNING";  label="Capot ouvert";   color="ORANGE" } }
    }
    if($raw -match "PRINT")   { return [pscustomobject]@{ severity="PRINTING"; label="Impression en cours"; color="BLUE" } }
    if($raw -match "INITIAL") { return [pscustomobject]@{ severity="INFO";     label="Initialisation";      color="BLUE" } }
    if($raw -match "OFFLINE|DISCONNECT|NOT.?FOUND") { return [pscustomobject]@{ severity="OFFLINE"; label="Imprimante inaccessible"; color="GRAY" } }
    if($raw -match "PAPER.*END|PAPEREND") { return [pscustomobject]@{ severity="ERROR"; label="Papier épuisé"; color="RED" } }
    if($raw -match "RIBBON.*END|RIBBONEND") { return [pscustomobject]@{ severity="ERROR"; label="Ruban épuisé"; color="RED" } }
    if($raw -match "JAM") { return [pscustomobject]@{ severity="ERROR"; label="Bourrage papier"; color="RED" } }
    if($raw -match "RIBBON") { return [pscustomobject]@{ severity="ERROR"; label="Erreur ruban"; color="RED" } }
    if($raw -match "SIZE|MEDIA.*MISMATCH|PAPER.*PARAM") { return [pscustomobject]@{ severity="WARNING"; label="Format ou média incompatible"; color="ORANGE" } }
    if($raw -match "TEMP|THERM|COOL") { return [pscustomobject]@{ severity="ERROR"; label="Anomalie thermique"; color="RED" } }
    if($raw -match "HEAD") { return [pscustomobject]@{ severity="ERROR"; label="Erreur tête thermique"; color="RED" } }
    if($raw -match "CUTTER") { return [pscustomobject]@{ severity="ERROR"; label="Erreur massicot"; color="RED" } }
    if($raw -match "RFID") { return [pscustomobject]@{ severity="ERROR"; label="Erreur module RFID"; color="RED" } }
    if($raw -match "FAN") { return [pscustomobject]@{ severity="ERROR"; label="Erreur ventilateur"; color="RED" } }
    if($raw -match "SYSTEM|HARDWARE|VOLT") { return [pscustomobject]@{ severity="ERROR"; label="Erreur matérielle DNP"; color="RED" } }
    return [pscustomobject]@{ severity="ERROR"; label="Erreur DNP non identifiée"; color="RED" }
}

function Get-LP28DnpTelemetry {
    if(-not (Test-Path $HfpStatusFile)){ return $null }
    try{
        $item = Get-Item $HfpStatusFile -ErrorAction Stop
        $ageSeconds = [math]::Round(((Get-Date) - $item.LastWriteTime).TotalSeconds)
        $json = Get-Content $HfpStatusFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $p = @($json) | Where-Object { $_.Model -match "DS620|DS-RX|RX1|DNP" -or $_.Name -match "DS620|DS-RX|RX1|DNP" } | Select-Object -First 1
        if(-not $p){ $p = @($json) | Select-Object -First 1 }
        if(-not $p){ return $null }
        $mapped = Convert-LP28DnpStatus ([string]$p.Status)
        $fresh = $ageSeconds -le 60
        if(-not $fresh){ $mapped = [pscustomobject]@{severity="OFFLINE";label="État HFP périmé";color="GRAY"} }
        return [ordered]@{
            source="DNP_HFP"
            model=([string]$p.Model).Trim()
            name=([string]$p.Name).Trim()
            present=$true
            rawStatus=([string]$p.Status).Trim()
            statusSeverity=$mapped.severity
            statusLabel=$mapped.label
            statusColor=$mapped.color
            statusFresh=$fresh
            statusAgeSeconds=$ageSeconds
            mediaFormat=([string]$p.MediaType).Trim()
            mediaRemaining=if($null -ne $p.MediaRemaining){[int]$p.MediaRemaining}else{$null}
            lifeCounter=if($null -ne $p.LifeCounter){[int64]$p.LifeCounter}else{$null}
            serialNumber=([string]$p.SerialNumber).Trim()
            firmwareVersion=([string]$p.FirmwareVersion).Trim()
            colorDataVersion=([string]$p.ColorDataVersion).Trim()
            mediaReadAt=$item.LastWriteTime.ToUniversalTime().ToString("o")
            statusReadAt=(Get-Date).ToUniversalTime().ToString("o")
            hfpRunning=[bool](Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match "HotFolder|Hot Folder|HFP" } | Select-Object -First 1)
        }
    }catch{
        Write-LP28Log "DNP parse error: $($_.Exception.Message)"
        return $null
    }
}

function Get-LP28WindowsPrinterTelemetry {
    try{
        $printers = Get-Printer -ErrorAction Stop | Where-Object { $_.Name -match "DNP|DS620|CY-02|Citizen|DP-DS" -or $_.DriverName -match "DNP|DS620|CY-02|Citizen|DP-DS" }
        $p = $printers | Select-Object -First 1
        if(-not $p){ return $null }
        $offline = [bool]$p.WorkOffline
        return [ordered]@{
            source="WINDOWS_PRINT_SPOOLER"
            model=([string]$p.DriverName).Trim()
            name=([string]$p.Name).Trim()
            present=$true
            rawStatus=if($offline){"WINDOWS_OFFLINE"}else{"WINDOWS_PRESENT"}
            statusSeverity=if($offline){"OFFLINE"}else{"OK"}
            statusLabel=if($offline){"Imprimante hors ligne"}else{"Détectée par Windows"}
            statusColor=if($offline){"GRAY"}else{"GREEN"}
            statusFresh=$true
            statusAgeSeconds=0
            mediaFormat=$null
            mediaRemaining=$null
            lifeCounter=$null
            serialNumber=""
            firmwareVersion=""
            colorDataVersion=""
            mediaReadAt=$null
            statusReadAt=(Get-Date).ToUniversalTime().ToString("o")
            hfpRunning=$false
            queueName=([string]$p.Name).Trim()
            portName=([string]$p.PortName).Trim()
            workOffline=$offline
        }
    }catch{
        Write-LP28Log "Windows printer error: $($_.Exception.Message)"
        return $null
    }
}

function Get-LP28PrinterTelemetry {
    $dnp = Get-LP28DnpTelemetry
    if($dnp){ return $dnp }
    $win = Get-LP28WindowsPrinterTelemetry
    if($win){ return $win }
    return [ordered]@{
        source="NONE"; model=""; name=""; present=$false; rawStatus="PRINTER_NOT_FOUND";
        statusSeverity="OFFLINE"; statusLabel="Imprimante non détectée"; statusColor="GRAY";
        statusFresh=$false; statusAgeSeconds=$null; statusReadAt=(Get-Date).ToUniversalTime().ToString("o")
    }
}

function Send-LP28PrinterTelemetry($Config,$Printer){
    $api = ([string]$Config.api).TrimEnd('/')
    $headers = @{ Authorization = "Bearer $($Config.apiKey)" }
    $body = @{
        boothName=$script:BoothName
        agentVersion=$AgentVersion
        eventId=([string]$Config.eventId)
        eventName=([string]$Config.eventName)
        printer=$Printer
    } | ConvertTo-Json -Depth 8
    Invoke-RestMethod -Uri "$api/api/booth-agent/printer-status" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body -TimeoutSec 12 | Out-Null
}

Write-LP28Log "Printer supervision start V$AgentVersion booth=$BoothName interval=${IntervalSeconds}s"
do {
    try{
        $cfg = Get-LP28Config
        $printer = Get-LP28PrinterTelemetry
        Send-LP28PrinterTelemetry $cfg $printer
        Write-LP28Log ("printer={0} status={1} remaining={2}" -f $printer.model,$printer.rawStatus,$printer.mediaRemaining)
    }catch{
        Write-LP28Log "supervision error: $($_.Exception.Message)"
    }
    if($Once){ break }
    Start-Sleep -Seconds ([math]::Max(3,$IntervalSeconds))
} while($true)
