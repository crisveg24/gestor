# Script completo de pruebas funcionales para produccion
$baseUrl = "https://api.vrmajo.xyz"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS FUNCIONALES - PRODUCCION" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Login como admin
Write-Host "[1/8] Login Admin..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "   OK - Token obtenido" -ForegroundColor Green
    $token = $loginResponse.token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
} catch {
    Write-Host "   ERROR: No se pudo hacer login" -ForegroundColor Red
    exit 1
}

# Obtener tiendas
Write-Host "[2/8] GET /api/stores..." -ForegroundColor Yellow
try {
    $stores = Invoke-RestMethod -Uri "$baseUrl/api/stores" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($stores.Count) tiendas" -ForegroundColor Green
    $storeId = $stores[0]._id
} catch {
    Write-Host "   ERROR" -ForegroundColor Red
}

# Obtener productos
Write-Host "[3/8] GET /api/products..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET -Headers $headers -ErrorAction Stop
    $products = $productsResponse.data.products
    Write-Host "   OK - $($products.Count) productos" -ForegroundColor Green
    
    # Verificar que tengan cost y price
    if ($products.Count -gt 0) {
        $firstProduct = $products[0]
        if ($firstProduct.cost -and $firstProduct.price) {
            Write-Host "   OK - Productos tienen cost ($($firstProduct.cost)) y price ($($firstProduct.price))" -ForegroundColor Green
        } else {
            Write-Host "   ADVERTENCIA - Productos sin cost/price" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

# Crear producto nuevo
Write-Host "[4/8] POST /api/products - Crear producto..." -ForegroundColor Yellow
$newProduct = @{
    name = "Producto de Prueba $(Get-Date -Format 'HHmmss')"
    description = "Producto creado automaticamente para pruebas"
    sku = "TEST-$(Get-Date -Format 'HHmmss')"
    barcode = "TEST123456$(Get-Date -Format 'ss')"
    category = "Pruebas"
    cost = 100
    price = 150
    isActive = $true
} | ConvertTo-Json

try {
    $createdProductResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method POST -Body $newProduct -Headers $headers -ErrorAction Stop
    $createdProduct = $createdProductResponse.data
    Write-Host "   OK - Producto creado: $($createdProduct.name)" -ForegroundColor Green
    $testProductId = $createdProduct._id
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

# Editar producto
Write-Host "[5/8] PUT /api/products/:id - Actualizar producto..." -ForegroundColor Yellow
if ($testProductId) {
    $updateProduct = @{
        name = "Producto de Prueba EDITADO"
        description = "Producto editado exitosamente"
        sku = "TEST-$(Get-Date -Format 'HHmmss')"
        category = "Pruebas"
        cost = 120
        price = 180
        isActive = $true
    } | ConvertTo-Json

    try {
        $updatedProduct = Invoke-RestMethod -Uri "$baseUrl/api/products/$testProductId" -Method PUT -Body $updateProduct -Headers $headers -ErrorAction Stop
        Write-Host "   OK - Producto actualizado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
}

# Obtener inventario
Write-Host "[6/8] GET /api/inventory..." -ForegroundColor Yellow
try {
    $inventory = Invoke-RestMethod -Uri "$baseUrl/api/inventory" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($inventory.Count) items de inventario" -ForegroundColor Green
} catch {
    Write-Host "   ERROR" -ForegroundColor Red
}

# Obtener proveedores
Write-Host "[7/8] GET /api/suppliers..." -ForegroundColor Yellow
try {
    $suppliers = Invoke-RestMethod -Uri "$baseUrl/api/suppliers" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($suppliers.Count) proveedores" -ForegroundColor Green
} catch {
    Write-Host "   ERROR" -ForegroundColor Red
}

# Eliminar producto de prueba
Write-Host "[8/8] DELETE /api/products/:id - Eliminar producto..." -ForegroundColor Yellow
if ($testProductId) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/products/$testProductId" -Method DELETE -Headers $headers -ErrorAction Stop
        Write-Host "   OK - Producto eliminado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumen de datos:" -ForegroundColor Yellow
Write-Host "  Tiendas: $($stores.Count)" -ForegroundColor White
Write-Host "  Productos: $($products.Count)" -ForegroundColor White
Write-Host "  Inventario: $($inventory.Count) items" -ForegroundColor White
Write-Host "  Proveedores: $($suppliers.Count)" -ForegroundColor White
Write-Host ""
Write-Host "Verificar frontend en: https://vrmajo.xyz" -ForegroundColor Cyan
