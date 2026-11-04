# Módulo Lean 5S — Documentación

## Descripción General

Sistema de implementación de la metodología **5S Lean Manufacturing** para talleres UDAT. Permite registrar, clasificar y dar seguimiento a elementos en áreas de trabajo a través de 3 plataformas:

- **Backend**: Node.js + Express + MSSQL (Azure VM `biUDAT`) — desplegado en Render
- **App Android**: Kotlin (LEAN) — proyecto local en Android Studio
- **Web Dashboard**: React/Vite — desplegado en Vercel

---

## Arquitectura

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  App Android  │────▶│   API REST       │◀────│  Web React   │
│  (Kotlin)     │     │  (Render)        │     │  (Vercel)    │
└──────────────┘     │                  │     └──────────────┘
                      │  cotizador-api   │
                      │  /api/cincos/*   │
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │   SQL Server     │
                      │   biUDAT (Azure) │
                      └──────────────────┘
                               │
                      ┌────────▼─────────┐
                      │   Cloudinary     │
                      │   (Fotos)        │
                      └──────────────────┘
```

**API Base URL**: `https://cotizador-api-hutz.onrender.com/api/`

---

## Flujo de Trabajo

### 1. Configuración del Proyecto (Setup)
- Crear proyecto 5S con empresa, gerente y encargado
- Definir terminales (sucursales/plantas)
- Definir áreas por terminal (Baños, Oficinas, Talleres, etc.)
- Asignar un **Champion** (usuario del sistema) a cada área

### 2. Implementar 1S — Inventario y Clasificación
- Registrar elementos/equipos/herramientas por área
- Capturar foto del elemento (Cloudinary)
- Clasificar: **Necesario**, **Innecesario** o **Dudoso**
- Registrar frecuencia de uso: Diario, Semanal, Ocasional
- Registrar estado: Funciona, No funciona, Necesita reparación, Evaluar
- El sistema calcula automáticamente la **acción recomendada**

### 3. Acciones del Champion — Ejecución
- Acciones generadas automáticamente según clasificación:
  - **Eliminar**: elementos innecesarios o que no funcionan
  - **Reparar**: elementos que necesitan reparación
  - **Red Tag**: elementos dudosos que requieren evaluación
  - **Reubicar**: elementos necesarios pero de uso ocasional
  - **Mantener**: elementos en buen estado y uso frecuente
- El Champion marca acciones como completadas
- Dashboard con progreso por tipo y por área

---

## Lógica de Acción Recomendada

```
Si clasificación = "innecesario"         → Eliminar
Si clasificación = "dudoso"              → Red Tag
Si estado = "no_funciona"               → Eliminar
Si estado = "necesita_reparacion"       → Reparar
Si estado = "evaluar"                   → Red Tag
Si frecuencia = "ocasional"             → Reubicar
Default                                 → Mantener
```

---

## Filtro de Áreas por Champion

Los Champions **solo ven las áreas que tienen asignadas** en los dropdowns de la app y web. Esto se controla mediante:

- **Backend**: El campo `ChampionId` en `CincoS_Areas` vincula al `UsuarioId` de la tabla `Usuarios`
- **Android**: `RegistroFragment` filtra `areas.filter { it.ChampionId == userId }`
- **Fallback**: Si un usuario no tiene áreas asignadas (admin/facilitador), ve todas las áreas

### Requisito de sesión
El `UsuarioId` se guarda en `SessionManager` al iniciar sesión. Si la sesión es antigua (sin UsuarioId), el `LoginFragment` fuerza un re-login automático.

---

## Permisos

El módulo se controla desde **Permisos** en el panel web:
- Vista ID: `cincos`
- Ubicada en la sección **Herramientas** del grid de permisos
- Los roles que tengan el checkbox `Lean 5S` activado verán el módulo en el sidebar

---

## Diseño — Tema Oscuro (Android)

La app Android usa un tema oscuro consistente con la app UDAT DVIR:

| Token            | Color     | Uso                        |
|------------------|-----------|----------------------------|
| Background       | `#0F172A` | Fondo principal            |
| Surface/Cards    | `#1E293B` | Cards, toolbars, dialogs   |
| Borders          | `#334155` | Bordes de inputs/spinners  |
| Title text       | `#F1F5F9` | Texto principal            |
| Subtitle text    | `#64748B` | Texto secundario           |
| Label text       | `#94A3B8` | Labels y texto muted       |
| Primary blue     | `#2563EB` | Acciones primarias         |
| Accent blue      | `#3B82F6` | Tab indicators, checkboxes |
| Error red        | `#F87171` | Errores, eliminar          |

### Estilos de tema (`themes.xml`)
- `Base.Theme.LEAN`: Material3 DayNight NoActionBar con colores oscuros
- `Theme.LEAN.Dialog`: Overlay para MaterialAlertDialogBuilder con surface oscuro

---

## Funcionalidades Implementadas

### App Android
- [x] Login con guardado de UsuarioId
- [x] Re-login forzado si sesión antigua
- [x] Home con cards de módulos (estilo UDATDVIR)
- [x] Registro de elementos con foto (cámara con permisos runtime)
- [x] Upload a Cloudinary
- [x] Clasificación con Chips (Necesario/Innecesario/Dudoso)
- [x] Acción recomendada automática
- [x] Filtro de áreas por Champion
- [x] Labels de área incluyen nombre de terminal
- [x] Vista de acciones con tabs (Eliminar/Reparar/Red Tags)
- [x] Progreso general por tipo
- [x] Dialog de detalle al tocar un elemento (foto grande + todos los datos)
- [x] Dialog de detalle al tocar una acción
- [x] Tema oscuro completo (status bar, navigation bar, dialogs, spinners)
- [x] Iconos SVG vectoriales (camera, back, clipboard, dashboard, 5s)

### Web Dashboard
- [x] CRUD de proyectos 5S (crear, editar)
- [x] Configuración de terminales y áreas con asignación de Champions
- [x] Registro de elementos con foto y clasificación
- [x] Modal de detalle de elemento con foto ampliable (lightbox)
- [x] Lightbox de fotos en vista de acciones
- [x] Vista de acciones del Champion con tabs SVG
- [x] Dashboard KPI (progreso por tipo + avance por área)
- [x] Iconos SVG en tabs, badges, botones de editar/eliminar
- [x] Cards de módulo con iconos SVG y gradientes
- [x] Módulo en panel de permisos (`cincos`)

### Backend (endpoints utilizados)
- `POST /api/login` — Login con retorno de UsuarioId
- `GET /api/cincos/proyectos` — Listar proyectos
- `GET /api/cincos/proyectos/:id` — Detalle con terminales y áreas
- `POST /api/cincos/proyectos` — Crear proyecto
- `PUT /api/cincos/proyectos/:id` — Editar proyecto
- `GET /api/cincos/areas?proyectoId=` — Áreas (incluye ChampionId, Terminal)
- `GET /api/cincos/elementos` — Elementos filtrados
- `POST /api/cincos/elementos` — Crear elemento
- `PUT /api/cincos/elementos/:id` — Editar elemento
- `DELETE /api/cincos/elementos/:id` — Eliminar elemento
- `GET /api/cincos/acciones` — Acciones por tipo
- `PUT /api/cincos/acciones/:id` — Actualizar estatus de acción
- `GET /api/cincos/dashboard/:proyectoId` — Resumen y avance por área
- `POST /api/cincos/upload` — Subir foto (base64 → Cloudinary)
- `GET /api/cincos/usuarios` — Usuarios para selector de Champion

---

## Archivos Clave

### Android (`LEAN/app/src/main/`)
| Archivo | Descripción |
|---------|-------------|
| `java/.../ui/auth/LoginFragment.kt` | Login con UsuarioId, re-login forzado |
| `java/.../ui/auth/HomeFragment.kt` | Pantalla principal con cards de módulos |
| `java/.../ui/registro/RegistroFragment.kt` | Inventario, filtro por Champion, dialog nuevo elemento |
| `java/.../ui/registro/ElementosAdapter.kt` | Lista de elementos con click → detalle |
| `java/.../ui/acciones/AccionesFragment.kt` | Tabs de acciones, progreso |
| `java/.../ui/acciones/AccionesAdapter.kt` | Lista de acciones con click → detalle |
| `java/.../utils/DetalleHelper.kt` | Dialogs de detalle (elemento y acción) |
| `java/.../utils/AccionHelper.kt` | Lógica de acción recomendada |
| `java/.../utils/SessionManager.kt` | Manejo de sesión con UsuarioId |
| `res/values/themes.xml` | Tema oscuro + Theme.LEAN.Dialog |
| `res/layout/dialog_detalle_elemento.xml` | Layout del dialog de detalle |
| `res/layout/dialog_nuevo_elemento.xml` | Layout del dialog de nuevo elemento |

### Web (`CotizadorServiciosUDAT/src/`)
| Archivo | Descripción |
|---------|-------------|
| `CincoS.jsx` | Componente principal: Setup, Registro, Acciones, Dashboard |
| `PermisosPanel.jsx` | Panel de permisos (incluye vista `cincos`) |
| `App.jsx` | Routing, sidebar con icono lean5s, vista cincos |
| `api.js` | Funciones de API para 5S |

---

## Pendiente / Futuro
- Implementación de 2S, 3S, 4S, 5S
- Auditorías periódicas
- Reportes exportables (PDF)
- Notificaciones push al Champion
- Historial de cambios por elemento
