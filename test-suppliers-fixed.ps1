# Script para probar proveedores con manejo correcto de cookies
$baseUrl = "https://api.vrmajo.xyz/api"

Write-Host "=== PRUEBA COMPLETA DE PROVEEDORES ===" -ForegroundColor Cyan
Write-Host ""

# 1. LOGIN y obtener token + cookies
Write-Host "1. LOGIN..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

# Crear sesión web para mantener cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -WebSession $session
    
    $token = $loginResponse.data.token
    Write-Host "   OK - Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Headers con el token
$headers = @{
    "Authorization" = "Bearer $token"
}

# 2. LISTAR PROVEEDORES
Write-Host "2. GET /api/suppliers - Listar..." -ForegroundColor Yellow
try {
    $suppliersResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers" `
        -Method GET `
        -Headers $headers `
        -WebSession $session
    
    $totalSuppliers = $suppliersResponse.data.suppliers.Count
    Write-Host "   OK - Total: $totalSuppliers" -ForegroundColor Green
    
    if ($totalSuppliers -gt 0) {
        $suppliersResponse.data.suppliers | Select-Object -First 2 | ForEach-Object {
            Write-Host "      - $($_.name) - Activo: $($_.isActive)" -ForegroundColor Gray
        }
        $firstSupplierId = $suppliersResponse.data.suppliers[0]._id
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. OBTENER PROVEEDOR ESPECIFICO
Write-Host "3. GET /api/suppliers/:id - Obtener uno..." -ForegroundColor Yellow
if ($firstSupplierId) {
    try {
        $supplierResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers/$firstSupplierId" `
            -Method GET `
            -Headers $headers `
            -WebSession $session
        
        Write-Host "   OK - Nombre: $($supplierResponse.data.name)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 4. CREAR PROVEEDOR
Write-Host "4. POST /api/suppliers - Crear..." -ForegroundColor Yellow
$newSupplier = @{
    name = "Test Supplier $(Get-Random -Maximum 9999)"
    email = "test$(Get-Random -Maximum 9999)@test.com"
    phone = "555-0123"
    address = "Test Address"
    city = "Test City"
    country = "Colombia"
    taxId = "TEST-$(Get-Random -Maximum 999999)"
    contactName = "Test Contact"
    paymentTerms = "30 dias"
    categories = @("Categoria Test")
    notes = "Test supplier"
    rating = 5
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers" `
        -Method POST `
        -Headers $headers `
        -Body $newSupplier `
        -ContentType "application/json" `
        -WebSession $session
    
    $createdSupplierId = $createResponse.data._id
    Write-Host "   OK - ID: $createdSupplierId" -ForegroundColor Green
    Write-Host "   Nombre: $($createResponse.data.name)" -ForegroundColor Gray
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. ACTUALIZAR PROVEEDOR
Write-Host "5. PUT /api/suppliers/:id - Actualizar..." -ForegroundColor Yellow
if ($createdSupplierId) {
    $updateSupplier = @{
        name = "Test Updated"
        phone = "555-9999"
    } | ConvertTo-Json
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method PUT `
            -Headers $headers `
            -Body $updateSupplier `
            -ContentType "application/json" `
            -WebSession $session
        
        Write-Host "   OK - Actualizado a: $($updateResponse.data.name)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 6. TOGGLE STATUS - ENDPOINT NO EXISTE
Write-Host "6. PUT /api/suppliers/:id/toggle-status - Cambiar estado..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $toggleResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers/$createdSupplierId/toggle-status" `
            -Method PUT `
            -Headers $headers `
            -WebSession $session
        
        Write-Host "   OK - Activo: $($toggleResponse.data.isActive)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "   FALTA - Endpoint no existe (404)" -ForegroundColor Red
            Write-Host "   Se debe crear este endpoint en el backend" -ForegroundColor Yellow
        } else {
            Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 7. PURCHASE ORDERS DEL PROVEEDOR - ENDPOINT NO EXISTE
Write-Host "7. GET /api/suppliers/:id/purchase-orders - Ordenes..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $poResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers/$createdSupplierId/purchase-orders" `
            -Method GET `
            -Headers $headers `
            -WebSession $session
        
        Write-Host "   OK - Total ordenes: $($poResponse.data.purchaseOrders.Count)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "   FALTA - Endpoint no existe (404)" -ForegroundColor Red
            Write-Host "   Se debe crear este endpoint en el backend" -ForegroundColor Yellow
        } else {
            Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 8. ELIMINAR PROVEEDOR (soft delete)
Write-Host "8. DELETE /api/suppliers/:id - Eliminar..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method DELETE `
            -Headers $headers `
            -WebSession $session
        
        Write-Host "   OK - $($deleteResponse.message)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 9. VERIFICAR QUE FUE DESACTIVADO
Write-Host "9. Verificar desactivacion..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method GET `
            -Headers $headers `
            -WebSession $session
        
        if ($verifyResponse.data.isActive -eq $false) {
            Write-Host "   OK - Proveedor desactivado correctamente" -ForegroundColor Green
        } else {
            Write-Host "   WARN - Proveedor aun activo" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "ENDPOINTS QUE FUNCIONAN:" -ForegroundColor Green
Write-Host "  GET    /api/suppliers" -ForegroundColor Gray
Write-Host "  GET    /api/suppliers/:id" -ForegroundColor Gray
Write-Host "  POST   /api/suppliers" -ForegroundColor Gray
Write-Host "  PUT    /api/suppliers/:id" -ForegroundColor Gray
Write-Host "  DELETE /api/suppliers/:id" -ForegroundColor Gray
Write-Host ""
Write-Host "ENDPOINTS QUE FALTAN:" -ForegroundColor Red
Write-Host "  PUT /api/suppliers/:id/toggle-status" -ForegroundColor Yellow
Write-Host "      Funcion: Activar/desactivar proveedor rapidamente" -ForegroundColor Gray
Write-Host "  GET /api/suppliers/:id/purchase-orders" -ForegroundColor Yellow
Write-Host "      Funcion: Obtener ordenes de compra de un proveedor" -ForegroundColor Gray
Write-Host ""
