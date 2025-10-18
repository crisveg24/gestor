# Ejemplos de Peticiones HTTP

Este archivo contiene ejemplos de cómo usar la API con curl o herramientas como Postman/Insomnia.

## Variables
```bash
BASE_URL=http://localhost:5000/api
TOKEN=<tu-token-jwt-aqui>
```

## 1. Autenticación

### Login como Administrador
```bash
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tienda.com",
    "password": "Admin123!"
  }'
```

### Login como Usuario de Tienda
```bash
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario1@tienda.com",
    "password": "User123!"
  }'
```

### Obtener Perfil Actual
```bash
curl -X GET $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Cambiar Contraseña
```bash
curl -X PUT $BASE_URL/auth/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "User123!",
    "newPassword": "NewPassword123!"
  }'
```

## 2. Gestión de Tiendas

### Listar Todas las Tiendas (Admin)
```bash
curl -X GET $BASE_URL/stores \
  -H "Authorization: Bearer $TOKEN"
```

### Obtener Tienda Específica
```bash
curl -X GET $BASE_URL/stores/<STORE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Nueva Tienda (Admin)
```bash
curl -X POST $BASE_URL/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tienda Oeste",
    "address": "Av. Oeste #999",
    "phone": "+1234567894",
    "email": "oeste@tienda.com"
  }'
```

### Actualizar Tienda (Admin)
```bash
curl -X PUT $BASE_URL/stores/<STORE_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tienda Oeste - Actualizada",
    "isActive": true
  }'
```

## 3. Gestión de Usuarios

### Listar Usuarios (Admin)
```bash
curl -X GET "$BASE_URL/users?role=user&isActive=true" \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Usuario (Admin)
```bash
curl -X POST $BASE_URL/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Usuario",
    "email": "nuevo@tienda.com",
    "password": "Password123!",
    "role": "user",
    "store": "<STORE_ID>",
    "permissions": {
      "canAddInventory": false,
      "canRemoveInventory": true,
      "canViewInventory": true,
      "canAddSale": true,
      "canViewSales": true,
      "canViewReports": false
    }
  }'
```

### Actualizar Permisos de Usuario (Admin)
```bash
curl -X PUT $BASE_URL/users/<USER_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "canAddInventory": true,
      "canViewReports": true
    }
  }'
```

### Resetear Intentos de Login (Admin)
```bash
curl -X POST $BASE_URL/users/<USER_ID>/reset-attempts \
  -H "Authorization: Bearer $TOKEN"
```

## 4. Gestión de Productos

### Listar Productos
```bash
curl -X GET "$BASE_URL/products?page=1&limit=20&category=Electrónica" \
  -H "Authorization: Bearer $TOKEN"
```

### Buscar Productos
```bash
curl -X GET "$BASE_URL/products?search=laptop" \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Producto (Admin)
```bash
curl -X POST $BASE_URL/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop HP Pavilion",
    "description": "Laptop para uso profesional",
    "sku": "LAP-002",
    "barcode": "7501234567900",
    "category": "Electrónica",
    "price": 899.99,
    "cost": 649.99
  }'
```

### Actualizar Producto (Admin)
```bash
curl -X PUT $BASE_URL/products/<PRODUCT_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 849.99,
    "isActive": true
  }'
```

### Obtener Categorías
```bash
curl -X GET $BASE_URL/products/categories/list \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Gestión de Inventario

### Obtener Inventario de una Tienda
```bash
curl -X GET $BASE_URL/inventory/<STORE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

### Obtener Inventario con Filtros
```bash
curl -X GET "$BASE_URL/inventory/<STORE_ID>?category=Electrónica&lowStock=true" \
  -H "Authorization: Bearer $TOKEN"
```

### Agregar Producto al Inventario (Admin)
```bash
curl -X POST $BASE_URL/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store": "<STORE_ID>",
    "product": "<PRODUCT_ID>",
    "quantity": 50,
    "minStock": 10,
    "maxStock": 200
  }'
```

### Actualizar Cantidad en Inventario
```bash
curl -X PUT $BASE_URL/inventory/<INVENTORY_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "quantity": 20
  }'
```

### Restar del Inventario
```bash
curl -X PUT $BASE_URL/inventory/<INVENTORY_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "subtract",
    "quantity": 5
  }'
```

### Alertas de Stock Bajo
```bash
curl -X GET $BASE_URL/inventory/alerts/low-stock \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Gestión de Ventas

### Crear Venta
```bash
curl -X POST $BASE_URL/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store": "<STORE_ID>",
    "items": [
      {
        "product": "<PRODUCT_ID_1>",
        "quantity": 2,
        "unitPrice": 29.99
      },
      {
        "product": "<PRODUCT_ID_2>",
        "quantity": 1,
        "unitPrice": 89.99
      }
    ],
    "tax": 15.00,
    "discount": 10.00,
    "paymentMethod": "card",
    "notes": "Cliente frecuente"
  }'
```

### Listar Ventas de una Tienda
```bash
curl -X GET "$BASE_URL/sales/<STORE_ID>?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar Ventas por Fecha
```bash
curl -X GET "$BASE_URL/sales/<STORE_ID>?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Obtener Detalle de Venta
```bash
curl -X GET $BASE_URL/sales/detail/<SALE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

### Cancelar Venta (Admin)
```bash
curl -X PUT $BASE_URL/sales/<SALE_ID>/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Devolución solicitada por el cliente"
  }'
```

### Estadísticas de Ventas
```bash
curl -X GET "$BASE_URL/sales/<STORE_ID>/stats?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

## 7. Dashboard

### Estadísticas Globales (Admin)
```bash
curl -X GET $BASE_URL/dashboard/global \
  -H "Authorization: Bearer $TOKEN"
```

### Estadísticas Globales con Filtro de Fecha (Admin)
```bash
curl -X GET "$BASE_URL/dashboard/global?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Estadísticas de Tienda Específica
```bash
curl -X GET $BASE_URL/dashboard/store/<STORE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

### Comparación entre Tiendas (Admin)
```bash
curl -X GET $BASE_URL/dashboard/comparison \
  -H "Authorization: Bearer $TOKEN"
```

## 8. Health Check

### Verificar Estado del Servidor
```bash
curl -X GET http://localhost:5000/health
```

### Información General de la API
```bash
curl -X GET http://localhost:5000/
```

## Notas Importantes

1. **Token JWT**: Después de hacer login, guarda el token recibido y úsalo en el header `Authorization: Bearer <TOKEN>` para todas las peticiones protegidas.

2. **Rate Limiting**: Por defecto hay un límite de 100 peticiones cada 15 minutos por IP.

3. **Respuestas**: Todas las respuestas siguen el formato:
   ```json
   {
     "success": true/false,
     "data": {...},
     "error": "mensaje de error si aplica"
   }
   ```

4. **Paginación**: Los endpoints que retornan listas soportan `?page=1&limit=50`

5. **Filtros**: Muchos endpoints soportan filtros vía query params. Consulta la documentación de cada endpoint.

6. **IDs**: Reemplaza `<STORE_ID>`, `<PRODUCT_ID>`, etc. con los IDs reales de MongoDB (formato ObjectId).

## Ejemplo Completo de Flujo

```bash
# 1. Login
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tienda.com","password":"Admin123!"}' \
  | jq -r '.token')

# 2. Listar tiendas
curl -X GET $BASE_URL/stores \
  -H "Authorization: Bearer $TOKEN"

# 3. Ver dashboard global
curl -X GET $BASE_URL/dashboard/global \
  -H "Authorization: Bearer $TOKEN"
```
