# Script para probar la API en produccion
$baseUrl = "https://api.vrmajo.xyz"

Write-Host "=== PRUEBAS DE API EN PRODUCCION ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor White
Write-Host ""

# 1. Verificar que el servidor responda
Write-Host "1. Probando endpoint raiz..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET -ErrorAction Stop
    Write-Host "   OK - Version: $($response.version)" -ForegroundColor Green
    Write-Host "   Mensaje: $($response.message)" -ForegroundColor Gray
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Intentar login con admin
Write-Host "2. Probando login de administrador..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@tienda.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session -ErrorAction Stop
    Write-Host "   OK - Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.user.name)" -ForegroundColor Gray
    Write-Host "   Role: $($loginResponse.user.role)" -ForegroundColor Gray
    Write-Host "   Email: $($loginResponse.user.email)" -ForegroundColor Gray
    
    $token = $loginResponse.token
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
    Write-Host "   No se pudo hacer login - Verifica credenciales en MongoDB" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 3. Probar endpoints protegidos con token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "3. Probando endpoints protegidos..." -ForegroundColor Yellow

# Stores
Write-Host "   - GET /api/stores..." -NoNewline
try {
    $stores = Invoke-RestMethod -Uri "$baseUrl/api/stores" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK ($($stores.Count) tiendas)" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

# Products
Write-Host "   - GET /api/products..." -NoNewline
try {
    $products = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK ($($products.Count) productos)" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

# Inventory
Write-Host "   - GET /api/inventory..." -NoNewline
try {
    $inventory = Invoke-RestMethod -Uri "$baseUrl/api/inventory" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK ($($inventory.Count) items)" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

# Sales
Write-Host "   - GET /api/sales..." -NoNewline
try {
    $sales = Invoke-RestMethod -Uri "$baseUrl/api/sales" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK ($($sales.Count) ventas)" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

# Suppliers
Write-Host "   - GET /api/suppliers..." -NoNewline
try {
    $suppliers = Invoke-RestMethod -Uri "$baseUrl/api/suppliers" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK ($($suppliers.Count) proveedores)" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

# Purchase Orders
Write-Host "   - GET /api/purchase-orders..." -NoNewline
try {
    $purchaseOrders = Invoke-RestMethod -Uri "$baseUrl/api/purchase-orders" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK ($($purchaseOrders.Count) ordenes)" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

# Dashboard
Write-Host "   - GET /api/dashboard..." -NoNewline
try {
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/api/dashboard" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
}

Write-Host ""

# 4. Probar login con usuario normal
Write-Host "4. Probando login de usuario normal..." -ForegroundColor Yellow
$userLoginBody = @{
    email = "carlos@tienda.com"
    password = "User123!"
} | ConvertTo-Json

try {
    $userLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $userLoginBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "   OK - Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($userLoginResponse.user.name)" -ForegroundColor Gray
    Write-Host "   Role: $($userLoginResponse.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== PRUEBAS COMPLETADAS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumen de datos en produccion:" -ForegroundColor Yellow
Write-Host "  - Tiendas: $($stores.Count)" -ForegroundColor White
Write-Host "  - Productos: $($products.Count)" -ForegroundColor White
Write-Host "  - Inventario: $($inventory.Count) items" -ForegroundColor White
Write-Host "  - Ventas: $($sales.Count)" -ForegroundColor White
Write-Host "  - Proveedores: $($suppliers.Count)" -ForegroundColor White
Write-Host "  - Ordenes de Compra: $($purchaseOrders.Count)" -ForegroundColor White
Write-Host ""
Write-Host "Backend funcionando correctamente!" -ForegroundColor Green
