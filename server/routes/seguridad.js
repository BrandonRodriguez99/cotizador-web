import express from 'express';
import sql from 'mssql';
import { getPool } from '../db.js';
import { autenticar } from '../middleware/autenticar.js';

const router = express.Router();

async function requirePool(res) {
  const pool = await getPool();
  if (!pool) { res.status(500).json({ error: 'No hay conexión SQL' }); return null; }
  return pool;
}

function generateFolio() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VH-${y}${m}-${r}`;
}

// ─── Vehiculos CRUD ──────────────────────────────────────────────────────────

router.get('/vehiculos', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(`SELECT * FROM Vehiculos ORDER BY FechaCreacion DESC`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/vehiculos', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Marca, Modelo, Placa, Año, Color, Capacidad } = req.body;
    const r = await pool.request()
      .input('Marca', sql.NVarChar, Marca)
      .input('Modelo', sql.NVarChar, Modelo)
      .input('Placa', sql.NVarChar, Placa)
      .input('Año', sql.Int, Año || null)
      .input('Color', sql.NVarChar, Color || null)
      .input('Capacidad', sql.Int, Capacidad || null)
      .query(`INSERT INTO Vehiculos (Marca, Modelo, Placa, Año, Color, Capacidad)
              OUTPUT INSERTED.*
              VALUES (@Marca, @Modelo, @Placa, @Año, @Color, @Capacidad)`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/vehiculos/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Marca, Modelo, Placa, Año, Color, Capacidad, Activo } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Marca', sql.NVarChar, Marca)
      .input('Modelo', sql.NVarChar, Modelo)
      .input('Placa', sql.NVarChar, Placa)
      .input('Año', sql.Int, Año || null)
      .input('Color', sql.NVarChar, Color || null)
      .input('Capacidad', sql.Int, Capacidad || null)
      .input('Activo', sql.Bit, Activo != null ? Activo : 1)
      .query(`UPDATE Vehiculos SET Marca=@Marca, Modelo=@Modelo, Placa=@Placa,
              Año=@Año, Color=@Color, Capacidad=@Capacidad, Activo=@Activo
              WHERE VehiculoId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/vehiculos/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM Vehiculos WHERE VehiculoId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Semirremolques CRUD ─────────────────────────────────────────────────────

router.get('/semirremolques', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(
      `IF EXISTS (SELECT 1 FROM sys.tables WHERE name='Semirremolques')
       SELECT * FROM Semirremolques ORDER BY SemirremolqueId DESC
       ELSE SELECT 1 WHERE 1=0`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/semirremolques', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { NumeroEconomico, Placa, Tipo, Capacidad } = req.body;
    const r = await pool.request()
      .input('NumeroEconomico', sql.NVarChar, NumeroEconomico)
      .input('Placa', sql.NVarChar, Placa)
      .input('Tipo', sql.NVarChar, Tipo || null)
      .input('Capacidad', sql.NVarChar, Capacidad || null)
      .query(`INSERT INTO Semirremolques (NumeroEconomico, Placa, Tipo, Capacidad)
              OUTPUT INSERTED.*
              VALUES (@NumeroEconomico, @Placa, @Tipo, @Capacidad)`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/semirremolques/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { NumeroEconomico, Placa, Tipo, Capacidad } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('NumeroEconomico', sql.NVarChar, NumeroEconomico)
      .input('Placa', sql.NVarChar, Placa)
      .input('Tipo', sql.NVarChar, Tipo || null)
      .input('Capacidad', sql.NVarChar, Capacidad || null)
      .query(`UPDATE Semirremolques SET NumeroEconomico=@NumeroEconomico, Placa=@Placa,
              Tipo=@Tipo, Capacidad=@Capacidad WHERE SemirremolqueId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/semirremolques/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM Semirremolques WHERE SemirremolqueId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Ordenes Vehículo ────────────────────────────────────────────────────────

router.get('/ordenes-vehiculo', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const rq = pool.request();
    let where = '1=1';

    if (req.query.estado) {
      rq.input('estado', sql.NVarChar, req.query.estado);
      where += ' AND o.Estado = @estado';
    }
    if (req.query.mine === '1') {
      rq.input('solicitante', sql.NVarChar, req.usuario.nombre);
      where += ' AND o.Solicitante = @solicitante';
    }

    const r = await rq.query(`
      SELECT o.*, v.Marca + ' ' + v.Modelo + ' (' + v.Placa + ')' AS VehiculoNombre
      FROM OrdenesVehiculo o
      LEFT JOIN Vehiculos v ON v.VehiculoId = o.VehiculoId
      WHERE ${where}
      ORDER BY o.FechaCreacion DESC
    `);

    const ids = r.recordset.map(o => o.OrdenVehiculoId);
    let alumnosMap = {};
    if (ids.length > 0) {
      const aR = await pool.request().query(
        `SELECT * FROM OrdenesVehiculoAlumnos WHERE OrdenVehiculoId IN (${ids.join(',')})`
      );
      for (const a of aR.recordset) {
        if (!alumnosMap[a.OrdenVehiculoId]) alumnosMap[a.OrdenVehiculoId] = [];
        alumnosMap[a.OrdenVehiculoId].push(a);
      }
    }

    const result = r.recordset.map(o => ({
      ...o,
      Alumnos: alumnosMap[o.OrdenVehiculoId] || [],
    }));

    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ordenes-vehiculo', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { VehiculoId, Destino, Motivo, FechaSalidaEstimada, HoraSalidaEstimada, Pasajeros, Alumnos,
            FotoSalidaFrontal, FotoSalidaTrasero, FotoSalidaLateralIzq, FotoSalidaLateralDer } = req.body;
    const folio = generateFolio();
    const r = await pool.request()
      .input('Folio', sql.NVarChar, folio)
      .input('VehiculoId', sql.Int, VehiculoId)
      .input('Solicitante', sql.NVarChar, req.usuario.nombre)
      .input('Destino', sql.NVarChar, Destino)
      .input('Motivo', sql.NVarChar, Motivo || null)
      .input('FechaSalidaEstimada', sql.Date, FechaSalidaEstimada || null)
      .input('HoraSalidaEstimada', sql.NVarChar, HoraSalidaEstimada || null)
      .input('Pasajeros', sql.Int, Pasajeros || null)
      .input('FotoSalidaFrontal', sql.NVarChar, FotoSalidaFrontal || null)
      .input('FotoSalidaTrasero', sql.NVarChar, FotoSalidaTrasero || null)
      .input('FotoSalidaLateralIzq', sql.NVarChar, FotoSalidaLateralIzq || null)
      .input('FotoSalidaLateralDer', sql.NVarChar, FotoSalidaLateralDer || null)
      .query(`INSERT INTO OrdenesVehiculo
              (Folio, VehiculoId, Solicitante, Destino, Motivo, FechaSalidaEstimada, HoraSalidaEstimada, Pasajeros, Estado,
               FotoSalidaFrontal, FotoSalidaTrasero, FotoSalidaLateralIzq, FotoSalidaLateralDer)
              OUTPUT INSERTED.*
              VALUES (@Folio, @VehiculoId, @Solicitante, @Destino, @Motivo, @FechaSalidaEstimada, @HoraSalidaEstimada, @Pasajeros, 'pendiente',
                      @FotoSalidaFrontal, @FotoSalidaTrasero, @FotoSalidaLateralIzq, @FotoSalidaLateralDer)`);

    const orden = r.recordset[0];

    if (Array.isArray(Alumnos) && Alumnos.length > 0) {
      for (const al of Alumnos) {
        await pool.request()
          .input('OrdenVehiculoId', sql.Int, orden.OrdenVehiculoId)
          .input('Matricula', sql.NVarChar, al.Matricula || null)
          .input('Nombre', sql.NVarChar, al.Nombre || null)
          .query(`INSERT INTO OrdenesVehiculoAlumnos (OrdenVehiculoId, Matricula, Nombre)
                  VALUES (@OrdenVehiculoId, @Matricula, @Nombre)`);
      }
    }

    res.json(orden);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/ordenes-vehiculo/:id/autorizar', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('AutorizadoPor', sql.NVarChar, req.usuario.nombre)
      .query(`UPDATE OrdenesVehiculo SET Estado='autorizada', AutorizadoPor=@AutorizadoPor, FechaAutorizacion=GETDATE()
              WHERE OrdenVehiculoId=@id AND Estado='pendiente'`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/ordenes-vehiculo/:id/rechazar', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('MotivoRechazo', sql.NVarChar, req.body.MotivoRechazo || '')
      .query(`UPDATE OrdenesVehiculo SET Estado='rechazada', MotivoRechazo=@MotivoRechazo
              WHERE OrdenVehiculoId=@id AND Estado='pendiente'`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/ordenes-vehiculo/:id/salida', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { KmInicial, FotoSalidaFrontal, FotoSalidaTrasero, FotoSalidaLateralIzq, FotoSalidaLateralDer } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('KmInicial', sql.Decimal(18, 2), KmInicial || null)
      .input('RegistradoPorSalida', sql.NVarChar, req.usuario.nombre)
      .input('FotoSalidaFrontal', sql.NVarChar, FotoSalidaFrontal || null)
      .input('FotoSalidaTrasero', sql.NVarChar, FotoSalidaTrasero || null)
      .input('FotoSalidaLateralIzq', sql.NVarChar, FotoSalidaLateralIzq || null)
      .input('FotoSalidaLateralDer', sql.NVarChar, FotoSalidaLateralDer || null)
      .query(`UPDATE OrdenesVehiculo SET Estado='en_curso', KmInicial=@KmInicial,
              HoraSalidaReal=GETDATE(), RegistradoPorSalida=@RegistradoPorSalida,
              FotoSalidaFrontal=COALESCE(@FotoSalidaFrontal, FotoSalidaFrontal),
              FotoSalidaTrasero=COALESCE(@FotoSalidaTrasero, FotoSalidaTrasero),
              FotoSalidaLateralIzq=COALESCE(@FotoSalidaLateralIzq, FotoSalidaLateralIzq),
              FotoSalidaLateralDer=COALESCE(@FotoSalidaLateralDer, FotoSalidaLateralDer)
              WHERE OrdenVehiculoId=@id AND Estado='autorizada'`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/ordenes-vehiculo/:id/llegada', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { KmFinal, Observaciones, FotoLlegadaFrontal, FotoLlegadaTrasero, FotoLlegadaLateralIzq, FotoLlegadaLateralDer } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('KmFinal', sql.Decimal(18, 2), KmFinal || null)
      .input('Observaciones', sql.NVarChar, Observaciones || null)
      .input('RegistradoPorLlegada', sql.NVarChar, req.usuario.nombre)
      .input('FotoLlegadaFrontal', sql.NVarChar, FotoLlegadaFrontal || null)
      .input('FotoLlegadaTrasero', sql.NVarChar, FotoLlegadaTrasero || null)
      .input('FotoLlegadaLateralIzq', sql.NVarChar, FotoLlegadaLateralIzq || null)
      .input('FotoLlegadaLateralDer', sql.NVarChar, FotoLlegadaLateralDer || null)
      .query(`UPDATE OrdenesVehiculo SET Estado='completada', KmFinal=@KmFinal,
              HoraLlegada=GETDATE(), Observaciones=@Observaciones,
              RegistradoPorLlegada=@RegistradoPorLlegada,
              FotoLlegadaFrontal=@FotoLlegadaFrontal, FotoLlegadaTrasero=@FotoLlegadaTrasero,
              FotoLlegadaLateralIzq=@FotoLlegadaLateralIzq, FotoLlegadaLateralDer=@FotoLlegadaLateralDer
              WHERE OrdenVehiculoId=@id AND Estado='en_curso'`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/ordenes-vehiculo/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM OrdenesVehiculoAlumnos WHERE OrdenVehiculoId=@id`);
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM OrdenesVehiculo WHERE OrdenVehiculoId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Actualizar kilometraje ──────────────────────────────────────────────────

router.put('/ordenes-vehiculo/:id/km', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { KmInicial, KmFinal } = req.body;
    const sets = [];
    const rq = pool.request().input('id', sql.Int, req.params.id);
    if (KmInicial !== undefined) {
      rq.input('KmInicial', sql.Decimal(18, 2), KmInicial);
      sets.push('KmInicial=@KmInicial');
    }
    if (KmFinal !== undefined) {
      rq.input('KmFinal', sql.Decimal(18, 2), KmFinal);
      sets.push('KmFinal=@KmFinal');
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    await rq.query(`UPDATE OrdenesVehiculo SET ${sets.join(', ')} WHERE OrdenVehiculoId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/dashboard', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const ordenes = await pool.request().query(`SELECT Estado, COUNT(*) as total FROM OrdenesVehiculo GROUP BY Estado`);
    const vehiculos = await pool.request().query(`SELECT COUNT(*) as total FROM Vehiculos WHERE Activo=1`);
    const hoy = await pool.request().query(
      `SELECT COUNT(*) as total FROM OrdenesVehiculo WHERE CAST(FechaSalidaEstimada AS DATE)=CAST(GETDATE() AS DATE)`
    );
    res.json({
      ordenesPorEstado: ordenes.recordset,
      vehiculosActivos: vehiculos.recordset[0]?.total || 0,
      salidasHoy: hoy.recordset[0]?.total || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Extintores ──────────────────────────────────────────────────────────────

router.get('/extintores', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(
      `IF EXISTS (SELECT 1 FROM sys.tables WHERE name='Extintores')
       SELECT * FROM Extintores ORDER BY ExtintorId DESC
       ELSE SELECT 1 WHERE 1=0`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/extintores', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Codigo, Ubicacion, Tipo, Capacidad, FechaVencimiento } = req.body;
    const r = await pool.request()
      .input('Codigo', sql.NVarChar, Codigo)
      .input('Ubicacion', sql.NVarChar, Ubicacion || null)
      .input('Tipo', sql.NVarChar, Tipo || null)
      .input('Capacidad', sql.NVarChar, Capacidad || null)
      .input('FechaVencimiento', sql.Date, FechaVencimiento || null)
      .query(`INSERT INTO Extintores (Codigo, Ubicacion, Tipo, Capacidad, FechaVencimiento)
              OUTPUT INSERTED.*
              VALUES (@Codigo, @Ubicacion, @Tipo, @Capacidad, @FechaVencimiento)`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/extintores/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Codigo, Ubicacion, Tipo, Capacidad, FechaVencimiento } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Codigo', sql.NVarChar, Codigo)
      .input('Ubicacion', sql.NVarChar, Ubicacion || null)
      .input('Tipo', sql.NVarChar, Tipo || null)
      .input('Capacidad', sql.NVarChar, Capacidad || null)
      .input('FechaVencimiento', sql.Date, FechaVencimiento || null)
      .query(`UPDATE Extintores SET Codigo=@Codigo, Ubicacion=@Ubicacion,
              Tipo=@Tipo, Capacidad=@Capacidad, FechaVencimiento=@FechaVencimiento
              WHERE ExtintorId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/extintores/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM Extintores WHERE ExtintorId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/extintores/:id/revisiones', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().input('id', sql.Int, req.params.id)
      .query(`IF EXISTS (SELECT 1 FROM sys.tables WHERE name='RevisionesExtintores')
              SELECT * FROM RevisionesExtintores WHERE ExtintorId=@id ORDER BY FechaRevision DESC
              ELSE SELECT 1 WHERE 1=0`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/revisiones-extintores', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { ExtintorId, Estado, Observaciones } = req.body;
    const r = await pool.request()
      .input('ExtintorId', sql.Int, ExtintorId)
      .input('Estado', sql.NVarChar, Estado || 'ok')
      .input('Observaciones', sql.NVarChar, Observaciones || null)
      .input('RevisadoPor', sql.NVarChar, req.usuario.nombre)
      .query(`INSERT INTO RevisionesExtintores (ExtintorId, Estado, Observaciones, RevisadoPor, FechaRevision)
              OUTPUT INSERTED.*
              VALUES (@ExtintorId, @Estado, @Observaciones, @RevisadoPor, GETDATE())`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Puntos de revisión ──────────────────────────────────────────────────────

router.get('/puntos-revision', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const puntos = await pool.request().query(
      `IF EXISTS (SELECT 1 FROM sys.tables WHERE name='PuntosRevision')
       SELECT * FROM PuntosRevision ORDER BY PuntoId
       ELSE SELECT 1 WHERE 1=0`);
    res.json(puntos.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/puntos-revision', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Nombre, Descripcion } = req.body;
    const r = await pool.request()
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion || null)
      .query(`INSERT INTO PuntosRevision (Nombre, Descripcion) OUTPUT INSERTED.* VALUES (@Nombre, @Descripcion)`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/puntos-revision/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Nombre, Descripcion } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion || null)
      .query(`UPDATE PuntosRevision SET Nombre=@Nombre, Descripcion=@Descripcion WHERE PuntoId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/puntos-revision/:puntoId/areas', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Nombre } = req.body;
    const r = await pool.request()
      .input('PuntoId', sql.Int, req.params.puntoId)
      .input('Nombre', sql.NVarChar, Nombre)
      .query(`INSERT INTO AreasRevision (PuntoId, Nombre) OUTPUT INSERTED.* VALUES (@PuntoId, @Nombre)`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/areas/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Nombre } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Nombre', sql.NVarChar, Nombre)
      .query(`UPDATE AreasRevision SET Nombre=@Nombre WHERE AreaId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Rondines ────────────────────────────────────────────────────────────────

router.get('/rondines', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(
      `IF EXISTS (SELECT 1 FROM sys.tables WHERE name='Rondines')
       SELECT * FROM Rondines ORDER BY FechaInicio DESC
       ELSE SELECT 1 WHERE 1=0`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rondines/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM Rondines WHERE RondinId=@id`);
    if (r.recordset.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const rondin = r.recordset[0];
    const regs = await pool.request().input('id', sql.Int, req.params.id)
      .query(`IF EXISTS (SELECT 1 FROM sys.tables WHERE name='RondinesRegistros')
              SELECT * FROM RondinesRegistros WHERE RondinId=@id ORDER BY Orden
              ELSE SELECT 1 WHERE 1=0`);
    rondin.Registros = regs.recordset;
    res.json(rondin);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rondines', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request()
      .input('Guardia', sql.NVarChar, req.usuario.nombre)
      .query(`INSERT INTO Rondines (Guardia, FechaInicio, Estado) OUTPUT INSERTED.* VALUES (@Guardia, GETDATE(), 'en_curso')`);
    const rondin = r.recordset[0];
    const puntos = await pool.request().query(
      `IF EXISTS (SELECT 1 FROM sys.tables WHERE name='PuntosRevision')
       SELECT * FROM PuntosRevision ORDER BY PuntoId
       ELSE SELECT 1 WHERE 1=0`);
    let orden = 0;
    for (const p of puntos.recordset) {
      await pool.request()
        .input('RondinId', sql.Int, rondin.RondinId)
        .input('PuntoId', sql.Int, p.PuntoId)
        .input('NombrePunto', sql.NVarChar, p.Nombre)
        .input('Orden', sql.Int, orden++)
        .query(`INSERT INTO RondinesRegistros (RondinId, PuntoId, NombrePunto, Orden, Estado)
                VALUES (@RondinId, @PuntoId, @NombrePunto, @Orden, 'pendiente')`);
    }
    res.json(rondin);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/rondines/:rondinId/registro/:registroId', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Estado, Observaciones, Severidad, Foto } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.registroId)
      .input('Estado', sql.NVarChar, Estado || 'ok')
      .input('Observaciones', sql.NVarChar, Observaciones || null)
      .input('Severidad', sql.NVarChar, Severidad || null)
      .input('Foto', sql.NVarChar, Foto || null)
      .input('FechaRegistro', sql.DateTime2, new Date())
      .query(`UPDATE RondinesRegistros SET Estado=@Estado, Observaciones=@Observaciones,
              Severidad=@Severidad, Foto=@Foto, FechaRegistro=@FechaRegistro WHERE RegistroId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/rondines/:id/finalizar', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Observaciones } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Observaciones', sql.NVarChar, Observaciones || null)
      .query(`UPDATE Rondines SET Estado='completado', FechaFin=GETDATE(), ObservacionesFinal=@Observaciones WHERE RondinId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/rondines/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM RondinesRegistros WHERE RondinId=@id`);
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM Rondines WHERE RondinId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Visitas ─────────────────────────────────────────────────────────────────

router.get('/visitas', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    let where = '1=1';
    const rq = pool.request();
    if (req.query.desde) { rq.input('desde', sql.Date, req.query.desde); where += ' AND CAST(FechaEntrada AS DATE) >= @desde'; }
    if (req.query.hasta) { rq.input('hasta', sql.Date, req.query.hasta); where += ' AND CAST(FechaEntrada AS DATE) <= @hasta'; }
    const r = await rq.query(
      `IF EXISTS (SELECT 1 FROM sys.tables WHERE name='VisitasSeguridad')
       SELECT * FROM VisitasSeguridad WHERE ${where} ORDER BY FechaEntrada DESC
       ELSE SELECT 1 WHERE 1=0`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/visitas', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { NombreVisitante, Empresa, MotivoVisita, PersonaVisitada, Identificacion } = req.body;
    const r = await pool.request()
      .input('NombreVisitante', sql.NVarChar, NombreVisitante)
      .input('Empresa', sql.NVarChar, Empresa || null)
      .input('MotivoVisita', sql.NVarChar, MotivoVisita || null)
      .input('PersonaVisitada', sql.NVarChar, PersonaVisitada || null)
      .input('Identificacion', sql.NVarChar, Identificacion || null)
      .input('RegistradoPor', sql.NVarChar, req.usuario.nombre)
      .query(`INSERT INTO VisitasSeguridad (NombreVisitante, Empresa, MotivoVisita, PersonaVisitada, Identificacion, RegistradoPor, FechaEntrada)
              OUTPUT INSERTED.*
              VALUES (@NombreVisitante, @Empresa, @MotivoVisita, @PersonaVisitada, @Identificacion, @RegistradoPor, GETDATE())`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/visitas/:id/salida', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`UPDATE VisitasSeguridad SET FechaSalida=GETDATE() WHERE VisitaId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/visitas/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id)
      .query(`DELETE FROM VisitasSeguridad WHERE VisitaId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
