# Plan de Implementación: Sistema de Códigos QR y Barras

## 📋 Objetivo
Permitir registrar ventas escaneando códigos de barras o QR de productos en lugar de buscarlos manualmente.

## 🎯 Funcionalidades

### 1. Escaneo en Ventas
- Escanear código de barras/QR del producto
- Agregar automáticamente al carrito
- Incrementar cantidad si ya existe
- Soporte para múltiples productos rápidamente

### 2. Gestión de Códigos
- Campo `barcode` ya existe en modelo Product
- Generar códigos QR para productos sin barcode
- Imprimir etiquetas con QR/Barcode

## 🔧 Implementación Técnica

### Backend (Ya Implementado ✅)
```typescript
// Model Product ya tiene:
{
  barcode?: string  // Código de barras del producto
  // ...
}
```

**Endpoint necesario**:
```
GET /api/products/by-barcode/:barcode
- Buscar producto por código de barras
- Retornar producto con inventario de la tienda
```

### Frontend (A Implementar)

#### 1. Componente BarcodeScanner
```tsx
// src/components/BarcodeScanner.tsx
- Usar librería: react-qr-barcode-scanner o quagga2
- Acceder a cámara del dispositivo
- Detectar código y emitir evento
- UI: Modal con vista de cámara + guía
```

#### 2. Integración en SalesPage
```tsx
// Agregar botón "Escanear Producto"
// Al detectar código:
//   1. Buscar producto por barcode
//   2. Agregar al carrito
//   3. Mostrar confirmación
//   4. Continuar escaneando
```

#### 3. Generador de QR
```tsx
// src/components/QRGenerator.tsx
- Usar librería: qrcode.react
- Generar QR con ID del producto
- Descargar como imagen
- Imprimir etiquetas
```

## 📦 Librerías Necesarias

### Opción 1: html5-qrcode (Recomendada)
```bash
npm install html5-qrcode
```
**Pros**:
- Fácil de usar
- Soporta QR y códigos de barras
- Funciona en móvil y desktop
- Buena detección

### Opción 2: react-qr-reader + quagga2
```bash
npm install react-qr-reader quagga2
```
**Pros**:
- Más control
- Mejor para códigos de barras complejos

### Para Generar QR:
```bash
npm install qrcode.react
npm install react-to-print  # Para imprimir etiquetas
```

## 🚀 Plan de Implementación

### Fase 1: Backend Endpoint ✅ (5 min)
- [x] Crear GET /api/products/by-barcode/:barcode
- [x] Incluir datos de inventario de la tienda
- [x] Manejo de errores si no existe

### Fase 2: Scanner Component (30 min)
- [ ] Instalar html5-qrcode
- [ ] Crear componente BarcodeScanner
- [ ] Configurar permisos de cámara
- [ ] UI con guía visual
- [ ] Eventos de éxito/error

### Fase 3: Integración en Ventas (20 min)
- [ ] Botón "Escanear" en SalesPage
- [ ] Modal con scanner
- [ ] Buscar producto por código
- [ ] Agregar al carrito automáticamente
- [ ] Sonido de confirmación

### Fase 4: Generador QR (20 min)
- [ ] Componente QRGenerator
- [ ] Mostrar en ProductsPage
- [ ] Descargar QR individual
- [ ] Opción de imprimir múltiples

### Fase 5: Mejoras (Opcional)
- [ ] Escaneo continuo (múltiples productos)
- [ ] Historial de escaneos
- [ ] Estadísticas de productos escaneados
- [ ] Soporte para lectores USB de barras

## 💡 Flujo de Usuario

### Escanear en Venta:
1. Usuario hace clic en "Escanear Producto"
2. Se abre modal con cámara
3. Apunta a código de barras/QR
4. Sistema detecta código
5. Busca producto en DB
6. Verifica inventario disponible
7. Agrega al carrito
8. Muestra confirmación visual/sonora
9. Listo para escanear siguiente

### Generar QR para Producto:
1. En ProductsPage, botón "Ver QR"
2. Modal muestra QR generado
3. Opciones: Descargar, Imprimir, Compartir
4. QR contiene: ID del producto + metadata

## 📱 Compatibilidad

### Móvil:
- ✅ Android: Chrome, Firefox
- ✅ iOS: Safari (requiere HTTPS)
- ⚠️ Requiere permisos de cámara

### Desktop:
- ✅ Chrome, Edge, Firefox
- ✅ Soporte para webcam
- ✅ También funciona con lectores USB

## 🔒 Seguridad

- HTTPS requerido para acceso a cámara
- Validación de códigos en backend
- No almacenar imágenes de escaneos
- Rate limiting en endpoint de búsqueda

## 📊 Casos de Uso

1. **Tienda física**: Escaneo rápido en punto de venta
2. **Inventario**: Verificar productos escaneando
3. **Recepción**: Registrar productos nuevos
4. **Transferencias**: Escanear para transferir entre tiendas

## 🎨 UI/UX

### Scanner Modal:
```
┌─────────────────────────────┐
│   📷 Escanear Producto      │
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │   [Vista Cámara]    │   │
│  │                     │   │
│  │  ┌─────────────┐   │   │
│  │  │   Guía QR   │   │   │
│  │  └─────────────┘   │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  "Apunta al código..."      │
│                             │
│  [Cerrar] [Usar Manual]     │
└─────────────────────────────┘
```

### Confirmación:
```
✅ Producto agregado!
   Laptop Dell XPS 15
   Cantidad: 1
   Precio: $2,499.00
```

---
*Plan creado: 10 de noviembre de 2025*
*Estado: Listo para implementar después de completar responsive*
