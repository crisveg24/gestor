# Script de analisis completo de funcionalidades Frontend vs Backend
$baseUrl = "https://api.vrmajo.xyz"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  ANALISIS DE FUNCIONALIDADES" -ForegroundColor Cyan
Write-Host "  Frontend vs Backend" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "[AUTH] Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "   OK - Token obtenido" -ForegroundColor Green
    $token = $loginResponse.token
    $userId = $loginResponse.user._id
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  DASHBOARD PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[1] GET /api/dashboard - Estadisticas globales..." -ForegroundColor Yellow
try {
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/api/dashboard" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host "[2] GET /api/dashboard/sales-trend - Tendencia ventas..." -ForegroundColor Yellow
try {
    $salesTrend = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/sales-trend" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host "[3] GET /api/dashboard/top-products - Top productos..." -ForegroundColor Yellow
try {
    $topProducts = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/top-products" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  PRODUCTS PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[4] GET /api/products - Listar productos..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET -Headers $headers -ErrorAction Stop
    $products = $productsResponse.data.products
    Write-Host "   OK - $($products.Count) productos" -ForegroundColor Green
    $productId = if ($products.Count -gt 0) { $products[0]._id } else { $null }
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host "[5] POST /api/products - Crear producto..." -ForegroundColor Yellow
$newProduct = @{
    name = "Test Producto $(Get-Date -Format 'HHmmss')"
    description = "Producto de prueba"
    sku = "TEST-$(Get-Date -Format 'HHmmss')"
    category = "Test"
    cost = 100
    price = 150
} | ConvertTo-Json

try {
    $createdProductResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method POST -Body $newProduct -Headers $headers -ErrorAction Stop
    $testProductId = $createdProductResponse.data._id
    Write-Host "   OK - Producto creado" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

if ($testProductId) {
    Write-Host "[6] PUT /api/products/:id - Actualizar producto..." -ForegroundColor Yellow
    $updateProduct = @{
        name = "Test Producto EDITADO"
        description = "Producto editado"
        sku = "TEST-EDIT-$(Get-Date -Format 'HHmmss')"
        category = "Test"
        cost = 120
        price = 180
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/products/$testProductId" -Method PUT -Body $updateProduct -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "   OK - Producto actualizado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
    
    Write-Host "[7] DELETE /api/products/:id - Eliminar producto..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/products/$testProductId" -Method DELETE -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "   OK - Producto eliminado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  STORES PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[8] GET /api/stores - Listar tiendas..." -ForegroundColor Yellow
try {
    $stores = Invoke-RestMethod -Uri "$baseUrl/api/stores" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($stores.Count) tiendas" -ForegroundColor Green
    $storeId = if ($stores.Count -gt 0) { $stores[0]._id } else { $null }
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  INVENTORY PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[9] GET /api/inventory - Listar inventario..." -ForegroundColor Yellow
try {
    $inventory = Invoke-RestMethod -Uri "$baseUrl/api/inventory" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($inventory.Count) items" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

if ($storeId) {
    Write-Host "[10] GET /api/inventory?store=:id - Filtrar por tienda..." -ForegroundColor Yellow
    try {
        $inventoryByStore = Invoke-RestMethod -Uri "$baseUrl/api/inventory?store=$storeId" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "   OK - $($inventoryByStore.Count) items en tienda" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SALES PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[11] GET /api/sales - Listar ventas..." -ForegroundColor Yellow
try {
    $sales = Invoke-RestMethod -Uri "$baseUrl/api/sales" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($sales.Count) ventas" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SUPPLIERS PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[12] GET /api/suppliers - Listar proveedores..." -ForegroundColor Yellow
try {
    $suppliers = Invoke-RestMethod -Uri "$baseUrl/api/suppliers" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($suppliers.Count) proveedores" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host "[13] POST /api/suppliers - Crear proveedor..." -ForegroundColor Yellow
$newSupplier = @{
    name = "Proveedor Test $(Get-Date -Format 'HHmmss')"
    contactName = "Contacto Test"
    email = "test@proveedor.com"
    phone = "1234567890"
    address = "Direccion Test"
    city = "Ciudad Test"
    country = "Colombia"
    nit = "TEST-$(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json

try {
    $createdSupplier = Invoke-RestMethod -Uri "$baseUrl/api/suppliers" -Method POST -Body $newSupplier -Headers $headers -ErrorAction Stop
    $testSupplierId = $createdSupplier._id
    Write-Host "   OK - Proveedor creado" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

if ($testSupplierId) {
    Write-Host "[14] DELETE /api/suppliers/:id - Eliminar proveedor..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/suppliers/$testSupplierId" -Method DELETE -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "   OK - Proveedor eliminado" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  PURCHASE ORDERS PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[15] GET /api/purchase-orders - Listar ordenes..." -ForegroundColor Yellow
try {
    $purchaseOrders = Invoke-RestMethod -Uri "$baseUrl/api/purchase-orders" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($purchaseOrders.Count) ordenes" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  USERS PAGE (Solo Admin)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[16] GET /api/users - Listar usuarios..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK - $($users.Count) usuarios" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  REPORTS PAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "[17] GET /api/reports/sales - Reporte de ventas..." -ForegroundColor Yellow
try {
    $salesReport = Invoke-RestMethod -Uri "$baseUrl/api/reports/sales" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   OK" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints probados: 17" -ForegroundColor White
Write-Host ""
Write-Host "Funcionalidades del Frontend:" -ForegroundColor Yellow
Write-Host "  - Dashboard: Estadisticas, graficas, metricas" -ForegroundColor White
Write-Host "  - Productos: CRUD completo (Crear, Leer, Actualizar, Eliminar)" -ForegroundColor White
Write-Host "  - Tiendas: Listar tiendas" -ForegroundColor White
Write-Host "  - Inventario: Ver stock por tienda y producto" -ForegroundColor White
Write-Host "  - Ventas: Listar ventas" -ForegroundColor White
Write-Host "  - Proveedores: CRUD completo" -ForegroundColor White
Write-Host "  - Ordenes de Compra: Listar ordenes" -ForegroundColor White
Write-Host "  - Usuarios: Gestion de usuarios (Solo Admin)" -ForegroundColor White
Write-Host "  - Reportes: Reportes de ventas" -ForegroundColor White
Write-Host ""
Write-Host "Ver frontend en: https://vrmajo.xyz" -ForegroundColor Cyan
