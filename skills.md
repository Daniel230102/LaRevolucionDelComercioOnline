# 🛒 La Revolución del Comercio Online - Documentación de Skills

## 📋 Descripción General del Proyecto

**La Revolución del Comercio Online** es una aplicación web de comercio electrónico (e-commerce) multi-rol desarrollada con **Node.js**, **Express.js**, **MongoDB** y **EJS** como motor de plantillas. La plataforma permite la gestión completa de tiendas online con un sistema de roles diferenciados para propietarios, gerentes y clientes.

### 🏗️ Stack Tecnológico

- **Backend**: Node.js + Express.js
- **Base de Datos**: MongoDB + Mongoose
- **Motor de Plantillas**: EJS
- **Autenticación**: express-session (sesiones server-side)
- **Pagos**: Stripe API
- **Upload de Archivos**: Multer
- **Procesamiento CSV**: csv-parser
- **Estilos**: Tailwind CSS + Bootstrap
- **Seguridad**: bcrypt (encriptación de contraseñas)

---

## 👥 Roles de Usuario y Sus Capacidades

### 1. 🔑 PROPIETARIO (Owner)

**Descripción**: Rol con máxima autoridad administrativa en la plataforma.

#### Skills/Capacidades:

| Skill | Descripción | Endpoint |
|-------|-------------|----------|
| **Gestión de Tiendas** | Crear, modificar y eliminar tiendas con imágenes | `/propietario`, `/agregar-tienda`, `/modificar-tienda`, `/eliminar-tienda/:id` |
| **Gestión de Usuarios** | Visualizar todos los usuarios del sistema y eliminarlos | `/propietario/gestion-usuarios` |
| **Administración de Roles** | Asignar y modificar roles de usuarios (cliente, gerente, propietario) | `/propietario/actualizar-rol` |
| **Subida de Imágenes** | Cargar imágenes para las tiendas mediante Multer | Middleware Multer configurado |

**Modelos Utilizados**:
- `Usuario` (gestión de usuarios y roles)
- `Tienda` (gestión de tiendas con imágenes)

---

### 2. 👔 GERENTE (Manager)

**Descripción**: Rol encargado de la gestión operativa de tiendas, productos, trabajadores y horarios.

#### Skills/Capacidades:

| Skill | Descripción | Endpoint |
|-------|-------------|----------|
| **Visualización de Tiendas** | Ver listado de todas las tiendas y vista detallada por tienda | `/gerente`, `/gerente/tienda/:id` |
| **Gestión de Productos** | Crear, modificar y eliminar productos con imágenes | `/gerente/gestion-productos`, `/agregar-producto`, `/modificar-producto`, `/eliminar-producto/:id` |
| **Gestión de Stock** | Añadir stock a productos, ver alertas de stock bajo (<5 unidades) | `/gerente/gestion-stock`, POST `/gerente/gestion-stock` |
| **Importación de Trabajadores** | Subir archivo CSV para importar trabajadores masivamente | POST `/gerente/subir-trabajadores` |
| **Gestión de Horarios** | Crear y visualizar planificaciones semanales de trabajadores | `/gerente/gestion-horarios`, `/agregar-horario` |
| **Alertas de Stock** | Dashboard con stocks bajos para monitoreo | Query `{ cantidad: { $lt: 5 } }` |

**Modelos Utilizados**:
- `Tienda` (información de tiendas)
- `Producto` (catálogo de productos)
- `Stock` (control de inventario)
- `Trabajador` (datos de empleados)
- `Planificacion` (horarios semanales)

**Características Especiales**:
- Upload de imágenes de productos (Multer)
- Procesamiento de archivos CSV (csv-parser)
- Planificación semanal con rango horario (08:00 - 17:00)
- Stock inicial automático de 20 unidades al crear productos

---

### 3. 🛍️ CLIENTE (Customer)

**Descripción**: Rol de usuario final que realiza compras en la plataforma.

#### Skills/Capacidades:

| Skill | Descripción | Endpoint |
|-------|-------------|----------|
| **Exploración de Tiendas** | Navegar por el catálogo de tiendas disponibles | `/cliente` |
| **Visualización de Productos** | Ver productos de una tienda específica | `/cliente/tienda/:id` |
| **Carrito de Compras** | Agregar, eliminar y visualizar productos del carrito | `/cliente/carrito/agregar`, `/cliente/carrito/eliminar` |
| **Control de Stock** | Validación automática de stock antes de agregar al carrito | Comprobación en tiempo real |
| **Pago con Stripe** | Checkout seguro mediante Stripe Checkout | POST `/cliente/pago` |
| **Confirmación de Pago** | Descuento automático de stock y vaciado de carrito | `/cliente/pago-exitoso` |

**Modelos Utilizados**:
- `Tienda` (listado de tiendas)
- `Producto` (catálogo de productos)
- `Stock` (validación de disponibilidad)

**Características Especiales**:
- Carrito persistente en sesión
- Validación de stock antes de agregar productos
- Integración con Stripe para pagos seguros
- Descuento automático de stock tras pago exitoso
- Mensaje de confirmación post-compra (`?gracias=1`)

---

## 🔐 Sistema de Autenticación y Autorización

### Skills de Autenticación:

| Skill | Descripción |
|-------|-------------|
| **Registro Multi-Rol** | Registro con selección de rol (cliente, gerente, propietario) |
| **Validación de Código** | Código de seguridad hardcodeado ("1") para roles especiales |
| **Encriptación de Contraseñas** | bcrypt con salt rounds de 10 |
| **Login con Selección de Rol** | Si un usuario tiene múltiples roles, muestra modal de selección |
| **Middleware de Autenticación** | Redirección automática según rol del usuario |
| **Gestión de Sesiones** | express-session con secret configurable |

### Flujo de Autenticación:

1. Usuario ingresa email y contraseña
2. Sistema valida credenciales con `compararContraseña()`
3. Si tiene un rol → redirección directa
4. Si tiene múltiples roles → modal de selección
5. Middleware `authMiddleware` protege rutas según rol

---

## 📊 Modelos de Base de Datos (MongoDB + Mongoose)

### 1. **Usuario**
```javascript
{
  email: String (único, requerido),
  contraseña: String (encriptada con bcrypt),
  rol: String ('cliente' | 'gerente' | 'propietario')
}
```

### 2. **Tienda**
```javascript
{
  nombre: String (requerido),
  imagen: String (ruta del archivo),
  propietario: ObjectId → Usuario
}
```

### 3. **Producto**
```javascript
{
  nombre: String (requerido),
  precio: Number (requerido),
  imagen: String (requerido),
  descripcion: String,
  tiendaId: ObjectId → Tienda (requerido)
}
```

### 4. **Stock**
```javascript
{
  tienda: ObjectId → Tienda (requerido),
  producto: ObjectId → Producto (requerido),
  cantidad: Number (default: 20)
}
```

### 5. **Trabajador**
```javascript
{
  nombre: String (requerido),
  apellidos: String (requerido),
  tiendaId: ObjectId → Tienda
}
```

### 6. **Planificacion**
```javascript
{
  trabajador: ObjectId → Trabajador (requerido),
  tienda: ObjectId → Tienda (requerido),
  fecha: Date (requerido),
  dia: String (requerido),
  horaEntrada: String (requerido),
  horaSalida: String (requerido),
  semana: Number (1-5)
}
```

### 7. **Horario**
```javascript
{
  empleado: ObjectId → Usuario,
  fecha: Date (requerido),
  horaInicio: String (requerido),
  horaFin: String (requerido)
}
```

---

## 💳 Integración con Stripe

### Configuración:
- **Modo**: Test (sk_test_...)
- **Funcionalidad**: Stripe Checkout Sessions
- **Flujo**:
  1. Cliente llena carrito
  2. Validación de stock previa al pago
  3. Creación de sesión de Stripe con `line_items`
  4. Redirección a Stripe Checkout
  5. URL de éxito → descuento de stock + vaciado de carrito
  6. URL de cancelación → retorno al carrito

### Metadata Adicional:
- Dirección de envío capturada en `metadata.direccion`

---

## 📁 Estructura de Archivos

```
LaRevolucionDelComercioOnline/
├── app.js                      # Configuración principal de Express
├── database.js                 # Conexión a MongoDB
├── keys.js                     # Configuración de URI de MongoDB
├── package.json                # Dependencias del proyecto
│
├── models/                     # Modelos Mongoose
│   ├── usuario.js
│   ├── tienda.js
│   ├── producto.js
│   ├── stock.js
│   ├── trabajador.js
│   ├── planificacion.js
│   └── horario.js
│
├── routes/                     # Rutas Express por rol
│   ├── controlUsuario.js       # Login, registro, logout
│   ├── propietario.js          # Rutas de propietario
│   ├── gerente.js              # Rutas de gerente
│   └── cliente.js              # Rutas de cliente
│
├── views/                      # Plantillas EJS
│   ├── autenticacion.ejs       # Login
│   ├── registro.ejs            # Registro
│   ├── propietario.ejs         # Dashboard propietario
│   ├── gerente.ejs             # Dashboard gerente
│   ├── cliente.ejs             # Dashboard cliente
│   ├── tienda.ejs              # Vista de productos por tienda
│   ├── carrito.ejs             # Carrito de compras
│   ├── error.ejs               # Página de error
│   └── partials/               # Componentes reutilizables
│
├── public/                     # Archivos estáticos
│   └── uploads/                # Imágenes subidas (tiendas, productos)
│
├── files/
│   └── trabajadores/           # CSVs de trabajadores subidos
│
└── bin/
    └── www                     # Entry point del servidor
```

---

## 🚀 Cómo Ejecutar el Proyecto

```bash
# Instalar dependencias
npm install

# Iniciar servidor (puerto por defecto configurado en bin/www)
npm start

# Acceder a la aplicación
http://localhost:3000
```

**Requisitos**:
- Node.js instalado
- MongoDB corriendo en `mongodb://localhost:27017`

---

## 🔒 Medidas de Seguridad

| Medida | Descripción |
|--------|-------------|
| **Encriptación** | Contraseñas hasheadas con bcrypt (10 salt rounds) |
| **Sesiones Server-Side** | express-session para evitar manipulación cliente |
| **Middleware de Autenticación** | Verificación de rol en cada ruta protegida |
| **Validación de Stock** | Prevención de compras sin stock suficiente |
| **Código de Acceso** | Validación con código "1" para roles especiales |

---

## 🎯 Funcionalidades Destacadas

1. ✅ **Sistema multi-rol con redirección automática**
2. ✅ **Carrito de compras persistente en sesión**
3. ✅ **Integración completa con Stripe Checkout**
4. ✅ **Gestión de stock con alertas automáticas**
5. ✅ **Importación masiva de trabajadores vía CSV**
6. ✅ **Planificación semanal de horarios**
7. ✅ **Upload de imágenes para tiendas y productos**
8. ✅ **Validación de stock en tiempo real**
9. ✅ **Descuento automático de stock post-pago**
10. ✅ **Middleware de protección por rol**

---

## 📝 Notas de Desarrollo

- **Código Hardcodeado**: El código de acceso para roles especiales es `"1"`
- **Stock Inicial**: Los productos nuevos se crean con 20 unidades por defecto
- **Horarios**: Rango permitido de 08:00 a 17:00
- **Sesión de Stripe**: Usa clave de prueba (`sk_test_...`)
- **Archivo CSV**: Separador por comas, requiere columnas `nombre` y `apellidos`

---

## 🛠️ Tecnologías Clave

| Categoría | Tecnología |
|-----------|-----------|
| **Runtime** | Node.js |
| **Framework Web** | Express.js 4.16 |
| **Base de Datos** | MongoDB + Mongoose 8.10 |
| **Motor de Plantillas** | EJS 3.1 |
| **Autenticación** | bcrypt 5.1, express-session 1.18 |
| **Pagos** | Stripe 18.1 |
| **Upload** | Multer 1.4.5 |
| **CSV** | csv-parser 3.2 |
| **Logging** | Morgan 1.9 |
| **Frontend** | Tailwind CSS 2.2, Bootstrap 4.6 |

---

*Documento generado el 14 de abril de 2026*