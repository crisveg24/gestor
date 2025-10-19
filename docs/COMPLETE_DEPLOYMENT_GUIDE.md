# 🚀 Guía Completa: De Desarrollo a Producción (GRATIS o $3)

Esta guía te llevará desde cero hasta tener tu aplicación en línea, accesible desde internet.

## 📋 PLAN DE ACCIÓN - 100% GRATIS

```
1. MongoDB Atlas (Base de Datos)     → GRATIS (512MB)
2. Render.com (Backend API)          → GRATIS (750hrs/mes)
3. Vercel (Frontend - futuro)        → GRATIS (ilimitado)
4. Freenom o Namecheap (Dominio)     → GRATIS o $0.88
```

**Tiempo estimado:** 30-45 minutos

---

## 🎯 FASE 1: Configurar Base de Datos (15 min)

### 1.1 Crear cuenta en MongoDB Atlas

1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Registrate con Gmail o email
3. Completa el formulario:
   - ¿Qué quieres construir? → **Aplicación Web**
   - Lenguaje: **JavaScript/Node.js**

### 1.2 Crear Cluster Gratuito

1. Click en **"Build a Database"**
2. Selecciona **M0 FREE**
3. Proveedor: **AWS**
4. Región: Elige la más cercana a tus usuarios
   - Para LATAM: `São Paulo (sa-east-1)` o `Virginia (us-east-1)`
5. Nombre del cluster: `gestor-tiendas`
6. Click **"Create"** (espera 3-5 min)

### 1.3 Crear Usuario

1. Aparecerá modal de seguridad
2. **Authentication Method:** Password
3. **Username:** `gestor_admin`
4. **Password:** Click en **"Autogenerate Secure Password"** 
   - ⚠️ **COPIA Y GUARDA ESTE PASSWORD**
5. Click **"Create User"**

### 1.4 Configurar Red

1. En el mismo modal:
2. **Where would you like to connect from?**
3. Click **"My Local Environment"**
4. Click **"Add My Current IP Address"**
5. También agrega: **"Allow Access from Anywhere"** (para Render)
   - IP: `0.0.0.0/0`
   - Description: `Render and development`
6. Click **"Finish and Close"**

### 1.5 Obtener Connection String

1. Click en **"Connect"** en tu cluster
2. Selecciona **"Drivers"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copia el connection string:
   ```
   mongodb+srv://gestor_admin:<password>@gestor-tiendas.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Guárdalo en un lugar seguro

### 1.6 Configurar en tu proyecto LOCAL

```bash
# Editar .env
nano .env
```

Actualiza esta línea (reemplaza <password> con tu password real):
```env
MONGODB_URI=mongodb+srv://gestor_admin:TU_PASSWORD_REAL@gestor-tiendas.xxxxx.mongodb.net/gestor-tiendas?retryWrites=true&w=majority
```

✅ **CHECKPOINT:** MongoDB Atlas configurado

---

## 🎯 FASE 2: Probar Localmente (10 min)

### 2.1 Inicializar la Base de Datos

```bash
cd /workspaces/gestor
npm run seed
```

**Deberías ver:**
```
MongoDB conectado: gestor-tiendas-shard-00-00.xxxxx.mongodb.net
4 tiendas creadas
Administrador creado
4 usuarios creados
10 productos creados

=== CREDENCIALES DE ACCESO ===
Administrador:
Email: admin@tienda.com
Password: Admin123!
...
```

✅ Si ves esto, ¡la BD está funcionando!

### 2.2 Iniciar el Servidor

```bash
npm run dev
```

**Deberías ver:**
```
Servidor corriendo en modo development en el puerto 5000
MongoDB conectado: ...
```

### 2.3 Probar API

En otra terminal:

```bash
# Test de login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tienda.com","password":"Admin123!"}'
```

**Deberías recibir:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "name": "Administrador Principal",
    "email": "admin@tienda.com",
    "role": "admin"
  }
}
```

✅ **CHECKPOINT:** API funcionando localmente

---

## 🎯 FASE 3: Preparar para Producción (5 min)

### 3.1 Verificar que el build funciona

```bash
npm run build
```

Debería crear carpeta `dist/` sin errores.

### 3.2 Probar producción localmente

```bash
npm start
```

Si funciona, ¡estamos listos para deploy!

### 3.3 Commit cambios (si hiciste alguno)

```bash
git add .
git commit -m "docs: agregar guías de deployment"
git push origin development
```

✅ **CHECKPOINT:** Código listo para producción

---

## 🎯 FASE 4: Deploy en Render.com (10 min)

### 4.1 Crear cuenta en Render

1. Ve a: https://render.com/
2. Click **"Get Started"**
3. **Sign Up with GitHub**
4. Autoriza a Render acceder a tus repos

### 4.2 Crear Web Service

1. En Dashboard, click **"New +"** → **"Web Service"**
2. Click **"Build and deploy from a Git repository"**
3. Click **"Next"**
4. Busca y selecciona: `crisveg24/gestor`
5. Click **"Connect"**

### 4.3 Configurar el Service

```
Name: gestor-tiendas-api
Region: Oregon (US West) o más cercano
Branch: development
Root Directory: (dejar vacío)
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Instance Type: Free
```

### 4.4 Agregar Variables de Entorno

Click en **"Advanced"** → **"Add Environment Variable"**

Agrega estas variables (usa el botón **"Add from .env"** o una por una):

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://gestor_admin:TU_PASSWORD@gestor-tiendas.xxxxx.mongodb.net/gestor-tiendas?retryWrites=true&w=majority
JWT_SECRET=super-secret-production-key-change-this-abc123xyz789
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=refresh-secret-production-xyz789abc123def456
JWT_REFRESH_EXPIRE=30d
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FRONTEND_URL=https://tudominio.com
LOG_LEVEL=info
```

⚠️ **IMPORTANTE:** 
- Cambia `JWT_SECRET` y `JWT_REFRESH_SECRET` por valores únicos
- Usa el MONGODB_URI real de Atlas

### 4.5 Deploy

1. Click **"Create Web Service"**
2. Espera ~5-8 minutos mientras se despliega
3. Verás logs en tiempo real

**Cuando veas:** "Servidor corriendo en modo production..." ¡Listo!

### 4.6 Obtener URL

Tu API estará disponible en:
```
https://gestor-tiendas-api.onrender.com
```

### 4.7 Probar API en Producción

```bash
curl https://gestor-tiendas-api.onrender.com/health
```

Debería responder:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2025-10-19T..."
}
```

✅ **CHECKPOINT:** API en producción funcionando

---

## 🎯 FASE 5: Inicializar Base de Datos en Producción (5 min)

### Opción A: Desde Render Shell

1. En Render dashboard → Tu servicio
2. Click en **"Shell"** (en el menú superior)
3. Ejecuta:
```bash
npm run seed
```

### Opción B: Crear endpoint temporal

Podrías crear un endpoint `/api/admin/seed` protegido que ejecute el seed (solo para uso inicial).

✅ **CHECKPOINT:** Base de datos de producción inicializada

---

## 🎯 FASE 6: Dominio (Opcional - $0 a $3)

### Opción A: Usar subdominio de Render (GRATIS)

Ya tienes: `gestor-tiendas-api.onrender.com`

¡Listo! Puedes usar este.

### Opción B: Dominio Custom ($0.88)

1. **Comprar dominio en Namecheap:**
   - Busca: `gestor-tiendas.xyz`
   - Compra por $0.88

2. **Configurar DNS en Namecheap:**
   - Advanced DNS
   - Agregar CNAME:
     ```
     Type: CNAME
     Host: @
     Value: gestor-tiendas-api.onrender.com
     TTL: Automatic
     ```

3. **Agregar dominio en Render:**
   - Settings → Custom Domain
   - Agregar: `gestor-tiendas.xyz`
   - Esperar propagación (5 min - 24 hrs)

✅ **CHECKPOINT:** Dominio configurado

---

## 🎉 ¡FELICITACIONES!

Tu API está en línea en:
- **URL:** `https://gestor-tiendas-api.onrender.com` (o tu dominio custom)
- **Documentación:** `https://gestor-tiendas-api.onrender.com/`
- **Health:** `https://gestor-tiendas-api.onrender.com/health`

### Endpoints disponibles:

```bash
# Login
POST https://gestor-tiendas-api.onrender.com/api/auth/login

# Listar tiendas (requiere token admin)
GET https://gestor-tiendas-api.onrender.com/api/stores

# Dashboard global (requiere token admin)
GET https://gestor-tiendas-api.onrender.com/api/dashboard/global
```

---

## 📝 COSTOS TOTALES

```
✅ MongoDB Atlas (512MB):        $0/mes - GRATIS
✅ Render.com (750hrs):          $0/mes - GRATIS
✅ SSL Certificate:              $0     - INCLUIDO
✅ Dominio .xyz (opcional):      $0.88  - PRIMER AÑO

TOTAL: $0 - $0.88 primer año
```

---

## 🔄 Mantenimiento

### Deploy automático:
Cada vez que hagas `git push origin development`, Render automáticamente:
1. Detecta los cambios
2. Hace build
3. Despliega la nueva versión
4. ¡Sin downtime!

### Monitorear:
- **Logs:** Render Dashboard → Logs
- **Métricas:** Render Dashboard → Metrics
- **MongoDB:** Atlas Dashboard → Metrics

---

## ⚠️ Limitaciones Free Tier

1. **Render:**
   - Servidor se duerme después de 15 min sin uso
   - Primera petición después tarda ~30 seg (cold start)
   - Para evitarlo: usa un servicio de "ping" cada 10 min

2. **MongoDB Atlas:**
   - 512MB de almacenamiento
   - Suficiente para ~10,000 productos y 50,000 ventas

---

## 🚀 Próximos Pasos

1. ✅ Probar todos los endpoints con Postman
2. ✅ Crear frontend (React/Next.js)
3. ✅ Desplegar frontend en Vercel (gratis)
4. ✅ Conectar frontend con tu API en Render
5. ✅ ¡Lanzar tu MVP!

¿Necesitas ayuda con algún paso? ¡Avísame!
