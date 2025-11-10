# Script para verificar que Render haya redesplegado con los nuevos endpoints
$baseUrl = "https://api.vrmajo.xyz/api"

Write-Host "=== VERIFICACION DE REDEPLOY DE RENDER ===" -ForegroundColor Cyan
Write-Host ""

# LOGIN
Write-Host "Obteniendo token de autenticacion..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@tienda.com","password":"Admin123!"}'

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).token
    Write-Host "  OK - Autenticado" -ForegroundColor Green
} catch {
    Write-Host "  ERROR en login" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host ""
Write-Host "=== VERIFICANDO NUEVOS ENDPOINTS ===" -ForegroundColor Cyan
Write-Host ""

# 1. GET /api/sales (endpoint agregado en commit 17ec628)
Write-Host "1. GET /api/sales - Listar todas las ventas..." -ForegroundColor Yellow
try {
    $salesResponse = Invoke-WebRequest -Uri "$baseUrl/sales" -Headers $headers -UseBasicParsing
    $salesData = $salesResponse.Content | ConvertFrom-Json
    Write-Host "   OK - Total ventas: $($salesData.total)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   FALTA - Render aun no ha redesplegado (404)" -ForegroundColor Red
    } else {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 2. PUT /api/suppliers/:id/toggle-status (endpoint agregado en commit 04728b2)
Write-Host "2. PUT /api/suppliers/:id/toggle-status..." -ForegroundColor Yellow

# Primero obtenemos un proveedor
try {
    $suppliersResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" -Headers $headers -UseBasicParsing
    $suppliers = ($suppliersResponse.Content | ConvertFrom-Json).data.suppliers
    
    if ($suppliers.Count -gt 0) {
        $supplierId = $suppliers[0]._id
        
        # Intentamos cambiar el estado
        try {
            $toggleResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$supplierId/toggle-status" -Method PUT -Headers $headers -UseBasicParsing
            $toggleData = $toggleResponse.Content | ConvertFrom-Json
            Write-Host "   OK - Estado cambiado a: $($toggleData.data.isActive)" -ForegroundColor Green
            
            # Revertir el cambio
            Invoke-WebRequest -Uri "$baseUrl/suppliers/$supplierId/toggle-status" -Method PUT -Headers $headers -UseBasicParsing | Out-Null
            Write-Host "   OK - Estado revertido" -ForegroundColor Gray
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 404) {
                Write-Host "   FALTA - Render aun no ha redesplegado (404)" -ForegroundColor Red
            } else {
                Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "   ERROR obteniendo proveedores" -ForegroundColor Red
}

Write-Host ""

# 3. GET /api/suppliers/:id/purchase-orders (endpoint agregado en commit 04728b2)
Write-Host "3. GET /api/suppliers/:id/purchase-orders..." -ForegroundColor Yellow
if ($supplierId) {
    try {
        $poResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$supplierId/purchase-orders" -Headers $headers -UseBasicParsing
        $poData = $poResponse.Content | ConvertFrom-Json
        Write-Host "   OK - Ordenes del proveedor: $($poData.data.purchaseOrders.Count)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "   FALTA - Render aun no ha redesplegado (404)" -ForegroundColor Red
        } else {
            Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si todos los endpoints responden OK, Render ha redesplegado exitosamente." -ForegroundColor White
Write-Host "Si alguno responde 404, espera 1-2 minutos mas y vuelve a ejecutar." -ForegroundColor Yellow
Write-Host ""
Write-Host "Commits pendientes de deploy:" -ForegroundColor White
Write-Host "  - 17ec628: GET /api/sales" -ForegroundColor Gray
Write-Host "  - 04728b2: Endpoints de proveedores" -ForegroundColor Gray
Write-Host ""
