# Cotizador Servicios UDAT — Documentación del Proyecto

**Versión:** 3.0  
**Fecha:** Julio 2026  
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
10. [Evidencia Fotográfica (Cloudinary)](#10-evidencia-fotográfica-cloudinary)
11. [Lógica de Cálculos](#11-lógica-de-cálculos)
12. [Configuración y Variables de Entorno](#12-configuración-y-variables-de-entorno)
13. [Instalación y Ejecución](#13-instalación-y-ejecución)
14. [Dependencias](#14-dependencias)
15. [Historial de Cambios](#15-historial-de-cambios)

---

## 1. Descripción General

**Cotizador Servicios UDAT** es una aplicación web empresarial para la gestión integral de operaciones internas de UDAT. Permite:

- Crear y gestionar cotizaciones de cursos/capacitaciones con cálculo automático de costos y márgenes
- Administrar un flujo de aprobación de dos niveles para órdenes de compra
- Gestionar **órdenes de mantenimiento** con flujo de solicitud y atención técnica
- Controlar un **inventario de materiales y refacciones** con movimientos de entrada/salida
- Gestionar un **módulo de seguridad** completo: rondines por área, extintores, visitas y vehículos
- Emitir **órdenes de salida de vehículos** con evidencia fotográfica (4 ángulos salida + 4 llegada)
- Recibir **solicitudes de vehículo públicas** sin requerir login (`/solicitud-vehiculo`)
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
| Correo electrónico | Nodemailer + Gmail SMTP |
| Almacenamiento de fotos | Cloudinary (upload sin firma, preset `douxyql6`) |
| Generación de PDF | jsPDF |
| Estilos | CSS personalizado + Bootstrap 5 |
| Deploy Frontend | Vercel (auto-deploy desde GitHub) |
| Deploy Backend | Railway (auto-deploy desde GitHub, ~2 min) |

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
│              Backend API (Railway)                    │
│              Node.js + Express.js                     │
│                                                      │
│  /api/auth                /api/cotizaciones          │
│  /api/catalogos           /api/ordenescompra         │
│  /api/usuarios            /api/ordenes-mantenimiento │
│  /api/inventario          /api/seguridad             │
│  /api/vehiculos           /api/solicitud-vehiculo    │
│                                                      │
│  Nodemailer → Gmail SMTP (notificaciones)            │
└────────────────────────┬─────────────────────────────┘
                         │ mssql
                         ▼
┌──────────────────────────────────────────────────────┐
│     SQL Server en Azure (biUDAT)                     │
│     udatserver.southcentralus.cloudapp.azure.com     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│     Cloudinary (cloud_name: kcj1hrdy)                │
│     Upload directo browser → Cloudinary              │
│     Preset: douxyql6 (sin firma)                     │
│     Carpetas: /rondines  /vehiculos                  │
└──────────────────────────────────────────────────────┘
```

La comunicación frontend→backend se realiza mediante peticiones HTTP/REST. El frontend usa `api.js` como cliente centralizado que adjunta automáticamente el token JWT en cada petición.

**Upload de fotos:** El frontend sube imágenes directamente a Cloudinary (sin pasar por el backend) usando un preset de upload sin firma. El backend solo recibe la URL ya procesada.

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
│   │   ├── api.js                  # Cliente HTTP centralizado (adjunta JWT + Cloudinary upload)
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
│   │   ├── Seguridad.jsx           # Módulo de seguridad: rondines, extintores, visitas, vehículos
│   │   ├── SolicitudVehiculoPublica.jsx  # Formulario público (sin login) para solicitar vehículo
│   │   ├── Usuarios.jsx            # Administración de usuarios (solo admin)
│   │   │
│   │   ├── CatalogFormModal.jsx        # Modal genérico para catálogos
│   │   ├── ChangePasswordModal.jsx     # Modal de cambio de contraseña
│   │   └── CotizacionDetallesModal.jsx # Modal de detalles de cotización
│   │
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json                 # SPA rewrite: todas las rutas → index.html
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
| Estado | Borrador / Pendiente / Aprobada / Rechazada / Enviada |
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

### 4.7 Tablas del Módulo de Seguridad *(nuevo en v3.0)*

#### `RondinesArea`
Registro de rondines de vigilancia por área del edificio.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| RondinId | INT (PK) | Identificador |
| Area | NVARCHAR | Nombre del área revisada |
| Turno | NVARCHAR | `Matutino` / `Vespertino` / `Nocturno` |
| Responsable | NVARCHAR | Personal que realizó el rondin |
| FechaHora | DATETIME | Timestamp del rondin |
| Estado | NVARCHAR | `Sin novedad` / `Con novedad` |
| Incidencia | NVARCHAR | Descripción de la novedad (si aplica) |
| FotoUrl | NVARCHAR(500) | URL Cloudinary de la foto de evidencia (opcional) |
| Activo | BIT | Soft delete |

#### `Extintores`
Inventario y estado de extintores.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| ExtintorId | INT (PK) | Identificador |
| Ubicacion | NVARCHAR | Ubicación física del extintor |
| Tipo | NVARCHAR | Tipo de extintor (ABC, CO2, etc.) |
| Capacidad | NVARCHAR | Capacidad (ej. 6 kg) |
| FechaUltimaRecarga | DATE | Última recarga |
| FechaProximaRevision | DATE | Próxima revisión programada |
| Estado | NVARCHAR | `Activo` / `Vencido` / `Dañado` |
| Activo | BIT | Soft delete |

#### `Visitas`
Control de acceso de visitantes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| VisitaId | INT (PK) | Identificador |
| NombreVisitante | NVARCHAR | Nombre completo |
| Empresa | NVARCHAR | Empresa del visitante |
| PersonaVisita | NVARCHAR | A quien visita dentro de UDAT |
| Motivo | NVARCHAR | Motivo de la visita |
| HoraEntrada | DATETIME | Timestamp de entrada |
| HoraSalida | DATETIME | Timestamp de salida (nullable) |
| Activo | BIT | Soft delete |

#### `VehiculosSeguridad`
Catálogo de vehículos de la institución.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| VehiculoId | INT (PK) | Identificador |
| Marca | NVARCHAR | Marca del vehículo |
| Modelo | NVARCHAR | Modelo |
| Anio | INT | Año |
| Placas | NVARCHAR | Número de placas |
| Color | NVARCHAR | Color |
| NumeroEconomico | NVARCHAR | Número económico interno |
| Estado | NVARCHAR | `Disponible` / `En uso` / `Mantenimiento` |
| Activo | BIT | Soft delete |

#### `OrdenesVehiculo`
Órdenes de salida y llegada de vehículos con evidencia fotográfica.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| OrdenVehiculoId | INT (PK) | Identificador |
| VehiculoId | INT (FK) | Vehículo asignado |
| Conductor | NVARCHAR | Nombre del conductor |
| Destino | NVARCHAR | Destino del viaje |
| Motivo | NVARCHAR | Motivo de la salida |
| FechaSalida | DATETIME | Fecha y hora de salida |
| FechaLlegada | DATETIME | Fecha y hora de llegada (nullable) |
| KmSalida | INT | Kilometraje al salir |
| KmLlegada | INT | Kilometraje al llegar (nullable) |
| Estado | NVARCHAR | `Pendiente` / `En uso` / `Completada` |
| AutorizadoPor | NVARCHAR | Quien autorizó la salida |
| Observaciones | NVARCHAR | Observaciones generales |
| FotoSalidaFrontal | NVARCHAR(500) | URL Cloudinary — foto frontal al salir |
| FotoSalidaTrasero | NVARCHAR(500) | URL Cloudinary — foto trasera al salir |
| FotoSalidaLateralIzq | NVARCHAR(500) | URL Cloudinary — lateral izquierdo al salir |
| FotoSalidaLateralDer | NVARCHAR(500) | URL Cloudinary — lateral derecho al salir |
| FotoLlegadaFrontal | NVARCHAR(500) | URL Cloudinary — foto frontal al llegar |
| FotoLlegadaTrasero | NVARCHAR(500) | URL Cloudinary — foto trasera al llegar |
| FotoLlegadaLateralIzq | NVARCHAR(500) | URL Cloudinary — lateral izquierdo al llegar |
| FotoLlegadaLateralDer | NVARCHAR(500) | URL Cloudinary — lateral derecho al llegar |
| Activo | BIT | Soft delete |

#### `SolicitudesVehiculo`
Solicitudes de uso de vehículo enviadas desde el formulario público.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| SolicitudId | INT (PK) | Identificador |
| Solicitante | NVARCHAR | Nombre del solicitante |
| Departamento | NVARCHAR | Departamento |
| Destino | NVARCHAR | Destino del viaje |
| FechaSalida | DATE | Fecha requerida |
| Motivo | NVARCHAR | Motivo de la solicitud |
| Estado | NVARCHAR | `Pendiente` / `Aprobada` / `Rechazada` |
| FechaCreacion | DATETIME | Timestamp automático |

> Las columnas de fotos en `OrdenesVehiculo` (`FotoSalidaFrontal`, `FotoSalidaTrasero`, `FotoSalidaLateralIzq`, `FotoSalidaLateralDer`, `FotoLlegadaFrontal`, `FotoLlegadaTrasero`, `FotoLlegadaLateralIzq`, `FotoLlegadaLateralDer`) se agregan automáticamente al iniciar el servidor si no existen (migración v3).

---

## 5. Backend — API REST

El servidor Express corre en **Railway** y expone los siguientes grupos de endpoints. Todos requieren autenticación JWT excepto los de `/api/auth` y `POST /api/solicitud-vehiculo`.

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
| POST | `/` | Crea nueva cotización → notifica a autorizadores |
| POST | `/:id/enviar` | Cambia estado a "Enviada" → notifica a autorizadores |
| POST | `/:id/aprobar` | Aprueba o rechaza → notifica al creador |

> **Nota sobre botones en el frontend:** El botón **"Guardar Cotización"** crea la cotización (POST `/`). El botón **"Enviar a Aprobación"** llama a POST `/:id/enviar`. Ambos endpoints envían correo a los autorizadores (autorizador1 + admin).

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

### 5.8 Módulo de Seguridad *(nuevo en v3.0)*

#### Rondines — `/api/seguridad/rondines`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista rondines (filtrable por fecha) |
| POST | `/` | Registra nuevo rondin con foto opcional |
| PUT | `/:id` | Actualiza rondin (agregar/cambiar foto, incidencia) |
| DELETE | `/:id` | Soft delete |

#### Extintores — `/api/seguridad/extintores`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista extintores con estado |
| POST | `/` | Registra extintor |
| PUT | `/:id` | Actualiza datos / estado |
| DELETE | `/:id` | Soft delete |

#### Visitas — `/api/seguridad/visitas`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista visitas del día / rango de fechas |
| POST | `/` | Registra entrada de visita |
| PUT | `/:id/salida` | Registra hora de salida |
| DELETE | `/:id` | Soft delete |

#### Vehículos — `/api/vehiculos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Catálogo de vehículos |
| POST | `/` | Agrega vehículo |
| PUT | `/:id` | Edita vehículo |
| DELETE | `/:id` | Soft delete |

#### Órdenes de Vehículo — `/api/vehiculos/ordenes`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista órdenes de salida |
| POST | `/` | Crea orden de salida con URLs de fotos (4 ángulos) |
| PUT | `/:id/llegada` | Registra llegada con URLs de fotos (4 ángulos) |
| DELETE | `/:id` | Soft delete |

#### Solicitudes Públicas — `/api/solicitud-vehiculo` *(sin autenticación)*

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/` | Recibe solicitud pública de vehículo (no requiere JWT) |
| GET | `/` | Lista solicitudes (requiere JWT + rol seguridad/admin) |

---

## 6. Frontend — Interfaz de Usuario

### 6.1 Componentes Principales

#### `App.jsx` — Componente Raíz
Centraliza todo el estado de la aplicación:
- **Autenticación:** `token`, `usuario` (persistidos en `localStorage` con claves `cotizador-token` y `cotizador-usuario`)
- **Ruta pública:** antes de cualquier guardia de autenticación, si `window.location.pathname === '/solicitud-vehiculo'` se renderiza `SolicitudVehiculoPublica` directamente
- **Navegación:** `activeView` controla qué vista se muestra
- **Catálogos:** se cargan al iniciar sesión y se pasan como props
- **Lógica de roles:** determina qué secciones son accesibles en el sidebar

**Vistas disponibles:**
| Vista | Componente | Acceso |
|-------|-----------|--------|
| `dashboard` | Dashboard.jsx | admin, autorizador1, autorizador2 |
| `inicio` | (inline en App.jsx) | empleado, jefe_mantenimiento |
| `cotizacion` | NuevaCotizacion.jsx | Todos excepto mantenimiento / seguridad / encargado_vehiculos |
| `historial` | (inline en App.jsx) | Todos excepto mantenimiento / seguridad / encargado_vehiculos |
| `aprobaciones` | (inline en App.jsx) | autorizador1, autorizador2 |
| `ordenesCompra` | OrdenesCompra.jsx | Todos excepto mantenimiento / seguridad / encargado_vehiculos |
| `mantenimiento` | OrdenesMantenimiento.jsx | Todos |
| `inventario` | Inventario.jsx | Todos excepto mantenimiento / seguridad / encargado_vehiculos |
| `seguridad` | Seguridad.jsx | seguridad, jefe_seguridad, encargado_vehiculos, admin |
| `usuarios` | Usuarios.jsx | Solo admin |
| `catalogo_*` | (CatalogFormModal genérico) | Solo admin |

**Vista inicial según rol:**
| Rol | Vista inicial |
|-----|--------------|
| `admin`, `autorizador1`, `autorizador2` | `dashboard` |
| `mantenimiento` | `mantenimiento` |
| `seguridad`, `jefe_seguridad`, `encargado_vehiculos` | `seguridad` |
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

**Botones de acción:**
- **Guardar Cotización** — crea la cotización en BD con estado "Pendiente" y notifica a autorizadores por correo
- **Enviar a Aprobación** — cambia el estado a "Enviada" y vuelve a notificar a autorizadores por correo

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

#### `Seguridad.jsx` *(nuevo en v3.0)*
Módulo de seguridad con cuatro secciones accesibles mediante pestañas:

**Pestaña Rondines:**
- Tabla de rondines por área con columnas: Área, Turno, Responsable, Fecha/Hora, Estado, Incidencia, Foto
- La columna **Foto** muestra un enlace `📷 Foto` que abre la imagen de Cloudinary en nueva pestaña
- Botón "Registrar Rondin" abre modal con campos: Área, Turno, Responsable, Fecha/Hora, Estado, Incidencia
- El modal incluye selector de foto: seleccionar archivo → preview → upload a Cloudinary → URL guardada
- Al pulsar "Revisar" en un registro existente, el modal se pre-carga con los datos actuales
- Roles con acceso completo: `seguridad`, `jefe_seguridad`, `admin`

**Pestaña Extintores:**
- Tabla con todos los extintores y su estado (badge de color según estado)
- CRUD completo: agregar, editar, eliminar extintor
- Campos: Ubicación, Tipo, Capacidad, Fecha Última Recarga, Fecha Próxima Revisión, Estado

**Pestaña Visitas:**
- Registro de entrada y salida de visitantes
- Tabla del día con opción de filtrar por rango de fechas
- Al registrar salida, se calcula automáticamente el tiempo de estancia

**Pestaña Vehículos / Órdenes:**
- Sub-vista del catálogo de vehículos con CRUD completo
- Sub-vista de órdenes de salida: crear orden, registrar llegada
- **Evidencia fotográfica de salida:** 4 campos de foto (Frontal, Trasero, Lateral Izq, Lateral Der) al crear la orden
- **Evidencia fotográfica de llegada:** 4 campos de foto (mismos ángulos) al registrar llegada
- Todas las fotos se suben a Cloudinary; el backend recibe y guarda solo las URLs
- Roles con acceso a vehículos: `encargado_vehiculos`, `jefe_seguridad`, `admin`

---

#### `SolicitudVehiculoPublica.jsx` *(nuevo en v3.0)*
Formulario público accesible en `/solicitud-vehiculo` **sin requerir login**.

- Campos: Nombre del solicitante, Departamento, Destino, Fecha de salida requerida, Motivo
- Al enviar, crea un registro en `SolicitudesVehiculo` con estado `Pendiente`
- El personal de seguridad puede ver y gestionar estas solicitudes desde el módulo de seguridad

**Implementación técnica — cómo funciona la ruta pública:**  
En `App.jsx`, antes de cualquier verificación de autenticación:
```javascript
if (window.location.pathname === '/solicitud-vehiculo') {
  return <SolicitudVehiculoPublica />
}
```
En `vercel.json`, la reescritura SPA envía todas las rutas a `index.html`, lo que permite que esta URL funcione incluso en recargas directas del navegador.

---

#### `Usuarios.jsx` (Solo Admin)
- Tabla con todos los usuarios del sistema
- Crear usuario: correo, nombre, rol, contraseña inicial
- Editar: nombre, rol, activo/inactivo
- Resetear contraseña (`DebeReiniciarPass = 1`)
- Roles disponibles en el dropdown: `empleado`, `mantenimiento`, `jefe_mantenimiento`, `autorizador1`, `autorizador2`, `seguridad`, `jefe_seguridad`, `encargado_vehiculos`, `admin`

---

#### `CatalogFormModal.jsx`
Modal genérico que renderiza formularios según `catalogConfig.js`. Soporta campos de tipo texto, número, select y área de texto.

---

### 6.2 Cliente HTTP — `api.js`

Wrapper sobre `fetch` que:
- Usa `VITE_API_BASE_URL` como base URL
- Adjunta automáticamente `Authorization: Bearer <token>` mediante `authHeaders()`
- Limpia `localStorage` y recarga la página si el servidor responde 401 (token expirado o inválido)

> **Importante:** Las funciones `postJson` y `putJson` NO incluyen headers de autorización. Para endpoints con middleware `autenticar`, usar `fetchJson` directamente con `authHeaders()`.

**Funciones de API — todos los módulos:**
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

// Seguridad — rondines, extintores, visitas
getRondines() / createRondin(data) / updateRondin(id, data) / deleteRondin(id)
getExtintores() / createExtintor(data) / updateExtintor(id, data) / deleteExtintor(id)
getVisitas() / createVisita(data) / registrarSalida(id) / deleteVisita(id)

// Vehículos y órdenes de vehículo
getVehiculos() / createVehiculo(data) / updateVehiculo(id, data) / deleteVehiculo(id)
getOrdenesVehiculo()                     // GET /vehiculos/ordenes
createOrdenVehiculo(data)                // POST /vehiculos/ordenes (incluye URLs fotos salida)
registrarLlegadaVehiculo(id, data)       // PUT /vehiculos/ordenes/:id/llegada (URLs fotos llegada)

// Solicitud pública (sin auth)
crearSolicitudVehiculo(data)             // POST /solicitud-vehiculo

// Upload de fotos a Cloudinary (directo browser→Cloudinary, sin backend)
uploadFotoVehiculo(base64)   // → carpeta 'vehiculos'
uploadFotoRondin(base64)     // → carpeta 'rondines'
```

**Implementación del upload a Cloudinary:**
```javascript
async function uploadToCloudinary(base64, folder) {
  const fd = new FormData()
  fd.append('file', base64)
  fd.append('upload_preset', 'douxyql6')   // preset sin firma (Unsigned)
  fd.append('folder', folder)
  const r = await fetch('https://api.cloudinary.com/v1_1/kcj1hrdy/image/upload', {
    method: 'POST', body: fd
  })
  const data = await r.json()
  if (data.error) throw new Error(data.error.message)
  return { url: data.secure_url }
}
export function uploadFotoVehiculo(base64) { return uploadToCloudinary(base64, 'vehiculos') }
export function uploadFotoRondin(base64)   { return uploadToCloudinary(base64, 'rondines') }
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
- **Token expirado:** si el servidor responde 401, `api.js` limpia `localStorage` y recarga la página automáticamente (no hay bucle de redirecciones)

### 7.2 Roles y Permisos

| Rol | Dashboard | Cotiz. | OC | Mant. | Inventario | Seguridad | Usuarios |
|-----|-----------|--------|----|-------|-----------|----------|---------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ (editar) | ✅ | ✅ |
| `autorizador1` | ✅ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `autorizador2` | ✅ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `empleado` | ❌ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `jefe_mantenimiento` | ❌ | ✅ | ✅ | ✅ | ✅ (ver) | ❌ | ❌ |
| `mantenimiento` | ❌ | ❌ | ❌ | ✅ (solo) | ❌ | ❌ | ❌ |
| `seguridad` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (rondines, extintores, visitas) | ❌ |
| `jefe_seguridad` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (todo) | ❌ |
| `encargado_vehiculos` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (solo vehículos/órdenes) | ❌ |

> `jefe_mantenimiento` tiene acceso idéntico a `empleado`. La distinción existe únicamente para enrutar notificaciones de correo electrónico de mantenimiento.

> `jefe_seguridad` tiene acceso completo al módulo de seguridad incluyendo la gestión de vehículos.

> `encargado_vehiculos` solo ve la sección de vehículos y órdenes dentro del módulo de seguridad.

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
¿URL es /solicitud-vehiculo?
    SÍ → Renderizar SolicitudVehiculoPublica (sin auth)
    NO ↓
¿Tiene token en localStorage?
    NO → Pantalla Login
    SÍ → Validar token con servidor
            ↓
        ¿Token válido?
            NO → Limpiar localStorage → Pantalla Login
            SÍ → ¿debeReiniciarPass?
                    SÍ → Modal ChangePassword (obligatorio)
                    NO → App principal según rol
```

---

### 8.2 Flujo de Cotización

```
1. Empleado crea cotización
   └── Selecciona catálogos, configura costos con fórmulas dinámicas

2. "Guardar Cotización" → POST /api/cotizaciones → Estado = "Pendiente"
   └── Email a autorizador1 + admin

3. "Enviar a Aprobación" → POST /api/cotizaciones/:id/enviar → Estado = "Enviada"
   └── Email a autorizador1 + admin

4. Autorizador aprueba o rechaza → POST /api/cotizaciones/:id/aprobar
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

### 8.6 Flujo de Orden de Vehículo *(nuevo en v3.0)*

```
1. Persona solicita vehículo (formulario público, sin login)
   └── POST /api/solicitud-vehiculo → SolicitudesVehiculo, Estado = "Pendiente"

2. Encargado de vehículos autoriza y crea orden de salida
   ├── Selecciona vehículo, asigna conductor, destino, motivo, km salida
   ├── Captura 4 fotos de salida (Frontal, Trasero, Lat. Izq, Lat. Der)
   │   └── Browser sube fotos a Cloudinary (carpeta 'vehiculos') → obtiene URLs
   └── POST /api/vehiculos/ordenes (con URLs de fotos) → Estado = "En uso"

3. Conductor regresa — encargado registra llegada
   ├── Ingresa KmLlegada, fecha/hora llegada, observaciones
   ├── Captura 4 fotos de llegada (mismos ángulos)
   │   └── Browser sube fotos a Cloudinary → obtiene URLs
   └── PUT /api/vehiculos/ordenes/:id/llegada (con URLs fotos) → Estado = "Completada"

4. Orden archivada con evidencia completa (8 fotos + datos de km y tiempos)
```

---

### 8.7 Flujo de Rondin de Seguridad *(nuevo en v3.0)*

```
1. Personal de seguridad inicia ronda
   └── Abre modal "Registrar Rondin" en pestaña Rondines

2. Por cada área revisada:
   ├── Selecciona Área, Turno, nombre del Responsable
   ├── Establece Estado: "Sin novedad" / "Con novedad"
   ├── Si hay novedad: describe la incidencia en campo de texto
   ├── Opcional: selecciona foto de evidencia
   │   └── Browser sube a Cloudinary (carpeta 'rondines') → URL guardada en FotoUrl
   └── Guarda registro → POST /api/seguridad/rondines

3. Jefe de seguridad o personal puede revisar/editar cualquier registro
   └── Modal se pre-carga con datos existentes → PUT /api/seguridad/rondines/:id

4. Tabla muestra enlace "📷 Foto" por cada registro que tenga FotoUrl
   └── Abre la imagen en nueva pestaña del navegador
```

---

## 9. Notificaciones por Correo Electrónico

El sistema usa **Nodemailer con Gmail SMTP** (`smtp.gmail.com:587`). Los correos son **fire-and-forget** implementados como async IIFE para no bloquear la respuesta de la API, con logging explícito en consola de Railway.

### 9.1 Infraestructura

```javascript
// Variables de entorno requeridas en Railway
SMTP_USER=correo@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx   // Contraseña de aplicación Google (16 caracteres)
APP_URL=https://cotizador-web.vercel.app
```

> Se debe usar una **contraseña de aplicación** de Google (no la contraseña principal). Se genera en: Cuenta Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones.

Si `SMTP_USER` / `SMTP_PASS` no están configurados, el sistema funciona normalmente pero registra en consola que los correos no se enviaron.

**Patrón de logging en Railway:**
```
📧 Cotización COT-000003 /enviar — autorizadores: admin@udat.com,autorizador@udat.com
✅ Email /enviar enviado a: admin@udat.com,autorizador@udat.com
❌ Error email /enviar cotización: [mensaje de error]
```

### 9.2 Funciones de Consulta de Destinatarios

| Función | Consulta | Descripción |
|---------|---------|-------------|
| `getEmailsDeRol(rol)` | `WHERE (Rol=@rol OR Rol='admin') AND Activo=1` | Rol específico + admins |
| `getEmailDeUsuario(nombre)` | `WHERE Nombre=@nombre AND Activo=1` | Usuario por nombre |
| `getEmailsPorRoles(roles[])` | `WHERE Rol IN (...) AND Activo=1` | Roles exactos, sin incluir admins |

### 9.3 Eventos y Destinatarios

| Módulo | Evento | Destinatarios |
|--------|--------|---------------|
| **OC** | OC creada | autorizador1 + admin + creador + todos los `empleado` |
| **OC** | Aprobada paso 1 | autorizador2 |
| **OC** | Aprobada paso 2 (final) | creador + todos los `empleado` |
| **OC** | Rechazada | creador + todos los `empleado` |
| **Cotización** | Creada (POST `/cotizaciones`) | autorizador1 + admin |
| **Cotización** | Enviada a aprobación (POST `/cotizaciones/:id/enviar`) | autorizador1 + admin |
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
| `emailCotizacionPendiente` | `Nueva cotización X requiere aprobación` | Folio, cliente, curso, total, creador |
| `emailCotizacionConfirmacion` | `Tu cotización fue registrada` | Confirmación al creador |
| `emailCotizacionResuelta` | `Cotización aprobada/rechazada` | Resultado con comentarios |

---

## 10. Evidencia Fotográfica (Cloudinary) *(nuevo en v3.0)*

### 10.1 Configuración

| Parámetro | Valor |
|-----------|-------|
| Cloud name | `kcj1hrdy` |
| Upload preset | `douxyql6` (tipo: Unsigned) |
| Carpeta vehículos | `vehiculos/` |
| Carpeta rondines | `rondines/` |
| Endpoint de upload | `https://api.cloudinary.com/v1_1/kcj1hrdy/image/upload` |

### 10.2 Flujo de Upload

El upload se realiza **100% en el browser**, sin pasar por el backend:

```
1. Usuario selecciona / captura foto
2. Frontend lee el archivo como base64 (FileReader)
3. Frontend llama uploadToCloudinary(base64, 'vehiculos') desde api.js
4. Petición directa a la API de Cloudinary (sin firma)
5. Cloudinary responde con { secure_url: "https://res.cloudinary.com/..." }
6. Frontend almacena la URL y la incluye en el payload al backend
7. Backend guarda solo la URL en la columna correspondiente de la BD
```

### 10.3 Por qué se usa upload sin firma (unsigned)

El preset de upload sin firma (`douxyql6`) permite subir imágenes directamente desde el browser sin necesitar que el servidor genere una firma criptográfica. Esto:
- Elimina la dependencia del SDK de Cloudinary en el backend
- Evita errores de firma inválida al eliminar la complejidad criptográfica del servidor
- Reduce la latencia al eliminar un round-trip al backend antes del upload
- No agrega paquetes npm al backend

### 10.4 Módulos que usan Cloudinary

| Módulo | Campo(s) | Carpeta |
|--------|---------|---------|
| Rondines | `FotoUrl` (1 foto por área) | `rondines/` |
| Órdenes vehículo — salida | `FotoSalidaFrontal`, `FotoSalidaTrasero`, `FotoSalidaLateralIzq`, `FotoSalidaLateralDer` | `vehiculos/` |
| Órdenes vehículo — llegada | `FotoLlegadaFrontal`, `FotoLlegadaTrasero`, `FotoLlegadaLateralIzq`, `FotoLlegadaLateralDer` | `vehiculos/` |

---

## 11. Lógica de Cálculos

### 11.1 Fórmulas de Cantidad en Costos de Cotización

| Fórmula | Cálculo | Ejemplo (3 sesiones, 5 días, 20 participantes) |
|---------|---------|-----------------------------------------------|
| `Sesiones x Días` | sesiones × días | 3 × 5 = **15** |
| `Participantes` | participantes | **20** |
| `Horas` | días × sesiones | 5 × 3 = **15** |
| `Eventos` | 1 | **1** |

---

### 11.2 Márgenes y Precios en Cotizaciones

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

### 11.3 Cálculo de Órdenes de Compra

```
Subtotal = Σ (Cantidad × PrecioUnitario) por cada línea
IVA      = Subtotal × 16%
Total    = Subtotal + IVA
```

---

### 11.4 Estado de Stock en Inventario

```sql
CASE
  WHEN CantidadReal <= 0               THEN 'agotado'
  WHEN CantidadReal < CantidadMinima   THEN 'bajo'      -- estrictamente menor
  ELSE                                      'ok'
END AS EstadoStock
```

> Nota: `CantidadReal = CantidadMinima` es estado `ok`, no `bajo`.

---

## 12. Configuración y Variables de Entorno

### Frontend — `cotizador-web/.env`
```env
VITE_API_BASE_URL=https://<proyecto>.up.railway.app/api
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

# SMTP (Gmail)
SMTP_USER=<correo@gmail.com>
SMTP_PASS=<contraseña_de_aplicación_16_caracteres>
APP_URL=https://cotizador-web.vercel.app
```

> **Nota sobre Cloudinary:** No se requieren variables de entorno en el backend para Cloudinary. El upload se hace directamente desde el browser usando el preset público `douxyql6`.

> **Importante:** El archivo `.env` nunca debe subirse al repositorio.

---

## 13. Instalación y Ejecución

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

Crear `.env` en cada proyecto con los valores de la sección 12.

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
  - El `vercel.json` debe tener `buildCommand: "npm run build"` y `outputDirectory: "dist"` para que Vercel encuentre el build de Vite correctamente
- **Backend:** Push a `main` en `cotizador-api` → Railway detecta y despliega automáticamente (~2 min)
- **Base de datos:** Las migraciones se aplican automáticamente al reiniciar el servidor en Railway

---

## 14. Dependencias

### Backend (`cotizador-api/package.json`)

| Paquete | Uso |
|---------|-----|
| `express` | Framework HTTP |
| `mssql` | Cliente SQL Server |
| `bcryptjs` | Hash de contraseñas |
| `jsonwebtoken` | Generación/validación JWT |
| `nodemailer` | Envío de correos electrónicos (Gmail SMTP) |
| `cors` | Cabeceras CORS |
| `dotenv` | Variables de entorno |

### Frontend (`cotizador-web/package.json`)

| Paquete | Uso |
|---------|-----|
| `react` + `react-dom` | UI Library |
| `vite` + `@vitejs/plugin-react` | Build tool y dev server |
| `jspdf` | Generación de PDFs en el cliente (descarga automática) |
| `bootstrap` | Componentes CSS adicionales |

> **Cloudinary:** Se consume mediante `fetch` nativo del navegador, sin paquete npm adicional.

---

## 15. Historial de Cambios

### v3.0 — Julio 2026

#### Nuevo: Módulo de Seguridad completo
- Nuevo componente `Seguridad.jsx` con pestañas: Rondines, Extintores, Visitas, Vehículos
- CRUD completo para rondines por área, extintores, visitas y catálogo de vehículos
- Órdenes de salida de vehículos con evidencia fotográfica (4 ángulos: Frontal, Trasero, Lateral Izq, Lateral Der) tanto en salida como en llegada
- Foto de evidencia en revisión de rondines (1 foto por área con preview y opción de eliminar)
- Columna "📷 Foto" en tabla de rondines con enlace directo a Cloudinary
- Tres nuevos roles: `seguridad`, `jefe_seguridad`, `encargado_vehiculos`
- Nuevas tablas: `RondinesArea`, `Extintores`, `Visitas`, `VehiculosSeguridad`, `OrdenesVehiculo`, `SolicitudesVehiculo`

#### Nuevo: Formulario Público de Solicitud de Vehículo
- Nuevo componente `SolicitudVehiculoPublica.jsx` accesible en `/solicitud-vehiculo` sin login
- Implementado como ruta especial antes de los guardias de autenticación en `App.jsx`

#### Nuevo: Integración con Cloudinary para fotos
- Upload directo browser→Cloudinary usando preset sin firma `douxyql6`
- Funciones `uploadFotoVehiculo` y `uploadFotoRondin` en `api.js`
- Migración automática de 8 columnas de fotos en tabla `OrdenesVehiculo` al iniciar el servidor

#### Fix: Correos de Cotización no se enviaban
- Corregido el manejo silencioso de errores en el email de creación (`.catch(() => {})` ocultaba todos los fallos)
- Añadido envío de correo al endpoint `POST /api/cotizaciones/:id/enviar` — antes solo actualizaba el estado en BD sin notificar
- Refactorizado a async IIFE con logging explícito (`📧`, `✅`, `❌`) visible en Railway

#### Fix: Autenticación — token expirado
- Corrección de la lógica en `api.js`: al recibir 401 ahora limpia `localStorage` y recarga la página sin bucle de redirecciones

#### Fix: Deploy en Vercel
- Corregido `vercel.json` con `buildCommand` y `outputDirectory` correctos para que Vercel encuentre el build generado por Vite

#### Cambios de infraestructura
- Backend migrado de **Render** a **Railway** (deploys ~2 min, sin cold starts prolongados)
- SMTP migrado de **Office 365** a **Gmail** con contraseña de aplicación

---

### v2.0 — Junio 2026

- Sistema de autenticación completo (JWT, cambio de contraseña, recuperación por código)
- Módulo de cotizaciones con fórmulas dinámicas y flujo de aprobación
- Módulo de órdenes de compra con aprobación en dos pasos
- Módulo de órdenes de mantenimiento con exportación a PDF
- Módulo de inventario con movimientos automáticos (ingresos por OC, consumos por mantenimiento)
- Dashboard con KPIs y gráficos
- Gestión de usuarios y catálogos (solo admin)
- Notificaciones por correo electrónico en todos los eventos clave
- Auto-migración de base de datos al iniciar el servidor

---

*Documentación actualizada el 9 de julio de 2026. Versión 3.0.*
