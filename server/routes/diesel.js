import express from 'express';
import sql from 'mssql';
import { getPool } from '../db.js';
import { autenticar } from '../middleware/autenticar.js';

const router = express.Router();

let tablesReady = false;

async function requirePool(res) {
  const pool = await getPool();
  if (!pool) { res.status(500).json({ error: 'No hay conexión SQL' }); return null; }
  return pool;
}

async function ensureTables(pool) {
  if (tablesReady) return;

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CargasDiesel' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE CargasDiesel (
      CargaId        INT IDENTITY(1,1) PRIMARY KEY,
      VehiculoId     INT NULL,
      VehiculoNombre NVARCHAR(400) NULL,
      Fecha          DATE NOT NULL,
      Tipo           NVARCHAR(50) NOT NULL DEFAULT 'diesel',
      Litros         DECIMAL(10,2) NOT NULL,
      KmActual       INT NULL,
      KmRecorridos   INT NULL,
      Rendimiento    DECIMAL(10,2) NULL,
      ValorPesos     DECIMAL(10,2) NULL,
      FolioTicket    NVARCHAR(100) NULL,
      Terminal       NVARCHAR(200) NULL,
      OperadorNombre NVARCHAR(400) NULL,
      UrlFotoTicket  NVARCHAR(1000) NULL,
      CreatedAt      DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DieselPrecios' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE DieselPrecios (
      PrecioId         INT IDENTITY(1,1) PRIMARY KEY,
      TipoCombustible  NVARCHAR(50) NOT NULL,
      PrecioPorLitro   DECIMAL(10,2) NOT NULL DEFAULT 0
    );
  `);

  // Seed default prices if empty
  const cnt = await pool.request().query('SELECT COUNT(*) AS c FROM DieselPrecios');
  if (cnt.recordset[0].c === 0) {
    await pool.request().query(`
      INSERT INTO DieselPrecios (TipoCombustible,PrecioPorLitro) VALUES ('diesel',0),('gasolina',0),('urea',0)
    `);
  }

  tablesReady = true;
}

// Compute km recorridos and rendimiento
async function computeRendimiento(pool, vehiculoId, kmActual, litros) {
  if (!vehiculoId || !kmActual) return { kmRecorridos: null, rendimiento: null };

  const prev = await pool.request()
    .input('vid', sql.Int, vehiculoId)
    .input('km', sql.Int, kmActual)
    .query(`SELECT TOP 1 KmActual FROM CargasDiesel
            WHERE VehiculoId=@vid AND KmActual IS NOT NULL AND KmActual < @km
            ORDER BY KmActual DESC`);

  if (!prev.recordset[0]) return { kmRecorridos: null, rendimiento: null };

  const kmRecorridos = kmActual - prev.recordset[0].KmActual;
  const rendimiento = litros > 0 ? Math.round((kmRecorridos / litros) * 100) / 100 : null;
  return { kmRecorridos, rendimiento };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/diesel/cargas
router.get('/cargas', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const result = await pool.request().query('SELECT * FROM CargasDiesel ORDER BY Fecha DESC, CargaId DESC');
  res.json(result.recordset);
});

// POST /api/diesel/cargas
router.post('/cargas', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const b = req.body;

  const { kmRecorridos, rendimiento } = await computeRendimiento(pool, b.vehiculoId, b.kmActual, b.litros);

  const ins = await pool.request()
    .input('vid', sql.Int, b.vehiculoId || null)
    .input('vnom', sql.NVarChar(400), b.vehiculoNombre || null)
    .input('fecha', sql.Date, b.fecha)
    .input('tipo', sql.NVarChar(50), b.tipo || 'diesel')
    .input('litros', sql.Decimal(10, 2), b.litros)
    .input('km', sql.Int, b.kmActual || null)
    .input('kmR', sql.Int, kmRecorridos)
    .input('rend', sql.Decimal(10, 2), rendimiento)
    .input('valor', sql.Decimal(10, 2), b.valorPesos ?? null)
    .input('folio', sql.NVarChar(100), b.folioTicket || null)
    .input('term', sql.NVarChar(200), b.terminal || null)
    .input('oper', sql.NVarChar(400), b.operadorNombre || null)
    .input('foto', sql.NVarChar(1000), b.urlFotoTicket || null)
    .query(`INSERT INTO CargasDiesel (VehiculoId,VehiculoNombre,Fecha,Tipo,Litros,KmActual,KmRecorridos,Rendimiento,ValorPesos,FolioTicket,Terminal,OperadorNombre,UrlFotoTicket)
            OUTPUT INSERTED.*
            VALUES (@vid,@vnom,@fecha,@tipo,@litros,@km,@kmR,@rend,@valor,@folio,@term,@oper,@foto)`);

  res.status(201).json(ins.recordset[0]);
});

// PUT /api/diesel/cargas/:id
router.put('/cargas/:id', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const b = req.body;

  await pool.request()
    .input('id', sql.Int, parseInt(req.params.id))
    .input('vnom', sql.NVarChar(400), b.vehiculoNombre || null)
    .input('fecha', sql.Date, b.fecha)
    .input('tipo', sql.NVarChar(50), b.tipo || 'diesel')
    .input('litros', sql.Decimal(10, 2), b.litros)
    .input('km', sql.Int, b.kmActual || null)
    .input('valor', sql.Decimal(10, 2), b.valorPesos ?? null)
    .input('folio', sql.NVarChar(100), b.folioTicket || null)
    .input('oper', sql.NVarChar(400), b.operadorNombre || null)
    .query(`UPDATE CargasDiesel SET VehiculoNombre=@vnom, Fecha=@fecha, Tipo=@tipo, Litros=@litros,
            KmActual=@km, ValorPesos=@valor, FolioTicket=@folio, OperadorNombre=@oper
            WHERE CargaId=@id`);

  res.json({ ok: true });
});

// DELETE /api/diesel/cargas/:id
router.delete('/cargas/:id', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  await pool.request()
    .input('id', sql.Int, parseInt(req.params.id))
    .query('DELETE FROM CargasDiesel WHERE CargaId=@id');
  res.json({ ok: true });
});

// GET /api/diesel/precio
router.get('/precio', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const result = await pool.request().query('SELECT TipoCombustible, PrecioPorLitro FROM DieselPrecios');
  const obj = {};
  result.recordset.forEach(r => { obj[r.TipoCombustible] = r.PrecioPorLitro; });
  res.json(obj);
});

// PUT /api/diesel/precio
router.put('/precio', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const { diesel, gasolina, urea } = req.body;

  for (const [tipo, precio] of [['diesel', diesel], ['gasolina', gasolina], ['urea', urea]]) {
    if (precio != null) {
      await pool.request()
        .input('tipo', sql.NVarChar(50), tipo)
        .input('precio', sql.Decimal(10, 2), Number(precio))
        .query(`IF EXISTS (SELECT 1 FROM DieselPrecios WHERE TipoCombustible=@tipo)
                  UPDATE DieselPrecios SET PrecioPorLitro=@precio WHERE TipoCombustible=@tipo
                ELSE
                  INSERT INTO DieselPrecios (TipoCombustible,PrecioPorLitro) VALUES (@tipo,@precio)`);
    }
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/diesel/publico/vehiculos — vehicle list for public form
router.get('/publico/vehiculos', async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  // Reuse DVIRVehiculos if it exists, otherwise return empty
  try {
    const result = await pool.request().query(`
      IF EXISTS (SELECT 1 FROM sys.tables WHERE name='DVIRVehiculos' AND schema_id=SCHEMA_ID('dbo'))
        SELECT VehiculoId, Nombre FROM DVIRVehiculos WHERE Activo=1 ORDER BY Nombre
      ELSE
        SELECT 1 WHERE 1=0
    `);
    res.json(result.recordset);
  } catch {
    res.json([]);
  }
});

// GET /api/diesel/publico/precios — fuel prices for public form
router.get('/publico/precios', async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const result = await pool.request().query('SELECT TipoCombustible, PrecioPorLitro FROM DieselPrecios');
  const obj = {};
  result.recordset.forEach(r => { obj[r.TipoCombustible] = r.PrecioPorLitro; });
  res.json(obj);
});

// POST /api/diesel/publico/cargas — submit fuel charge (public)
router.post('/publico/cargas', async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const b = req.body;

  if (!b.litros || !b.fecha) return res.status(400).json({ error: 'Litros y fecha son obligatorios' });

  const { kmRecorridos, rendimiento } = await computeRendimiento(pool, b.vehiculoId, b.kmActual, b.litros);

  const ins = await pool.request()
    .input('vid', sql.Int, b.vehiculoId || null)
    .input('vnom', sql.NVarChar(400), b.vehiculoNombre || null)
    .input('fecha', sql.Date, b.fecha)
    .input('tipo', sql.NVarChar(50), b.tipo || 'diesel')
    .input('litros', sql.Decimal(10, 2), b.litros)
    .input('km', sql.Int, b.kmActual || null)
    .input('kmR', sql.Int, kmRecorridos)
    .input('rend', sql.Decimal(10, 2), rendimiento)
    .input('valor', sql.Decimal(10, 2), b.valorPesos ?? null)
    .input('folio', sql.NVarChar(100), b.folioTicket || null)
    .input('term', sql.NVarChar(200), b.terminal || null)
    .input('oper', sql.NVarChar(400), b.operadorNombre || null)
    .input('foto', sql.NVarChar(1000), b.urlFotoTicket || null)
    .query(`INSERT INTO CargasDiesel (VehiculoId,VehiculoNombre,Fecha,Tipo,Litros,KmActual,KmRecorridos,Rendimiento,ValorPesos,FolioTicket,Terminal,OperadorNombre,UrlFotoTicket)
            OUTPUT INSERTED.CargaId
            VALUES (@vid,@vnom,@fecha,@tipo,@litros,@km,@kmR,@rend,@valor,@folio,@term,@oper,@foto)`);

  res.status(201).json({ ok: true, cargaId: ins.recordset[0].CargaId });
});

export default router;
