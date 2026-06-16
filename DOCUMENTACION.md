# Cotizador Servicios UDAT — Documentación del Proyecto

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Autor:** Brandon Rodriguez

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Base de Datos](#4-base-de-datos)
5. [Backend — API REST](#5-backend--api-rest)
6. [Frontend — Interfaz de Usuario](#6-frontend--interfaz-de-usuario)
7. [Autenticación y Roles](#7-autenticación-y-roles)
8. [Flujos Principales](#8-flujos-principales)
9. [Lógica de Cálculos](#9-lógica-de-cálculos)
10. [Configuración y Variables de Entorno](#10-configuración-y-variables-de-entorno)
11. [Instalación y Ejecución](#11-instalación-y-ejecución)
12. [Dependencias](#12-dependencias)

---

## 1. Descripción General

**Cotizador Servicios UDAT** es una aplicación web empresarial para la gestión de cotizaciones de servicios de capacitación y administración de órdenes de compra. Está diseñada para el equipo interno de UDAT y permite:

- Crear y gestionar cotizaciones de cursos/capacitaciones con cálculo automático de costos y márgenes
- Administrar un flujo de aprobación de dos niveles para órdenes de compra
- Gestionar catálogos de clientes, cursos, coaches, proveedores y más
- Visualizar KPIs y estadísticas en un dashboard
- Administrar usuarios con distintos roles y permisos

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express.js |
| Base de Datos | SQL Server (Azure) |
| Autenticación | JWT (JSON Web Tokens) |
| Estilos | Tailwind CSS 4 + CSS personalizado |

---

## 2. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────┐
│                   Cliente (Navegador)                 │
│              React 19 + Vite (puerto 5173)            │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP / REST
                         ▼
┌──────────────────────────────────────────────────────┐
│              Backend API (puerto 4000)                │
│              Node.js + Express.js                     │
│                                                      │
│  /api/auth          /api/cotizaciones                │
│  /api/catalogos     /api/ordenescompra               │
│  /api/usuarios                                       │
└────────────────────────┬─────────────────────────────┘
                         │ mssql
                         ▼
┌──────────────────────────────────────────────────────┐
│     SQL Server en Azure (biUDAT)                     │
│     udatserver.southcentralus.cloudapp.azure.com     │
└──────────────────────────────────────────────────────┘
```

La comunicación frontend→backend se realiza mediante peticiones HTTP/REST. El frontend usa `api.js` como cliente centralizado que adjunta automáticamente el token JWT en cada petición.

---

## 3. Estructura de Carpetas

```
CotizadorServiciosUDAT/
│
├── cotizador-web/                  # Frontend React
│   ├── src/
│   │   ├── App.jsx                 # Componente raíz: estado global, navegación, layout
│   │   ├── main.jsx                # Punto de entrada de React
│   │   ├── api.js                  # Cliente HTTP centralizado (adjunta JWT)
│   │   ├── catalogConfig.js        # Definición de catálogos (campos, etiquetas)
│   │   ├── App.css                 # Variables CSS, sidebar, componentes globales
│   │   ├── index.css               # Reset y estilos base
│   │   │
│   │   ├── Login.jsx               # Pantalla de login y recuperación de contraseña
│   │   ├── Dashboard.jsx           # KPIs, gráficos y estadísticas
│   │   ├── NuevaCotizacion.jsx     # Formulario de cotizaciones
│   │   ├── OrdenesCompra.jsx       # Gestión de órdenes de compra
│   │   ├── Usuarios.jsx            # Administración de usuarios (solo admin)
│   │   │
│   │   ├── CatalogFormModal.jsx        # Modal genérico para catálogos
│   │   ├── ChangePasswordModal.jsx     # Modal de cambio de contraseña
│   │   └── CotizacionDetallesModal.jsx # Modal de detalles de cotización
│   │
│   ├── public/                     # Archivos estáticos
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── server/                         # Backend Node.js
│   ├── index.js                    # Punto de entrada principal
│   ├── server.js                   # Configuración Express y registro de rutas
│   ├── db.js                       # Pool de conexión a SQL Server
│   │
│   ├── middleware/
│   │   └── autenticar.js           # Middleware JWT (autenticar, soloAdmin)
│   │
│   ├── routes/
│   │   ├── auth.js                 # Login, cambio y recuperación de contraseña
│   │   ├── catalogos.js            # CRUD de catálogos
│   │   ├── cotizaciones.js         # Cotizaciones y aprobaciones
│   │   ├── ordenescompra.js        # Órdenes de compra, facturas, evaluaciones
│   │   └── usuarios.js             # Gestión de usuarios (admin)
│   │
│   ├── scripts/
│   │   ├── seed-catalogos.js       # Poblar BD con datos iniciales
│   │   └── migrate-tipocosto.js    # Migración de columna TipoCosto
│   │
│   ├── package.json
│   └── .env                        # Credenciales (no commitear)
│
├── database/
│   └── CotizadorSchema.sql         # Schema completo de la base de datos
│
└── DOCUMENTACION.md
```

---

## 4. Base de Datos

**Servidor:** `udatserver.southcentralus.cloudapp.azure.com:1433`  
**Base de datos:** `biUDAT`

### 4.1 Tablas de Autenticación

#### `Usuarios`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| UsuarioId | INT (PK) | Identificador único |
| Correo | NVARCHAR | Email del usuario (único) |
| PasswordHash | NVARCHAR | Hash bcrypt de la contraseña |
| Nombre | NVARCHAR | Nombre completo |
| Rol | NVARCHAR | `admin`, `autorizador1`, `autorizador2`, `empleado` |
| DebeReiniciarPass | BIT | 1 = debe cambiar contraseña en próximo login |
| Activo | BIT | 0 = usuario desactivado |
| FechaCreacion | DATETIME | Fecha de alta |
| UltimoAcceso | DATETIME | Último login exitoso |

#### `TokensRecuperacion`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| TokenId | INT (PK) | Identificador |
| UsuarioId | INT (FK) | Referencia a Usuarios |
| Token | NVARCHAR | Código de 6 caracteres |
| Expiracion | DATETIME | Expira 24h después de creación |
| Usado | BIT | 1 = token ya utilizado |

---

### 4.2 Tablas de Catálogos

| Tabla | Campos principales |
|-------|-------------------|
| `Clientes` / `Empresas` | Id, Nombre, RFC, Contacto, Activo |
| `Cursos` | Id, Nombre, Descripcion, Activo |
| `Coaches` | Id, Nombre, Especialidad, Activo |
| `Modalidades` | Id, Nombre (Presencial, Virtual, Híbrido) |
| `ConceptosCosto` | Id, Nombre, TipoCosto, Formula, Activo |
| `Proveedores` | Id, Nombre, RFC, Contacto, Activo |
| `UnidadesNegocio` | Id, Nombre, Activo |
| `EstadosCotizacion` | Id, Nombre (Borrador, Aprobada, Rechazada) |

> Los catálogos soportan **soft delete** (campo `Activo`). El hard delete se activa con `?hard=1`.

---

### 4.3 Tablas de Cotizaciones

#### `AppCotizaciones`
| Columna | Descripción |
|---------|-------------|
| CotizacionId | PK |
| Folio | `COT-YYYY-XXXXXX` generado automáticamente |
| ClienteId | FK a Clientes |
| CursoId | FK a Cursos |
| CoachId | FK a Coaches |
| ModalidadId | FK a Modalidades |
| UnidadNegocioId | FK a UnidadesNegocio |
| DuracionDias | Número de días |
| SesionesPorDia | Sesiones diarias |
| ParticipantesCantidad | Número de participantes |
| FechaInicio / FechaFin | Rango de fechas |
| Observaciones | Texto libre |
| TotalCostos | Calculado |
| Ganancia | Monto de margen |
| TotalConGanancia | TotalCostos + Ganancia |
| PrecioPorParticipante | TotalConGanancia / Participantes |
| EstadoId | FK a EstadosCotizacion |
| Creador | Nombre del usuario creador |
| FechaCreacion | Timestamp |

#### `AppCotizacionCostos`
| Columna | Descripción |
|---------|-------------|
| CotizacionCostoId | PK |
| CotizacionId | FK a AppCotizaciones |
| Concepto | Nombre del concepto |
| TipoCosto | `Directo` o `Indirecto` |
| CostoUnitario | Precio por unidad |
| Cantidad | Resultado de evaluar la fórmula |
| Total | CostoUnitario × Cantidad |

#### `AppCotizacionParticipantes`
| Columna | Descripción |
|---------|-------------|
| CotizacionParticipanteId | PK |
| CotizacionId | FK |
| EmpleadoId | ID del empleado |
| NombreCompleto | Nombre |
| Empresa | Empresa a la que pertenece |

> Los participantes se buscan en tiempo real en la tabla externa `[biUDAT].[STG].[tPlantillaColaboradoresTrayecto]`.

---

### 4.4 Tablas de Órdenes de Compra

#### `OrdenesCompra`
| Columna | Descripción |
|---------|-------------|
| OrdenCompraId | PK |
| Folio | `OC-YYYY-XXXXXX` generado automáticamente |
| UnidadNegocioId | FK a UnidadesNegocio |
| ProveedorId | FK a Proveedores |
| Fecha | Fecha de emisión |
| Observaciones | Texto libre |
| Subtotal | Suma de líneas |
| IVA | Subtotal × 16% |
| Total | Subtotal + IVA |
| Creador | Nombre del usuario |
| Aprobaciones | JSON con historial de aprobaciones |
| Rechazo | JSON con info de rechazo |

#### `OrdenesCompraLineas`
| Columna | Descripción |
|---------|-------------|
| OrdenCompraLineaId | PK |
| OrdenCompraId | FK |
| Descripcion | Descripción del concepto |
| Cantidad | Cantidad |
| PrecioUnitario | Precio unitario |
| Total | Cantidad × PrecioUnitario |

---

## 5. Backend — API REST

El servidor Express corre en el **puerto 4000** y expone los siguientes grupos de endpoints. Todos requieren autenticación JWT excepto los de `/api/auth`.

### 5.1 Autenticación — `/api/auth`

| Método | Ruta | Descripción | Body |
|--------|------|-------------|------|
| POST | `/login` | Inicia sesión, retorna token JWT | `{ correo, password }` |
| POST | `/cambiar-password` | Cambia contraseña (requiere token) | `{ passwordActual, passwordNuevo }` |
| POST | `/recuperar` | Genera código de recuperación de 6 chars | `{ correo }` |
| POST | `/restablecer` | Restablece contraseña con código | `{ correo, codigo, passwordNuevo }` |

**Respuesta de `/login`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "usuario": {
    "id": 1,
    "correo": "admin@udat.com",
    "nombre": "Administrador",
    "rol": "admin",
    "debeReiniciarPass": false
  }
}
```

---

### 5.2 Catálogos — `/api/catalogos`

Todos los catálogos siguen el mismo patrón CRUD:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:catalogo` | Lista todos los registros activos |
| POST | `/:catalogo` | Crea un nuevo registro |
| PUT | `/:catalogo/:id` | Actualiza un registro existente |
| DELETE | `/:catalogo/:id` | Soft delete (o hard con `?hard=1`) |

**Catálogos disponibles:** `clientes`, `cursos`, `coaches`, `modalidades`, `conceptos`, `estados`, `proveedores`, `unidadesnegocio`

**Endpoint especial:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/participantes?search=X` | Busca participantes por nombre en tabla STG |

---

### 5.3 Cotizaciones — `/api/cotizaciones`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Historial completo de cotizaciones | Autenticado |
| GET | `/:id` | Detalle de una cotización | Autenticado |
| GET | `/pendientes/list` | Cotizaciones pendientes de aprobación | Autorizadores |
| GET | `/generate/folio` | Genera el siguiente folio disponible | Autenticado |
| POST | `/` | Crea nueva cotización con costos y participantes | Autenticado |
| POST | `/:id/aprobar` | Aprueba o rechaza una cotización | Autorizadores |

**Body de creación:**
```json
{
  "folio": "COT-2026-000001",
  "clienteId": 1,
  "cursoId": 2,
  "coachId": 3,
  "modalidadId": 1,
  "unidadNegocioId": 1,
  "duracionDias": 5,
  "sesionesPorDia": 3,
  "participantesCantidad": 20,
  "fechaInicio": "2026-07-01",
  "fechaFin": "2026-07-05",
  "observaciones": "Capacitación presencial",
  "costos": [
    { "concepto": "Instructor", "tipoCosto": "Directo", "costoUnitario": 1000, "cantidad": 15, "total": 15000 }
  ],
  "participantes": [
    { "empleadoId": "EMP001", "nombreCompleto": "Juan Pérez", "empresa": "UDAT" }
  ],
  "margenDirecto": 23.5,
  "margenIndirecto": 0
}
```

---

### 5.4 Órdenes de Compra — `/api/ordenescompra`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista todas las órdenes |
| POST | `/` | Crea nueva orden de compra |
| PUT | `/:id` | Actualiza orden (aprobaciones, rechazo) |
| POST | `/:id/aprobar` | Registra aprobación de paso 1 o 2 |
| POST | `/:id/rechazar` | Rechaza la orden con motivo |
| GET | `/:id/pdf` | Descarga PDF de la orden |
| POST | `/:id/factura` | Guarda archivo de factura |
| GET | `/:id/factura/archivo` | Descarga la factura guardada |
| POST | `/:id/evaluacion` | Registra evaluación del proveedor |

---

### 5.5 Usuarios — `/api/usuarios` (Solo Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista todos los usuarios |
| POST | `/` | Crea nuevo usuario |
| PUT | `/:id` | Actualiza nombre, rol, estado activo |
| POST | `/:id/resetear` | Resetea contraseña y activa flag de reinicio |

---

## 6. Frontend — Interfaz de Usuario

### 6.1 Componentes Principales

#### `App.jsx` — Componente Raíz
Centraliza todo el estado de la aplicación:
- **Autenticación:** `token`, `usuario` (persistidos en `localStorage`)
- **Navegación:** `activeView` controla qué vista se muestra
- **Catálogos:** se cargan al iniciar sesión y se pasan como props
- **Lógica de roles:** determina qué secciones son accesibles

**Vistas disponibles:**
| Vista | Componente | Acceso |
|-------|-----------|--------|
| `dashboard` | Dashboard.jsx | admin, autorizador1, autorizador2 |
| `cotizacion` | NuevaCotizacion.jsx | Todos |
| `historial` | (en App.jsx) | Todos |
| `aprobaciones` | (en App.jsx) | autorizador1, autorizador2 |
| `ordenesCompra` | OrdenesCompra.jsx | Todos |
| `usuarios` | Usuarios.jsx | Solo admin |
| `catalogo_*` | CatalogFormModal.jsx | Solo admin |

---

#### `Login.jsx`
- Formulario de correo + contraseña
- Sección de **recuperación de contraseña** (solicitar código → ingresar código → nueva contraseña)
- Al iniciar sesión exitosamente, guarda `token` y `usuario` en `localStorage`

---

#### `Dashboard.jsx`
Requiere `rol` de admin o autorizador. Muestra:
- **KPI Cards:** número de cotizaciones, órdenes, pendientes
- **Gráfico de barras horizontal:** Cursos más cotizados
- **Gráfico de barras horizontal:** Coaches más activos
- **Gráfico de dona:** Distribución de participantes
- **Gráfico de dona:** Montos por unidad de negocio

---

#### `NuevaCotizacion.jsx`
Formulario multi-sección para crear cotizaciones:

1. **Datos generales:** Cliente, Curso, Coach, Modalidad, Unidad de Negocio
2. **Fechas y duración:** Fecha inicio/fin, días, sesiones/día, participantes
3. **Búsqueda de participantes:** Búsqueda en tiempo real + tabla de seleccionados
4. **Tabla de costos:**
   - Concepto, tipo (Directo/Indirecto), fórmula, costo unitario, cantidad calculada, total
   - Fórmulas disponibles: `Sesiones x Días`, `Participantes`, `Horas`, `Eventos`
5. **Resumen financiero:** Total costos, márgenes, precio por participante

---

#### `OrdenesCompra.jsx`
Gestión completa de órdenes de compra:
- Crear orden con folio autogenerado
- Seleccionar unidad de negocio y proveedor
- Agregar líneas (descripción, cantidad, precio unitario)
- Ver estado de aprobaciones
- Aprobar/rechazar según rol
- Descargar PDF
- Gestionar factura y evaluación de proveedor

---

#### `Usuarios.jsx` (Solo Admin)
- Tabla con todos los usuarios del sistema
- Crear usuario: correo, nombre, rol, contraseña inicial
- Editar: nombre, rol, activo/inactivo
- Resetear contraseña (marca `DebeReiniciarPass = 1`)

---

#### `CatalogFormModal.jsx`
Modal genérico que renderiza formularios dinámicamente según la configuración en `catalogConfig.js`. Soporta campos de tipo texto, número, select y área de texto.

---

### 6.2 Cliente HTTP — `api.js`

Wrapper sobre `fetch` que:
- Usa `VITE_API_BASE_URL` como base URL
- Adjunta automáticamente el header `Authorization: Bearer <token>`
- Expone métodos: `api.get()`, `api.post()`, `api.put()`, `api.delete()`

---

### 6.3 Estilos

**Variables CSS globales (`App.css`):**
```css
--primary:    #2563eb   /* Azul principal */
--bg:         #f5f7fb   /* Fondo general */
--surface:    #ffffff   /* Superficies/cards */
--text:       #404753   /* Texto principal */
--border:     #e2e8f0   /* Bordes */
```

**Sidebar:**
- Fondo: `#0f172a` (azul muy oscuro)
- Ancho fijo: 280px
- En móvil se oculta y se muestra con botón toggle (overlay)

**Clases de botón:**
- `.primary-button` — Acción principal (azul)
- `.secondary-button` — Acción secundaria
- `.ghost-button` — Sin relleno, solo borde

---

## 7. Autenticación y Roles

### 7.1 JWT

- **Secret:** `udat-cotizador-secret-2024`
- **Expiración:** 8 horas
- **Payload:** `{ id, correo, nombre, rol }`
- **Almacenamiento:** `localStorage` con claves `cotizador-token` y `cotizador-usuario`

### 7.2 Roles y Permisos

| Rol | Dashboard | Cotizaciones | Aprobaciones | Órdenes | Usuarios | Catálogos |
|-----|-----------|-------------|-------------|---------|---------|----------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `autorizador1` | ✅ | ✅ | ✅ (Paso 1) | ✅ | ❌ | ❌ |
| `autorizador2` | ✅ | ✅ | ✅ (Paso 2) | ✅ | ❌ | ❌ |
| `empleado` | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |

### 7.3 Credenciales Iniciales

| Campo | Valor |
|-------|-------|
| Correo | `admin@udat.com` |
| Contraseña | `Udat2024!` |
| Rol | `admin` |

> Los usuarios nuevos reciben `DebeReiniciarPass = 1` y deben cambiar su contraseña en el primer login.

### 7.4 Recuperación de Contraseña

1. Usuario solicita código en `/api/auth/recuperar` con su correo
2. Se genera un código alfanumérico de 6 caracteres (expira en 24h)
3. Usuario ingresa código + nueva contraseña en `/api/auth/restablecer`
4. El token queda marcado como `Usado = 1`

> En el entorno actual, el código se devuelve directamente en la respuesta de la API (no se envía por correo). Pendiente integración de envío de email.

---

## 8. Flujos Principales

### 8.1 Flujo de Autenticación

```
Usuario abre la app
        ↓
¿Tiene token en localStorage?
    NO → Pantalla Login
    SÍ → Validar token con servidor
            ↓
        ¿Token válido?
            NO → Pantalla Login (limpia localStorage)
            SÍ → ¿debeReiniciarPass?
                    SÍ → Modal ChangePassword (obligatorio)
                    NO → App principal según rol
```

---

### 8.2 Flujo de Cotización

```
1. Empleado crea cotización en NuevaCotizacion.jsx
   ├── Selecciona: Cliente, Curso, Coach, Modalidad, Unidad Negocio
   ├── Configura: Días, Sesiones, Participantes, Fechas
   ├── Agrega participantes (búsqueda en tabla STG)
   └── Define costos con fórmulas dinámicas

2. POST /api/cotizaciones
   └── Cotización guardada con Estado = "Borrador"

3. Autorizador ve la cotización en sección "Aprobaciones"
   ├── Aprobar → Estado = "Aprobada"
   └── Rechazar → Estado = "Rechazada" + comentarios

4. Cotización aprobada visible en Historial
```

---

### 8.3 Flujo de Orden de Compra

```
1. Usuario crea orden en OrdenesCompra.jsx
   ├── Folio autogenerado: OC-YYYY-XXXXXX
   ├── Selecciona Unidad de Negocio y Proveedor
   └── Agrega líneas (descripción, cantidad, precio)

2. POST /api/ordenescompra
   └── Orden en estado "Pendiente"

3. Autorizador1 (Administración) — Paso 1
   ├── Aprobar → pasa a Paso 2
   └── Rechazar → "Rechazada" + motivo

4. Autorizador2 (Secretaría Académica) — Paso 2
   ├── Aprobar → "Aprobada" ✓
   └── Rechazar → "Rechazada" + motivo

5. Orden aprobada:
   ├── Descarga de PDF disponible
   ├── Carga de factura
   └── Evaluación de proveedor
```

---

## 9. Lógica de Cálculos

### 9.1 Fórmulas de Cantidad en Costos

Las fórmulas se evalúan dinámicamente con los valores de la cotización:

| Fórmula | Cálculo | Ejemplo (3 sesiones, 5 días, 20 participantes) |
|---------|---------|-----------------------------------------------|
| `Sesiones x Días` | sesiones × días | 3 × 5 = **15** |
| `Participantes` | participantes | **20** |
| `Horas` | días × sesiones | 5 × 3 = **15** |
| `Eventos` | 1 | **1** |

```
Total Costo = Cantidad × Costo Unitario
```

---

### 9.2 Márgenes y Precios

```
Total Costos Directos   = Σ costos donde TipoCosto = "Directo"
Total Costos Indirectos = Σ costos donde TipoCosto = "Indirecto"
Total Costos            = Directos + Indirectos

Margen Utilidad   = Total Costos × (margenDirecto% / 100)
Total con Ganancia = Total Costos + Margen Utilidad

Precio por Participante = Total con Ganancia / ParticipantesCantidad
```

**Valores por defecto de márgenes:**
- Costos Directos: **23.5%**
- Costos Indirectos: **0%**

---

### 9.3 Cálculo de Órdenes de Compra

```
Subtotal = Σ (Cantidad × PrecioUnitario) por cada línea
IVA      = Subtotal × 16%
Total    = Subtotal + IVA
```

---

## 10. Configuración y Variables de Entorno

### Frontend — `cotizador-web/.env`
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Para producción, cambiar a la URL del servidor desplegado.

### Backend — `server/.env`
```env
# Conexión SQL Server
DB_SERVER=udatserver.southcentralus.cloudapp.azure.com
DB_PORT=1433
DB_NAME=biUDAT
DB_USER=BiBandonRodriguez
DB_PASSWORD=BiRodriguez2024#$.#
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Servidor
PORT=4000

# JWT
JWT_SECRET=udat-cotizador-secret-2024
JWT_EXPIRES_IN=8h
```

> **Importante:** El archivo `.env` nunca debe subirse al repositorio.

---

## 11. Instalación y Ejecución

### Requisitos previos
- Node.js 18+
- Acceso a la base de datos SQL Server de Azure

### 1. Instalar dependencias

```bash
# Backend
cd server
npm install

# Frontend
cd cotizador-web
npm install
```

### 2. Configurar variables de entorno

```bash
# Backend
cp server/.env.example server/.env
# Editar server/.env con las credenciales correctas

# Frontend
cp cotizador-web/.env.example cotizador-web/.env
# Editar cotizador-web/.env con la URL de la API
```

### 3. Inicializar base de datos (primera vez)

```bash
# Ejecutar el schema en SQL Server
# Usar SSMS o sqlcmd con el archivo database/CotizadorSchema.sql

# Poblar catálogos iniciales
cd server
node scripts/seed-catalogos.js
```

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 — Backend
cd server
npm run dev    # Inicia con nodemon en puerto 4000

# Terminal 2 — Frontend
cd cotizador-web
npm run dev    # Inicia Vite en puerto 5173
```

### 5. Build de producción

```bash
cd cotizador-web
npm run build
# Los archivos compilados quedan en cotizador-web/dist/
```

---

## 12. Dependencias

### Backend (`server/package.json`)

| Paquete | Versión | Uso |
|---------|---------|-----|
| `express` | ^4.18.2 | Framework HTTP |
| `mssql` | ^12.5.4 | Cliente SQL Server |
| `bcryptjs` | ^3.0.3 | Hash de contraseñas |
| `jsonwebtoken` | ^9.0.3 | Generación/validación JWT |
| `cors` | ^2.8.5 | Cabeceras CORS |
| `dotenv` | ^16.3.1 | Variables de entorno |
| `nodemon` | ^3.0.1 | Hot reload en desarrollo |

### Frontend (`cotizador-web/package.json`)

| Paquete | Versión | Uso |
|---------|---------|-----|
| `react` | ^19.2.6 | UI Library |
| `react-dom` | ^19.2.6 | Render en el DOM |
| `vite` | ^8.0.12 | Build tool y dev server |
| `@vitejs/plugin-react` | ^6.0.1 | Plugin React para Vite |

### Estilos (raíz `package.json`)

| Paquete | Versión | Uso |
|---------|---------|-----|
| `tailwindcss` | ^4.3.0 | Utility-first CSS |
| `autoprefixer` | ^10.5.0 | Prefijos CSS automáticos |
| `postcss` | ^8.5.15 | Procesador CSS |
| `bootstrap` | ^5.3.8 | Componentes CSS adicionales |

---

*Documentación generada el 12 de junio de 2026.*
