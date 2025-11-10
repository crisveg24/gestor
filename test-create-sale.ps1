# Prueba completa de creacion de venta
$baseUrl = "https://api.vrmajo.xyz"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  PRUEBA: CREAR VENTA COMPLETA" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "[1/5] Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
Write-Host "   OK" -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $($loginResponse.token)"
    "Content-Type" = "application/json"
}

# Obtener tiendas
Write-Host "[2/5] Obtener tiendas..." -ForegroundColor Yellow
$stores = Invoke-RestMethod -Uri "$baseUrl/api/stores" -Method GET -Headers $headers
$storeId = $stores[0]._id
Write-Host "   OK - Usando tienda: $($stores[0].name)" -ForegroundColor Green

# Obtener productos
Write-Host "[3/5] Obtener productos..." -ForegroundColor Yellow
$productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET -Headers $headers
$products = $productsResponse.data.products
Write-Host "   OK - $($products.Count) productos disponibles" -ForegroundColor Green

# Verificar inventario del primer producto
$productId = $products[0]._id
Write-Host "[4/5] Verificar inventario..." -ForegroundColor Yellow
$inventoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/inventory?store=$storeId&product=$productId" -Method GET -Headers $headers
if ($inventoryResponse.Count -gt 0) {
    $stockAvailable = $inventoryResponse[0].quantity
    Write-Host "   OK - Stock disponible: $stockAvailable unidades de $($products[0].name)" -ForegroundColor Green
} else {
    Write-Host "   ADVERTENCIA - No hay stock" -ForegroundColor Yellow
    $stockAvailable = 0
}

# Crear venta
Write-Host "[5/5] Crear venta..." -ForegroundColor Yellow
$saleData = @{
    store = $storeId
    items = @(
        @{
            product = $productId
            quantity = 1
            unitPrice = $products[0].price
        }
    )
    paymentMethod = "efectivo"
    tax = 0
    discount = 0
    notes = "Venta de prueba automatica"
} | ConvertTo-Json -Depth 10

try {
    $saleResponse = Invoke-RestMethod -Uri "$baseUrl/api/sales" -Method POST -Body $saleData -Headers $headers -ErrorAction Stop
    Write-Host "   OK - Venta creada exitosamente" -ForegroundColor Green
    Write-Host "   Total: $($saleResponse.data.totalAmount)" -ForegroundColor White
    Write-Host "   Folio: $($saleResponse.data.folio)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
    Write-Host "   Detalles: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  PRUEBA COMPLETADA" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
