import express from 'express';
import sql from 'mssql';
import { getPool, query } from '../db.js';
import { estadoNombre } from './catalogos.js';

const router = express.Router();
let tablesReady = false;

async function ensureCotizacionesTables(pool) {
  if (tablesReady) return;
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppCotizaciones' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
      CREATE TABLE AppCotizaciones (
        CotizacionId              INT IDENTITY(1,1) PRIMARY KEY,
        Folio                     NVARCHAR(50)   NOT NULL,
        ClienteId                 INT            NULL,
        CursoId                   INT            NULL,
        CoachId                   INT            NULL,
        ModalidadId               INT            NULL,
        UnidadNegocioId           INT            NULL,
        DuracionDias              INT            NULL,
        SesionesPorDia            INT            NULL,
        ParticipantesCantidad     INT            NULL,
        FechaInicio               DATE           NULL,
        FechaFin                  DATE           NULL,
        Observaciones             NVARCHAR(2000) NULL,
        TotalCostosDirectos       DECIMAL(18,2)  NULL,
        TotalCostosIndirectos     DECIMAL(18,2)  NULL,
        TotalCostos               DECIMAL(18,2)  NULL,
        MargenUtilidadPct         DECIMAL(5,2)   NULL,
        MargenUtilidad            DECIMAL(18,2)  NULL,
        TotalConGanancia          DECIMAL(18,2)  NULL,
        PrecioPorParticipante     DECIMAL(18,2)  NULL,
        PrecioSugeridoPorParticipante DECIMAL(18,2) NULL,
        EstadoId                  INT            NOT NULL DEFAULT 1,
        Estado                    NVARCHAR(100)  NULL,
        CreadoPor                 NVARCHAR(150)  NULL,
        FechaCreacion             DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        ModificadoPor             NVARCHAR(150)  NULL,
        FechaModificacion         DATETIME2      NULL
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppCotizacionCostos' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
      CREATE TABLE AppCotizacionCostos (
        CotizacionCostoId INT IDENTITY(1,1) PRIMARY KEY,
        CotizacionId      INT             NOT NULL,
        Concepto          NVARCHAR(250)   NOT NULL,
        TipoCalculo       NVARCHAR(100)   NULL,
        Formula           NVARCHAR(250)   NULL,
        TipoCosto         NVARCHAR(100)   NULL,
        CostoUnitario     DECIMAL(18,2)   NULL,
        Cantidad          NVARCHAR(100)   NULL,
        Participantes     NVARCHAR(100)   NULL,
        Total             DECIMAL(18,2)   NULL,
        Orden             INT             NULL,
        FechaCreacion     DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        FOREIGN KEY (CotizacionId) REFERENCES AppCotizaciones(CotizacionId)
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppCotizacionParticipantes' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
      CREATE TABLE AppCotizacionParticipantes (
        CotizacionParticipanteId INT IDENTITY(1,1) PRIMARY KEY,
        CotizacionId             INT            NOT NULL,
        EmpleadoId               INT            NULL,
        NombreCompleto           NVARCHAR(300)  NOT NULL,
        Empresa                  NVARCHAR(200)  NULL,
        Factura2                 NVARCHAR(100)  NULL,
        Factura3                 NVARCHAR(100)  NULL,
        Observaciones            NVARCHAR(500)  NULL,
        FechaCreacion            DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        FOREIGN KEY (CotizacionId) REFERENCES AppCotizaciones(CotizacionId)
      );
    END
  `);
  tablesReady = true;
}

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureCotizacionesTables(pool);

    const result = await query(`
      SELECT
        c.CotizacionId,
        c.Folio,
        c.Estado,
        c.ParticipantesCantidad,
        c.FechaInicio,
        c.FechaFin,
        c.TotalConGanancia,
        c.FechaCreacion,
        ISNULL(cl.Nombre, '') AS Cliente,
        ISNULL(co.Nombre, '') AS Curso,
        ISNULL(ch.Nombre, '') AS Coach,
        ISNULL(m.Nombre,  '') AS Modalidad
      FROM AppCotizaciones c
      LEFT JOIN Empresas    cl ON c.ClienteId   = cl.EmpresaId
      LEFT JOIN Cursos      co ON c.CursoId     = co.CursoId
      LEFT JOIN Coaches     ch ON c.CoachId     = ch.CoachId
      LEFT JOIN Modalidades m  ON c.ModalidadId = m.ModalidadId
      ORDER BY c.CotizacionId DESC`);

    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar cotizaciones' });
  }
});

router.get('/generate/folio', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureCotizacionesTables(pool);

    const year = new Date().getFullYear();
    const result = await query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(Folio, CHARINDEX('-', Folio, CHARINDEX('-', Folio) + 1) + 1, LEN(Folio)) AS INT)), 0) AS MaxNumber
      FROM AppCotizaciones
      WHERE Folio LIKE 'COT-' + CAST(@year AS VARCHAR(4)) + '-%'
    `, [{ name: 'year', type: sql.Int, value: year }]);

    const maxNumber = (result.recordset[0]?.MaxNumber || 0) + 1;
    res.json({ folio: `COT-${year}-${String(maxNumber).padStart(6, '0')}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar folio' });
  }
});

router.get('/pendientes/list', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureCotizacionesTables(pool);

    const result = await query(`
      SELECT c.CotizacionId, c.Folio, c.TotalConGanancia, c.FechaCreacion,
             ISNULL(cl.Nombre,'') AS Cliente, ISNULL(co.Nombre,'') AS Curso
      FROM AppCotizaciones c
      LEFT JOIN Empresas cl ON c.ClienteId = cl.EmpresaId
      LEFT JOIN Cursos   co ON c.CursoId   = co.CursoId
      WHERE c.EstadoId = 2
      ORDER BY c.FechaCreacion DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar pendientes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureCotizacionesTables(pool);

    const cotizacionId = Number(req.params.id);
    const cotizacionResult = await query(`
      SELECT c.*, ISNULL(cl.Nombre,'') AS Cliente, ISNULL(co.Nombre,'') AS Curso,
             ISNULL(ch.Nombre,'') AS Coach, ISNULL(m.Nombre,'') AS Modalidad
      FROM AppCotizaciones c
      LEFT JOIN Empresas    cl ON c.ClienteId   = cl.EmpresaId
      LEFT JOIN Cursos      co ON c.CursoId     = co.CursoId
      LEFT JOIN Coaches     ch ON c.CoachId     = ch.CoachId
      LEFT JOIN Modalidades m  ON c.ModalidadId = m.ModalidadId
      WHERE c.CotizacionId = @cotizacionId`,
      [{ name: 'cotizacionId', type: sql.Int, value: cotizacionId }]);

    if (!cotizacionResult.recordset.length) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const costosResult = await query(
      'SELECT * FROM AppCotizacionCostos WHERE CotizacionId = @cotizacionId ORDER BY Orden',
      [{ name: 'cotizacionId', type: sql.Int, value: cotizacionId }]
    );

    const participantesResult = await query(
      'SELECT * FROM AppCotizacionParticipantes WHERE CotizacionId = @cotizacionId',
      [{ name: 'cotizacionId', type: sql.Int, value: cotizacionId }]
    );

    res.json({
      cotizacion: cotizacionResult.recordset[0],
      costos: costosResult.recordset,
      participantes: participantesResult.recordset,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la cotización' });
  }
});

router.post('/', async (req, res) => {
  const {
    folio,
    clienteId,
    cursoId,
    coachId,
    modalidadId,
    unidadNegocioId,
    duracionDias,
    sesionesPorDia,
    participantesCantidad,
    fechaInicio,
    fechaFin,
    observaciones,
    totalCostosDirectos,
    totalCostosIndirectos,
    totalCostos,
    margenUtilidadPct,
    margenUtilidad,
    totalConGanancia,
    precioPorParticipante,
    precioSugeridoPorParticipante,
    estadoId,
    estado,
    creadoPor,
    costos = [],
    participantes = [],
  } = req.body;

  const pool = await getPool();
  await ensureCotizacionesTables(pool);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = transaction.request();

    const estadoTexto = estado || estadoNombre(estadoId);

    request.input('folio',                        sql.NVarChar(50),    folio);
    request.input('clienteId',                    sql.Int,             clienteId || null);
    request.input('cursoId',                      sql.Int,             cursoId || null);
    request.input('coachId',                      sql.Int,             coachId || null);
    request.input('modalidadId',                  sql.Int,             modalidadId || null);
    request.input('unidadNegocioId',              sql.Int,             unidadNegocioId ? Number(unidadNegocioId) : null);
    request.input('duracionDias',                 sql.Int,             duracionDias || null);
    request.input('sesionesPorDia',               sql.Int,             sesionesPorDia || null);
    request.input('participantesCantidad',        sql.Int,             participantesCantidad || null);
    request.input('fechaInicio',                  sql.Date,            fechaInicio || null);
    request.input('fechaFin',                     sql.Date,            fechaFin || null);
    request.input('observaciones',                sql.NVarChar(2000),  observaciones || null);
    request.input('totalCostosDirectos',          sql.Decimal(18,2),   totalCostosDirectos);
    request.input('totalCostosIndirectos',        sql.Decimal(18,2),   totalCostosIndirectos);
    request.input('totalCostos',                  sql.Decimal(18,2),   totalCostos);
    request.input('margenUtilidadPct',            sql.Decimal(5,2),    margenUtilidadPct);
    request.input('margenUtilidad',               sql.Decimal(18,2),   margenUtilidad);
    request.input('totalConGanancia',             sql.Decimal(18,2),   totalConGanancia);
    request.input('precioPorParticipante',        sql.Decimal(18,2),   precioPorParticipante);
    request.input('precioSugeridoPorParticipante',sql.Decimal(18,2),   precioSugeridoPorParticipante);
    request.input('estado',                       sql.NVarChar(100),   estadoTexto);
    request.input('creadoPor',                    sql.NVarChar(150),   creadoPor || null);

    const insertResult = await request.query(`
      INSERT INTO AppCotizaciones (
        Folio, ClienteId, CursoId, CoachId, ModalidadId, UnidadNegocioId,
        DuracionDias, SesionesPorDia, ParticipantesCantidad,
        FechaInicio, FechaFin, Observaciones,
        TotalCostosDirectos, TotalCostosIndirectos, TotalCostos,
        MargenUtilidadPct, MargenUtilidad, TotalConGanancia,
        PrecioPorParticipante, PrecioSugeridoPorParticipante,
        Estado, CreadoPor
      ) VALUES (
        @folio, @clienteId, @cursoId, @coachId, @modalidadId, @unidadNegocioId,
        @duracionDias, @sesionesPorDia, @participantesCantidad,
        @fechaInicio, @fechaFin, @observaciones,
        @totalCostosDirectos, @totalCostosIndirectos, @totalCostos,
        @margenUtilidadPct, @margenUtilidad, @totalConGanancia,
        @precioPorParticipante, @precioSugeridoPorParticipante,
        @estado, @creadoPor
      );
      SELECT SCOPE_IDENTITY() AS CotizacionId;
    `);

    const cotizacionId = Number(insertResult.recordset[0].CotizacionId);

    for (const [index, costo] of costos.entries()) {
      const costoReq = transaction.request();
      costoReq.input('cotizacionId',  sql.Int,           cotizacionId);
      costoReq.input('concepto',      sql.NVarChar(250),  costo.concepto);
      costoReq.input('tipoCalculo',   sql.NVarChar(100),  costo.tipoCalculo || null);
      costoReq.input('formula',       sql.NVarChar(250),  costo.formula || null);
      costoReq.input('tipoCosto',     sql.NVarChar(100),  costo.tipoCosto || null);
      costoReq.input('costoUnitario', sql.Decimal(18,2),  costo.costoUnitario);
      costoReq.input('cantidad',      sql.NVarChar(100),  costo.cantidad);
      costoReq.input('participantes', sql.NVarChar(100),  costo.participantes || null);
      costoReq.input('total',         sql.Decimal(18,2),  costo.total);
      costoReq.input('orden',         sql.Int,            index + 1);
      await costoReq.query(`
        INSERT INTO AppCotizacionCostos
          (CotizacionId, Concepto, TipoCalculo, Formula, TipoCosto, CostoUnitario, Cantidad, Participantes, Total, Orden)
        VALUES
          (@cotizacionId, @concepto, @tipoCalculo, @formula, @tipoCosto, @costoUnitario, @cantidad, @participantes, @total, @orden);
      `);
    }

    for (const participante of participantes) {
      const partReq = transaction.request();
      partReq.input('cotizacionId',   sql.Int,           cotizacionId);
      partReq.input('empleadoId',     sql.Int,           participante.empleadoId || null);
      partReq.input('nombreCompleto', sql.NVarChar(300),  participante.nombreCompleto);
      partReq.input('empresa',        sql.NVarChar(200),  participante.empresa || null);
      partReq.input('factura2',       sql.NVarChar(100),  participante.factura2 || null);
      partReq.input('factura3',       sql.NVarChar(100),  participante.factura3 || null);
      partReq.input('observaciones',  sql.NVarChar(500),  participante.observaciones || null);
      await partReq.query(`
        INSERT INTO AppCotizacionParticipantes
          (CotizacionId, EmpleadoId, NombreCompleto, Empresa, Factura2, Factura3, Observaciones)
        VALUES
          (@cotizacionId, @empleadoId, @nombreCompleto, @empresa, @factura2, @factura3, @observaciones);
      `);
    }

    await transaction.commit();
    res.status(201).json({ cotizacionId });
  } catch (error) {
    console.error(error);
    try { await transaction.rollback(); } catch (_) {}
    res.status(500).json({ error: error.message || 'Error al crear cotización' });
  }
});

router.post('/:id/enviar', async (req, res) => {
  try {
    const cotizacionId = Number(req.params.id);
    if (!Number.isInteger(cotizacionId) || cotizacionId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const pool = await getPool();
    await ensureCotizacionesTables(pool);

    const result = await query(
      `UPDATE AppCotizaciones SET EstadoId = 2, Estado = 'Enviado' WHERE CotizacionId = @id; SELECT @@ROWCOUNT AS affected;`,
      [{ name: 'id', type: sql.Int, value: cotizacionId }]
    );

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar a aprobación' });
  }
});

router.post('/:id/aprobar', async (req, res) => {
  try {
    const cotizacionId = Number(req.params.id);
    if (!Number.isInteger(cotizacionId) || cotizacionId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const pool = await getPool();
    await ensureCotizacionesTables(pool);

    const { aprobado, comentarios, aprobador } = req.body;
    const nuevoEstado = aprobado ? 3 : 4;
    const nuevoEstadoNombre = aprobado ? 'Aprobado' : 'Rechazado';

    const result = await query(
      `UPDATE AppCotizaciones SET EstadoId = @nuevoEstado, Estado = @nuevoEstadoNombre WHERE CotizacionId = @id; SELECT @@ROWCOUNT AS affected;`,
      [
        { name: 'id',               type: sql.Int,           value: cotizacionId },
        { name: 'nuevoEstado',      type: sql.Int,           value: nuevoEstado },
        { name: 'nuevoEstadoNombre',type: sql.NVarChar(100), value: nuevoEstadoNombre },
      ]
    );

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar aprobación' });
  }
});

export default router;
