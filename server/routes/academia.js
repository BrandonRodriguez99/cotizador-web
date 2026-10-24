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

// ─── Init tables ──────────────────────────────────────────────────────────────

export async function initAcademiaTables() {
  const pool = await getPool();
  if (!pool) return;
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='AcademiaCursos')
    CREATE TABLE AcademiaCursos (
      CursoAcademiaId INT IDENTITY PRIMARY KEY,
      Nombre          NVARCHAR(300) NOT NULL,
      Descripcion     NVARCHAR(MAX) NULL,
      Instructor      NVARCHAR(200) NULL,
      Modalidad       NVARCHAR(50) DEFAULT 'Presencial',
      Ubicacion       NVARCHAR(300) NULL,
      Capacidad       INT DEFAULT 25,
      Estado          NVARCHAR(30) DEFAULT 'Activo',
      PorcentajeMinAsistencia INT DEFAULT 75,
      CreadoPor       NVARCHAR(200) NULL,
      FechaCreacion   DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('AcademiaCursos') AND name='Generacion')
      ALTER TABLE AcademiaCursos ADD Generacion NVARCHAR(100) NULL;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='AcademiaSesiones')
    CREATE TABLE AcademiaSesiones (
      SesionId        INT IDENTITY PRIMARY KEY,
      CursoAcademiaId INT NOT NULL REFERENCES AcademiaCursos(CursoAcademiaId),
      NumeroSesion    INT NOT NULL,
      Fecha           DATE NOT NULL,
      HoraInicio      NVARCHAR(10) NULL,
      HoraFin         NVARCHAR(10) NULL,
      Ubicacion       NVARCHAR(300) NULL,
      Estado          NVARCHAR(30) DEFAULT 'Programada'
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='AcademiaInscripciones')
    CREATE TABLE AcademiaInscripciones (
      InscripcionId   INT IDENTITY PRIMARY KEY,
      CursoAcademiaId INT NOT NULL REFERENCES AcademiaCursos(CursoAcademiaId),
      NumeroEmpleado  NVARCHAR(50) NOT NULL,
      NombreCompleto  NVARCHAR(300) NOT NULL,
      Empresa         NVARCHAR(200) NULL,
      Correo          NVARCHAR(300) NULL,
      FechaInscripcion DATETIME DEFAULT GETDATE(),
      InscritoPor     NVARCHAR(200) NULL,
      Activo          BIT DEFAULT 1
    );

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('AcademiaInscripciones') AND name='Terminal')
      ALTER TABLE AcademiaInscripciones ADD Terminal NVARCHAR(200) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('AcademiaInscripciones') AND name='Plaza')
      ALTER TABLE AcademiaInscripciones ADD Plaza NVARCHAR(200) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('AcademiaInscripciones') AND name='Area')
      ALTER TABLE AcademiaInscripciones ADD Area NVARCHAR(200) NULL;
  `);
  await pool.request().query(`
    ;WITH dupes AS (
      SELECT InscripcionId,
        ROW_NUMBER() OVER (PARTITION BY CursoAcademiaId, NumeroEmpleado ORDER BY InscripcionId) AS rn
      FROM AcademiaInscripciones WHERE Activo=1
    )
    UPDATE AcademiaInscripciones SET Activo=0
    WHERE InscripcionId IN (SELECT InscripcionId FROM dupes WHERE rn > 1);
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='AcademiaAsistencias')
    CREATE TABLE AcademiaAsistencias (
      AsistenciaId    INT IDENTITY PRIMARY KEY,
      SesionId        INT NOT NULL REFERENCES AcademiaSesiones(SesionId),
      InscripcionId   INT NOT NULL REFERENCES AcademiaInscripciones(InscripcionId),
      FechaRegistro   DATETIME DEFAULT GETDATE(),
      MetodoRegistro  NVARCHAR(30) DEFAULT 'QR'
    );
  `);
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

router.get('/dashboard', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM AcademiaCursos WHERE Estado='Activo') AS cursosActivos,
        (SELECT COUNT(*) FROM AcademiaCursos) AS cursosTotal,
        (SELECT COUNT(*) FROM AcademiaInscripciones WHERE Activo=1
          AND CursoAcademiaId IN (SELECT CursoAcademiaId FROM AcademiaCursos WHERE Estado='Activo'))
          AS participantesActivos,
        (SELECT COUNT(*) FROM AcademiaSesiones
          WHERE Fecha >= CAST(GETDATE() AS DATE)
          AND Fecha < DATEADD(DAY,7,CAST(GETDATE() AS DATE)))
          AS sesionesEstaSemana
    `);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Cursos CRUD ──────────────────────────────────────────────────────────────

router.get('/cursos', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM AcademiaInscripciones i WHERE i.CursoAcademiaId=c.CursoAcademiaId AND i.Activo=1) AS Inscritos,
        (SELECT COUNT(*) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=c.CursoAcademiaId) AS TotalSesiones,
        (SELECT MIN(Fecha) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=c.CursoAcademiaId) AS FechaInicio,
        (SELECT MAX(Fecha) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=c.CursoAcademiaId) AS FechaFin
      FROM AcademiaCursos c
      ORDER BY c.FechaCreacion DESC
    `);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/cursos/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const rCurso = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM AcademiaCursos WHERE CursoAcademiaId=@id`);
    if (!rCurso.recordset[0]) return res.status(404).json({ error: 'Curso no encontrado' });

    const rSesiones = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM AcademiaSesiones WHERE CursoAcademiaId=@id ORDER BY NumeroSesion`);

    const rInscritos = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM AcademiaInscripciones WHERE CursoAcademiaId=@id AND Activo=1 ORDER BY NombreCompleto`);

    res.json({
      curso: rCurso.recordset[0],
      sesiones: rSesiones.recordset,
      inscritos: rInscritos.recordset,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/cursos', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Nombre, Descripcion, Instructor, Modalidad, Ubicacion, Capacidad, PorcentajeMinAsistencia, Generacion, sesiones } = req.body;
    const rCurso = await pool.request()
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion || null)
      .input('Instructor', sql.NVarChar, Instructor || null)
      .input('Modalidad', sql.NVarChar, Modalidad || 'Presencial')
      .input('Ubicacion', sql.NVarChar, Ubicacion || null)
      .input('Capacidad', sql.Int, Capacidad || 25)
      .input('PctMin', sql.Int, PorcentajeMinAsistencia || 75)
      .input('Generacion', sql.NVarChar, Generacion || null)
      .input('CreadoPor', sql.NVarChar, req.usuario?.nombre || null)
      .query(`INSERT INTO AcademiaCursos (Nombre, Descripcion, Instructor, Modalidad, Ubicacion, Capacidad, PorcentajeMinAsistencia, Generacion, CreadoPor)
              OUTPUT INSERTED.*
              VALUES (@Nombre, @Descripcion, @Instructor, @Modalidad, @Ubicacion, @Capacidad, @PctMin, @Generacion, @CreadoPor)`);
    const curso = rCurso.recordset[0];

    if (Array.isArray(sesiones) && sesiones.length > 0) {
      for (let i = 0; i < sesiones.length; i++) {
        const s = sesiones[i];
        await pool.request()
          .input('CursoId', sql.Int, curso.CursoAcademiaId)
          .input('Num', sql.Int, i + 1)
          .input('Fecha', sql.Date, s.Fecha)
          .input('HoraInicio', sql.NVarChar, s.HoraInicio || null)
          .input('HoraFin', sql.NVarChar, s.HoraFin || null)
          .input('Ubicacion', sql.NVarChar, s.Ubicacion || null)
          .query(`INSERT INTO AcademiaSesiones (CursoAcademiaId, NumeroSesion, Fecha, HoraInicio, HoraFin, Ubicacion)
                  VALUES (@CursoId, @Num, @Fecha, @HoraInicio, @HoraFin, @Ubicacion)`);
      }
    }

    res.json(curso);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/cursos/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Nombre, Descripcion, Instructor, Modalidad, Ubicacion, Capacidad, Estado, PorcentajeMinAsistencia, Generacion } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Descripcion', sql.NVarChar, Descripcion || null)
      .input('Instructor', sql.NVarChar, Instructor || null)
      .input('Modalidad', sql.NVarChar, Modalidad || 'Presencial')
      .input('Ubicacion', sql.NVarChar, Ubicacion || null)
      .input('Capacidad', sql.Int, Capacidad || 25)
      .input('Estado', sql.NVarChar, Estado || 'Activo')
      .input('PctMin', sql.Int, PorcentajeMinAsistencia || 75)
      .input('Generacion', sql.NVarChar, Generacion || null)
      .query(`UPDATE AcademiaCursos SET Nombre=@Nombre, Descripcion=@Descripcion, Instructor=@Instructor,
              Modalidad=@Modalidad, Ubicacion=@Ubicacion, Capacidad=@Capacidad, Estado=@Estado,
              PorcentajeMinAsistencia=@PctMin, Generacion=@Generacion
              WHERE CursoAcademiaId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/cursos/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const id = req.params.id;
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM AcademiaAsistencias WHERE SesionId IN (SELECT SesionId FROM AcademiaSesiones WHERE CursoAcademiaId=@id)`);
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM AcademiaSesiones WHERE CursoAcademiaId=@id`);
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM AcademiaInscripciones WHERE CursoAcademiaId=@id`);
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM AcademiaCursos WHERE CursoAcademiaId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Sesiones CRUD ────────────────────────────────────────────────────────────

router.get('/cursos/:id/sesiones', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT s.*,
        (SELECT COUNT(*) FROM AcademiaAsistencias a WHERE a.SesionId=s.SesionId) AS Asistentes
      FROM AcademiaSesiones s WHERE s.CursoAcademiaId=@id ORDER BY s.NumeroSesion`);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/cursos/:id/sesiones', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Fecha, HoraInicio, HoraFin, Ubicacion } = req.body;
    const rMax = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT ISNULL(MAX(NumeroSesion),0)+1 AS siguiente FROM AcademiaSesiones WHERE CursoAcademiaId=@id`);
    const num = rMax.recordset[0].siguiente;
    const r = await pool.request()
      .input('CursoId', sql.Int, req.params.id)
      .input('Num', sql.Int, num)
      .input('Fecha', sql.Date, Fecha)
      .input('HoraInicio', sql.NVarChar, HoraInicio || null)
      .input('HoraFin', sql.NVarChar, HoraFin || null)
      .input('Ubicacion', sql.NVarChar, Ubicacion || null)
      .query(`INSERT INTO AcademiaSesiones (CursoAcademiaId, NumeroSesion, Fecha, HoraInicio, HoraFin, Ubicacion)
              OUTPUT INSERTED.*
              VALUES (@CursoId, @Num, @Fecha, @HoraInicio, @HoraFin, @Ubicacion)`);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/sesiones/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { Fecha, HoraInicio, HoraFin, Ubicacion, Estado } = req.body;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('Fecha', sql.Date, Fecha)
      .input('HoraInicio', sql.NVarChar, HoraInicio || null)
      .input('HoraFin', sql.NVarChar, HoraFin || null)
      .input('Ubicacion', sql.NVarChar, Ubicacion || null)
      .input('Estado', sql.NVarChar, Estado || 'Programada')
      .query(`UPDATE AcademiaSesiones SET Fecha=@Fecha, HoraInicio=@HoraInicio, HoraFin=@HoraFin,
              Ubicacion=@Ubicacion, Estado=@Estado WHERE SesionId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/sesiones/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM AcademiaAsistencias WHERE SesionId=@id`);
    await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM AcademiaSesiones WHERE SesionId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Inscripciones ────────────────────────────────────────────────────────────

router.get('/cursos/:id/inscritos', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT i.*,
          (SELECT COUNT(*) FROM AcademiaAsistencias a
            INNER JOIN AcademiaSesiones s ON a.SesionId=s.SesionId
            WHERE s.CursoAcademiaId=@id AND a.InscripcionId=i.InscripcionId) AS SesionesAsistidas,
          (SELECT COUNT(*) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=@id) AS TotalSesiones
        FROM AcademiaInscripciones i
        WHERE i.CursoAcademiaId=@id AND i.Activo=1
        ORDER BY i.NombreCompleto
      `);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/inscripciones', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { CursoAcademiaId, participantes } = req.body;
    if (!Array.isArray(participantes) || participantes.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un participante' });
    }

    const rCap = await pool.request()
      .input('id', sql.Int, CursoAcademiaId)
      .query(`SELECT Capacidad, (SELECT COUNT(*) FROM AcademiaInscripciones WHERE CursoAcademiaId=@id AND Activo=1) AS Inscritos FROM AcademiaCursos WHERE CursoAcademiaId=@id`);
    const curso = rCap.recordset[0];
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    const disponibles = curso.Capacidad - curso.Inscritos;
    if (participantes.length > disponibles) {
      return res.status(400).json({ error: `Solo hay ${disponibles} lugar(es) disponible(s)` });
    }

    const inscritos = [];
    for (const p of participantes) {
      const existe = await pool.request()
        .input('CursoId', sql.Int, CursoAcademiaId)
        .input('NumEmp', sql.NVarChar, p.NumeroEmpleado)
        .query(`SELECT InscripcionId FROM AcademiaInscripciones WHERE CursoAcademiaId=@CursoId AND NumeroEmpleado=@NumEmp AND Activo=1`);
      if (existe.recordset.length > 0) continue;

      const r = await pool.request()
        .input('CursoId', sql.Int, CursoAcademiaId)
        .input('NumEmp', sql.NVarChar, p.NumeroEmpleado)
        .input('Nombre', sql.NVarChar, p.NombreCompleto)
        .input('Empresa', sql.NVarChar, p.Empresa || null)
        .input('Correo', sql.NVarChar, p.Correo || null)
        .input('Terminal', sql.NVarChar, p.Terminal || null)
        .input('Plaza', sql.NVarChar, p.Plaza || null)
        .input('Area', sql.NVarChar, p.Area || null)
        .input('InscritoPor', sql.NVarChar, req.usuario?.nombre || null)
        .query(`INSERT INTO AcademiaInscripciones (CursoAcademiaId, NumeroEmpleado, NombreCompleto, Empresa, Correo, Terminal, Plaza, Area, InscritoPor)
                OUTPUT INSERTED.*
                VALUES (@CursoId, @NumEmp, @Nombre, @Empresa, @Correo, @Terminal, @Plaza, @Area, @InscritoPor)`);
      inscritos.push(r.recordset[0]);
    }

    res.json({ inscritos: inscritos.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/inscripciones/:id', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE AcademiaInscripciones SET Activo=0 WHERE InscripcionId=@id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Asistencias ──────────────────────────────────────────────────────────────

router.get('/cursos/:id/asistencias', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const cursoId = req.params.id;
    const rSesiones = await pool.request()
      .input('id', sql.Int, cursoId)
      .query(`SELECT * FROM AcademiaSesiones WHERE CursoAcademiaId=@id ORDER BY NumeroSesion`);

    const rInscritos = await pool.request()
      .input('id', sql.Int, cursoId)
      .query(`SELECT i.InscripcionId, i.CursoAcademiaId, i.NumeroEmpleado, i.NombreCompleto,
        i.FechaInscripcion, i.InscritoPor, i.Activo,
        ISNULL(NULLIF(i.Empresa,''), ISNULL(p.Empresa,'')) AS Empresa,
        ISNULL(NULLIF(i.Terminal,''), ISNULL(p.Terminal,'')) AS Terminal,
        ISNULL(NULLIF(i.Plaza,''), ISNULL(p.Plaza,'')) AS Plaza,
        ISNULL(NULLIF(i.Area,''), ISNULL(p.Area,'')) AS Area,
        ISNULL(NULLIF(i.Correo,''), ISNULL(p.CorreoElectronico,'')) AS Correo
      FROM AcademiaInscripciones i
      LEFT JOIN [biUDAT].[STG].[tPlantillaColaboradoresTrayecto] p
        ON p.NumeroEmpleado=i.NumeroEmpleado AND p.BActivo=1
      WHERE i.CursoAcademiaId=@id AND i.Activo=1
      ORDER BY i.NombreCompleto`);

    const rAsist = await pool.request()
      .input('id', sql.Int, cursoId)
      .query(`SELECT a.* FROM AcademiaAsistencias a
              INNER JOIN AcademiaSesiones s ON a.SesionId=s.SesionId
              WHERE s.CursoAcademiaId=@id`);

    const rCurso = await pool.request()
      .input('id', sql.Int, cursoId)
      .query(`SELECT PorcentajeMinAsistencia FROM AcademiaCursos WHERE CursoAcademiaId=@id`);

    res.json({
      sesiones: rSesiones.recordset,
      inscritos: rInscritos.recordset,
      asistencias: rAsist.recordset,
      porcentajeMin: rCurso.recordset[0]?.PorcentajeMinAsistencia || 75,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Histórico ───────────────────────────────────────────────────────────────

router.get('/historico', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const r = await pool.request().query(`
      SELECT
        i.InscripcionId, i.NumeroEmpleado, i.NombreCompleto,
        ISNULL(NULLIF(i.Empresa,''), ISNULL(p.Empresa,'')) AS Empresa,
        ISNULL(NULLIF(i.Terminal,''), ISNULL(p.Terminal,'')) AS Terminal,
        ISNULL(NULLIF(i.Plaza,''), ISNULL(p.Plaza,'')) AS Plaza,
        ISNULL(NULLIF(i.Area,''), ISNULL(p.Area,'')) AS Area,
        ISNULL(NULLIF(i.Correo,''), ISNULL(p.CorreoElectronico,'')) AS Correo,
        c.CursoAcademiaId, c.Nombre AS CursoNombre, ISNULL(c.Generacion,'') AS Generacion,
        ISNULL(c.Instructor,'') AS Instructor, ISNULL(c.Modalidad,'') AS Modalidad,
        c.PorcentajeMinAsistencia,
        (SELECT COUNT(*) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=c.CursoAcademiaId) AS TotalSesiones,
        (SELECT COUNT(*) FROM AcademiaAsistencias a
         INNER JOIN AcademiaSesiones s ON a.SesionId=s.SesionId
         WHERE a.InscripcionId=i.InscripcionId AND s.CursoAcademiaId=c.CursoAcademiaId) AS SesionesAsistidas,
        (SELECT MIN(Fecha) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=c.CursoAcademiaId) AS FechaInicio,
        (SELECT MAX(Fecha) FROM AcademiaSesiones s WHERE s.CursoAcademiaId=c.CursoAcademiaId) AS FechaFin,
        i.FechaInscripcion
      FROM AcademiaInscripciones i
      INNER JOIN AcademiaCursos c ON i.CursoAcademiaId=c.CursoAcademiaId
      LEFT JOIN [biUDAT].[STG].[tPlantillaColaboradoresTrayecto] p
        ON p.NumeroEmpleado=i.NumeroEmpleado AND p.BActivo=1
      WHERE i.Activo=1
      ORDER BY i.NombreCompleto, c.Nombre
    `);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── QR attendance — public endpoint ─────────────────────────────────────────

router.post('/asistencia-qr', async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) return res.status(500).json({ error: 'No hay conexión SQL' });

    const { sesionId, numeroEmpleado } = req.body;
    if (!sesionId || !numeroEmpleado) return res.status(400).json({ error: 'Faltan datos' });

    const rSesion = await pool.request()
      .input('sid', sql.Int, sesionId)
      .query(`SELECT s.*, c.Nombre AS CursoNombre FROM AcademiaSesiones s
              INNER JOIN AcademiaCursos c ON s.CursoAcademiaId=c.CursoAcademiaId
              WHERE s.SesionId=@sid`);
    const sesion = rSesion.recordset[0];
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    const hoy = new Date().toISOString().split('T')[0];
    const fechaSesion = new Date(sesion.Fecha).toISOString().split('T')[0];
    if (hoy !== fechaSesion) {
      return res.status(400).json({ error: 'La fecha de la sesión no coincide con hoy' });
    }

    const rInscripcion = await pool.request()
      .input('cursoId', sql.Int, sesion.CursoAcademiaId)
      .input('numEmp', sql.NVarChar, numeroEmpleado)
      .query(`SELECT * FROM AcademiaInscripciones WHERE CursoAcademiaId=@cursoId AND NumeroEmpleado=@numEmp AND Activo=1`);
    const inscripcion = rInscripcion.recordset[0];
    if (!inscripcion) return res.status(400).json({ error: 'No estás inscrito en este curso' });

    const rYa = await pool.request()
      .input('sid', sql.Int, sesionId)
      .input('iid', sql.Int, inscripcion.InscripcionId)
      .query(`SELECT AsistenciaId FROM AcademiaAsistencias WHERE SesionId=@sid AND InscripcionId=@iid`);
    if (rYa.recordset.length > 0) {
      return res.json({ ok: true, mensaje: 'Asistencia ya registrada previamente', participante: inscripcion.NombreCompleto, curso: sesion.CursoNombre });
    }

    await pool.request()
      .input('sid', sql.Int, sesionId)
      .input('iid', sql.Int, inscripcion.InscripcionId)
      .query(`INSERT INTO AcademiaAsistencias (SesionId, InscripcionId) VALUES (@sid, @iid)`);

    res.json({ ok: true, mensaje: 'Asistencia registrada correctamente', participante: inscripcion.NombreCompleto, curso: sesion.CursoNombre });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── QR: validate employee number (public) ───────────────────────────────────

router.get('/validar-empleado', async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) return res.status(500).json({ error: 'No hay conexión SQL' });
    const { sesionId, numeroEmpleado } = req.query;
    if (!sesionId || !numeroEmpleado) return res.status(400).json({ error: 'Faltan datos' });

    const rSesion = await pool.request()
      .input('sid', sql.Int, sesionId)
      .query(`SELECT s.*, c.Nombre AS CursoNombre FROM AcademiaSesiones s
              INNER JOIN AcademiaCursos c ON s.CursoAcademiaId=c.CursoAcademiaId
              WHERE s.SesionId=@sid`);
    const sesion = rSesion.recordset[0];
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    const rInsc = await pool.request()
      .input('cursoId', sql.Int, sesion.CursoAcademiaId)
      .input('numEmp', sql.NVarChar, numeroEmpleado)
      .query(`SELECT * FROM AcademiaInscripciones WHERE CursoAcademiaId=@cursoId AND NumeroEmpleado=@numEmp AND Activo=1`);
    const inscripcion = rInsc.recordset[0];
    if (!inscripcion) return res.status(404).json({ error: 'No inscrito en este curso' });

    res.json({
      NombreCompleto: inscripcion.NombreCompleto,
      NumeroEmpleado: inscripcion.NumeroEmpleado,
      Empresa: inscripcion.Empresa,
      Correo: inscripcion.Correo,
      CursoNombre: sesion.CursoNombre,
      Sesion: sesion.NumeroSesion,
      FechaSesion: sesion.Fecha,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Manual attendance toggle (admin) ─────────────────────────────────────────

router.post('/asistencia-manual', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { sesionId, inscripcionId, presente } = req.body;
    if (presente) {
      const rYa = await pool.request()
        .input('sid', sql.Int, sesionId)
        .input('iid', sql.Int, inscripcionId)
        .query(`SELECT AsistenciaId FROM AcademiaAsistencias WHERE SesionId=@sid AND InscripcionId=@iid`);
      if (rYa.recordset.length === 0) {
        await pool.request()
          .input('sid', sql.Int, sesionId)
          .input('iid', sql.Int, inscripcionId)
          .query(`INSERT INTO AcademiaAsistencias (SesionId, InscripcionId, MetodoRegistro) VALUES (@sid, @iid, 'Manual')`);
      }
    } else {
      await pool.request()
        .input('sid', sql.Int, sesionId)
        .input('iid', sql.Int, inscripcionId)
        .query(`DELETE FROM AcademiaAsistencias WHERE SesionId=@sid AND InscripcionId=@iid`);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Search employees for enrollment ─────────────────────────────────────────

router.get('/buscar-empleados', autenticar, async (req, res) => {
  try {
    const pool = await requirePool(res); if (!pool) return;
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const r = await pool.request()
      .input('q', sql.NVarChar, `%${q}%`)
      .query(`SELECT TOP 20 NumeroEmpleado, NombreCompleto, Empresa, Correo
              FROM MatrizColaboradores
              WHERE NombreCompleto LIKE @q OR NumeroEmpleado LIKE @q OR Correo LIKE @q
              ORDER BY NombreCompleto`);
    if (r.recordset.length === 0) {
      const r2 = await pool.request()
        .input('q', sql.NVarChar, `%${q}%`)
        .query(`SELECT TOP 20 NumeroEmpleado, NombreCompleto, Empresa, CorreoElectronico AS Correo
                FROM Empleados
                WHERE NombreCompleto LIKE @q OR NumeroEmpleado LIKE @q OR CorreoElectronico LIKE @q
                ORDER BY NombreCompleto`);
      return res.json(r2.recordset);
    }
    res.json(r.recordset);
  } catch (e) {
    try {
      const pool = await getPool();
      const r2 = await pool.request()
        .input('q', sql.NVarChar, `%${req.query.q}%`)
        .query(`SELECT TOP 20 NumeroEmpleado, NombreCompleto, Empresa, CorreoElectronico AS Correo
                FROM Empleados
                WHERE NombreCompleto LIKE @q OR NumeroEmpleado LIKE @q OR CorreoElectronico LIKE @q
                ORDER BY NombreCompleto`);
      res.json(r2.recordset);
    } catch (e2) {
      res.status(500).json({ error: e2.message });
    }
  }
});

export default router;
