# Cotizador Backend

Este backend expone la API necesaria para usar las tablas de la base de datos `CotizadorServiciosUDAT`.

## Instalación

1. Copia `.env.example` a `.env`.
2. Llena los valores con tu conexión a SQL Server.
3. Ejecuta:

```bash
cd server
npm install
```

## Ejecución

```bash
cd server
npm run dev
```

La API quedará disponible en `http://localhost:4000`.

## Endpoints principales

- `GET /api/catalogos/clientes`
- `GET /api/catalogos/cursos`
- `GET /api/catalogos/coaches`
- `GET /api/catalogos/modalidades`
- `GET /api/catalogos/conceptos`
- `GET /api/catalogos/proveedores`
- `GET /api/catalogos/unidadesnegocio`
- `GET /api/catalogos/estados`
- `GET /api/catalogos/participantes?search=...`
- `GET /api/cotizaciones`
- `GET /api/cotizaciones/:id`
- `POST /api/cotizaciones`
- `GET /api/ordenescompra`
- `POST /api/ordenescompra`
- `PUT /api/ordenescompra/:id`

## Siguiente paso

Conectar el front-end en `cotizador-web` a estos endpoints para cargar catálogos, guardar cotizaciones y seleccionar participantes.
