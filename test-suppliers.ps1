# Script para probar funcionalidad completa de Proveedores
$baseUrl = "https://api.vrmajo.xyz/api"

Write-Host "=== PRUEBA COMPLETA DE PROVEEDORES ===" -ForegroundColor Cyan
Write-Host ""

# 1. LOGIN
Write-Host "1. LOGIN..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "   OK - Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. LISTAR PROVEEDORES
Write-Host "2. GET /api/suppliers - Listar proveedores..." -ForegroundColor Yellow
try {
    $suppliersResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" -Method GET -Headers $headers -UseBasicParsing
    $suppliersData = $suppliersResponse.Content | ConvertFrom-Json
    $totalSuppliers = $suppliersData.data.suppliers.Count
    Write-Host "   OK - Total: $totalSuppliers" -ForegroundColor Green
    if ($totalSuppliers -gt 0) {
        $suppliersData.data.suppliers | Select-Object -First 2 | ForEach-Object {
            Write-Host "      - $($_.name) - Activo: $($_.isActive)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. OBTENER PROVEEDOR ESPECIFICO
Write-Host "3. GET /api/suppliers/:id - Obtener uno..." -ForegroundColor Yellow
if ($totalSuppliers -gt 0) {
    $supplierId = $suppliersData.data.suppliers[0]._id
    try {
        $supplierResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$supplierId" -Method GET -Headers $headers -UseBasicParsing
        $supplierData = $supplierResponse.Content | ConvertFrom-Json
        Write-Host "   OK - Nombre: $($supplierData.data.supplier.name)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   SKIP - No hay proveedores" -ForegroundColor Yellow
}

Write-Host ""

# 4. CREAR PROVEEDOR
Write-Host "4. POST /api/suppliers - Crear..." -ForegroundColor Yellow
$newSupplier = @{
    name = "Test Supplier $(Get-Random -Maximum 9999)"
    email = "test$(Get-Random -Maximum 9999)@test.com"
    phone = "555-0123"
    address = "Test Address"
    taxId = "TEST-$(Get-Random -Maximum 999999)"
    contactName = "Test Contact"
    paymentTerms = "30 dias"
    notes = "Test supplier"
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" -Method POST -Headers $headers -Body $newSupplier -UseBasicParsing
    $createdSupplier = ($createResponse.Content | ConvertFrom-Json).data.supplier
    $createdSupplierId = $createdSupplier._id
    Write-Host "   OK - ID: $createdSupplierId" -ForegroundColor Green
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
        $updateResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" -Method PUT -Headers $headers -Body $updateSupplier -UseBasicParsing
        Write-Host "   OK - Actualizado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 6. TOGGLE STATUS
Write-Host "6. PUT /api/suppliers/:id/toggle-status - Cambiar estado..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $toggleResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/toggle-status" -Method PUT -Headers $headers -UseBasicParsing
        $toggledSupplier = ($toggleResponse.Content | ConvertFrom-Json).data.supplier
        Write-Host "   OK - Activo: $($toggledSupplier.isActive)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 7. PURCHASE ORDERS DEL PROVEEDOR
Write-Host "7. GET /api/suppliers/:id/purchase-orders - Ordenes del proveedor..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $poResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/purchase-orders" -Method GET -Headers $headers -UseBasicParsing
        $poData = $poResponse.Content | ConvertFrom-Json
        $totalPOs = $poData.data.purchaseOrders.Count
        Write-Host "   OK - Total ordenes: $totalPOs" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 8. ELIMINAR PROVEEDOR
Write-Host "8. DELETE /api/suppliers/:id - Eliminar..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" -Method DELETE -Headers $headers -UseBasicParsing
        Write-Host "   OK - Eliminado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 9. VERIFICAR ELIMINACION
Write-Host "9. Verificar eliminacion..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" -Method GET -Headers $headers -UseBasicParsing
        Write-Host "   WARN - Proveedor aun existe" -ForegroundColor Yellow
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "   OK - Correctamente eliminado (404)" -ForegroundColor Green
        } else {
            Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Endpoints probados:" -ForegroundColor White
Write-Host "  GET    /api/suppliers" -ForegroundColor Gray
Write-Host "  GET    /api/suppliers/:id" -ForegroundColor Gray
Write-Host "  POST   /api/suppliers" -ForegroundColor Gray
Write-Host "  PUT    /api/suppliers/:id" -ForegroundColor Gray
Write-Host "  PUT    /api/suppliers/:id/toggle-status" -ForegroundColor Gray
Write-Host "  GET    /api/suppliers/:id/purchase-orders" -ForegroundColor Gray
Write-Host "  DELETE /api/suppliers/:id" -ForegroundColor Gray
Write-Host ""
