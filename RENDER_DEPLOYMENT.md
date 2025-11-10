# 🚀 Guía de Deployment en Render.com

## ❗ Problema Actual
El backend en `https://gestor-glwn.onrender.com` **NO está respondiendo** (devuelve 404).

Esto significa que:
1. El servicio podría no estar deployed correctamente
2. Las rutas están mal configuradas
3. El servicio está en estado "Suspended" (plan free)
4. Hay errores en el build o runtime

## 📋 Pasos para Verificar y Corregir

### 1. Verificar Estado del Servicio en Render

1. Ir a: https://dashboard.render.com/
2. Buscar el servicio `gestor` o `gestor-glwn`
3. Verificar el estado:
   - ✅ **Running**: El servicio está activo
   - ⚠️ **Building**: Está compilando
   - ❌ **Failed**: Falló el deploy
   - 💤 **Suspended**: Inactivo (plan free se suspende después de 15 min sin uso)

### 2. Configuración Correcta del Servicio

#### A. Settings Básicos

```yaml
Name: gestor
Environment: Node
Region: Oregon (o el más cercano)
Branch: development  # ⚠️ IMPORTANTE: Usar la rama development
```

#### B. Build & Deploy Settings

**Build Command**:
```bash
npm install && npm run build
```

**Start Command**:
```bash
npm start
```

**Root Directory**: (dejar vacío, está en la raíz del repo)

#### C. Plan

- **Free Plan**: El servicio se suspende después de 15 minutos de inactividad
  - Se reactiva automáticamente en la primera request (tarda ~30-60 segundos)
  - Límite de 750 horas/mes gratis

### 3. Variables de Entorno CRÍTICAS

⚠️ **MUY IMPORTANTE**: Configurar estas variables en Render Dashboard:

```env
NODE_ENV=production
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/gestor-tiendas?retryWrites=true&w=majority

# JWT
JWT_SECRET=tu-secret-super-seguro-produccion-cambiar-este-valor-por-algo-aleatorio
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=tu-refresh-secret-super-seguro-produccion-tambien-cambiar
JWT_REFRESH_EXPIRE=30d

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS (opcional, ya está en el código)
FRONTEND_URL=https://vrmajo.xyz

# Logging
LOG_LEVEL=info
```

### 4. Verificar Logs en Render

1. En el dashboard de Render, ir al servicio
2. Click en **Logs**
3. Buscar errores como:
   - `MongoServerError`: Error de conexión a MongoDB
   - `EADDRINUSE`: Puerto ya en uso (no debería pasar en Render)
   - `SyntaxError`: Error de sintaxis en el código
   - `Cannot find module`: Falta alguna dependencia

### 5. Verificar package.json

El archivo `package.json` debe tener estos scripts:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "nodemon --exec ts-node src/server.ts"
  }
}
```

### 6. Verificar tsconfig.json

El archivo `tsconfig.json` debe tener:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 7. Crear/Verificar archivo de inicio

Si el problema persiste, crear un archivo `server.js` en la raíz:

**Opción 1: Usar el compiled version** (Recomendado)
```javascript
// server.js
require('dotenv').config();
require('./dist/server.js');
```

**Opción 2: Usar ts-node en producción** (No recomendado pero funciona)
```javascript
// server.js
require('dotenv').config();
require('ts-node/register');
require('./src/server.ts');
```

Y actualizar el start command a:
```bash
node server.js
```

### 8. MongoDB Atlas Configuration

**CRÍTICO**: Verificar en MongoDB Atlas:

1. **Network Access** (Whitelist de IPs):
   - Opción recomendada: Agregar `0.0.0.0/0` (permitir desde cualquier IP)
   - O agregar las IPs específicas de Render

2. **Database Access** (Usuario):
   - Verificar que el usuario tenga permisos `readWrite` en la base de datos
   - Verificar que la contraseña NO tenga caracteres especiales sin encodear

3. **Connection String**:
   ```
   mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```
   - Reemplazar `<usuario>`, `<password>`, `<cluster>`, `<database>`
   - Si la password tiene caracteres especiales, encodearlos (ej: `@` = `%40`)

### 9. Healthcheck Endpoint

Nuestro backend tiene un endpoint de health check en `/health`:

```bash
GET https://gestor-glwn.onrender.com/health
```

Debería devolver:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2025-XX-XX..."
}
```

Puedes configurar Render para que haga healthcheck automático:
1. En Render Dashboard → Settings
2. **Health Check Path**: `/health`

### 10. Troubleshooting Común

#### Error: "Application failed to respond"
- El servicio tarda en iniciar (especialmente en plan free al reactivarse)
- Esperar 1-2 minutos y reintentar

#### Error: "Build failed"
- Ver logs de build en Render
- Verificar que todas las dependencias estén en `package.json`
- Verificar que TypeScript compile sin errores localmente

#### Error: MongoDB Connection
- Verificar MONGODB_URI en variables de entorno
- Verificar whitelist de IPs en MongoDB Atlas
- Verificar credenciales del usuario

#### Error: CORS
- Verificar que `https://vrmajo.xyz` esté en `allowedOrigins` (ya lo arreglamos)
- Verificar que Vercel esté usando el dominio correcto

### 11. Pasos de Deploy Manual

Si el auto-deploy no funciona:

1. **En GitHub**:
   ```bash
   cd c:\Users\crsti\proyectos\gestor
   git checkout development
   git pull origin development
   ```

2. **En Render Dashboard**:
   - Ir al servicio
   - Click en **Manual Deploy** → **Deploy latest commit**
   - Esperar a que termine el build (~2-5 minutos)

3. **Verificar Logs**:
   - Ver que no haya errores
   - Buscar el mensaje: `Servidor corriendo en modo production en el puerto 5000`

4. **Test**:
   ```bash
   curl https://gestor-glwn.onrender.com/health
   ```

### 12. Configuración de Auto-Deploy

En Render Dashboard:
1. Settings → Build & Deploy
2. **Auto-Deploy**: Yes
3. **Branch**: development
4. Guardar

Ahora cada push a la rama `development` hará un deploy automático.

## 🆘 Si Nada Funciona

### Opción A: Recrear el Servicio

1. Eliminar el servicio actual en Render
2. Crear nuevo servicio:
   - New → Web Service
   - Connect GitHub repository: `crisveg24/gestor`
   - Name: `gestor-backend` (o el que prefieras)
   - Branch: `development`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Agregar todas las variables de entorno
   - Create Web Service

### Opción B: Usar Dockerfile

Crear un `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build TypeScript
RUN npm run build

# Exponer puerto
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]
```

Y en Render:
- Seleccionar "Docker" como Environment
- Render detectará el Dockerfile automáticamente

## 📊 Checklist Final

Antes de que todo funcione, verificar:

- [ ] Servicio en Render está en estado "Running"
- [ ] Variables de entorno configuradas correctamente
- [ ] MongoDB Atlas whitelist configurada
- [ ] Build exitoso (sin errores en logs)
- [ ] Endpoint `/health` responde correctamente
- [ ] Endpoint `/` muestra info del API
- [ ] CORS incluye `https://vrmajo.xyz`
- [ ] Frontend en Vercel tiene `VITE_API_URL` correcto
- [ ] SSL/HTTPS funcionando

## 🎯 Próximos Pasos

Una vez que el backend esté funcionando:

1. Verificar login desde el frontend
2. Revisar cookies en el navegador (F12 → Application → Cookies)
3. Verificar requests en Network tab
4. Si hay errores de CORS, revisar logs de Render

---

**Última actualización**: 2025-01-10
**Versión del Backend**: 1.1.5
**Commit**: a6974d0
