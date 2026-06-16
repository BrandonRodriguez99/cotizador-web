const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 CONFIG SQL
const config = {
  user: 'BiBandonRodriguez',
  password: 'BiRodriguez2024#$.#',
  server: 'udatserver.southcentralus.cloudapp.azure.com',
  database: 'biUDAT',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;

sql.connect(config)
  .then((p) => {
    pool = p;
    console.log('✅ Conectado a SQL Server');

    (async () => {
      try {
        await pool.request().query(`
          IF OBJECT_ID('dbo.ConceptosCosto', 'U') IS NOT NULL
          BEGIN
            IF NOT EXISTS(
              SELECT 1 FROM sys.columns
              WHERE object_id = OBJECT_ID('dbo.ConceptosCosto')
                AND name = 'TipoCosto'
            )
            BEGIN
              ALTER TABLE dbo.ConceptosCosto ADD TipoCosto NVARCHAR(50) NULL;
            END
            UPDATE dbo.ConceptosCosto
            SET TipoCosto = ''
            WHERE TipoCosto IS NULL;
          END
        `);
        console.log('✅ Asegurada columna TipoCosto en ConceptosCosto y normalizados valores NULL');
      } catch (e) {
        console.log('❌ Error asegurando TipoCosto:', e);
      }
    })();
  })
  .catch((err) => console.log('❌ Error SQL:', err));

function ensurePool(res) {
  if (!pool) {
    res.status(500).send('No hay conexión SQL');
    return false;
  }
  return true;
}

function requireNombre(req, res) {
  const nombre = (req.body.Nombre || '').toString().trim();
  if (!nombre) {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return null;
  }
  return nombre;
}

function buildSqlParams(request, data) {
  Object.entries(data).forEach(([key, value], index) => {
    const paramValue = value === undefined ? null : value;
    const paramType =
      value == null
        ? sql.NVarChar(sql.MAX)
        : typeof value === 'number'
        ? Number.isInteger(value)
          ? sql.Int
          : sql.Decimal(18, 2)
        : sql.NVarChar(sql.MAX);
    request.input(`p${index}`, paramType, paramValue);
  });
}

async function insertCatalogItem(table, data) {
  const fields = Object.keys(data);
  const columns = fields.map((field) => `[${field}]`).join(', ');
  const values = fields.map((_, index) => `@p${index}`).join(', ');
  const request = pool.request();
  buildSqlParams(request, data);
  return request.query(`INSERT INTO ${table} (${columns}) VALUES (${values}); SELECT SCOPE_IDENTITY() AS id;`);
}

async function updateCatalogItem(table, idColumn, id, data) {
  const fields = Object.keys(data);
  const updates = fields.map((field, index) => `[${field}] = @p${index}`).join(', ');
  const request = pool.request();
  buildSqlParams(request, data);
  request.input('id', sql.Int, Number(id));
  return request.query(`UPDATE ${table} SET ${updates}, FechaModificacion = SYSUTCDATETIME() WHERE ${idColumn} = @id; SELECT @@ROWCOUNT AS affected;`);
}

async function deleteCatalogItem(table, idColumn, id) {
  return pool
    .request()
    .input('id', sql.Int, Number(id))
    .query(`
      IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('${table}') AND name = 'Activo')
        UPDATE ${table} SET Activo = 0, FechaModificacion = SYSUTCDATETIME() WHERE ${idColumn} = @id;
      ELSE
        DELETE FROM ${table} WHERE ${idColumn} = @id;
      SELECT @@ROWCOUNT AS affected;
    `);
}

app.get('/', (req, res) => {
  res.send('API funcionando');
});

app.get('/api/catalogos/cursos', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const result = await pool.request().query(`SELECT * FROM Cursos WHERE Activo = 1 ORDER BY Nombre`);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR CURSOS:', err);
    res.status(500).json({ error: 'Error al cargar cursos' });
  }
});

app.post('/api/catalogos/cursos', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Faltan datos para crear curso' });
    }
    const result = await insertCatalogItem('Cursos', data);
    res.status(201).json({ id: result.recordset[0].id });
  } catch (err) {
    console.log('❌ ERROR CREAR CURSO:', err);
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

app.put('/api/catalogos/cursos/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Faltan datos para actualizar curso' });
    }
    const result = await updateCatalogItem('Cursos', 'CursoId', req.params.id, data);
    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ACTUALIZAR CURSO:', err);
    res.status(500).json({ error: 'Error al actualizar curso' });
  }
});

app.delete('/api/catalogos/cursos/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const result = await deleteCatalogItem('Cursos', 'CursoId', req.params.id);
    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.log('❌ ERROR ELIMINAR CURSO:', err);
    res.status(500).json({ error: 'Error al eliminar curso' });
  }
});

app.get('/api/catalogos/conceptos', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const result = await pool.request().query(`SELECT ConceptoCostoId, Nombre, TipoCalculo, TipoCosto, Formula, CostoUnitario, Activo FROM ConceptosCosto WHERE Activo = 1 ORDER BY Nombre`);
    const rows = result.recordset.map((row) => ({
      ...row,
      TipoCosto: row.TipoCosto == null ? '' : row.TipoCosto,
    }));
    res.json(rows);
  } catch (err) {
    console.log('❌ ERROR CONCEPTOS:', err);
    res.status(500).json({ error: 'Error al cargar conceptos de costo' });
  }
});

app.post('/api/catalogos/conceptos', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Faltan datos para crear concepto' });
    }
    const request = pool.request();
    request.input('Nombre', sql.NVarChar(250), data.Nombre || null);
    request.input('TipoCalculo', sql.NVarChar(100), data.TipoCalculo || null);
    request.input('TipoCosto', sql.NVarChar(50), data.TipoCosto || null);
    request.input('Formula', sql.NVarChar(250), data.Formula || null);
    request.input('CostoUnitario', sql.Decimal(18, 2), data.CostoUnitario != null && data.CostoUnitario !== '' ? Number(data.CostoUnitario) : null);
    const result = await request.query(`
      INSERT INTO ConceptosCosto (Nombre, TipoCalculo, TipoCosto, Formula, CostoUnitario)
      OUTPUT INSERTED.ConceptoCostoId AS id
      VALUES (@Nombre, @TipoCalculo, @TipoCosto, @Formula, @CostoUnitario);
    `);
    res.status(201).json({ id: result.recordset[0].id });
  } catch (err) {
    console.log('❌ ERROR CREAR CONCEPTO:', err);
    res.status(500).json({ error: 'Error al crear concepto de costo' });
  }
});

app.put('/api/catalogos/conceptos/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Faltan datos para actualizar concepto' });
    }
    const updates = [];
    const request = pool.request();
    if (data.Nombre !== undefined) {
      request.input('Nombre', sql.NVarChar(250), data.Nombre);
      updates.push('[Nombre] = @Nombre');
    }
    if (data.TipoCalculo !== undefined) {
      request.input('TipoCalculo', sql.NVarChar(100), data.TipoCalculo);
      updates.push('[TipoCalculo] = @TipoCalculo');
    }
    if (data.TipoCosto !== undefined) {
      request.input('TipoCosto', sql.NVarChar(50), data.TipoCosto);
      updates.push('[TipoCosto] = @TipoCosto');
    }
    if (data.Formula !== undefined) {
      request.input('Formula', sql.NVarChar(250), data.Formula);
      updates.push('[Formula] = @Formula');
    }
    if (data.CostoUnitario !== undefined) {
      request.input('CostoUnitario', sql.Decimal(18, 2), data.CostoUnitario !== '' ? Number(data.CostoUnitario) : null);
      updates.push('[CostoUnitario] = @CostoUnitario');
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay datos válidos para actualizar concepto' });
    }
    request.input('id', sql.Int, Number(req.params.id));
    const result = await request.query(`
      UPDATE ConceptosCosto
      SET ${updates.join(', ')}
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

const catalogRoutes = [
  { path: 'clientes', table: 'Empresas', idColumn: 'EmpresaId' },
  { path: 'coaches', table: 'Coaches', idColumn: 'CoachId' },
  { path: 'modalidades', table: 'Modalidades', idColumn: 'ModalidadId' },
];

catalogRoutes.forEach((route) => {
  app.get(`/api/catalogos/${route.path}`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const result = await pool.request().query(`SELECT * FROM ${route.table} WHERE Activo = 1 ORDER BY Nombre`);
      const rows = result.recordset.map((row) => {
        if (route.path === 'clientes') {
          return { ...row, ClienteId: row.EmpresaId };
        }
        if (route.path === 'conceptos') {
          return { ...row, TipoCosto: row.TipoCosto == null ? '' : row.TipoCosto };
        }
        return row;
      });
      res.json(rows);
    } catch (err) {
      console.log(`❌ ERROR ${route.path.toUpperCase()}:`, err);
      res.status(500).json({ error: `Error al cargar ${route.path}` });
    }
  });

  app.post(`/api/catalogos/${route.path}`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: `Faltan datos para crear ${route.path}` });
      }

      if (route.path === 'conceptos') {
        const conceptoData = {
          Nombre: data.Nombre,
          TipoCalculo: data.TipoCalculo || null,
          TipoCosto: data.TipoCosto || null,
          Formula: data.Formula || null,
          CostoUnitario: data.CostoUnitario != null && data.CostoUnitario !== '' ? Number(data.CostoUnitario) : null,
          Activo: data.Activo !== undefined ? data.Activo : 1,
        };
        const result = await insertCatalogItem(route.table, conceptoData);
        return res.status(201).json({ id: result.recordset[0].id });
      }

      const result = await insertCatalogItem(route.table, data);
      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.log(`❌ ERROR CREAR ${route.path.toUpperCase()}:`, err);
      res.status(500).json({ error: `Error al crear ${route.path}` });
    }
  });

  app.put(`/api/catalogos/${route.path}/:id`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: `Faltan datos para actualizar ${route.path}` });
      }

      if (route.path === 'conceptos') {
        const conceptoData = {};
        if (data.Nombre !== undefined) conceptoData.Nombre = data.Nombre;
        if (data.TipoCalculo !== undefined) conceptoData.TipoCalculo = data.TipoCalculo;
        if (data.TipoCosto !== undefined) conceptoData.TipoCosto = data.TipoCosto;
        if (data.Formula !== undefined) conceptoData.Formula = data.Formula;
        if (data.CostoUnitario !== undefined)
          conceptoData.CostoUnitario = data.CostoUnitario !== '' ? Number(data.CostoUnitario) : null;
        if (Object.keys(conceptoData).length === 0) {
          return res.status(400).json({ error: 'No hay datos válidos para actualizar concepto' });
        }
        const result = await updateCatalogItem(route.table, route.idColumn, req.params.id, conceptoData);
        if (result.recordset[0].affected === 0) {
          return res.status(404).json({ error: 'Concepto no encontrado' });
        }
        return res.sendStatus(204);
      }

      const result = await updateCatalogItem(route.table, route.idColumn, req.params.id, data);
      if (result.recordset[0].affected === 0) {
        return res.status(404).json({ error: `${route.path} no encontrado` });
      }
      res.sendStatus(204);
    } catch (err) {
      console.log(`❌ ERROR ACTUALIZAR ${route.path.toUpperCase()}:`, err);
      res.status(500).json({ error: `Error al actualizar ${route.path}` });
    }
  });

  app.delete(`/api/catalogos/${route.path}/:id`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const result = await deleteCatalogItem(route.table, route.idColumn, req.params.id);
      if (result.recordset[0].affected === 0) {
        return res.status(404).json({ error: `${route.path} no encontrado` });
      }
      res.sendStatus(204);
    } catch (err) {
      console.log(`❌ ERROR ELIMINAR ${route.path.toUpperCase()}:`, err);
      res.status(500).json({ error: `Error al eliminar ${route.path}` });
    }
  });
});

app.get('/api/catalogos/participantes', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const search = (req.query.search || '').trim();
    const request = pool.request();
    let sqlText = `
      SELECT TOP 1000
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

app.get('/api/catalogos/estados', async (req, res) => {
  try {
    const estados = [
      { Id: 1, Nombre: 'Borrador' },
      { Id: 2, Nombre: 'Enviado' },
      { Id: 3, Nombre: 'Aprobado' },
      { Id: 4, Nombre: 'Rechazado' },
    ];
    res.json(estados);
  } catch (err) {
    console.log('❌ ERROR ESTADOS:', err);
    res.status(500).json({ error: 'Error al cargar estados' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
