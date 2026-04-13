# Tolima Preciso — Plataforma Catastral

## Estructura del proyecto

```
tolima-preciso/
├── public/
│   ├── index.html          ← HTML principal (sin JS ni CSS inline)
│   ├── css/
│   │   └── styles.css      ← Todo el CSS separado
│   └── js/
│       └── main.js         ← Todo el JavaScript separado
├── server/
│   └── index.js            ← Backend Node.js (Express + SQLite + MP)
├── .env.example            ← Variables de entorno de ejemplo
├── package.json
└── README.md
```

## Instalación

### 1. Clonar y entrar al directorio
```bash
cd tolima-preciso
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tu token de Mercado Pago
```

### 4. Obtener token de Mercado Pago
1. Ingresa a https://www.mercadopago.com.co/developers/panel
2. Crea una aplicación
3. Copia el **Access Token de prueba** (empieza con `TEST-`)
4. Pégalo en `.env` como `MP_ACCESS_TOKEN`

### 5. Iniciar el servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El sitio estará disponible en http://localhost:3000

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/clientes` | Registra consulta gratuita |
| `GET`  | `/api/clientes` | Lista todos los clientes ⚠️ |
| `POST` | `/api/pagos/crear-preferencia` | Crea preferencia de Mercado Pago |
| `POST` | `/api/pagos/webhook` | Recibe notificaciones IPN de MP |
| `GET`  | `/api/pagos` | Lista todos los pagos ⚠️ |

⚠️ **Importante:** Proteger los endpoints GET con autenticación antes de desplegar en producción.

---

## Base de datos

El archivo SQLite se genera automáticamente en `server/tolima_preciso.db`.

**Tabla `clientes`:** nombre, teléfono, email, predial, municipio, fecha  
**Tabla `pagos`:** datos del cliente, plan, monto, IDs de Mercado Pago, estado (pendiente/aprobado/rechazado)

---

## Flujo de pago

1. Usuario hace clic en **"Contratar"** en cualquier plan
2. Se abre el modal de pago con los datos del servicio
3. El usuario completa sus datos y hace clic en **"Pagar con Mercado Pago"**
4. El servidor crea el pago en la BD (estado: `pendiente`) y genera una preferencia en MP
5. El usuario es redirigido al checkout de Mercado Pago
6. Al completar el pago, Mercado Pago redirige de vuelta al sitio (`back_url`)
7. El webhook `/api/pagos/webhook` actualiza el estado en la BD automáticamente

---

## Despliegue en producción

1. Cambiar `MP_ACCESS_TOKEN` al token de **producción** (empieza con `APP_USR-`)
2. Actualizar `BASE_URL` a la URL pública del servidor
3. Configurar el webhook de Mercado Pago apuntando a `https://tudominio.co/api/pagos/webhook`
4. Usar un reverse proxy (nginx) para servir el puerto 3000
