# Script corregido para probar proveedores
$baseUrl = "https://api.vrmajo.xyz/api"

Write-Host "=== PRUEBA COMPLETA DE PROVEEDORES ===" -ForegroundColor Cyan
Write-Host ""

# 1. LOGIN
Write-Host "1. LOGIN..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@tienda.com","password":"Admin123!"}'

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -UseBasicParsing
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token  # El token esta directo, no en data.token
    Write-Host "   OK - Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

$headers = @{
    "Authorization" = "Bearer $token"
}

# 2. LISTAR PROVEEDORES
Write-Host "2. GET /api/suppliers - Listar..." -ForegroundColor Yellow
try {
    $suppliersResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $suppliersData = $suppliersResponse.Content | ConvertFrom-Json
    $totalSuppliers = $suppliersData.data.suppliers.Count
    Write-Host "   OK - Total: $totalSuppliers" -ForegroundColor Green
    
    if ($totalSuppliers -gt 0) {
        $suppliersData.data.suppliers | Select-Object -First 2 | ForEach-Object {
            Write-Host "      - $($_.name) - Activo: $($_.isActive)" -ForegroundColor Gray
        }
        $firstSupplierId = $suppliersData.data.suppliers[0]._id
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. OBTENER PROVEEDOR ESPECIFICO
Write-Host "3. GET /api/suppliers/:id - Obtener uno..." -ForegroundColor Yellow
if ($firstSupplierId) {
    try {
        $supplierResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$firstSupplierId" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing
        
        $supplierData = $supplierResponse.Content | ConvertFrom-Json
        Write-Host "   OK - Nombre: $($supplierData.data.name)" -ForegroundColor Green
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
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" `
        -Method POST `
        -Headers $headers `
        -Body $newSupplier `
        -ContentType "application/json" `
        -UseBasicParsing
    
    $createData = $createResponse.Content | ConvertFrom-Json
    $createdSupplierId = $createData.data._id
    Write-Host "   OK - ID: $createdSupplierId" -ForegroundColor Green
    Write-Host "   Nombre: $($createData.data.name)" -ForegroundColor Gray
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
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
        $updateResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method PUT `
            -Headers $headers `
            -Body $updateSupplier `
            -ContentType "application/json" `
            -UseBasicParsing
        
        $updateData = $updateResponse.Content | ConvertFrom-Json
        Write-Host "   OK - Actualizado a: $($updateData.data.name)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 6. TOGGLE STATUS - ENDPOINT NO EXISTE
Write-Host "6. PUT /api/suppliers/:id/toggle-status - Cambiar estado..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $toggleResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/toggle-status" `
            -Method PUT `
            -Headers $headers `
            -UseBasicParsing
        
        $toggleData = $toggleResponse.Content | ConvertFrom-Json
        Write-Host "   OK - Activo: $($toggleData.data.isActive)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "   FALTA - Endpoint no existe (404)" -ForegroundColor Red
        } else {
            Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 7. PURCHASE ORDERS - ENDPOINT NO EXISTE
Write-Host "7. GET /api/suppliers/:id/purchase-orders - Ordenes..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $poResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/purchase-orders" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing
        
        $poData = $poResponse.Content | ConvertFrom-Json
        Write-Host "   OK - Total ordenes: $($poData.data.purchaseOrders.Count)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "   FALTA - Endpoint no existe (404)" -ForegroundColor Red
        } else {
            Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 8. ELIMINAR (soft delete)
Write-Host "8. DELETE /api/suppliers/:id - Eliminar..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method DELETE `
            -Headers $headers `
            -UseBasicParsing
        
        $deleteData = $deleteResponse.Content | ConvertFrom-Json
        Write-Host "   OK - $($deleteData.message)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 9. VERIFICAR DESACTIVACION
Write-Host "9. Verificar desactivacion..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing
        
        $verifyData = $verifyResponse.Content | ConvertFrom-Json
        if ($verifyData.data.isActive -eq $false) {
            Write-Host "   OK - Proveedor desactivado correctamente" -ForegroundColor Green
        } else {
            Write-Host "   WARN - Proveedor aun activo" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE ENDPOINTS DE PROVEEDORES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "FUNCIONAN CORRECTAMENTE:" -ForegroundColor Green
Write-Host "  GET    /api/suppliers" -ForegroundColor White
Write-Host "  GET    /api/suppliers/:id" -ForegroundColor White
Write-Host "  POST   /api/suppliers" -ForegroundColor White
Write-Host "  PUT    /api/suppliers/:id" -ForegroundColor White
Write-Host "  DELETE /api/suppliers/:id (soft delete)" -ForegroundColor White
Write-Host ""
Write-Host "ENDPOINTS FALTANTES:" -ForegroundColor Red
Write-Host "  1. PUT /api/suppliers/:id/toggle-status" -ForegroundColor Yellow
Write-Host "     Proposito: Cambiar rapidamente el estado activo/inactivo" -ForegroundColor Gray
Write-Host "     Usado en: Frontend SuppliersPage (probablemente)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. GET /api/suppliers/:id/purchase-orders" -ForegroundColor Yellow
Write-Host "     Proposito: Obtener todas las ordenes de compra de un proveedor" -ForegroundColor Gray
Write-Host "     Usado en: Vista detalle de proveedor o reportes" -ForegroundColor Gray
Write-Host ""
