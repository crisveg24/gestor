# 📐 Presets de Tallas - Sistema de Gestión

## 🎯 Uso del Endpoint

```typescript
POST /api/products/size-curve
Authorization: Bearer <token>

{
  "baseName": "Zapato Nike Air",
  "baseSkuPrefix": "ZAP-NIKE-001",
  "description": "Zapatos deportivos Nike Air",
  "category": "Zapatos",
  "price": 50000,
  "cost": 30000,
  "sizeType": "zapatos",
  "sizes": ["34", "35", "36", "37", "38", "39", "40", "41", "42"],
  "store": "673abc123def456789012345",  // ID de la tienda (opcional)
  "quantityPerSize": 10,                 // Cantidad inicial por talla (opcional)
  "minStock": 5,                         // Stock mínimo (opcional)
  "maxStock": 50                         // Stock máximo (opcional)
}
```

---

## 👟 ZAPATOS

### Curva Completa
```json
["34", "35", "36", "37", "38", "39", "40", "41", "42"]
```

### Curva Dama
```json
["34", "35", "36", "37", "38", "39", "40"]
```

### Curva Caballero
```json
["38", "39", "40", "41", "42", "43", "44"]
```

### Niños
```json
["22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33"]
```

---

## 👶 ROPA BEBÉ

### Por Meses
```json
["0m", "3m", "6m", "9m", "12m", "18m", "24m"]
```

### Por Años (alternativa)
```json
["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"]
```

### Por Tallas Numéricas
```json
["0", "2", "4", "6", "8", "10", "12"]
```

---

## 👧👦 ROPA NIÑO

### Niñas/Niños
```json
["4", "6", "8", "10", "12", "14"]
```

### Alternativa con años
```json
["4Y", "6Y", "8Y", "10Y", "12Y", "14Y", "16Y"]
```

---

## 👔👗 ROPA ADULTO

### Tallas Estándar
```json
["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
```

### Tallas Extra
```json
["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]
```

### Tallas Numéricas (camisas)
```json
["14", "15", "16", "17", "18"]
```

### Pantalones Hombre (cintura)
```json
["28", "30", "32", "34", "36", "38", "40", "42"]
```

### Pantalones Mujer
```json
["4", "6", "8", "10", "12", "14", "16", "18"]
```

---

## ⭐ TALLA ÚNICA

```json
["U"]
```

Usa `sizeType: "unica"` y `sizes: ["U"]`

---

## 📋 EJEMPLOS DE USO COMPLETOS

### 1. Crear Zapatos del 34 al 42
```bash
curl -X POST http://localhost:5000/api/products/size-curve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "baseName": "Zapato Nike Air Max",
    "baseSkuPrefix": "ZAP-NIKE-MAX",
    "description": "Zapatos deportivos Nike Air Max 2024",
    "category": "Zapatos",
    "price": 85000,
    "cost": 50000,
    "sizeType": "zapatos",
    "sizes": ["34","35","36","37","38","39","40","41","42"],
    "store": "673abc123def456789012345",
    "quantityPerSize": 5,
    "minStock": 2,
    "maxStock": 20
  }'
```

**Resultado:**
- ✅ 9 productos creados
- SKUs: ZAP-NIKE-MAX-34, ZAP-NIKE-MAX-35, ..., ZAP-NIKE-MAX-42
- Nombres: "Zapato Nike Air Max - Talla 34", "Zapato Nike Air Max - Talla 35", ...
- 9 inventarios creados con 5 unidades cada uno

---

### 2. Crear Ropa de Bebé
```bash
curl -X POST http://localhost:5000/api/products/size-curve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "baseName": "Body Manga Corta",
    "baseSkuPrefix": "BODY-MC",
    "description": "Body de algodón para bebé",
    "category": "Ropa Bebé",
    "price": 15000,
    "cost": 8000,
    "sizeType": "bebe",
    "sizes": ["0", "2", "4", "6", "8", "10", "12"],
    "store": "673abc123def456789012345",
    "quantityPerSize": 10
  }'
```

---

### 3. Crear Camisetas Adulto
```bash
curl -X POST http://localhost:5000/api/products/size-curve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "baseName": "Camiseta Polo Clásica",
    "baseSkuPrefix": "CAM-POLO",
    "description": "Camiseta tipo polo de algodón",
    "category": "Ropa Adulto",
    "price": 35000,
    "cost": 18000,
    "sizeType": "adulto",
    "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
    "store": "673abc123def456789012345",
    "quantityPerSize": 8
  }'
```

---

### 4. Producto Talla Única
```bash
curl -X POST http://localhost:5000/api/products/size-curve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "baseName": "Gorra Ajustable",
    "baseSkuPrefix": "GORRA-ADJ",
    "description": "Gorra deportiva ajustable",
    "category": "Accesorios",
    "price": 25000,
    "cost": 12000,
    "sizeType": "unica",
    "sizes": ["U"],
    "store": "673abc123def456789012345",
    "quantityPerSize": 20
  }'
```

---

## 🎨 TIPS DE ORGANIZACIÓN

### Prefijos de SKU Recomendados
- **Zapatos**: `ZAP-`, `CAL-`, `TEN-`, `BOT-`
- **Ropa Bebé**: `BODY-`, `PYMA-`, `ROMPER-`
- **Ropa Niño**: `CAM-NI-`, `PAN-NI-`
- **Ropa Adulto**: `CAM-`, `PAN-`, `BLUSA-`, `VEST-`
- **Accesorios**: `GORRA-`, `CINTU-`, `BUFANDA-`

### Categorías Sugeridas
- Zapatos Deportivos
- Zapatos Formales
- Zapatos Casual
- Ropa Bebé 0-2 años
- Ropa Niño 3-14 años
- Ropa Adulto Hombre
- Ropa Adulto Mujer
- Accesorios

---

## 🚀 VENTAJAS DEL SISTEMA

✅ **Rápido**: Crea 9 productos en 1 petición
✅ **Consistente**: Todos los productos comparten precio, descripción, categoría
✅ **Único**: SKUs automáticos sin duplicados
✅ **Completo**: Crea productos + inventario inicial
✅ **Seguro**: Transacciones - todo o nada
✅ **Flexible**: Con o sin inventario inicial

---

## 🔍 BUSCAR PRODUCTOS POR TALLA

```bash
# Buscar todas las tallas de un producto
GET /api/products?search=Zapato Nike Air Max

# Filtrar por tipo de talla
GET /api/products?sizeType=zapatos

# Buscar talla específica
GET /api/products?search=Talla 38
```

---

## 💡 FUNCIONALIDADES ADICIONALES SUGERIDAS

### 1. **Edición Masiva de Precios**
Cambiar precio de todas las tallas de un producto

### 2. **Reporte de Tallas Faltantes**
Ver qué tallas tienen poco stock

### 3. **Transferencia de Tallas**
Mover stock de una talla a otra tienda

### 4. **Análisis de Ventas por Talla**
Ver qué tallas se venden más

### 5. **Alertas de Reposición por Talla**
Notificar cuando una talla específica esté baja

¿Te gustaría que implemente alguna de estas funcionalidades adicionales?
