import express from 'express';
import sql from 'mssql';
import { getPool, query } from '../db.js';

const router = express.Router();

const DEFAULT_CONCEPTOS = [
  { ConceptoCostoId: 1, Nombre: 'Instructor IMPARTICIÓN', TipoCalculo: 'Por sesión', Formula: 'Sesiones x Días', CostoUnitario: 1000 },
  { ConceptoCostoId: 2, Nombre: 'Instructor sesión de coaching', TipoCalculo: 'Por sesión', Formula: 'Sesiones x Días', CostoUnitario: 1000 },
  { ConceptoCostoId: 3, Nombre: 'Intervención por no acreditación', TipoCalculo: 'Por evento', Formula: 'Eventos', CostoUnitario: 1000 },
];

const DEFAULT_ESTADOS = [
  { EstadoId: 1, Nombre: 'Borrador' },
  { EstadoId: 2, Nombre: 'Enviado' },
  { EstadoId: 3, Nombre: 'Aprobado' },
  { EstadoId: 4, Nombre: 'Rechazado' },
];

let conceptosTableReady = false;

export function estadoNombre(estadoId) {
  return DEFAULT_ESTADOS.find((e) => e.EstadoId === Number(estadoId))?.Nombre || 'Borrador';
}

async function requirePool(res) {
  const pool = await getPool();
  if (!pool) {
    res.status(500).send('No hay conexión SQL');
    return null;
  }
  return pool;
}

async function ensureConceptosTable(pool) {
  if (conceptosTableReady) return;

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'ConceptosCosto' AND schema_id = SCHEMA_ID('dbo')
    )
    BEGIN
      CREATE TABLE ConceptosCosto (
        ConceptoCostoId INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(250) NOT NULL,
        TipoCalculo NVARCHAR(100) NULL,
        TipoCosto NVARCHAR(50) NULL,
        Formula NVARCHAR(250) NULL,
        CostoUnitario DECIMAL(18,2) NULL,
        Activo BIT NOT NULL DEFAULT 1
      );
    END
  `);

  // Ensure existing tables get the new column if missing
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConceptosCosto' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ConceptosCosto') AND name = 'TipoCosto'
      )
      BEGIN
        ALTER TABLE ConceptosCosto ADD TipoCosto NVARCHAR(50) NULL;
      END
    END
  `);

  conceptosTableReady = true;
}

function requireNombre(req, res) {
  const nombre = (req.body.Nombre || '').trim();
  if (!nombre) {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return null;
  }
  return nombre;
}

router.get('/cursos', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request().query(`
      SELECT *
      FROM Cursos
      WHERE Activo = 1
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR CURSOS:', err);
    res.status(500).json({ error: 'Error al cargar cursos' });
  }
});

router.post('/cursos', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const duracion = req.body.DuracionDefaultDias ?? req.body.DuracionBaseDias ?? null;
    const request = pool.request();
    request.input('Nombre', sql.NVarChar(200), nombre);
    request.input('DuracionDefaultDias', sql.Int, duracion != null && duracion !== '' ? Number(duracion) : null);

    const result = await request.query(`
      INSERT INTO Cursos (Nombre, DuracionDefaultDias)
      OUTPUT INSERTED.*
      VALUES (@Nombre, @DuracionDefaultDias)
    `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR CURSO:', err);
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

router.put('/cursos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de curso inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;

    const updates = {};
    if (req.body.Nombre !== undefined) {
      updates.Nombre = req.body.Nombre;
    }
    if (req.body.DuracionDefaultDias !== undefined) {
      updates.DuracionDefaultDias = req.body.DuracionDefaultDias !== '' ? Number(req.body.DuracionDefaultDias) : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay datos para actualizar curso' });
    }

    const request = pool.request();
    const setSql = Object.keys(updates)
      .map((key, index) => {
        request.input(key, key === 'DuracionDefaultDias' ? sql.Int : sql.NVarChar(200), updates[key]);
        return `[${key}] = @${key}`;
      })
      .join(', ');
    request.input('id', sql.Int, id);

    const result = await request.query(`
      UPDATE Cursos
      SET ${setSql}
      WHERE CursoId = @id;
      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR CURSO:', err);
    res.status(500).json({ error: 'Error al actualizar curso' });
  }
});

router.delete('/cursos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de curso inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;

    const hard = req.query.hard === '1' || req.query.hard === 'true';
    const request = pool.request().input('id', sql.Int, id);
    let result;
    if (hard) {
      result = await request.query(`
        DELETE FROM Cursos WHERE CursoId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    } else {
      result = await request.query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Cursos') AND name = 'Activo')
          UPDATE Cursos SET Activo = 0 WHERE CursoId = @id;
        ELSE
          DELETE FROM Cursos WHERE CursoId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    }

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR CURSO:', err);
    res.status(500).json({ error: 'Error al eliminar curso' });
  }
});

router.get('/clientes', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request().query(`
      SELECT
        EmpresaId AS ClienteId,
        EmpresaId,
        Nombre
      FROM Empresas
      WHERE Activo = 1
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR EMPRESAS:', err);
    res.status(500).json({ error: 'Error al cargar clientes' });
  }
});

router.post('/clientes', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(200), nombre)
      .query(`
        INSERT INTO Empresas (Nombre)
        OUTPUT INSERTED.EmpresaId AS ClienteId, INSERTED.EmpresaId, INSERTED.Nombre
        VALUES (@Nombre)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR EMPRESA:', err);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

router.put('/clientes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(200), nombre)
      .input('id', sql.Int, id)
      .query(`
        UPDATE Empresas
        SET Nombre = @Nombre
        WHERE EmpresaId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR CLIENTE:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/clientes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;

    const hard = req.query.hard === '1' || req.query.hard === 'true';
    const request = pool.request().input('id', sql.Int, id);
    let result;
    if (hard) {
      result = await request.query(`
        DELETE FROM Empresas WHERE EmpresaId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    } else {
      result = await request.query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'Activo')
          UPDATE Empresas SET Activo = 0 WHERE EmpresaId = @id;
        ELSE
          DELETE FROM Empresas WHERE EmpresaId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    }

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR CLIENTE:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

router.get('/coaches', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request().query(`
      SELECT CoachId, Nombre
      FROM Coaches
      WHERE Activo = 1
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR COACHES:', err);
    res.status(500).json({ error: 'Error al cargar coaches' });
  }
});

router.post('/coaches', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(200), nombre)
      .query(`
        INSERT INTO Coaches (Nombre)
        OUTPUT INSERTED.*
        VALUES (@Nombre)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR COACH:', err);
    res.status(500).json({ error: 'Error al crear coach' });
  }
});

router.put('/coaches/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de coach inválido' });
    }

    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(200), nombre)
      .input('id', sql.Int, id)
      .query(`
        UPDATE Coaches
        SET Nombre = @Nombre
        WHERE CoachId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Coach no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR COACH:', err);
    res.status(500).json({ error: 'Error al actualizar coach' });
  }
});

router.delete('/coaches/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de coach inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;

    const hard = req.query.hard === '1' || req.query.hard === 'true';
    const request = pool.request().input('id', sql.Int, id);
    let result;
    if (hard) {
      result = await request.query(`
        DELETE FROM Coaches WHERE CoachId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    } else {
      result = await request.query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Coaches') AND name = 'Activo')
          UPDATE Coaches SET Activo = 0 WHERE CoachId = @id;
        ELSE
          DELETE FROM Coaches WHERE CoachId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    }

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Coach no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR COACH:', err);
    res.status(500).json({ error: 'Error al eliminar coach' });
  }
});

router.get('/modalidades', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request().query(`
      SELECT *
      FROM Modalidades
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR MODALIDADES:', err);
    res.status(500).json({ error: 'Error al cargar modalidades' });
  }
});

router.post('/modalidades', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .query(`
        INSERT INTO Modalidades (Nombre)
        OUTPUT INSERTED.*
        VALUES (@Nombre)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR MODALIDAD:', err);
    res.status(500).json({ error: 'Error al crear modalidad' });
  }
});

router.put('/modalidades/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de modalidad inválido' });
    }

    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('id', sql.Int, id)
      .query(`
        UPDATE Modalidades
        SET Nombre = @Nombre
        WHERE ModalidadId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Modalidad no encontrada' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR MODALIDAD:', err);
    res.status(500).json({ error: 'Error al actualizar modalidad' });
  }
});

router.delete('/modalidades/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de modalidad inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;

    const hard = req.query.hard === '1' || req.query.hard === 'true';
    const request = pool.request().input('id', sql.Int, id);
    let result;
    if (hard) {
      result = await request.query(`
        DELETE FROM Modalidades WHERE ModalidadId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    } else {
      result = await request.query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Modalidades') AND name = 'Activo')
          UPDATE Modalidades SET Activo = 0 WHERE ModalidadId = @id;
        ELSE
          DELETE FROM Modalidades WHERE ModalidadId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    }

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Modalidad no encontrada' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR MODALIDAD:', err);
    res.status(500).json({ error: 'Error al eliminar modalidad' });
  }
});

router.get('/conceptos', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;

    await ensureConceptosTable(pool);

    const result = await pool.request().query(`
      SELECT *
      FROM ConceptosCosto
      WHERE Activo = 1
      ORDER BY Nombre
    `);

    const rows = result.recordset.map((row, index) => ({
      ConceptoCostoId: row.ConceptoCostoId ?? row.Id ?? index + 1,
      Nombre: row.Nombre ?? row.Concepto,
      TipoCalculo: row.TipoCalculo,
      TipoCosto: row.TipoCosto,
      Formula: row.Formula,
      CostoUnitario: row.CostoUnitario,
      ...row,
    }));

    res.json(rows.length ? rows : DEFAULT_CONCEPTOS);
  } catch (err) {
    console.log('❌ ERROR CONCEPTOS (usando valores por defecto):', err.message);
    res.json(DEFAULT_CONCEPTOS);
  }
});

router.post('/conceptos', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureConceptosTable(pool);

    const { TipoCalculo, Formula, CostoUnitario, TipoCosto } = req.body;
    const request = pool.request();
    request.input('Nombre', sql.NVarChar(250), nombre);
    request.input('TipoCalculo', sql.NVarChar(100), TipoCalculo || null);
    request.input('TipoCosto', sql.NVarChar(50), TipoCosto || null);
    request.input('Formula', sql.NVarChar(250), Formula || null);
    request.input(
      'CostoUnitario',
      sql.Decimal(18, 2),
      CostoUnitario != null && CostoUnitario !== '' ? Number(CostoUnitario) : null
    );

    console.log('DEBUG POST CONCEPTO body:', { TipoCalculo, Formula, CostoUnitario, TipoCosto });

    const result = await request.query(`
      INSERT INTO ConceptosCosto (Nombre, TipoCalculo, TipoCosto, Formula, CostoUnitario)
      OUTPUT INSERTED.*
      VALUES (@Nombre, @TipoCalculo, @TipoCosto, @Formula, @CostoUnitario)
    `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR CONCEPTO:', err);
    res.status(500).json({ error: 'Error al crear concepto de costo' });
  }
});

router.put('/conceptos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de concepto inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureConceptosTable(pool);

    const updates = {};
    if (req.body.Nombre !== undefined) updates.Nombre = req.body.Nombre;
    if (req.body.TipoCalculo !== undefined) updates.TipoCalculo = req.body.TipoCalculo;
    if (req.body.TipoCosto !== undefined) updates.TipoCosto = req.body.TipoCosto;
    if (req.body.Formula !== undefined) updates.Formula = req.body.Formula;
    if (req.body.CostoUnitario !== undefined) {
      updates.CostoUnitario = req.body.CostoUnitario !== '' ? Number(req.body.CostoUnitario) : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay datos para actualizar concepto' });
    }

    const request = pool.request();
    const setSql = Object.keys(updates)
      .map((key) => {
        const value = updates[key];
        const type = key === 'CostoUnitario' ? sql.Decimal(18, 2) : sql.NVarChar(250);
        request.input(key, type, value);
        return `[${key}] = @${key}`;
      })
      .join(', ');
    request.input('id', sql.Int, id);

    console.log('DEBUG PUT CONCEPTO id:', id, 'updates:', updates);

    const result = await request.query(`
      UPDATE ConceptosCosto
      SET ${setSql}
      WHERE ConceptoCostoId = @id;
      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Concepto no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR CONCEPTO:', err);
    res.status(500).json({ error: 'Error al actualizar concepto de costo' });
  }
});

router.delete('/conceptos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de concepto inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureConceptosTable(pool);

    const hard = req.query.hard === '1' || req.query.hard === 'true';
    const request = pool.request().input('id', sql.Int, id);
    let result;
    if (hard) {
      result = await request.query(`
        DELETE FROM ConceptosCosto WHERE ConceptoCostoId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    } else {
      result = await request.query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ConceptosCosto') AND name = 'Activo')
          UPDATE ConceptosCosto SET Activo = 0 WHERE ConceptoCostoId = @id;
        ELSE
          DELETE FROM ConceptosCosto WHERE ConceptoCostoId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);
    }

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Concepto no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR CONCEPTO:', err);
    res.status(500).json({ error: 'Error al eliminar concepto de costo' });
  }
});

router.get('/participantes', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;

    const search = (req.query.search || '').trim();
    const request = pool.request();

    let sqlText = `
      SELECT TOP 1000
        EmpleadoId,
        NumeroEmpleado,
        Nombre,
        ApellidoPaterno,
        ApellidoMaterno,
        LTRIM(RTRIM(
          ISNULL(Nombre,'') + ' ' +
          ISNULL(ApellidoPaterno,'') + ' ' +
          ISNULL(ApellidoMaterno,'')
        )) AS NombreCompleto,
        ISNULL(UnidadNegocio, '') AS Empresa
      FROM [biUDAT].[STG].[tPlantillaColaboradoresTrayecto]
      WHERE BActivo = 1
    `;

    if (search) {
      sqlText += `
        AND (
          Nombre + ' ' + ISNULL(ApellidoPaterno,'') + ' ' + ISNULL(ApellidoMaterno,'') LIKE @search
          OR NumeroEmpleado LIKE @search
          OR UnidadNegocio LIKE @search
        )`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    sqlText += ' ORDER BY Nombre';
    const result = await request.query(sqlText);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR PARTICIPANTES:', err);
    res.status(500).json({ error: 'Error al cargar participantes' });
  }
});

async function ensureProveedoresTable(pool) {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'Proveedores' AND schema_id = SCHEMA_ID('dbo')
    )
    BEGIN
      CREATE TABLE Proveedores (
        ProveedorId INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(250) NOT NULL,
        RFC NVARCHAR(50) NULL,
        Telefono NVARCHAR(50) NULL,
        Correo NVARCHAR(150) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        FechaModificacion DATETIME2 NULL
      );
    END
  `);
}

async function ensureUnidadesNegocioTable(pool) {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'UnidadesNegocio' AND schema_id = SCHEMA_ID('dbo')
    )
    BEGIN
      CREATE TABLE UnidadesNegocio (
        UnidadNegocioId INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(250) NOT NULL,
        Descripcion NVARCHAR(500) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        FechaModificacion DATETIME2 NULL
      );
    END
  `);
}

router.get('/proveedores', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;
    await ensureProveedoresTable(pool);

    const result = await pool.request().query(`
      SELECT *
      FROM Proveedores
      WHERE Activo = 1
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR PROVEEDORES:', err);
    res.status(500).json({ error: 'Error al cargar proveedores' });
  }
});

router.post('/proveedores', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureProveedoresTable(pool);

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(250), nombre)
      .input('RFC', sql.NVarChar(50), req.body.RFC || null)
      .input('Telefono', sql.NVarChar(50), req.body.Telefono || null)
      .input('Correo', sql.NVarChar(150), req.body.Correo || null)
      .query(`
        INSERT INTO Proveedores (Nombre, RFC, Telefono, Correo)
        OUTPUT INSERTED.*
        VALUES (@Nombre, @RFC, @Telefono, @Correo)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR PROVEEDOR:', err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

router.put('/proveedores/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de proveedor inválido' });
    }

    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureProveedoresTable(pool);

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(250), nombre)
      .input('RFC', sql.NVarChar(50), req.body.RFC || null)
      .input('Telefono', sql.NVarChar(50), req.body.Telefono || null)
      .input('Correo', sql.NVarChar(150), req.body.Correo || null)
      .input('id', sql.Int, id)
      .query(`
        UPDATE Proveedores
        SET Nombre = @Nombre,
            RFC = @RFC,
            Telefono = @Telefono,
            Correo = @Correo
        WHERE ProveedorId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR PROVEEDOR:', err);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

router.delete('/proveedores/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de proveedor inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureProveedoresTable(pool);

    const request = pool.request().input('id', sql.Int, id);
    const result = await request.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Proveedores') AND name = 'Activo')
        UPDATE Proveedores SET Activo = 0 WHERE ProveedorId = @id;
      ELSE
        DELETE FROM Proveedores WHERE ProveedorId = @id;
      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR PROVEEDOR:', err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

router.get('/unidadesnegocio', async (req, res) => {
  try {
    const pool = await requirePool(res);
    if (!pool) return;
    await ensureUnidadesNegocioTable(pool);

    const result = await pool.request().query(`
      SELECT *
      FROM UnidadesNegocio
      WHERE Activo = 1
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR UNIDADES DE NEGOCIO:', err);
    res.status(500).json({ error: 'Error al cargar unidades de negocio' });
  }
});

router.post('/unidadesnegocio', async (req, res) => {
  try {
    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureUnidadesNegocioTable(pool);

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(250), nombre)
      .input('Descripcion', sql.NVarChar(500), req.body.Descripcion || null)
      .query(`
        INSERT INTO UnidadesNegocio (Nombre, Descripcion)
        OUTPUT INSERTED.*
        VALUES (@Nombre, @Descripcion)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.log('❌ ERROR CREAR UNIDAD DE NEGOCIO:', err);
    res.status(500).json({ error: 'Error al crear unidad de negocio' });
  }
});

router.put('/unidadesnegocio/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de unidad inválido' });
    }

    const nombre = requireNombre(req, res);
    if (!nombre) return;

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureUnidadesNegocioTable(pool);

    const result = await pool.request()
      .input('Nombre', sql.NVarChar(250), nombre)
      .input('Descripcion', sql.NVarChar(500), req.body.Descripcion || null)
      .input('id', sql.Int, id)
      .query(`
        UPDATE UnidadesNegocio
        SET Nombre = @Nombre,
            Descripcion = @Descripcion
        WHERE UnidadNegocioId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Unidad de negocio no encontrada' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR UNIDAD DE NEGOCIO:', err);
    res.status(500).json({ error: 'Error al actualizar unidad de negocio' });
  }
});

router.delete('/unidadesnegocio/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de unidad inválido' });
    }

    const pool = await requirePool(res);
    if (!pool) return;
    await ensureUnidadesNegocioTable(pool);

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UnidadesNegocio') AND name = 'Activo')
          UPDATE UnidadesNegocio SET Activo = 0 WHERE UnidadNegocioId = @id;
        ELSE
          DELETE FROM UnidadesNegocio WHERE UnidadNegocioId = @id;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Unidad de negocio no encontrada' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR UNIDAD DE NEGOCIO:', err);
    res.status(500).json({ error: 'Error al eliminar unidad de negocio' });
  }
});

router.get('/estados', async (req, res) => {
  try {
    res.json(DEFAULT_ESTADOS);
  } catch (err) {
    console.log('❌ ERROR ESTADOS:', err);
    res.status(500).json({ error: 'Error al cargar estados' });
  }
});

export default router;
