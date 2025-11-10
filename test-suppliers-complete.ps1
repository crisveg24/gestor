# Script para probar TODA la funcionalidad de Proveedores
# Incluyendo CRUD completo y relación con órdenes de compra

$baseUrl = "https://api.vrmajo.xyz/api"
$frontendUrl = "https://vrmajo.xyz"

Write-Host "=== PRUEBA COMPLETA DE FUNCIONALIDAD DE PROVEEDORES ===" -ForegroundColor Cyan
Write-Host ""

# 1. LOGIN
Write-Host "1. LOGIN como admin..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -SessionVariable session `
        -UseBasicParsing
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    
    Write-Host "   ✅ Login exitoso - Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Headers para requests autenticados
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. LISTAR TODOS LOS PROVEEDORES
Write-Host "2. GET /api/suppliers - Listar todos los proveedores..." -ForegroundColor Yellow
try {
    $suppliersResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $suppliersData = $suppliersResponse.Content | ConvertFrom-Json
    $totalSuppliers = $suppliersData.data.suppliers.Count
    
    Write-Host "   ✅ Proveedores obtenidos: $totalSuppliers" -ForegroundColor Green
    
    if ($totalSuppliers -gt 0) {
        Write-Host "   Primeros proveedores:" -ForegroundColor Cyan
        $suppliersData.data.suppliers | Select-Object -First 3 | ForEach-Object {
            Write-Host "      - $($_.name) ($($_.email)) - Activo: $($_.isActive)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. OBTENER UN PROVEEDOR ESPECÍFICO
Write-Host "3. GET /api/suppliers/:id - Obtener proveedor específico..." -ForegroundColor Yellow
if ($totalSuppliers -gt 0) {
    $supplierId = $suppliersData.data.suppliers[0]._id
    
    try {
        $supplierResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$supplierId" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing
        
        $supplierData = $supplierResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Proveedor obtenido: $($supplierData.data.supplier.name)" -ForegroundColor Green
        Write-Host "      Email: $($supplierData.data.supplier.email)" -ForegroundColor Gray
        Write-Host "      Teléfono: $($supplierData.data.supplier.phone)" -ForegroundColor Gray
        Write-Host "      Dirección: $($supplierData.data.supplier.address)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  No hay proveedores para probar" -ForegroundColor Yellow
}

Write-Host ""

# 4. CREAR NUEVO PROVEEDOR
Write-Host "4. POST /api/suppliers - Crear nuevo proveedor..." -ForegroundColor Yellow
$newSupplier = @{
    name = "Proveedor Test $([DateTime]::Now.ToString('HHmmss'))"
    email = "test$(Get-Random -Maximum 9999)@proveedor.com"
    phone = "555-0123"
    address = "Calle Test 123"
    taxId = "TEST-$(Get-Random -Maximum 999999)"
    contactName = "Juan Pérez"
    paymentTerms = "30 días"
    notes = "Proveedor de prueba automática"
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers" `
        -Method POST `
        -Headers $headers `
        -Body $newSupplier `
        -UseBasicParsing
    
    $createdSupplier = ($createResponse.Content | ConvertFrom-Json).data.supplier
    $createdSupplierId = $createdSupplier._id
    
    Write-Host "   ✅ Proveedor creado exitosamente" -ForegroundColor Green
    Write-Host "      ID: $createdSupplierId" -ForegroundColor Gray
    Write-Host "      Nombre: $($createdSupplier.name)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 5. ACTUALIZAR PROVEEDOR
Write-Host "5. PUT /api/suppliers/:id - Actualizar proveedor..." -ForegroundColor Yellow
if ($createdSupplierId) {
    $updateSupplier = @{
        name = "Proveedor Test Actualizado"
        phone = "555-9999"
        notes = "Proveedor actualizado automáticamente"
    } | ConvertTo-Json
    
    try {
        $updateResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method PUT `
            -Headers $headers `
            -Body $updateSupplier `
            -UseBasicParsing
        
        $updatedSupplier = ($updateResponse.Content | ConvertFrom-Json).data.supplier
        
        Write-Host "   ✅ Proveedor actualizado exitosamente" -ForegroundColor Green
        Write-Host "      Nombre: $($updatedSupplier.name)" -ForegroundColor Gray
        Write-Host "      Teléfono: $($updatedSupplier.phone)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  No se creó proveedor para actualizar" -ForegroundColor Yellow
}

Write-Host ""

# 6. DESACTIVAR PROVEEDOR
Write-Host "6. PUT /api/suppliers/:id/toggle-status - Desactivar proveedor..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $toggleResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/toggle-status" `
            -Method PUT `
            -Headers $headers `
            -UseBasicParsing
        
        $toggledSupplier = ($toggleResponse.Content | ConvertFrom-Json).data.supplier
        
        Write-Host "   ✅ Estado cambiado exitosamente" -ForegroundColor Green
        Write-Host "      Activo: $($toggledSupplier.isActive)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  No se creó proveedor para desactivar" -ForegroundColor Yellow
}

Write-Host ""

# 7. REACTIVAR PROVEEDOR
Write-Host "7. PUT /api/suppliers/:id/toggle-status - Reactivar proveedor..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $toggleResponse2 = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/toggle-status" `
            -Method PUT `
            -Headers $headers `
            -UseBasicParsing
        
        $toggledSupplier2 = ($toggleResponse2.Content | ConvertFrom-Json).data.supplier
        
        Write-Host "   ✅ Estado cambiado exitosamente" -ForegroundColor Green
        Write-Host "      Activo: $($toggledSupplier2.isActive)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  No se creó proveedor para reactivar" -ForegroundColor Yellow
}

Write-Host ""

# 8. OBTENER ÓRDENES DE COMPRA DE UN PROVEEDOR
Write-Host "8. GET /api/suppliers/:id/purchase-orders - Órdenes de compra del proveedor..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $poResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId/purchase-orders" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing
        
        $poData = $poResponse.Content | ConvertFrom-Json
        $totalPOs = $poData.data.purchaseOrders.Count
        
        Write-Host "   ✅ Órdenes de compra obtenidas: $totalPOs" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  No se creó proveedor para obtener órdenes" -ForegroundColor Yellow
}

Write-Host ""

# 9. ELIMINAR PROVEEDOR
Write-Host "9. DELETE /api/suppliers/:id - Eliminar proveedor..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method DELETE `
            -Headers $headers `
            -UseBasicParsing
        
        Write-Host "   ✅ Proveedor eliminado exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  No se creó proveedor para eliminar" -ForegroundColor Yellow
}

Write-Host ""

# 10. VERIFICAR QUE FUE ELIMINADO
Write-Host "10. Verificar eliminación..." -ForegroundColor Yellow
if ($createdSupplierId) {
    try {
        $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/suppliers/$createdSupplierId" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing
        
        Write-Host "   ⚠️  Proveedor aún existe (debería haber sido eliminado)" -ForegroundColor Yellow
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "   ✅ Proveedor correctamente eliminado (404 esperado)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== RESUMEN DE PRUEBAS ===" -ForegroundColor Cyan
Write-Host "Endpoints de proveedores probados:" -ForegroundColor White
Write-Host "  1. GET    /api/suppliers               - Listar todos" -ForegroundColor Gray
Write-Host "  2. GET    /api/suppliers/:id           - Obtener uno" -ForegroundColor Gray
Write-Host "  3. POST   /api/suppliers               - Crear" -ForegroundColor Gray
Write-Host "  4. PUT    /api/suppliers/:id           - Actualizar" -ForegroundColor Gray
Write-Host "  5. PUT    /api/suppliers/:id/toggle-status - Cambiar estado" -ForegroundColor Gray
Write-Host "  6. GET    /api/suppliers/:id/purchase-orders - Ordenes de compra" -ForegroundColor Gray
Write-Host "  7. DELETE /api/suppliers/:id           - Eliminar" -ForegroundColor Gray
Write-Host ""
Write-Host "Revisa los resultados arriba para identificar endpoints faltantes o con errores." -ForegroundColor Yellow
