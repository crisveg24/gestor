# Script para probar endpoints del backend en produccion
$baseUrl = "https://gestor-glwn.onrender.com"

Write-Host "Probando endpoints del backend" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Esperando a que el servicio despierte..." -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 5
$attempt = 1
$success = $false

while (-not $success -and $attempt -le $maxAttempts) {
    Write-Host "Intento $attempt de $maxAttempts..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET -TimeoutSec 60 -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
        $success = $true
        Write-Host ""
        Write-Host "API Version: $($response.version)" -ForegroundColor White
        Write-Host "Mensaje: $($response.message)" -ForegroundColor White
        Write-Host ""
    }
    catch {
        Write-Host " Error" -ForegroundColor Red
        if ($attempt -lt $maxAttempts) {
            Start-Sleep -Seconds 15
        }
    }
    $attempt++
}

if ($success) {
    Write-Host "Backend esta funcionando correctamente" -ForegroundColor Green
} else {
    Write-Host "No se pudo conectar al backend" -ForegroundColor Red
}
