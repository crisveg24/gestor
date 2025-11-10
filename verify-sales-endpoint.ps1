# Script para verificar que el nuevo endpoint GET /api/sales funcione
$baseUrl = "https://api.vrmajo.xyz"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACION: GET /api/sales" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$headers = @{
    "Authorization" = "Bearer $($loginResponse.token)"
    "Content-Type" = "application/json"
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# Intentar hasta 10 veces (mientras Render redespliega)
$maxAttempts = 10
$attempt = 1
$success = $false

Write-Host "Esperando que Render redespliege..." -ForegroundColor Yellow
Write-Host "Esto puede tomar 2-3 minutos" -ForegroundColor Gray
Write-Host ""

while (-not $success -and $attempt -le $maxAttempts) {
    Write-Host "Intento $attempt de $maxAttempts..." -NoNewline
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/sales" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host " OK!" -ForegroundColor Green
        $success = $true
        
        Write-Host ""
        Write-Host "Resultado:" -ForegroundColor Cyan
        Write-Host "  - Ventas encontradas: $($response.data.sales.Count)" -ForegroundColor White
        Write-Host "  - Total de ventas: $($response.total)" -ForegroundColor White
        Write-Host "  - Pagina actual: $($response.page)" -ForegroundColor White
        Write-Host ""
        Write-Host "Endpoint GET /api/sales esta funcionando correctamente!" -ForegroundColor Green
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host " 404 (Render aun no redespliega)" -ForegroundColor Yellow
        } else {
            Write-Host " Error $statusCode" -ForegroundColor Red
        }
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "   Esperando 20 segundos..." -ForegroundColor Gray
            Start-Sleep -Seconds 20
        }
    }
    
    $attempt++
}

if (-not $success) {
    Write-Host ""
    Write-Host "Render aun no ha redesplegado." -ForegroundColor Yellow
    Write-Host "Espera 2-3 minutos mas y ejecuta este script nuevamente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Puedes verificar el estado del deploy en:" -ForegroundColor Cyan
    Write-Host "https://dashboard.render.com" -ForegroundColor White
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
