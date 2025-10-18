# Sistema de Gestión de Tiendas 🏪

Sistema completo de gestión de inventario, ventas y administración para múltiples tiendas con control de acceso basado en roles.

## 🚀 Características

### Seguridad
- ✅ Autenticación JWT con tokens de acceso y refresh
- ✅ Roles de usuario (Administrador y Usuario)
- ✅ Sistema de permisos granular
- ✅ Rate limiting para prevenir ataques DDoS
- ✅ Protección contra inyección NoSQL
- ✅ Headers de seguridad con Helmet
- ✅ Bloqueo de cuenta después de múltiples intentos fallidos
- ✅ Validación y sanitización de inputs
- ✅ Logs de seguridad detallados

### Funcionalidades por Rol

#### Administradores
- ✅ Gestión completa de tiendas
- ✅ Gestión de usuarios y permisos
- ✅ Agregar y eliminar productos del inventario
- ✅ Acceso a estadísticas globales
- ✅ Comparación de rendimiento entre tiendas
- ✅ Cancelación de ventas
- ✅ Acceso a todas las tiendas

#### Usuarios de Tienda
- ✅ Gestión de ventas en su tienda
- ✅ Consulta de inventario de su tienda
- ✅ Eliminación de items del inventario (con permiso)
- ✅ Estadísticas de su tienda
- ✅ Acceso restringido a su tienda asignada

### Gestión de Inventario
- ✅ Control de stock por tienda
- ✅ Alertas de stock bajo
- ✅ Historial de cambios
- ✅ Stock mínimo y máximo configurable
- ✅ Búsqueda y filtrado avanzado

### Gestión de Ventas
- ✅ Registro de ventas con múltiples items
- ✅ Actualización automática de inventario
- ✅ Múltiples métodos de pago
- ✅ Aplicación de impuestos y descuentos
- ✅ Cancelación de ventas (devuelve stock)
- ✅ Transacciones atómicas con MongoDB

### Dashboard y Reportes
- ✅ Estadísticas globales (admins)
- ✅ Estadísticas por tienda
- ✅ Ventas del día en tiempo real
- ✅ Productos más vendidos
- ✅ Gráficos de ventas por día
- ✅ Comparación de rendimiento entre tiendas

## 📋 Requisitos Previos

- Node.js v18 o superior
- MongoDB v5 o superior
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd gestor
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar el archivo `.env` con tus configuraciones:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gestor-tiendas
JWT_SECRET=tu-secret-key-super-segura
JWT_EXPIRE=7d
```

4. **Inicializar la base de datos con datos de prueba**
```bash
npm run seed
```

Este comando creará:
- 4 tiendas de ejemplo
- 1 usuario administrador
- 4 usuarios (uno por tienda)
- 10 productos de ejemplo

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 📚 API Endpoints

### Autenticación (`/api/auth`)
- `POST /login` - Iniciar sesión
- `POST /register` - Registrar usuario (solo admin)
- `GET /me` - Obtener usuario actual
- `PUT /profile` - Actualizar perfil
- `PUT /password` - Cambiar contraseña

### Tiendas (`/api/stores`)
- `GET /` - Listar tiendas (admin)
- `GET /:id` - Obtener tienda
- `POST /` - Crear tienda (admin)
- `PUT /:id` - Actualizar tienda (admin)
- `DELETE /:id` - Eliminar tienda (admin)

### Usuarios (`/api/users`)
- `GET /` - Listar usuarios (admin)
- `GET /:id` - Obtener usuario (admin)
- `PUT /:id` - Actualizar usuario (admin)
- `DELETE /:id` - Eliminar usuario (admin)
- `POST /:id/reset-attempts` - Resetear intentos de login (admin)

### Productos (`/api/products`)
- `GET /` - Listar productos
- `GET /:id` - Obtener producto
- `GET /categories/list` - Listar categorías
- `POST /` - Crear producto (admin)
- `PUT /:id` - Actualizar producto (admin)
- `DELETE /:id` - Eliminar producto (admin)

### Inventario (`/api/inventory`)
- `GET /:storeId` - Obtener inventario de tienda
- `GET /alerts/low-stock` - Alertas de stock bajo
- `POST /` - Agregar al inventario (admin)
- `PUT /:id` - Actualizar inventario
- `DELETE /:id` - Eliminar del inventario (admin)

### Ventas (`/api/sales`)
- `POST /` - Crear venta
- `GET /:storeId` - Obtener ventas de tienda
- `GET /:storeId/stats` - Estadísticas de ventas
- `GET /detail/:id` - Obtener venta específica
- `PUT /:id/cancel` - Cancelar venta (admin)

### Dashboard (`/api/dashboard`)
- `GET /global` - Estadísticas globales (admin)
- `GET /comparison` - Comparación entre tiendas (admin)
- `GET /store/:storeId` - Estadísticas por tienda

## 🔐 Credenciales por Defecto

### Administrador
- Email: `admin@tienda.com`
- Password: `Admin123!`

### Usuarios de Tienda
- Tienda Centro: `usuario1@tienda.com` / `User123!`
- Tienda Norte: `usuario2@tienda.com` / `User123!`
- Tienda Sur: `usuario3@tienda.com` / `User123!`
- Tienda Este: `usuario4@tienda.com` / `User123!`

## 🔒 Medidas de Seguridad Implementadas

1. **Autenticación JWT**: Tokens firmados con algoritmo HS256
2. **Hashing de Contraseñas**: bcryptjs con 12 rounds
3. **Rate Limiting**: 100 requests por 15 minutos por IP
4. **Helmet**: Headers de seguridad HTTP
5. **CORS**: Configurado para frontend específico
6. **Validación de Inputs**: express-validator
7. **Sanitización NoSQL**: express-mongo-sanitize
8. **Bloqueo de Cuenta**: Después de 5 intentos fallidos
9. **Logs de Seguridad**: Winston para auditoría
10. **Soft Delete**: No se eliminan datos físicamente

## 📁 Estructura del Proyecto

```
gestor/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuración de MongoDB
│   ├── controllers/
│   │   ├── authController.ts    # Autenticación
│   │   ├── dashboardController.ts
│   │   ├── inventoryController.ts
│   │   ├── productController.ts
│   │   ├── salesController.ts
│   │   ├── storeController.ts
│   │   └── userController.ts
│   ├── middleware/
│   │   ├── auth.ts              # JWT y autorización
│   │   ├── errorHandler.ts      # Manejo de errores
│   │   └── validation.ts        # Validación de inputs
│   ├── models/
│   │   ├── User.ts
│   │   ├── Store.ts
│   │   ├── Product.ts
│   │   ├── Inventory.ts
│   │   └── Sale.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── dashboardRoutes.ts
│   │   ├── inventoryRoutes.ts
│   │   ├── productRoutes.ts
│   │   ├── salesRoutes.ts
│   │   ├── storeRoutes.ts
│   │   └── userRoutes.ts
│   ├── scripts/
│   │   └── seed.ts              # Datos iniciales
│   ├── utils/
│   │   └── logger.ts            # Sistema de logs
│   └── server.ts                # Punto de entrada
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Próximas Funcionalidades

- [ ] Tests unitarios y de integración
- [ ] Implementación de refresh tokens
- [ ] Sistema de notificaciones
- [ ] Reportes en PDF
- [ ] Exportación de datos a Excel
- [ ] Gráficos avanzados en dashboard
- [ ] Aplicación móvil
- [ ] Sistema de códigos de barras
- [ ] Integración con sistemas de pago
- [ ] Módulo de proveedores

## 📝 Licencia

ISC

---

Desarrollado con ❤️ para la gestión eficiente de tiendas
