# Configuración MongoDB Atlas (GRATIS)

## Paso 1: Crear Cuenta en MongoDB Atlas

1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Registrate con tu email (o Gmail)
3. Completa el formulario básico

## Paso 2: Crear un Cluster Gratuito

1. Selecciona **"Build a Database"**
2. Elige **M0 (FREE)** - 512MB de almacenamiento
3. Selecciona un proveedor:
   - **AWS** - Región más cercana (ej: `us-east-1` o `sa-east-1` para Latinoamérica)
   - O **Google Cloud** / **Azure**
4. Dale un nombre a tu cluster: `gestor-tiendas`
5. Click en **"Create"** (tarda ~3-5 minutos)

## Paso 3: Configurar Acceso

### 3.1 Crear Usuario de Base de Datos

1. En el menú lateral: **Security > Database Access**
2. Click en **"Add New Database User"**
3. Configuración:
   ```
   Authentication Method: Password
   Username: gestor_admin
   Password: [Genera una contraseña segura] (guárdala!)
   Database User Privileges: Read and write to any database
   ```
4. Click **"Add User"**

### 3.2 Configurar IP Whitelist

1. En el menú lateral: **Security > Network Access**
2. Click en **"Add IP Address"**
3. Opciones:
   - **Desarrollo:** Click en **"Allow Access from Anywhere"** (0.0.0.0/0)
   - **Producción:** Agrega las IPs específicas de tu servidor
4. Click **"Confirm"**

## Paso 4: Obtener Connection String

1. En **Database** click en **"Connect"** en tu cluster
2. Selecciona **"Connect your application"**
3. Elige:
   - **Driver:** Node.js
   - **Version:** 5.5 or later
4. Copia el Connection String:
   ```
   mongodb+srv://gestor_admin:<password>@gestor-tiendas.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Paso 5: Configurar en tu Proyecto

1. Abre tu archivo `.env`:
   ```bash
   nano .env
   ```

2. Actualiza `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://gestor_admin:TU_PASSWORD_AQUI@gestor-tiendas.xxxxx.mongodb.net/gestor-tiendas?retryWrites=true&w=majority
   ```
   
   ⚠️ **IMPORTANTE:** Reemplaza:
   - `<password>` con tu contraseña real
   - `xxxxx` con el ID de tu cluster
   - Agrega `/gestor-tiendas` antes del `?` para nombrar tu base de datos

3. Guarda el archivo

## Paso 6: Probar la Conexión

```bash
# Ejecutar el seed para crear datos iniciales
npm run seed

# Si ves "MongoDB conectado" ¡funcionó! ✅
```

## 📊 Límites del Tier Gratuito

- ✅ **Almacenamiento:** 512 MB
- ✅ **RAM:** Compartida
- ✅ **Conexiones:** Hasta 500 concurrentes
- ✅ **Disponibilidad:** 24/7
- ✅ **Backups:** No incluidos (manual)
- ✅ **Duración:** PERMANENTE (no expira)

## 🎯 Estimación de Capacidad

Con 512MB puedes almacenar aproximadamente:
- **~10,000 productos**
- **~50,000 ventas**
- **~1,000 usuarios**
- Perfecta para MVP y pruebas iniciales

## 🔄 Monitorear Uso

1. En Atlas Dashboard ve a **Metrics**
2. Revisa:
   - **Data Size** - Espacio usado
   - **Connections** - Conexiones activas
   - **Operations** - Operaciones por segundo

## ⚠️ Notas de Seguridad

1. **Nunca compartas tu connection string** con el password
2. **Usa variables de entorno** (nunca hardcodees el password)
3. **En producción:** Restringe IPs específicas
4. **Habilita 2FA** en tu cuenta de MongoDB Atlas

## 🚀 Cuando necesites más

Si superas el límite gratuito, los planes pagos empiezan desde **$9/mes** con:
- 2GB de almacenamiento
- Backups automáticos
- Mejor rendimiento
