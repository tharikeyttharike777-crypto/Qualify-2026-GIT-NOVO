Param(
    [int]$Port = 5001,
    [int[]]$FallbackPorts = @(3000, 8080, 5500, 8001, 8888, 5001)
)

$ErrorActionPreference = 'Stop'

function Start-HttpListener([int]$p) {
    $lis = New-Object System.Net.HttpListener
    $prefs = @("http://localhost:$p/", "http://127.0.0.1:$p/")
    foreach ($pf in $prefs) {
        try { $lis.Prefixes.Add($pf) } catch { Write-Host ("Aviso: não foi possível adicionar prefixo {0} - {1}" -f $pf, $_.Exception.Message) }
    }
    try {
        $lis.Start()
        Write-Host ("Servidor iniciado em: " + ($lis.Prefixes -join ', '))
        return $lis
    } catch {
        Write-Host ("Porta {0} indisponível: {1}" -f $p, $_.Exception.Message)
        try { $lis.Close() } catch {}
        return $null
    }
}

# Tenta porta solicitada, senão cai para fallback
$listener = Start-HttpListener -p $Port
if (-not $listener) {
    foreach ($fp in $FallbackPorts) {
        if ($fp -eq $Port) { continue }
        $listener = Start-HttpListener -p $fp
        if ($listener) { break }
    }
}

if (-not $listener) {
    Write-Error "Nenhuma porta disponível para iniciar o servidor."
    exit 1
}

function Get-ContentType($path) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    switch ($ext) {
        '.html' { 'text/html' }
        '.css'  { 'text/css' }
        '.js'   { 'application/javascript' }
        '.json' { 'application/json' }
        '.png'  { 'image/png' }
        '.svg'  { 'image/svg+xml' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.ico'  { 'image/x-icon' }
        default { 'application/octet-stream' }
    }
}

while ($true) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $localPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($localPath)) { $localPath = 'index.html' }
    $fullPath = Join-Path (Get-Location) $localPath

    if (Test-Path $fullPath) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentType = Get-ContentType $fullPath
            $response.StatusCode = 200
            $response.KeepAlive = $false
            $response.SendChunked = $false
            $response.Headers.Set('Connection','close')
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne 'HEAD') {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } catch {
            $response.StatusCode = 500
            $response.KeepAlive = $false
            $response.SendChunked = $false
            $response.Headers.Set('Connection','close')
            $err = [System.Text.Encoding]::UTF8.GetBytes("Erro ao servir arquivo: $($_.Exception.Message)")
            $response.ContentLength64 = $err.Length
            if ($request.HttpMethod -ne 'HEAD') {
                $response.OutputStream.Write($err, 0, $err.Length)
            }
        }
    } else {
        $response.StatusCode = 404
        $response.KeepAlive = $false
        $response.SendChunked = $false
        $response.Headers.Set('Connection','close')
        $msg = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        $response.ContentLength64 = $msg.Length
        if ($request.HttpMethod -ne 'HEAD') {
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
    }

    try { $response.Close() } catch { try { $response.OutputStream.Close() } catch {} }
}