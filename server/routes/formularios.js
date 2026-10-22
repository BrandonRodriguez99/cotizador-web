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

function slugify(text) {
  return text
    .toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) + '-' + Math.random().toString(36).slice(2, 8);
}

async function ensureTables(pool) {
  if (tablesReady) return;

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Formularios' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE Formularios (
      FormularioId INT IDENTITY(1,1) PRIMARY KEY,
      Nombre       NVARCHAR(400) NOT NULL,
      Descripcion  NVARCHAR(1000) NULL,
      Activo       BIT NOT NULL DEFAULT 1,
      Slug         NVARCHAR(200) NULL,
      CreadoPor    NVARCHAR(200) NULL,
      CreatedAt    DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FormularioSecciones' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE FormularioSecciones (
      SeccionId     INT IDENTITY(1,1) PRIMARY KEY,
      FormularioId  INT NOT NULL REFERENCES Formularios(FormularioId) ON DELETE CASCADE,
      Titulo        NVARCHAR(400) NOT NULL,
      Orden         INT NOT NULL DEFAULT 0
    );

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FormularioPreguntas' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE FormularioPreguntas (
      PreguntaId    INT IDENTITY(1,1) PRIMARY KEY,
      SeccionId     INT NOT NULL REFERENCES FormularioSecciones(SeccionId) ON DELETE CASCADE,
      Texto         NVARCHAR(1000) NOT NULL,
      TipoRespuesta NVARCHAR(50) NOT NULL DEFAULT 'texto',
      Requerida     BIT NOT NULL DEFAULT 0,
      Orden         INT NOT NULL DEFAULT 0,
      Opciones      NVARCHAR(MAX) NULL
    );

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FormularioRespuestas' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE FormularioRespuestas (
      RespuestaId   INT IDENTITY(1,1) PRIMARY KEY,
      FormularioId  INT NOT NULL REFERENCES Formularios(FormularioId),
      NombreUsuario NVARCHAR(400) NULL,
      FechaEnvio    DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FormularioRespuestaValores' AND schema_id=SCHEMA_ID('dbo'))
    CREATE TABLE FormularioRespuestaValores (
      ValorId      INT IDENTITY(1,1) PRIMARY KEY,
      RespuestaId  INT NOT NULL REFERENCES FormularioRespuestas(RespuestaId) ON DELETE CASCADE,
      PreguntaId   INT NOT NULL,
      Valor        NVARCHAR(MAX) NULL
    );
  `);

  // Add Slug column if missing (for existing installations)
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name='Formularios' AND schema_id=SCHEMA_ID('dbo'))
    AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Formularios') AND name='Slug')
    ALTER TABLE Formularios ADD Slug NVARCHAR(200) NULL;
  `);

  tablesReady = true;
}

// ── Helper: load full form with sections + questions ──────────────────────────
// Uses the original tables: FormSecciones, FormPreguntas, FormOpciones
async function loadFullForm(pool, formularioId) {
  const formRes = await pool.request()
    .input('id', sql.Int, formularioId)
    .query('SELECT * FROM Formularios WHERE FormularioId=@id');
  if (!formRes.recordset[0]) return null;

  const form = formRes.recordset[0];

  const secs = await pool.request()
    .input('fid', sql.Int, formularioId)
    .query('SELECT * FROM FormSecciones WHERE FormularioId=@fid ORDER BY Orden');

  const secIds = secs.recordset.map(s => s.SeccionId);
  let preguntas = [];
  let opciones = [];
  if (secIds.length > 0) {
    const ph = secIds.map((_, i) => `@sid${i}`).join(',');
    const req1 = pool.request();
    secIds.forEach((id, i) => req1.input(`sid${i}`, sql.Int, id));
    const pregRes = await req1.query(`SELECT * FROM FormPreguntas WHERE SeccionId IN (${ph}) ORDER BY Orden`);
    preguntas = pregRes.recordset;

    const pregIds = preguntas.map(p => p.PreguntaId);
    if (pregIds.length > 0) {
      const ph2 = pregIds.map((_, i) => `@pid${i}`).join(',');
      const req2 = pool.request();
      pregIds.forEach((id, i) => req2.input(`pid${i}`, sql.Int, id));
      const opcRes = await req2.query(`SELECT * FROM FormOpciones WHERE PreguntaId IN (${ph2}) ORDER BY Orden`);
      opciones = opcRes.recordset;
    }
  }

  form.secciones = secs.recordset.map(s => ({
    SeccionId: s.SeccionId,
    titulo: s.Titulo,
    preguntas: preguntas
      .filter(p => p.SeccionId === s.SeccionId)
      .map(p => ({
        PreguntaId: p.PreguntaId,
        texto: p.Texto,
        tipoRespuesta: p.TipoRespuesta,
        requerida: !!p.Requerida,
        opciones: opciones.filter(o => o.PreguntaId === p.PreguntaId).map(o => o.Texto),
      })),
  }));

  return form;
}

// ── Helper: save sections + questions (for create/update) ─────────────────────
// Uses the original tables: FormSecciones, FormPreguntas, FormOpciones
async function saveSecciones(pool, formularioId, secciones) {
  // Get existing section IDs to delete their options and questions first
  const existingSecs = await pool.request()
    .input('fid', sql.Int, formularioId)
    .query('SELECT SeccionId FROM FormSecciones WHERE FormularioId=@fid');

  for (const sec of existingSecs.recordset) {
    // Delete options for questions in this section
    await pool.request()
      .input('sid', sql.Int, sec.SeccionId)
      .query('DELETE FROM FormOpciones WHERE PreguntaId IN (SELECT PreguntaId FROM FormPreguntas WHERE SeccionId=@sid)');
    // Delete questions
    await pool.request()
      .input('sid', sql.Int, sec.SeccionId)
      .query('DELETE FROM FormPreguntas WHERE SeccionId=@sid');
  }
  // Delete sections
  await pool.request()
    .input('fid', sql.Int, formularioId)
    .query('DELETE FROM FormSecciones WHERE FormularioId=@fid');

  for (let si = 0; si < (secciones || []).length; si++) {
    const sec = secciones[si];
    const secRes = await pool.request()
      .input('fid', sql.Int, formularioId)
      .input('titulo', sql.NVarChar(400), sec.titulo || `Sección ${si + 1}`)
      .input('orden', sql.Int, si)
      .query('INSERT INTO FormSecciones (FormularioId,Titulo,Orden) OUTPUT INSERTED.SeccionId VALUES (@fid,@titulo,@orden)');
    const seccionId = secRes.recordset[0].SeccionId;

    for (let pi = 0; pi < (sec.preguntas || []).length; pi++) {
      const preg = sec.preguntas[pi];
      const pregRes = await pool.request()
        .input('sid', sql.Int, seccionId)
        .input('texto', sql.NVarChar(1000), preg.texto || '')
        .input('tipo', sql.NVarChar(50), preg.tipoRespuesta || 'texto')
        .input('req', sql.Bit, preg.requerida ? 1 : 0)
        .input('orden', sql.Int, pi)
        .query('INSERT INTO FormPreguntas (SeccionId,Texto,TipoRespuesta,Requerida,Orden) OUTPUT INSERTED.PreguntaId VALUES (@sid,@texto,@tipo,@req,@orden)');
      const preguntaId = pregRes.recordset[0].PreguntaId;

      // Save options (stored as separate rows, not JSON)
      const opts = preg.opciones || [];
      for (let oi = 0; oi < opts.length; oi++) {
        const opTexto = typeof opts[oi] === 'string' ? opts[oi] : (opts[oi].texto || opts[oi].Texto || '');
        if (!opTexto) continue;
        await pool.request()
          .input('pid', sql.Int, preguntaId)
          .input('texto', sql.NVarChar(1000), opTexto)
          .input('orden', sql.Int, oi)
          .query('INSERT INTO FormOpciones (PreguntaId,Texto,Orden) VALUES (@pid,@texto,@orden)');
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (must be BEFORE /:id to avoid being caught by it)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/formularios/publico/lista — list active forms (public)
router.get('/publico/lista', async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);

  // Auto-generate slugs for forms that don't have one yet
  const missing = await pool.request().query(
    "SELECT FormularioId, Nombre FROM Formularios WHERE Slug IS NULL OR Slug=''"
  );
  for (const row of missing.recordset) {
    const slug = slugify(row.Nombre || 'formulario');
    await pool.request()
      .input('id', sql.Int, row.FormularioId)
      .input('slug', sql.NVarChar(200), slug)
      .query('UPDATE Formularios SET Slug=@slug WHERE FormularioId=@id');
  }

  const result = await pool.request().query(
    "SELECT FormularioId, Nombre, Descripcion, Slug FROM Formularios WHERE Activo=1 ORDER BY Nombre"
  );
  res.json(result.recordset);
});

// GET /api/formularios/publico/:slug — get form by slug (public)
router.get('/publico/:slug', async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);

  const formRes = await pool.request()
    .input('slug', sql.NVarChar(200), req.params.slug)
    .query('SELECT FormularioId FROM Formularios WHERE Slug=@slug AND Activo=1');

  if (!formRes.recordset[0]) return res.status(404).json({ error: 'Formulario no encontrado o inactivo' });

  const form = await loadFullForm(pool, formRes.recordset[0].FormularioId);
  res.json(form);
});

// POST /api/formularios/publico/:slug/responder — submit response (public)
router.post('/publico/:slug/responder', async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);

  const formRes = await pool.request()
    .input('slug', sql.NVarChar(200), req.params.slug)
    .query('SELECT FormularioId FROM Formularios WHERE Slug=@slug AND Activo=1');

  if (!formRes.recordset[0]) return res.status(404).json({ error: 'Formulario no encontrado o inactivo' });

  const formularioId = formRes.recordset[0].FormularioId;
  const { nombreUsuario, valores } = req.body;

  const respIns = await pool.request()
    .input('fid', sql.Int, formularioId)
    .input('nombre', sql.NVarChar(400), nombreUsuario || 'Anónimo')
    .query('INSERT INTO FormRespuestas (FormularioId,OperadorNombre) OUTPUT INSERTED.RespuestaId VALUES (@fid,@nombre)');

  const respuestaId = respIns.recordset[0].RespuestaId;

  for (const v of (valores || [])) {
    await pool.request()
      .input('rid', sql.Int, respuestaId)
      .input('pid', sql.Int, v.preguntaId)
      .input('valor', sql.NVarChar(sql.MAX), typeof v.valor === 'string' ? v.valor : JSON.stringify(v.valor))
      .query('INSERT INTO FormRespuestaValores (RespuestaId,PreguntaId,Valor) VALUES (@rid,@pid,@valor)');
  }

  res.status(201).json({ ok: true, respuestaId });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/formularios — list all forms
router.get('/', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);

  // Auto-generate slugs for forms that don't have one yet
  const missing = await pool.request().query(
    "SELECT FormularioId, Nombre FROM Formularios WHERE Slug IS NULL OR Slug=''"
  );
  for (const row of missing.recordset) {
    const slug = slugify(row.Nombre || 'formulario');
    await pool.request()
      .input('id', sql.Int, row.FormularioId)
      .input('slug', sql.NVarChar(200), slug)
      .query('UPDATE Formularios SET Slug=@slug WHERE FormularioId=@id');
  }

  const result = await pool.request().query('SELECT FormularioId, Nombre, Descripcion, Activo, Slug, FechaCreacion FROM Formularios ORDER BY FechaCreacion DESC');
  res.json(result.recordset);
});

// GET /api/formularios/:id — get full form
router.get('/:id', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const form = await loadFullForm(pool, parseInt(req.params.id));
  if (!form) return res.status(404).json({ error: 'Formulario no encontrado' });
  res.json(form);
});

// POST /api/formularios — create form
router.post('/', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const { nombre, descripcion, secciones } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const slug = slugify(nombre);
  const ins = await pool.request()
    .input('nombre', sql.NVarChar(400), nombre.trim())
    .input('desc', sql.NVarChar(1000), descripcion || null)
    .input('slug', sql.NVarChar(200), slug)
    .query('INSERT INTO Formularios (Nombre,Descripcion,Slug) OUTPUT INSERTED.FormularioId VALUES (@nombre,@desc,@slug)');

  const formId = ins.recordset[0].FormularioId;
  await saveSecciones(pool, formId, secciones);

  const form = await loadFullForm(pool, formId);
  res.status(201).json(form);
});

// PUT /api/formularios/:id — update form
router.put('/:id', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const formId = parseInt(req.params.id);
  const { nombre, descripcion, secciones } = req.body;

  const existing = await pool.request().input('id', sql.Int, formId).query('SELECT FormularioId FROM Formularios WHERE FormularioId=@id');
  if (!existing.recordset[0]) return res.status(404).json({ error: 'Formulario no encontrado' });

  await pool.request()
    .input('id', sql.Int, formId)
    .input('nombre', sql.NVarChar(400), nombre?.trim() || 'Sin nombre')
    .input('desc', sql.NVarChar(1000), descripcion || null)
    .query('UPDATE Formularios SET Nombre=@nombre, Descripcion=@desc WHERE FormularioId=@id');

  await saveSecciones(pool, formId, secciones);

  const form = await loadFullForm(pool, formId);
  res.json(form);
});

// PATCH /api/formularios/:id/activo — toggle active
router.patch('/:id/activo', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const { activo } = req.body;
  await pool.request()
    .input('id', sql.Int, parseInt(req.params.id))
    .input('activo', sql.Bit, activo ? 1 : 0)
    .query('UPDATE Formularios SET Activo=@activo WHERE FormularioId=@id');
  res.json({ ok: true });
});

// DELETE /api/formularios/:id
router.delete('/:id', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  await pool.request()
    .input('id', sql.Int, parseInt(req.params.id))
    .query('DELETE FROM Formularios WHERE FormularioId=@id');
  res.json({ ok: true });
});

// GET /api/formularios/:id/respuestas — list responses
router.get('/:id/respuestas', autenticar, async (req, res) => {
  const pool = await requirePool(res); if (!pool) return;
  await ensureTables(pool);
  const formId = parseInt(req.params.id);

  const respuestas = await pool.request()
    .input('fid', sql.Int, formId)
    .query('SELECT * FROM FormRespuestas WHERE FormularioId=@fid ORDER BY FechaEnvio DESC');

  const rIds = respuestas.recordset.map(r => r.RespuestaId);
  let valores = [];
  if (rIds.length > 0) {
    const ph = rIds.map((_, i) => `@rid${i}`).join(',');
    const req2 = pool.request();
    rIds.forEach((id, i) => req2.input(`rid${i}`, sql.Int, id));
    const valRes = await req2.query(`SELECT * FROM FormRespuestaValores WHERE RespuestaId IN (${ph})`);
    valores = valRes.recordset;
  }

  const data = respuestas.recordset.map(r => ({
    ...r,
    valores: valores.filter(v => v.RespuestaId === r.RespuestaId),
  }));

  res.json(data);
});

export default router;
