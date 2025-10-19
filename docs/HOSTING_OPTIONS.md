# Opciones de Hosting GRATIS para el Backend

## Opción 1: Render.com (RECOMENDADO - 100% GRATIS)

### ✅ Ventajas:
- **100% Gratis** para siempre
- Deploy automático desde GitHub
- 750 horas/mes gratis (suficiente para 24/7)
- HTTPS automático
- Variables de entorno
- Logs en tiempo real

### 📋 Pasos:

1. **Crear cuenta en Render:**
   - Ve a: https://render.com/
   - Registrate con tu cuenta de GitHub

2. **Crear Web Service:**
   - Click en **"New +"** > **"Web Service"**
   - Conecta tu repositorio: `crisveg24/gestor`
   - Configuración:
     ```
     Name: gestor-tiendas-api
     Branch: development
     Root Directory: (dejar vacío)
     Runtime: Node
     Build Command: npm install && npm run build
     Start Command: npm start
     Instance Type: Free
     ```

3. **Configurar Variables de Entorno:**
   En la sección "Environment":
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://... (tu connection string de Atlas)
   JWT_SECRET=un-secret-super-seguro-cambiar-en-produccion-abc123xyz
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=otro-refresh-secret-super-seguro-xyz789abc
   JWT_REFRESH_EXPIRE=30d
   BCRYPT_ROUNDS=12
   MAX_LOGIN_ATTEMPTS=5
   LOCK_TIME=15
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   FRONTEND_URL=https://tu-frontend.com
   LOG_LEVEL=info
   ```

4. **Deploy:**
   - Click en **"Create Web Service"**
   - Espera ~5 minutos
   - Tu API estará en: `https://gestor-tiendas-api.onrender.com`

### ⚠️ Limitaciones del Free Tier:
- El servidor **se duerme después de 15 minutos de inactividad**
- La primera petición después de dormir tarda ~30 segundos (cold start)
- 750 horas/mes (suficiente si no tienes muchos usuarios)

---

## Opción 2: Railway.app (500 horas gratis/mes)

### ✅ Ventajas:
- $5 de crédito gratis cada mes
- No se duerme (mejor que Render para producción)
- Deploy desde GitHub
- Base de datos PostgreSQL gratis incluida

### 📋 Pasos:

1. Ve a: https://railway.app/
2. Login con GitHub
3. **New Project** > **Deploy from GitHub repo**
4. Selecciona `gestor`
5. Configura variables de entorno (igual que Render)
6. Deploy automático

---

## Opción 3: Fly.io (GRATIS con límites)

### ✅ Ventajas:
- 3 VMs pequeñas gratis
- 160GB de transferencia gratis/mes
- Múltiples regiones (baja latencia global)

### 📋 Pasos:

1. Instalar Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Crear archivo `fly.toml` en tu proyecto:
   ```toml
   app = "gestor-tiendas"
   
   [build]
     builder = "heroku/buildpacks:20"
   
   [[services]]
     internal_port = 5000
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = 80
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

4. Deploy:
   ```bash
   fly launch
   fly secrets set MONGODB_URI="tu-connection-string"
   fly secrets set JWT_SECRET="tu-secret"
   fly deploy
   ```

---

## Opción 4: Vercel (Solo para Serverless Functions)

⚠️ **Limitación:** Vercel es mejor para frontend y funciones serverless, NO para servidores Express tradicionales.

Si quieres usar Vercel, necesitarías **refactorizar** tu backend a Serverless Functions.

---

## 🏆 RECOMENDACIÓN FINAL

Para tu caso (MVP, sin dinero, 4 tiendas):

### **Combinación Ganadora (100% GRATIS):**

1. **Base de Datos:** MongoDB Atlas (512MB gratis)
2. **Backend API:** Render.com (750 hrs/mes gratis)
3. **Frontend:** Vercel o Netlify (gratis, ilimitado)
4. **Dominio:** Freenom (.tk, .ml gratis) o Namecheap ($0.88/año)

### **Si tienes $3 USD:**

1. **Base de Datos:** MongoDB Atlas (gratis)
2. **Backend API:** Railway.app ($5 crédito/mes - NO se duerme)
3. **Frontend:** Vercel (gratis)
4. **Dominio:** Namecheap ($0.88/año .xyz o .tech)

---

## 📝 Archivo a crear antes de Deploy

Necesitas crear un script de inicio para producción:
