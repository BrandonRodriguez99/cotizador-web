# Cotizador Servicios UDAT — Documentación del Proyecto

**Versión:** 2.0  
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
9. [Notificaciones por Correo Electrónico](#9-notificaciones-por-correo-electrónico)
10. [Lógica de Cálculos](#10-lógica-de-cálculos)
11. [Configuración y Variables de Entorno](#11-configuración-y-variables-de-entorno)
12. [Instalación y Ejecución](#12-instalación-y-ejecución)
13. [Dependencias](#13-dependencias)

---

## 1. Descripción General

**Cotizador Servicios UDAT** es una aplicación web empresarial para la gestión integral de operaciones internas de UDAT. Permite:

- Crear y gestionar cotizaciones de cursos/capacitaciones con cálculo automático de costos y márgenes
- Administrar un flujo de aprobación de dos niveles para órdenes de compra
- Gestionar **órdenes de mantenimiento** con flujo de solicitud y atención técnica
- Controlar un **inventario de materiales y refacciones** con movimientos de entrada/salida
- Gestionar catálogos de clientes, cursos, coaches, proveedores y más
- Visualizar KPIs y estadísticas en un dashboard
- Administrar usuarios con distintos roles y permisos
- Enviar **notificaciones por correo electrónico** en eventos clave

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express.js (monolito `server.js`) |
| Base de Datos | SQL Server (Azure) |
| Autenticación | JWT (JSON Web Tokens) |
| Correo electrónico | Nodemailer + Office 365 SMTP |
| Generación de PDF | jsPDF |
| Estilos | CSS personalizado + Bootstrap 5 |
| Deploy Frontend | Vercel (auto-deploy desde GitHub) |
| Deploy Backend | Render (auto-deploy desde GitHub) |

---

## 2. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────┐
│                   Cliente (Navegador)                 │
│              React 19 + Vite (Vercel)                 │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP / REST + JWT
                         ▼
┌──────────────────────────────────────────────────────┐
│              Backend API (Render)                     │
│              Node.js + Express.js                     │
│                                                      │
│  /api/auth                /api/cotizaciones          │
│  /api/catalogos           /api/ordenescompra         │
│  /api/usuarios            /api/ordenes-mantenimiento │
│  /api/inventario                                     │
│                                                      │
│  Nodemailer → Office 365 SMTP (notificaciones)       │
└────────────────────────┬─────────────────────────────┘
                         │ mssql
                         ▼
┌──────────────────────────────────────────────────────┐
│     SQL Server en Azure (biUDAT)                     │
│     udatserver.southcentralus.cloudapp.azure.com     │
└──────────────────────────────────────────────────────┘
```

La comunicación frontend→backend se realiza mediante peticiones HTTP/REST. El frontend usa `api.js` como cliente centralizado que adjunta automáticamente el token JWT en cada petición.

**Auto-migración de base de datos:** Al arrancar el servidor, se ejecutan sentencias `IF NOT EXISTS` / `IF OBJECT_ID IS NULL` que crean tablas y columnas faltantes. No se requiere ejecutar scripts manuales de migración.

---

## 3. Estructura de Carpetas

```
CotizadorServiciosUDAT/
│
├── cotizador-web/                  # Frontend React (repo: cotizador-web)
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
│   │   ├── OrdenesCompra.jsx       # Gestión de órdenes de compra + selector inventario
│   │   ├── OrdenesMantenimiento.jsx # Gestión de órdenes de mantenimiento + PDF
│   │   ├── Inventario.jsx          # Módulo de inventario de materiales
│   │   ├── Usuarios.jsx            # Administración de usuarios (solo admin)
│   │   │
│   │   ├── CatalogFormModal.jsx        # Modal genérico para catálogos
│   │   ├── ChangePasswordModal.jsx     # Modal de cambio de contraseña
│   │   └── CotizacionDetallesModal.jsx # Modal de detalles de cotización
│   │
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── cotizador-api/                  # Backend Node.js (repo: cotizador-api)
│   └── cotizador-api/
│       └── server.js               # Monolito: Express + todas las rutas + migraciones BD
│
├── database/
│   └── CotizadorSchema.sql         # Schema base (las migraciones se aplican automáticamente)
│
└── DOCUMENTACION.md
```

---

## 4. Base de Datos

**Servidor:** `udatserver.southcentralus.cloudapp.azure.com:1433`  
**Base de datos:** `biUDAT`

> Las tablas se crean y actualizan automáticamente al iniciar el servidor mediante bloques `IF OBJECT_ID IS NULL / IF NOT EXISTS`. No se requieren scripts manuales.

---

### 4.1 Tablas de Autenticación

#### `Usuarios`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| UsuarioId | INT (PK) | Identificador único |
| Correo | NVARCHAR | Email del usuario (único) |
| PasswordHash | NVARCHAR | Hash bcrypt de la contraseña |
| Nombre | NVARCHAR | Nombre completo |
| Rol | NVARCHAR | Ver sección 7.2 |
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
| `Cursos` | Id, Nombre, Descripcion, Costo, Horas, TipoCurso, Activo |
| `Coaches` | Id, Nombre, Especialidad, Costo, Activo |
| `Modalidades` | Id, Nombre (Presencial, Virtual, Híbrido) |
| `ConceptosCosto` | Id, Nombre, TipoCosto, Formula, Activo |
| `Proveedores` | Id, Nombre, RFC, Contacto, Activo |
| `UnidadesNegocio` | Id, Nombre, Activo |

> Los catálogos soportan **soft delete** (campo `Activo`). El hard delete se activa con `?hard=1`.

---

### 4.3 Tablas de Cotizaciones

#### `Cotizaciones`
| Columna | Descripción |
|---------|-------------|
| CotizacionId | PK |
| Folio | `COT-XXXXXX` generado automáticamente |
| ClienteId, CursoId, CoachId, ModalidadId, UnidadNegocioId | FKs a catálogos |
| DuracionDias, SesionesPorDia, ParticipantesCantidad | Configuración |
| FechaInicio, FechaFin | Rango de fechas |
| TotalCostos, Ganancia, TotalConGanancia, PrecioPorParticipante | Resumen financiero |
| MargenUtilidadPctDirectos, MargenUtilidadPctIndirectos | Porcentajes de margen |
| Estado | Borrador / Pendiente / Aprobada / Rechazada |
| AprobadoPor, FechaAprobacion, ComentariosAprobacion | Datos de aprobación |
| Creador, FechaCreacion | Auditoría |

#### `CotizacionCostos`

| Columna | Descripción |
|---------|-------------|
| CotizacionCostoId | PK |
| CotizacionId | FK |
| Concepto, TipoCosto, Formula | Definición del costo |
| CostoUnitario, Cantidad, Total | Valores calculados |

---

### 4.4 Tablas de Órdenes de Compra

#### `OrdenesCompra`
| Columna | Descripción |
|---------|-------------|
| OrdenCompraId | PK |
| Folio | `OC-YYYY-XXXXXX` generado automáticamente (nullable para el patrón insert→update) |
| UnidadNegocioId | FK a UnidadesNegocio |
| ProveedorId | FK a Proveedores |
| Tipo | `compras` (default) |
| Fecha, Observaciones | Información general |
| Subtotal, IVA, Total | Totales calculados |
| Creador, Destino | Metadatos |
| Rechazado, RechazadoPor, MotivoRechazo, FechaRechazo | Datos de rechazo |
| Activo | Soft delete |

#### `OrdenesCompraLineas`
| Columna | Descripción |
|---------|-------------|
| OrdenCompraLineaId | PK |
| OrdenCompraId | FK |
| Descripcion | Descripción del concepto / nombre del producto |
| Cantidad, UnidadMedida, PrecioUnitario | Detalle |
| ProductoId | FK a `Inventario` (nullable) — se establece al seleccionar producto del inventario |

> Cuando `ProductoId` tiene valor y se crea la OC, el stock del producto se incrementa automáticamente y se registra un movimiento de tipo `ingreso`.

#### `OrdenesCompraAprobaciones`
| Columna | Descripción |
|---------|-------------|
| OrdenCompraAprobacionId | PK |
| OrdenCompraId | FK |
| Paso | 1 (Administración) o 2 (Secretaría Académica) |
| Aprobado | BIT |
| AprobadoPor, FechaAprobacion | Datos del aprobador |

---

### 4.5 Tablas de Órdenes de Mantenimiento

#### `OrdenesMantenimiento`
| Columna | Descripción |
|---------|-------------|
| OrdenMantenimientoId | PK |
| Folio | `OM-YYYY-XXXXXX` generado automáticamente |
| Departamento | Departamento solicitante |
| FechaReporte | Fecha de la solicitud |
| NombreSolicita | Nombre del solicitante |
| Puesto | Puesto del solicitante |
| Equipo | Equipo o área afectada |
| Codigo | Código interno del equipo |
| RazonOrden | `correctivo` / `preventivo` / `predictivo` / `programado` |
| DescripcionFalla | Descripción detallada del problema |
| TipoFalla | `Plomería` / `Eléctrica` / `Albañilería` / `Otro` |
| FechaTerminacion | Fecha en que se completó el trabajo |
| DescripcionMantenimiento | Descripción del trabajo realizado |
| TecnicoResponsable | Nombre del técnico |
| UsuarioEquipo | Nombre del usuario del equipo |
| Estado | `Pendiente` / `En proceso` / `Completada` |
| CreadoPor | Usuario que creó la solicitud |
| Activo | Soft delete |

#### `OrdenesMantenimientoMateriales`
| Columna | Descripción |
|---------|-------------|
| MaterialId | PK |
| OrdenMantenimientoId | FK |
| Material | Nombre del material / refacción |
| Cantidad | Cantidad utilizada |
| ProductoId | FK a `Inventario` (nullable) — para descontar stock automáticamente |

> Al completar una orden (`Estado = 'Completada'`), si el material tiene `ProductoId`, el stock del producto se decrementa y se registra un movimiento de tipo `consumo`.

---

### 4.6 Tablas de Inventario

#### `Inventario`
| Columna | Descripción |
|---------|-------------|
| ProductoId | PK |
| NombreProducto | Nombre del material o refacción |
| UnidadMedida | Unidad (pza, litros, kg, etc.) |
| CantidadMinima | Stock mínimo antes de alerta |
| CantidadReal | Stock actual |
| PrecioUnitario | Precio de referencia |
| Activo | Soft delete |

**Estados de stock** (calculado en queries, no almacenado):
| Estado | Condición |
|--------|-----------|
| `ok` | `CantidadReal >= CantidadMinima` |
| `bajo` | `CantidadReal > 0 AND CantidadReal < CantidadMinima` (estrictamente menor) |
| `agotado` | `CantidadReal <= 0` |

#### `InventarioMovimientos`
| Columna | Descripción |
|---------|-------------|
| MovimientoId | PK |
| ProductoId | FK a Inventario |
| TipoMovimiento | `ingreso` / `consumo` / `ajuste` |
| Cantidad | Cantidad del movimiento |
| CantidadAnterior | Stock antes del movimiento |
| OrdenCompraId | FK (solo en ingresos por OC) |
| OrdenMantenimientoId | FK (solo en consumos por mantenimiento) |
| Referencia | Folio de la OC u otro texto de referencia |
| Usuario | Quien realizó el ajuste manual |
| FechaMovimiento | Timestamp automático |

---

## 5. Backend — API REST

El servidor Express corre en **Render** y expone los siguientes grupos de endpoints. Todos requieren autenticación JWT excepto los de `/api/auth`.

### 5.1 Autenticación — `/api/auth`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/login` | Inicia sesión, retorna token JWT |
| POST | `/cambiar-password` | Cambia contraseña (requiere token) |
| POST | `/recuperar` | Genera código de recuperación por correo |
| POST | `/restablecer` | Restablece contraseña con código |

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

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:catalogo` | Lista todos los registros activos |
| POST | `/:catalogo` | Crea un nuevo registro |
| PUT | `/:catalogo/:id` | Actualiza un registro existente |
| DELETE | `/:catalogo/:id` | Soft delete (o hard con `?hard=1`) |
| GET | `/participantes?search=X` | Busca participantes en tabla STG |

**Catálogos disponibles:** `clientes`, `cursos`, `coaches`, `modalidades`, `conceptos`, `proveedores`, `unidadesnegocio`

---

### 5.3 Cotizaciones — `/api/cotizaciones`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Historial de cotizaciones |
| GET | `/:id` | Detalle de una cotización |
| GET | `/generate/folio` | Genera el siguiente folio |
| POST | `/` | Crea nueva cotización |
| POST | `/:id/aprobar` | Aprueba o rechaza |

---

### 5.4 Órdenes de Compra — `/api/ordenescompra`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista todas las órdenes |
| POST | `/` | Crea nueva orden (incrementa stock si hay `ProductoId`) |
| PUT | `/:id` | Actualiza orden |
| POST | `/:id/aprobar` | Aprobación paso 1 o 2 |
| POST | `/:id/rechazar` | Rechaza con motivo |
| GET | `/:id/pdf` | Descarga PDF |
| POST | `/:id/factura` | Guarda archivo de factura |
| GET | `/:id/factura/archivo` | Descarga factura |
| POST | `/:id/evaluacion` | Registra evaluación del proveedor |

**Lógica de stock en OC:** Al crear una OC, si una línea tiene `ProductoId`, se incrementa `Inventario.CantidadReal` por la cantidad de la línea y se registra un movimiento `ingreso` en `InventarioMovimientos`. Todo ocurre dentro de la misma transacción que crea la OC.

---

### 5.5 Órdenes de Mantenimiento — `/api/ordenes-mantenimiento`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista todas las órdenes |
| POST | `/` | Crea nueva solicitud (notifica por email) |
| GET | `/:id` | Detalle con materiales |
| PUT | `/:id` | Completa la orden técnica (decrementa stock si aplica, notifica por email) |

**Lógica de stock en mantenimiento:** Al marcar una orden como `Completada`, por cada material con `ProductoId` se decrementa `Inventario.CantidadReal` y se registra un movimiento `consumo`.

---

### 5.6 Inventario — `/api/inventario`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista productos activos con estado de stock |
| GET | `/dashboard` | Estadísticas: totales, alertas, movimientos recientes |
| POST | `/` | Crea nuevo producto (solo admin) |
| PUT | `/:id` | Edita producto (solo admin) |
| POST | `/:id/ajuste` | Ajuste manual de stock |

---

### 5.7 Usuarios — `/api/usuarios` (Solo Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista todos los usuarios |
| POST | `/` | Crea nuevo usuario |
| PUT | `/:id` | Actualiza nombre, rol, estado |
| POST | `/:id/resetear` | Resetea contraseña |

---

## 6. Frontend — Interfaz de Usuario

### 6.1 Componentes Principales

#### `App.jsx` — Componente Raíz
Centraliza todo el estado de la aplicación:
- **Autenticación:** `token`, `usuario` (persistidos en `localStorage`)
- **Navegación:** `activeView` controla qué vista se muestra
- **Catálogos:** se cargan al iniciar sesión y se pasan como props
- **Lógica de roles:** determina qué secciones son accesibles en el sidebar

**Vistas disponibles:**
| Vista | Componente | Acceso |
|-------|-----------|--------|
| `dashboard` | Dashboard.jsx | admin, autorizador1, autorizador2 |
| `inicio` | (inline en App.jsx) | empleado, jefe_mantenimiento |
| `cotizacion` | NuevaCotizacion.jsx | Todos excepto `mantenimiento` |
| `historial` | (inline en App.jsx) | Todos excepto `mantenimiento` |
| `aprobaciones` | (inline en App.jsx) | autorizador1, autorizador2 |
| `ordenesCompra` | OrdenesCompra.jsx | Todos excepto `mantenimiento` |
| `mantenimiento` | OrdenesMantenimiento.jsx | Todos |
| `inventario` | Inventario.jsx | Todos excepto `mantenimiento` |
| `usuarios` | Usuarios.jsx | Solo admin |
| `catalogo_*` | (CatalogFormModal genérico) | Solo admin |

**Vista inicial según rol:**
| Rol | Vista inicial |
|-----|--------------|
| `admin`, `autorizador1`, `autorizador2` | `dashboard` |
| `mantenimiento` | `mantenimiento` |
| `empleado`, `jefe_mantenimiento`, otros | `inicio` |

---

#### `Login.jsx`
- Formulario de correo + contraseña
- Recuperación de contraseña: solicitar código → ingresar código → nueva contraseña
- Al iniciar sesión guarda `token` y `usuario` en `localStorage`

---

#### `Dashboard.jsx`
Requiere rol admin o autorizador. Muestra KPI Cards, gráfico de cursos más cotizados, coaches más activos, distribución de participantes y montos por unidad de negocio.

---

#### `NuevaCotizacion.jsx`
Formulario multi-sección: datos generales, fechas, participantes (búsqueda en tabla STG), tabla de costos con fórmulas dinámicas y resumen financiero.

---

#### `OrdenesCompra.jsx`
Gestión completa de órdenes de compra:
- Crear orden con folio autogenerado `OC-YYYY-XXXXXX`
- **Selector de inventario en campo Descripción:** al escribir en el campo Descripción de cada partida, aparece un dropdown con productos del inventario activos. Al seleccionar un producto se auto-rellena la Unidad de Medida y se registra el `ProductoId` para incrementar el stock al guardar
- Ver estado de aprobaciones, aprobar/rechazar según rol
- Descarga de PDF, gestión de factura y evaluación de proveedor

---

#### `OrdenesMantenimiento.jsx`
Módulo de gestión de órdenes de mantenimiento con dos flujos:

**Parte 1 — Solicitud (cualquier usuario):**
- Formulario: Departamento, Fecha, Nombre del solicitante, Puesto, Equipo, Código, Razón (correctivo/preventivo/predictivo/programado), Descripción de la falla
- Al enviar, notifica por email al personal de mantenimiento

**Parte 2 — Atención técnica (rol mantenimiento):**
- Selecciona una orden pendiente de la lista "Por Atender"
- Completa: Tipo de falla, materiales utilizados (con selector de inventario), Fecha de terminación, Descripción del trabajo, Técnico responsable, Usuario del equipo
- Al completar, decrementa stock de los materiales con `ProductoId` y notifica al jefe de mantenimiento

**Exportación a PDF:**
- Botón "📄 PDF" en la columna Acciones de la tabla
- Descarga automática como `OM-<folio>.pdf` sin ventana emergente (jsPDF)
- Formato oficial FGA03-02: encabezado UDAT, colorimetría azul, checkboxes, tabla de materiales adaptable

**Pestañas:**
| Pestaña | Acceso | Descripción |
|---------|--------|-------------|
| Nueva Solicitud | Todos excepto `mantenimiento` | Crear nueva solicitud |
| Mis Solicitudes | Todos | Órdenes creadas por el usuario actual |
| Por Atender | Todos | Órdenes pendientes / en proceso |
| Todas las Órdenes | Solo admin | Vista completa |

---

#### `Inventario.jsx`
Módulo independiente de gestión de inventario:

**Vista Tabla:**
- Listado de todos los productos activos
- Columnas: ID, Nombre, Unidad, Stock Mínimo, Stock Actual, Precio, Estado (badge colorido)
- Búsqueda por nombre
- Acciones de edición y ajuste de stock (solo admin)
- `StockBadge`: verde (OK), naranja (Stock bajo), rojo (Agotado)

**Vista Dashboard:**
- 5 tarjetas de resumen: total productos, OK, stock bajo, agotados, valor total
- Alertas de stock bajo con detalle
- Tabla de movimientos recientes (ingresos, consumos, ajustes)

**Ajuste de stock (admin):**
- `ingreso`: suma cantidad al stock actual
- `ajuste`: establece la cantidad exacta

---

#### `Usuarios.jsx` (Solo Admin)
- Tabla con todos los usuarios del sistema
- Crear usuario: correo, nombre, rol, contraseña inicial
- Editar: nombre, rol, activo/inactivo
- Resetear contraseña (`DebeReiniciarPass = 1`)
- Roles disponibles en el dropdown: empleado, mantenimiento, jefe_mantenimiento, autorizador1, autorizador2, admin

---

#### `CatalogFormModal.jsx`
Modal genérico que renderiza formularios según `catalogConfig.js`. Soporta campos de tipo texto, número, select y área de texto.

---

### 6.2 Cliente HTTP — `api.js`

Wrapper sobre `fetch` que:
- Usa `VITE_API_BASE_URL` como base URL
- Adjunta automáticamente `Authorization: Bearer <token>` mediante `authHeaders()`
- Limpia `localStorage` y recarga la página si el servidor responde 401

> **Importante:** Las funciones `postJson` y `putJson` NO incluyen headers de autorización. Para endpoints con middleware `autenticar`, usar `fetchJson` directamente con `authHeaders()`.

**Funciones de API para módulos nuevos:**
```javascript
// Inventario
getInventario()              // GET /inventario
getInventarioDashboard()     // GET /inventario/dashboard
createProducto(data)         // POST /inventario
updateProducto(id, data)     // PUT /inventario/:id
ajustarStock(id, data)       // POST /inventario/:id/ajuste

// Órdenes de Mantenimiento
getOrdenesMantenimiento()          // GET /ordenes-mantenimiento
getOrdenMantenimientoById(id)      // GET /ordenes-mantenimiento/:id
createOrdenMantenimiento(data)     // POST /ordenes-mantenimiento
updateOrdenMantenimiento(id, data) // PUT /ordenes-mantenimiento/:id
```

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
- En móvil se oculta con botón toggle (overlay)

**Botones:**
- `.primary-button` — Acción principal (azul)
- `.secondary-button` — Acción secundaria
- `.ghost-button` — Sin relleno, solo borde

---

## 7. Autenticación y Roles

### 7.1 JWT

- **Expiración:** 8 horas
- **Payload:** `{ id, correo, nombre, rol }`
- **Almacenamiento:** `localStorage` con claves `cotizador-token` y `cotizador-usuario`

### 7.2 Roles y Permisos

| Rol | Dashboard | Cotiz. | OC | Mant. | Inventario | Catálogos | Usuarios |
|-----|-----------|--------|----|-------|-----------|----------|---------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ (editar) | ✅ | ✅ |
| `autorizador1` | ✅ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `autorizador2` | ✅ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `empleado` | ❌ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `jefe_mantenimiento` | ❌ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `mantenimiento` | ❌ | ❌ | ❌ | ✅ (solo) | ❌ | ❌ | ❌ |

> `jefe_mantenimiento` tiene acceso idéntico a `empleado`. La distinción existe únicamente para enrutar notificaciones de correo electrónico de mantenimiento.

> El rol `mantenimiento` solo ve el módulo de Órdenes de Mantenimiento en el sidebar.

### 7.3 Credenciales Iniciales

| Campo | Valor |
|-------|-------|
| Correo | `admin@udat.com` |
| Contraseña | `Udat2024!` |
| Rol | `admin` |

> Los usuarios nuevos reciben `DebeReiniciarPass = 1` y deben cambiar su contraseña en el primer login.

### 7.4 Recuperación de Contraseña

1. Usuario solicita código en `/api/auth/recuperar` con su correo
2. Se genera un código alfanumérico de 6 caracteres y se envía por correo (expira en 24h)
3. Usuario ingresa código + nueva contraseña en `/api/auth/restablecer`
4. El token queda marcado como `Usado = 1`

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
1. Empleado crea cotización
   └── Selecciona catalogos, configura costos con fórmulas dinámicas

2. POST /api/cotizaciones → Estado = "Pendiente"
   └── Email a autorizador1 y al creador

3. Autorizador aprueba o rechaza
   └── Email de resultado al creador
```

---

### 8.3 Flujo de Orden de Compra

```
1. Usuario crea orden con líneas de partidas
   ├── Opcionalmente selecciona productos del inventario en campo Descripción
   └── POST /api/ordenescompra
       ├── Folio generado: OC-YYYY-XXXXXX
       ├── Si línea tiene ProductoId: stock del producto + cantidad
       └── Email a autorizador1, al creador y a todos los empleados

2. Autorizador1 (Administración) — Paso 1
   ├── Aprobar → notifica a autorizador2
   └── Rechazar → "Rechazada" + notifica al creador y empleados

3. Autorizador2 (Secretaría Académica) — Paso 2
   ├── Aprobar → "Aprobada" + notifica al creador y empleados
   └── Rechazar → "Rechazada" + notifica al creador y empleados

4. Orden aprobada:
   ├── PDF disponible para descarga
   ├── Carga de factura (archivo)
   └── Evaluación de proveedor
```

---

### 8.4 Flujo de Orden de Mantenimiento

```
1. Solicitante crea orden (Parte 1)
   ├── Completa formulario: equipo, razón, descripción de falla
   └── POST /api/ordenes-mantenimiento → Estado = "Pendiente"
       └── Email a todos los usuarios con rol mantenimiento y jefe_mantenimiento

2. Técnico atiende la orden (Parte 2)
   ├── Selecciona materiales (del inventario o texto libre)
   ├── Completa: tipo de falla, descripción del trabajo, fechas
   └── PUT /api/ordenes-mantenimiento/:id → Estado = "Completada"
       ├── Por cada material con ProductoId: stock del producto - cantidad
       ├── Registra movimientos "consumo" en InventarioMovimientos
       └── Email al jefe_mantenimiento con resumen del trabajo

3. PDF exportable desde la tabla de órdenes
   └── Descarga directa como OM-YYYY-XXXXXX.pdf (jsPDF, sin popup)
```

---

### 8.5 Flujo de Inventario

```
Entradas de stock (ingresos):
  → Vía OC: al crear OC con ProductoId en línea de partida
  → Vía ajuste manual (admin): POST /api/inventario/:id/ajuste (tipo "ingreso")

Salidas de stock (consumos):
  → Vía mantenimiento: al completar orden con materiales con ProductoId

Ajuste directo (admin):
  → POST /api/inventario/:id/ajuste (tipo "ajuste") → establece cantidad exacta

Alertas:
  → Badge naranja: CantidadReal > 0 Y CantidadReal < CantidadMinima
  → Badge rojo: CantidadReal <= 0
  → Dashboard: sección de alertas con productos en stock bajo o agotado
```

---

## 9. Notificaciones por Correo Electrónico

El sistema usa **Nodemailer con Office 365 SMTP** (`smtp.office365.com:587`). Los correos son **fire-and-forget** (no bloquean la respuesta de la API).

### 9.1 Infraestructura

```javascript
// Variables de entorno requeridas
SMTP_USER=correo@udat.com
SMTP_PASS=contraseña
APP_URL=https://cotizador-web.vercel.app
```

Si `SMTP_USER` / `SMTP_PASS` no están configurados, el sistema funciona normalmente pero registra en consola que los correos no se enviaron.

### 9.2 Funciones de Consulta de Destinatarios

| Función | Consulta | Descripción |
|---------|---------|-------------|
| `getEmailsDeRol(rol)` | `WHERE Rol=@rol OR Rol='admin'` | Rol específico + admins |
| `getEmailDeUsuario(nombre)` | `WHERE Nombre=@nombre` | Usuario por nombre |
| `getEmailsPorRoles(roles[])` | `WHERE Rol IN (...)` | Roles exactos, sin incluir admins |

### 9.3 Eventos y Destinatarios

| Módulo | Evento | Destinatarios |
|--------|--------|---------------|
| **OC** | OC creada | autorizador1 + creador + todos los `empleado` |
| **OC** | Aprobada paso 1 | autorizador2 |
| **OC** | Aprobada paso 2 (final) | creador + todos los `empleado` |
| **OC** | Rechazada | creador + todos los `empleado` |
| **Cotización** | Cotización creada | autorizador1 + creador |
| **Cotización** | Aprobada/Rechazada | creador |
| **Mantenimiento** | Orden creada | todos los `mantenimiento` + todos los `jefe_mantenimiento` |
| **Mantenimiento** | Orden completada | todos los `jefe_mantenimiento` |
| **Auth** | Recuperación de contraseña | el usuario solicitante |

### 9.4 Plantillas de Correo

| Función | Asunto | Contenido |
|---------|--------|-----------|
| `emailOrdenCreada` | `Nueva orden X requiere autorización` | Folio, proveedor, total |
| `emailPasoAprobado` | `Orden X aprobada por Y` | Folio, siguiente paso |
| `emailOCConfirmacion` | `Tu orden X fue registrada` | Confirmación al creador |
| `emailOCResultado` | `Tu orden X fue aprobada/rechazada` | Resultado con motivo |
| `emailOMCreada` | `Nueva Orden de Mantenimiento — X` | Folio, equipo, tipo, solicitante |
| `emailOMCompletada` | `Orden X completada` | Técnico, tipo falla, descripción, materiales |
| `emailCotizacionPendiente` | `Nueva cotización requiere aprobación` | Folio, curso, total |
| `emailCotizacionConfirmacion` | `Tu cotización fue registrada` | Confirmación al creador |
| `emailCotizacionResuelta` | `Cotización aprobada/rechazada` | Resultado con comentarios |

---

## 10. Lógica de Cálculos

### 10.1 Fórmulas de Cantidad en Costos de Cotización

| Fórmula | Cálculo | Ejemplo (3 sesiones, 5 días, 20 participantes) |
|---------|---------|-----------------------------------------------|
| `Sesiones x Días` | sesiones × días | 3 × 5 = **15** |
| `Participantes` | participantes | **20** |
| `Horas` | días × sesiones | 5 × 3 = **15** |
| `Eventos` | 1 | **1** |

---

### 10.2 Márgenes y Precios en Cotizaciones

```
Total Costos Directos   = Σ costos donde TipoCosto = "Directo"
Total Costos Indirectos = Σ costos donde TipoCosto = "Indirecto"
Total Costos            = Directos + Indirectos

Margen Utilidad    = Total Costos × (margenDirecto% / 100)
Total con Ganancia = Total Costos + Margen Utilidad

Precio por Participante = Total con Ganancia / ParticipantesCantidad
```

**Valores por defecto de márgenes:** Directos: 23.5% / Indirectos: 0%

---

### 10.3 Cálculo de Órdenes de Compra

```
Subtotal = Σ (Cantidad × PrecioUnitario) por cada línea
IVA      = Subtotal × 16%
Total    = Subtotal + IVA
```

---

### 10.4 Estado de Stock en Inventario

```sql
CASE
  WHEN CantidadReal <= 0               THEN 'agotado'
  WHEN CantidadReal < CantidadMinima   THEN 'bajo'      -- estrictamente menor
  ELSE                                      'ok'
END AS EstadoStock
```

> Nota: `CantidadReal = CantidadMinima` es estado `ok`, no `bajo`.

---

## 11. Configuración y Variables de Entorno

### Frontend — `cotizador-web/.env`
```env
VITE_API_BASE_URL=https://cotizador-api.onrender.com/api
```

### Backend — `cotizador-api/.env`
```env
# Conexión SQL Server
DB_SERVER=udatserver.southcentralus.cloudapp.azure.com
DB_PORT=1433
DB_NAME=biUDAT
DB_USER=<usuario>
DB_PASSWORD=<contraseña>
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Servidor
PORT=4000

# JWT
JWT_SECRET=<secreto>
JWT_EXPIRES_IN=8h

# SMTP (Office 365)
SMTP_USER=<correo@udat.com>
SMTP_PASS=<contraseña>
APP_URL=https://cotizador-web.vercel.app
```

> **Importante:** El archivo `.env` nunca debe subirse al repositorio.

---

## 12. Instalación y Ejecución

### Requisitos previos
- Node.js 18+
- Acceso a la base de datos SQL Server de Azure

### 1. Clonar repositorios

```bash
git clone https://github.com/BrandonRodriguez99/cotizador-web.git
git clone https://github.com/BrandonRodriguez99/cotizador-api.git
```

### 2. Instalar dependencias

```bash
# Frontend
cd cotizador-web
npm install

# Backend
cd cotizador-api/cotizador-api
npm install
```

### 3. Configurar variables de entorno

Crear `.env` en cada proyecto con los valores de la sección 11.

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 — Backend
cd cotizador-api/cotizador-api
node server.js    # Las migraciones de BD se ejecutan automáticamente al iniciar

# Terminal 2 — Frontend
cd cotizador-web
npm run dev       # Vite en http://localhost:5173
```

### 5. Build de producción

```bash
cd cotizador-web
npm run build
# Archivos en cotizador-web/dist/ — se despliegan automáticamente en Vercel
```

### 6. Deploy

- **Frontend:** Push a `main` en `cotizador-web` → Vercel detecta y despliega automáticamente
- **Backend:** Push a `main` en `cotizador-api` → Render detecta y despliega automáticamente
- **Base de datos:** Las migraciones se aplican automáticamente al reiniciar el servidor en Render

---

## 13. Dependencias

### Backend (`cotizador-api/package.json`)

| Paquete | Uso |
|---------|-----|
| `express` | Framework HTTP |
| `mssql` | Cliente SQL Server |
| `bcryptjs` | Hash de contraseñas |
| `jsonwebtoken` | Generación/validación JWT |
| `nodemailer` | Envío de correos electrónicos (Office 365 SMTP) |
| `cors` | Cabeceras CORS |
| `dotenv` | Variables de entorno |

### Frontend (`cotizador-web/package.json`)

| Paquete | Uso |
|---------|-----|
| `react` + `react-dom` | UI Library |
| `vite` + `@vitejs/plugin-react` | Build tool y dev server |
| `jspdf` | Generación de PDFs en el cliente (descarga automática) |
| `bootstrap` | Componentes CSS adicionales |

---

*Documentación actualizada el 24 de junio de 2026. Versión 2.0.*
