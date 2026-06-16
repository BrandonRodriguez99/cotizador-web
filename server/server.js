const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'udat-cotizador-secret-2024';

app.use(cors());
app.use(express.json());

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
        // Tablas de autenticación
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Usuarios' AND schema_id = SCHEMA_ID('dbo'))
          BEGIN
            CREATE TABLE dbo.Usuarios (
              UsuarioId         INT IDENTITY(1,1) PRIMARY KEY,
              Correo            NVARCHAR(150) NOT NULL,
              PasswordHash      NVARCHAR(255) NOT NULL,
              Nombre            NVARCHAR(200) NOT NULL,
              Rol               NVARCHAR(50)  NOT NULL DEFAULT 'empleado',
              DebeReiniciarPass BIT           NOT NULL DEFAULT 1,
              Activo            BIT           NOT NULL DEFAULT 1,
              FechaCreacion     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
              UltimoAcceso      DATETIME2     NULL,
              CONSTRAINT UQ_Usuarios_Correo UNIQUE (Correo)
            )
          END
        `);

        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TokensRecuperacion' AND schema_id = SCHEMA_ID('dbo'))
          BEGIN
            CREATE TABLE dbo.TokensRecuperacion (
              TokenId       INT IDENTITY(1,1) PRIMARY KEY,
              UsuarioId     INT           NOT NULL,
              Token         NVARCHAR(20)  NOT NULL,
              Expiracion    DATETIME2     NOT NULL,
              Usado         BIT           NOT NULL DEFAULT 0,
              FechaCreacion DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
              CONSTRAINT FK_TokensRec_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId)
            )
          END
        `);

        const countRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.Usuarios');
        if (countRes.recordset[0].total === 0) {
          const hash = await bcrypt.hash('Udat2024!', 10);
          await pool
            .request()
            .input('Correo', sql.NVarChar(150), 'admin@udat.com')
            .input('Hash', sql.NVarChar(255), hash)
            .input('Nombre', sql.NVarChar(200), 'Administrador')
            .input('Rol', sql.NVarChar(50), 'admin')
            .query(`INSERT INTO dbo.Usuarios (Correo, PasswordHash, Nombre, Rol, DebeReiniciarPass)
                    VALUES (@Correo, @Hash, @Nombre, @Rol, 1)`);
          console.log('✅ Admin creado: admin@udat.com / Udat2024!');
        }
        console.log('✅ Tablas de autenticación aseguradas');
      } catch (e) {
        console.log('❌ Error en startup:', e.message);
      }
    })();
  })
  .catch((err) => console.log('❌ Error SQL:', err));

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    request.input(`p${index}`, value);
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
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('${table}') AND name = 'Activo')
        UPDATE ${table} SET Activo = 0, FechaModificacion = SYSUTCDATETIME() WHERE ${idColumn} = @id;
      ELSE
        DELETE FROM ${table} WHERE ${idColumn} = @id;
      SELECT @@ROWCOUNT AS affected;
    `);
}

async function ensureProveedoresTable() {
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

async function ensureUnidadesNegocioTable() {
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

async function ensureOrdenesCompraTables() {
  if (!pool) return;
  try {
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.tables WHERE name = 'OrdenesCompra' AND schema_id = SCHEMA_ID('dbo')
      )
      BEGIN
        CREATE TABLE OrdenesCompra (
          OrdenCompraId INT IDENTITY(1,1) PRIMARY KEY,
          Folio NVARCHAR(50) NOT NULL,
          UnidadNegocioId INT NULL,
          UnidadNegocio NVARCHAR(250) NULL,
          ProveedorId INT NULL,
          Proveedor NVARCHAR(250) NULL,
          Fecha DATE NULL,
          Observaciones NVARCHAR(2000) NULL,
          Subtotal DECIMAL(18,2) NULL,
          Iva DECIMAL(18,2) NULL,
          Total DECIMAL(18,2) NULL,
          Creador NVARCHAR(150) NULL,
          FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          Aprobaciones NVARCHAR(MAX) NULL,
          Rechazo NVARCHAR(MAX) NULL
        );
      END

      IF NOT EXISTS (
        SELECT 1 FROM sys.tables WHERE name = 'OrdenesCompraLineas' AND schema_id = SCHEMA_ID('dbo')
      )
      BEGIN
        CREATE TABLE OrdenesCompraLineas (
          OrdenCompraLineaId INT IDENTITY(1,1) PRIMARY KEY,
          OrdenCompraId INT NOT NULL,
          Descripcion NVARCHAR(1000) NOT NULL,
          UnidadMedida NVARCHAR(100) NULL,
          Cantidad DECIMAL(18,4) NULL,
          PrecioUnitario DECIMAL(18,2) NULL,
          Total DECIMAL(18,2) NULL,
          FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          FOREIGN KEY (OrdenCompraId) REFERENCES OrdenesCompra(OrdenCompraId)
        );
      END
    `);
  } catch (err) {
    console.log('❌ Error creando tablas de órdenes:', err.message);
  }
}

// ─── Middleware JWT ────────────────────────────────────────────────────────────
function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    req.usuario = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

// TEST
app.get('/', (req, res) => res.send('API funcionando'));

// ─── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    const result = await pool.request()
      .input('Correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .query('SELECT * FROM dbo.Usuarios WHERE Correo = @Correo AND Activo = 1');

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    await pool.request()
      .input('id', sql.Int, user.UsuarioId)
      .query('UPDATE dbo.Usuarios SET UltimoAcceso = SYSUTCDATETIME() WHERE UsuarioId = @id');

    const token = jwt.sign(
      { id: user.UsuarioId, correo: user.Correo, nombre: user.Nombre, rol: user.Rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: user.UsuarioId,
        correo: user.Correo,
        nombre: user.Nombre,
        rol: user.Rol,
        debeReiniciarPass: Boolean(user.DebeReiniciarPass),
      },
    });
  } catch (err) {
    console.log('❌ LOGIN:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.post('/api/auth/cambiar-password', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
    let decoded;
    try { decoded = jwt.verify(auth.slice(7), JWT_SECRET); }
    catch { return res.status(401).json({ error: 'Token inválido o expirado' }); }

    const { passwordActual, passwordNuevo } = req.body;
    if (!passwordActual || !passwordNuevo) return res.status(400).json({ error: 'Faltan contraseñas' });
    if (passwordNuevo.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });

    const result = await pool.request()
      .input('id', sql.Int, decoded.id)
      .query('SELECT PasswordHash FROM dbo.Usuarios WHERE UsuarioId = @id AND Activo = 1');

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(passwordActual, user.PasswordHash);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual no es correcta' });

    const newHash = await bcrypt.hash(passwordNuevo, 10);
    await pool.request()
      .input('id', sql.Int, decoded.id)
      .input('hash', sql.NVarChar(255), newHash)
      .query('UPDATE dbo.Usuarios SET PasswordHash = @hash, DebeReiniciarPass = 0 WHERE UsuarioId = @id');

    res.json({ ok: true });
  } catch (err) {
    console.log('❌ CAMBIAR PASSWORD:', err.message);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

app.post('/api/auth/recuperar', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: 'Correo requerido' });

    const result = await pool.request()
      .input('Correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .query('SELECT UsuarioId FROM dbo.Usuarios WHERE Correo = @Correo AND Activo = 1');

    if (!result.recordset[0]) return res.json({ ok: true });

    const uid = result.recordset[0].UsuarioId;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.request()
      .input('uid', sql.Int, uid)
      .query('UPDATE dbo.TokensRecuperacion SET Usado = 1 WHERE UsuarioId = @uid AND Usado = 0');

    await pool.request()
      .input('uid', sql.Int, uid)
      .input('token', sql.NVarChar(20), code)
      .input('exp', sql.DateTime2, expiracion)
      .query('INSERT INTO dbo.TokensRecuperacion (UsuarioId, Token, Expiracion) VALUES (@uid, @token, @exp)');

    console.log(`Código recuperación para ${correo}: ${code}`);
    res.json({ ok: true, codigo: code });
  } catch (err) {
    console.log('❌ RECUPERAR:', err.message);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

app.post('/api/auth/restablecer', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const { correo, codigo, passwordNuevo } = req.body;
    if (!correo || !codigo || !passwordNuevo) return res.status(400).json({ error: 'Faltan campos' });
    if (passwordNuevo.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });

    const result = await pool.request()
      .input('correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .input('token', sql.NVarChar(20), codigo.toUpperCase().trim())
      .query(`
        SELECT u.UsuarioId, t.TokenId
        FROM dbo.Usuarios u
        JOIN dbo.TokensRecuperacion t ON t.UsuarioId = u.UsuarioId
        WHERE u.Correo = @correo AND t.Token = @token
          AND t.Usado = 0 AND t.Expiracion > SYSUTCDATETIME() AND u.Activo = 1
      `);

    if (!result.recordset[0]) return res.status(400).json({ error: 'Código inválido o expirado' });

    const { UsuarioId, TokenId } = result.recordset[0];
    const newHash = await bcrypt.hash(passwordNuevo, 10);

    await pool.request()
      .input('id', sql.Int, UsuarioId)
      .input('hash', sql.NVarChar(255), newHash)
      .query('UPDATE dbo.Usuarios SET PasswordHash = @hash, DebeReiniciarPass = 0 WHERE UsuarioId = @id');

    await pool.request()
      .input('tid', sql.Int, TokenId)
      .query('UPDATE dbo.TokensRecuperacion SET Usado = 1 WHERE TokenId = @tid');

    res.json({ ok: true });
  } catch (err) {
    console.log('❌ RESTABLECER:', err.message);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

// ─── USUARIOS (solo admin) ─────────────────────────────────────────────────────
app.get('/api/usuarios', autenticar, soloAdmin, async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const result = await pool.request().query(
      'SELECT UsuarioId, Correo, Nombre, Rol, DebeReiniciarPass, Activo, FechaCreacion, UltimoAcceso FROM dbo.Usuarios ORDER BY Nombre'
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

app.post('/api/usuarios', autenticar, soloAdmin, async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const { correo, nombre, rol, passwordInicial } = req.body;
    if (!correo || !nombre) return res.status(400).json({ error: 'Correo y nombre requeridos' });

    const hash = await bcrypt.hash(passwordInicial || 'Udat2024!', 10);
    const result = await pool.request()
      .input('Correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .input('Hash', sql.NVarChar(255), hash)
      .input('Nombre', sql.NVarChar(200), nombre.trim())
      .input('Rol', sql.NVarChar(50), rol || 'empleado')
      .query(`INSERT INTO dbo.Usuarios (Correo, PasswordHash, Nombre, Rol, DebeReiniciarPass)
              OUTPUT INSERTED.UsuarioId VALUES (@Correo, @Hash, @Nombre, @Rol, 1)`);

    res.status(201).json({ id: result.recordset[0].UsuarioId });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601)
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.put('/api/usuarios/:id', autenticar, soloAdmin, async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const { nombre, rol, activo } = req.body;
    await pool.request()
      .input('id', sql.Int, Number(req.params.id))
      .input('Nombre', sql.NVarChar(200), nombre)
      .input('Rol', sql.NVarChar(50), rol)
      .input('Activo', sql.Bit, activo !== false ? 1 : 0)
      .query('UPDATE dbo.Usuarios SET Nombre = @Nombre, Rol = @Rol, Activo = @Activo WHERE UsuarioId = @id');
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.post('/api/usuarios/:id/resetear', autenticar, soloAdmin, async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const temp = req.body.password || 'Udat2024!';
    const hash = await bcrypt.hash(temp, 10);
    await pool.request()
      .input('id', sql.Int, Number(req.params.id))
      .input('hash', sql.NVarChar(255), hash)
      .query('UPDATE dbo.Usuarios SET PasswordHash = @hash, DebeReiniciarPass = 1 WHERE UsuarioId = @id');
    res.json({ ok: true, passwordTemporal: temp });
  } catch (err) {
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
});

// ─── CATÁLOGOS ─────────────────────────────────────────────────────────────────
app.get('/api/catalogos/cursos', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const result = await pool.request().query(`SELECT * FROM Cursos WHERE Activo = 1 ORDER BY Nombre`);
    res.json(result.recordset);
  } catch (err) {
    console.log('❌ ERROR CURSOS:', err.message);
    res.status(500).json({ error: 'Error al cargar cursos' });
  }
});

app.post('/api/catalogos/cursos', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: 'Faltan datos para crear curso' });
    const result = await insertCatalogItem('Cursos', data);
    res.status(201).json({ id: result.recordset[0].id });
  } catch (err) { console.log('❌ ERROR CREAR CURSO:', err.message); res.status(500).json({ error: 'Error al crear curso' }); }
});

app.put('/api/catalogos/cursos/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: 'Faltan datos para actualizar curso' });
    const result = await updateCatalogItem('Cursos', 'CursoId', req.params.id, data);
    if (result.recordset[0].affected === 0) return res.status(404).json({ error: 'Curso no encontrado' });
    res.sendStatus(204);
  } catch (err) { console.log('❌ ERROR ACTUALIZAR CURSO:', err.message); res.status(500).json({ error: 'Error al actualizar curso' }); }
});

app.delete('/api/catalogos/cursos/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const result = await deleteCatalogItem('Cursos', 'CursoId', req.params.id);
    if (result.recordset[0].affected === 0) return res.status(404).json({ error: 'Curso no encontrado' });
    res.sendStatus(204);
  } catch (err) { console.log('❌ ERROR ELIMINAR CURSO:', err.message); res.status(500).json({ error: 'Error al eliminar curso' }); }
});

const catalogRoutes = [
  { path: 'clientes', table: 'Empresas', idColumn: 'EmpresaId' },
  { path: 'coaches', table: 'Coaches', idColumn: 'CoachId' },
  { path: 'modalidades', table: 'Modalidades', idColumn: 'ModalidadId' },
  { path: 'conceptos', table: 'ConceptosCosto', idColumn: 'ConceptoCostoId' },
];

catalogRoutes.forEach((route) => {
  app.get(`/api/catalogos/${route.path}`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const result = await pool.request().query(`SELECT * FROM ${route.table} WHERE Activo = 1 ORDER BY Nombre`);
      const rows = result.recordset.map((row) => {
        if (route.path === 'clientes') return { ...row, ClienteId: row.EmpresaId };
        return row;
      });
      res.json(rows);
    } catch (err) {
      console.log(`❌ ERROR ${route.path.toUpperCase()}:`, err.message);
      res.status(500).json({ error: `Error al cargar ${route.path}` });
    }
  });

  app.post(`/api/catalogos/${route.path}`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const data = req.body;
      if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: `Faltan datos para crear ${route.path}` });
      const result = await insertCatalogItem(route.table, data);
      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.log(`❌ ERROR CREAR ${route.path.toUpperCase()}:`, err.message);
      res.status(500).json({ error: `Error al crear ${route.path}` });
    }
  });

  app.put(`/api/catalogos/${route.path}/:id`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const data = req.body;
      if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: `Faltan datos para actualizar ${route.path}` });
      const result = await updateCatalogItem(route.table, route.idColumn, req.params.id, data);
      if (result.recordset[0].affected === 0) return res.status(404).json({ error: `${route.path} no encontrado` });
      res.sendStatus(204);
    } catch (err) {
      console.log(`❌ ERROR ACTUALIZAR ${route.path.toUpperCase()}:`, err.message);
      res.status(500).json({ error: `Error al actualizar ${route.path}` });
    }
  });

  app.delete(`/api/catalogos/${route.path}/:id`, async (req, res) => {
    try {
      if (!ensurePool(res)) return;
      const result = await deleteCatalogItem(route.table, route.idColumn, req.params.id);
      if (result.recordset[0].affected === 0) return res.status(404).json({ error: `${route.path} no encontrado` });
      res.sendStatus(204);
    } catch (err) {
      console.log(`❌ ERROR ELIMINAR ${route.path.toUpperCase()}:`, err.message);
      res.status(500).json({ error: `Error al eliminar ${route.path}` });
    }
  });
});

app.get('/api/catalogos/proveedores', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    await ensureProveedoresTable();
    const result = await pool.request().query(`SELECT * FROM Proveedores WHERE Activo = 1 ORDER BY Nombre`);
    res.json(result.recordset);
  } catch (err) { console.log('❌ ERROR PROVEEDORES:', err.message); res.status(500).json({ error: 'Error al cargar proveedores' }); }
});

app.post('/api/catalogos/proveedores', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const nombre = requireNombre(req, res);
    if (!nombre) return;
    await ensureProveedoresTable();
    const result = await pool.request()
      .input('Nombre', sql.NVarChar(250), nombre)
      .input('RFC', sql.NVarChar(50), req.body.RFC || null)
      .input('Telefono', sql.NVarChar(50), req.body.Telefono || null)
      .input('Correo', sql.NVarChar(150), req.body.Correo || null)
      .query(`INSERT INTO Proveedores (Nombre, RFC, Telefono, Correo) OUTPUT INSERTED.* VALUES (@Nombre, @RFC, @Telefono, @Correo)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { console.log('❌ ERROR CREAR PROVEEDOR:', err.message); res.status(500).json({ error: 'Error al crear proveedor' }); }
});

app.put('/api/catalogos/proveedores/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: 'Faltan datos para actualizar proveedor' });
    await ensureProveedoresTable();
    const result = await updateCatalogItem('Proveedores', 'ProveedorId', req.params.id, data);
    if (result.recordset[0].affected === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.sendStatus(204);
  } catch (err) { console.log('❌ ERROR ACTUALIZAR PROVEEDOR:', err.message); res.status(500).json({ error: 'Error al actualizar proveedor' }); }
});

app.delete('/api/catalogos/proveedores/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    await ensureProveedoresTable();
    const result = await deleteCatalogItem('Proveedores', 'ProveedorId', req.params.id);
    if (result.recordset[0].affected === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.sendStatus(204);
  } catch (err) { console.log('❌ ERROR ELIMINAR PROVEEDOR:', err.message); res.status(500).json({ error: 'Error al eliminar proveedor' }); }
});

app.get('/api/catalogos/unidadesnegocio', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    await ensureUnidadesNegocioTable();
    const result = await pool.request().query(`SELECT * FROM UnidadesNegocio WHERE Activo = 1 ORDER BY Nombre`);
    res.json(result.recordset);
  } catch (err) { console.log('❌ ERROR UNIDADES DE NEGOCIO:', err.message); res.status(500).json({ error: 'Error al cargar unidades de negocio' }); }
});

app.post('/api/catalogos/unidadesnegocio', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const nombre = requireNombre(req, res);
    if (!nombre) return;
    await ensureUnidadesNegocioTable();
    const result = await pool.request()
      .input('Nombre', sql.NVarChar(250), nombre)
      .input('Descripcion', sql.NVarChar(500), req.body.Descripcion || null)
      .query(`INSERT INTO UnidadesNegocio (Nombre, Descripcion) OUTPUT INSERTED.* VALUES (@Nombre, @Descripcion)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { console.log('❌ ERROR CREAR UNIDAD DE NEGOCIO:', err.message); res.status(500).json({ error: 'Error al crear unidad de negocio' }); }
});

app.put('/api/catalogos/unidadesnegocio/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: 'Faltan datos para actualizar unidad de negocio' });
    await ensureUnidadesNegocioTable();
    const result = await updateCatalogItem('UnidadesNegocio', 'UnidadNegocioId', req.params.id, data);
    if (result.recordset[0].affected === 0) return res.status(404).json({ error: 'Unidad de negocio no encontrada' });
    res.sendStatus(204);
  } catch (err) { console.log('❌ ERROR ACTUALIZAR UNIDAD DE NEGOCIO:', err.message); res.status(500).json({ error: 'Error al actualizar unidad de negocio' }); }
});

app.delete('/api/catalogos/unidadesnegocio/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    await ensureUnidadesNegocioTable();
    const result = await deleteCatalogItem('UnidadesNegocio', 'UnidadNegocioId', req.params.id);
    if (result.recordset[0].affected === 0) return res.status(404).json({ error: 'Unidad de negocio no encontrada' });
    res.sendStatus(204);
  } catch (err) { console.log('❌ ERROR ELIMINAR UNIDAD DE NEGOCIO:', err.message); res.status(500).json({ error: 'Error al eliminar unidad de negocio' }); }
});

app.get('/api/cotizaciones/generate/folio', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const year = new Date().getFullYear();
    const result = await pool.request()
      .input('year', sql.Int, year)
      .query(`
        SELECT ISNULL(MAX(CAST(SUBSTRING(Folio, CHARINDEX('-', Folio, CHARINDEX('-', Folio) + 1) + 1, LEN(Folio)) AS INT)), 0) AS MaxNumber
        FROM AppCotizaciones
        WHERE Folio LIKE 'COT-' + CAST(@year AS VARCHAR(4)) + '-%'
      `);
    const maxNumber = (result.recordset[0]?.MaxNumber || 0) + 1;
    res.json({ folio: `COT-${year}-${String(maxNumber).padStart(6, '0')}` });
  } catch (err) { console.log('❌ ERROR GENERAR FOLIO:', err.message); res.status(500).json({ error: 'Error al generar folio' }); }
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
  } catch (err) { console.log('❌ ERROR PARTICIPANTES:', err.message); res.status(500).json({ error: 'Error al cargar participantes' }); }
});

app.get('/api/catalogos/estados', async (req, res) => {
  res.json([
    { Id: 1, Nombre: 'Borrador' },
    { Id: 2, Nombre: 'Enviado' },
    { Id: 3, Nombre: 'Aprobado' },
    { Id: 4, Nombre: 'Rechazado' },
  ]);
});

// ─── ÓRDENES DE COMPRA ──────────────────────────────────────────────────────────
app.get('/api/ordenescompra', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    await ensureOrdenesCompraTables();
    const result = await pool.request().query(`SELECT * FROM OrdenesCompra ORDER BY OrdenCompraId DESC`);
    const ordenes = result.recordset.map((row) => ({
      ...row,
      Fecha: row.Fecha ? new Date(row.Fecha).toISOString().slice(0, 10) : null,
      aprobaciones: row.Aprobaciones ? JSON.parse(row.Aprobaciones) : [],
      rechazo: row.Rechazo ? JSON.parse(row.Rechazo) : null,
    }));
    res.json(ordenes);
  } catch (err) { console.log('❌ ERROR LISTAR ORDENES COMPRA:', err.message); res.status(500).json({ error: 'Error al listar órdenes de compra' }); }
});

app.post('/api/ordenescompra', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    await ensureOrdenesCompraTables();

    const {
      Folio,
      UnidadNegocioId,
      UnidadNegocio,
      ProveedorId,
      Proveedor,
      Fecha,
      Observaciones,
      Subtotal,
      Iva,
      Total,
      Creador,
      FechaCreacion,
      aprobaciones,
      rechazo,
      LineItems,
    } = req.body;

    const validLineItems = Array.isArray(LineItems)
      ? LineItems.filter((item) => item?.Descripcion && String(item.Descripcion).trim())
      : [];

    if (!Folio || !ProveedorId || !UnidadNegocioId || validLineItems.length === 0) {
      return res.status(400).json({ error: 'Folio, proveedor, unidad de negocio y al menos una partida son obligatorios' });
    }

    const request = pool.request();
    request.input('Folio', sql.NVarChar(50), Folio);
    request.input('UnidadNegocioId', sql.Int, UnidadNegocioId ? Number(UnidadNegocioId) : null);
    request.input('UnidadNegocio', sql.NVarChar(250), UnidadNegocio || null);
    request.input('ProveedorId', sql.Int, ProveedorId ? Number(ProveedorId) : null);
    request.input('Proveedor', sql.NVarChar(250), Proveedor || null);
    request.input('Fecha', sql.Date, Fecha ? new Date(Fecha) : null);
    request.input('Observaciones', sql.NVarChar(2000), Observaciones || null);
    request.input('Subtotal', sql.Decimal(18, 2), Subtotal != null ? Number(Subtotal) : null);
    request.input('Iva', sql.Decimal(18, 2), Iva != null ? Number(Iva) : null);
    request.input('Total', sql.Decimal(18, 2), Total != null ? Number(Total) : null);
    request.input('Creador', sql.NVarChar(150), Creador || null);
    request.input('FechaCreacion', sql.DateTime2, FechaCreacion ? new Date(FechaCreacion) : new Date());
    request.input('Aprobaciones', sql.NVarChar(sql.MAX), JSON.stringify(aprobaciones || []));
    request.input('Rechazo', sql.NVarChar(sql.MAX), rechazo ? JSON.stringify(rechazo) : null);

    const insertResult = await request.query(`
      INSERT INTO OrdenesCompra (
        Folio, UnidadNegocioId, UnidadNegocio, ProveedorId, Proveedor,
        Fecha, Observaciones, Subtotal, Iva, Total, Creador, FechaCreacion, Aprobaciones, Rechazo
      )
      OUTPUT INSERTED.OrdenCompraId
      VALUES (
        @Folio, @UnidadNegocioId, @UnidadNegocio, @ProveedorId, @Proveedor,
        @Fecha, @Observaciones, @Subtotal, @Iva, @Total, @Creador, @FechaCreacion, @Aprobaciones, @Rechazo
      );
    `);

    const ordenCompraId = insertResult.recordset[0]?.OrdenCompraId;

    for (const line of validLineItems) {
      const lineRequest = pool.request();
      lineRequest.input('OrdenCompraId', sql.Int, ordenCompraId);
      lineRequest.input('Descripcion', sql.NVarChar(1000), line.Descripcion);
      lineRequest.input('UnidadMedida', sql.NVarChar(100), line.UnidadMedida || null);
      lineRequest.input('Cantidad', sql.Decimal(18, 4), line.Cantidad != null ? Number(line.Cantidad) : null);
      lineRequest.input('PrecioUnitario', sql.Decimal(18, 2), line.PrecioUnitario != null ? Number(line.PrecioUnitario) : null);
      lineRequest.input('Total', sql.Decimal(18, 2), line.subtotal != null ? Number(line.subtotal) : null);
      await lineRequest.query(`
        INSERT INTO OrdenesCompraLineas (OrdenCompraId, Descripcion, UnidadMedida, Cantidad, PrecioUnitario, Total)
        VALUES (@OrdenCompraId, @Descripcion, @UnidadMedida, @Cantidad, @PrecioUnitario, @Total);
      `);
    }

    res.status(201).json({ OrdenCompraId: ordenCompraId });
  } catch (error) {
    console.error('❌ ERROR CREAR ORDEN COMPRA:', error.message);
    res.status(500).json({ error: 'Error al crear la orden de compra' });
  }
});

app.put('/api/ordenescompra/:id', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de orden inválido' });

    await ensureOrdenesCompraTables();

    const orderResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Aprobaciones, Rechazo FROM OrdenesCompra WHERE OrdenCompraId = @id');

    if (!orderResult.recordset.length) return res.status(404).json({ error: 'Orden de compra no encontrada' });

    const current = orderResult.recordset[0];
    const currentApprovals = current.Aprobaciones ? JSON.parse(current.Aprobaciones) : [];

    let newApprovals = currentApprovals;
    let newRejection = current.Rechazo ? JSON.parse(current.Rechazo) : null;

    if (req.body.aprobado) {
      const nextApproval = newApprovals.find((approval) => !approval.aprobado);
      if (!nextApproval) return res.status(400).json({ error: 'No hay aprobaciones pendientes' });
      nextApproval.aprobado = true;
      nextApproval.aprobadoPor = req.body.aprobador || null;
      nextApproval.fecha = new Date().toISOString();
      newRejection = null;
    } else if (req.body.Rechazado || req.body.rechazado) {
      newRejection = {
        rechazado: true,
        rechazadoPor: req.body.RechazadoPor || req.body.rechazadoPor || null,
        motivo: req.body.MotivoRechazo || req.body.motivo || null,
        fecha: new Date().toISOString(),
      };
    } else {
      return res.status(400).json({ error: 'Acción de aprobación o rechazo no especificada' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('Aprobaciones', sql.NVarChar(sql.MAX), JSON.stringify(newApprovals))
      .input('Rechazo', sql.NVarChar(sql.MAX), newRejection ? JSON.stringify(newRejection) : null)
      .query(`UPDATE OrdenesCompra SET Aprobaciones = @Aprobaciones, Rechazo = @Rechazo WHERE OrdenCompraId = @id`);

    res.sendStatus(204);
  } catch (error) {
    console.error('❌ ERROR ACTUALIZAR ORDEN COMPRA:', error.message);
    res.status(500).json({ error: 'Error al actualizar la orden de compra' });
  }
});

// ── PDF Orden de Compra ────────────────────────────────────────────────────────
const PDF_DOC_NO    = 'FGA01-03';
const PDF_DOC_REV   = '1';
const PDF_DOC_FECHA = '21-Ene-2021';
const PDF_EMPRESA   = 'UNIVERSIDAD DE AUTOTRANSPORTE SC';
const PDF_DIRECCION = 'CARRETERA A COLOMBIA 2080, COL. ANDRES CABALLERO MORENO AGROP, ESCOBEDO, N.L. CP 66080';

function fmtMXN(val) {
  return '$' + Number(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pdfCell(doc, x, y, w, h, opts) {
  const o = opts || {};
  const fill   = o.fill;
  const text   = o.text;
  const size   = o.size   || 9;
  const align  = o.align  || 'left';
  const bold   = o.bold   || false;
  const color  = o.color  || '#111827';
  const border = o.border !== false;
  const pad    = o.pad    || 5;

  if (fill) { doc.save().rect(x, y, w, h).fill(fill).restore(); }
  if (border) { doc.save().rect(x, y, w, h).lineWidth(0.4).stroke('#aaaaaa').restore(); }
  if (text !== undefined && text !== null && String(text).trim() !== '') {
    const lineH = size * 1.3;
    const ty = y + Math.max(2, (h - lineH) / 2);
    doc.save()
      .rect(x + 1, y + 1, w - 2, h - 2).clip()
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size).fillColor(color)
      .text(String(text), x + pad, ty, { width: w - pad * 2, align: align, lineBreak: false })
      .restore();
  }
}

app.get('/api/ordenescompra/:id/pdf', async (req, res) => {
  try {
    if (!ensurePool(res)) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalido' });

    const [ordenResult, lineasResult] = await Promise.all([
      pool.request().input('id', sql.Int, id).query('SELECT * FROM OrdenesCompra WHERE OrdenCompraId = @id'),
      pool.request().input('id', sql.Int, id).query('SELECT * FROM OrdenesCompraLineas WHERE OrdenCompraId = @id ORDER BY OrdenCompraLineaId'),
    ]);

    if (!ordenResult.recordset.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const orden  = ordenResult.recordset[0];
    const lineas = lineasResult.recordset;
    const aprobaciones = orden.Aprobaciones ? JSON.parse(orden.Aprobaciones) : [
      { step: 1, label: 'Administracion',      aprobado: false },
      { step: 2, label: 'Secretaria Academica', aprobado: false },
    ];
    const rechazo = orden.Rechazo ? JSON.parse(orden.Rechazo) : null;

    const fechaOrden = orden.Fecha
      ? new Date(orden.Fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + orden.Folio + '.pdf"');
    doc.pipe(res);

    const ML = 40, CW = 612 - 80;
    let y = 40;

    // ── ENCABEZADO INSTITUCIONAL ──────────────────────────────────────────────
    const HDR_H = 62, LOGO_W = 82, META_W = 132, TITLE_W = CW - LOGO_W - META_W;
    pdfCell(doc, ML, y, LOGO_W, HDR_H, { fill: '#f1f5f9' });
    doc.save().circle(ML + LOGO_W / 2, y + HDR_H / 2, 27).fill('#1e3a8a').restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
      .text('UDAT', ML, y + HDR_H / 2 - 8, { width: LOGO_W, align: 'center' });
    pdfCell(doc, ML + LOGO_W, y, TITLE_W, HDR_H, { text: 'Orden de compra', size: 15, bold: true, align: 'center' });

    var MH = HDR_H / 3, MX = ML + LOGO_W + TITLE_W;
    [['No.', PDF_DOC_NO], ['Rev.', PDF_DOC_REV], ['Fecha', PDF_DOC_FECHA]].forEach(function(pair, i) {
      pdfCell(doc, MX, y + MH * i, META_W, MH, { fill: '#f3f4f6', border: true });
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(pair[0], MX + 6, y + MH * i + MH / 2 - 5, { width: 36, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827').text(pair[1], MX + 44, y + MH * i + MH / 2 - 5, { width: META_W - 50, lineBreak: false });
    });
    y += HDR_H;

    // ── EMPRESA + ADQUISICIONES ───────────────────────────────────────────────
    var INFO_H = 62, ADQ_W = 192, INFO_W = CW - ADQ_W;
    pdfCell(doc, ML, y, INFO_W, INFO_H, { fill: '#ffffff' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text(PDF_EMPRESA, ML + 6, y + 9, { width: INFO_W - 12, lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(PDF_DIRECCION, ML + 6, y + 23, { width: INFO_W - 12 });

    var AX = ML + INFO_W, ADQ_ROW = (INFO_H - 18) / 2;
    pdfCell(doc, AX, y, ADQ_W, 18, { fill: '#dbeafe', text: '** Datos a llenar por Adquisiciones', size: 7.5, bold: true, align: 'center' });
    [['Folio', orden.Folio], ['Unidad de Negocio', orden.UnidadNegocio || '']].forEach(function(pair, i) {
      pdfCell(doc, AX,              y + 18 + ADQ_ROW * i, ADQ_W / 2, ADQ_ROW, { fill: '#fef9c3', text: pair[0], size: 8, bold: true, align: 'center' });
      pdfCell(doc, AX + ADQ_W / 2, y + 18 + ADQ_ROW * i, ADQ_W / 2, ADQ_ROW, { fill: '#fef9c3', text: pair[1], size: 8, align: 'center' });
    });
    y += INFO_H;

    // ── PROVEEDOR / CREADO POR / FECHA ────────────────────────────────────────
    var ROW_H = 22, LBL_W = 95;
    pdfCell(doc, ML, y, LBL_W, ROW_H, { fill: '#f3f4f6', text: 'PROVEEDOR:', bold: true, size: 9 });
    pdfCell(doc, ML + LBL_W, y, CW - LBL_W - 130, ROW_H, { text: orden.Proveedor || '—', size: 9 });
    pdfCell(doc, ML + CW - 130, y, 52, ROW_H, { fill: '#f3f4f6', text: 'FECHA', bold: true, size: 9, align: 'center' });
    pdfCell(doc, ML + CW - 78, y, 78, ROW_H, { text: fechaOrden, size: 9, align: 'center' });
    y += ROW_H;
    pdfCell(doc, ML, y, LBL_W, ROW_H, { fill: '#f3f4f6', text: 'CREADO POR:', bold: true, size: 9 });
    pdfCell(doc, ML + LBL_W, y, CW - LBL_W, ROW_H, { text: orden.Creador || '—', size: 9 });
    y += ROW_H;

    // ── TABLA DE PARTIDAS ─────────────────────────────────────────────────────
    var COLS = [
      { label: 'Cantidad',         w: 56,  align: 'center' },
      { label: 'Descripcion',      w: 0,   align: 'left'   },
      { label: 'Unidad de medida', w: 82,  align: 'center' },
      { label: 'Precio Unitario',  w: 84,  align: 'right'  },
      { label: 'Subtotal',         w: 84,  align: 'right'  },
    ];
    COLS[1].w = CW - COLS.reduce(function(s, c) { return s + c.w; }, 0);

    var cx = ML;
    COLS.forEach(function(col) {
      pdfCell(doc, cx, y, col.w, 20, { fill: '#1e3a8a', text: col.label, size: 8, bold: true, align: col.align, color: '#ffffff' });
      cx += col.w;
    });
    y += 20;

    var dataLineas = lineas.filter(function(l) { return l.Descripcion; });
    var totalRows  = Math.max(dataLineas.length, 8);
    for (var i = 0; i < totalRows; i++) {
      var l = dataLineas[i];
      var subtotal = l ? (l.Total != null ? Number(l.Total) : Number(l.Cantidad || 0) * Number(l.PrecioUnitario || 0)) : null;
      var rowFill = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      var vals = l ? [l.Cantidad || '', l.Descripcion, l.UnidadMedida || '', fmtMXN(l.PrecioUnitario), fmtMXN(subtotal)] : ['', '', '', '', ''];
      cx = ML;
      COLS.forEach(function(col, ci) {
        pdfCell(doc, cx, y, col.w, 18, { fill: rowFill, text: vals[ci], size: 8.5, align: col.align });
        cx += col.w;
      });
      y += 18;
    }

    // ── TOTALES ───────────────────────────────────────────────────────────────
    y += 4;
    var TOT_LBL = CW - 100, TOT_VAL = 100;
    [
      { lbl: 'SUBTOTAL', val: fmtMXN(orden.Subtotal), bg: '#f9fafb', fg: '#111827', bold: false },
      { lbl: 'IVA 16%',  val: fmtMXN(orden.Iva),      bg: '#f9fafb', fg: '#111827', bold: false },
      { lbl: 'TOTAL',    val: fmtMXN(orden.Total),     bg: '#1e3a8a', fg: '#ffffff', bold: true  },
    ].forEach(function(t) {
      pdfCell(doc, ML, y, TOT_LBL, 20, { fill: t.bg, text: t.lbl, size: 9, bold: t.bold, align: 'right', color: t.fg });
      pdfCell(doc, ML + TOT_LBL, y, TOT_VAL, 20, { fill: t.bg, text: t.val, size: 9, bold: t.bold, align: 'right', color: t.fg });
      y += 20;
    });

    // ── OBSERVACIONES ─────────────────────────────────────────────────────────
    if (orden.Observaciones) {
      y += 8;
      pdfCell(doc, ML, y, CW, 28, { fill: '#f8fafc' });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151').text('Observaciones:', ML + 6, y + 7, { width: 92, lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor('#374151').text(orden.Observaciones, ML + 102, y + 7, { width: CW - 108 });
      y += 28;
    }

    // ── FLUJO DE APROBACION ───────────────────────────────────────────────────
    y += 16;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a8a').text('FLUJO DE APROBACION', ML, y);
    y += 14;

    var AP_COLS = [CW * 0.30, CW * 0.26, CW * 0.22, CW * 0.22];
    ['Etapa', 'Responsable', 'Estado', 'Fecha'].forEach(function(h, i) {
      var ax = ML + AP_COLS.slice(0, i).reduce(function(s, v) { return s + v; }, 0);
      pdfCell(doc, ax, y, AP_COLS[i], 20, { fill: '#1e3a8a', text: h, size: 8, bold: true, align: 'center', color: '#ffffff' });
    });
    y += 20;

    aprobaciones.forEach(function(paso) {
      var aprobado = Boolean(paso.aprobado || paso.Aprobado);
      var rechazadoPorEste = rechazo && rechazo.rechazado && !aprobado;
      var bg = aprobado ? '#f0fdf4' : rechazadoPorEste ? '#fee2e2' : '#fffbeb';
      var estadoTxt   = aprobado ? 'Aprobado' : rechazadoPorEste ? 'Rechazado' : 'Pendiente';
      var estadoColor = aprobado ? '#15803d'  : rechazadoPorEste ? '#b91c1c'  : '#92400e';
      var responsable = aprobado ? (paso.aprobadoPor || paso.AprobadoPor || '—') : rechazadoPorEste ? (rechazo.rechazadoPor || '—') : '—';
      var fecha = (paso.fecha || paso.Fecha) ? new Date(paso.fecha || paso.Fecha).toLocaleDateString('es-MX') : '—';
      var etiqueta = paso.label || ('Paso ' + paso.step);
      [etiqueta, responsable, estadoTxt, fecha].forEach(function(val, i) {
        var ax = ML + AP_COLS.slice(0, i).reduce(function(s, v) { return s + v; }, 0);
        pdfCell(doc, ax, y, AP_COLS[i], 20, { fill: bg, text: val, size: 8, align: 'center', color: i === 2 ? estadoColor : '#111827', bold: i === 2 });
      });
      y += 20;
    });

    if (rechazo && rechazo.rechazado && rechazo.motivo) {
      y += 4;
      pdfCell(doc, ML, y, CW, 20, { fill: '#fee2e2', text: 'Motivo de rechazo: ' + rechazo.motivo, size: 8, color: '#b91c1c' });
      y += 20;
    }

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    y += 20;
    var FW = CW / 3;
    var firmas = [
      { rol: 'SOLICITA', nombre: orden.Creador || '',                 cargo: 'Solicitante'      },
      { rol: 'AUTORIZA', nombre: (aprobaciones[0] && aprobaciones[0].aprobadoPor) || '', cargo: 'Administracion'  },
      { rol: 'AUTORIZA', nombre: (aprobaciones[1] && aprobaciones[1].aprobadoPor) || '', cargo: 'Sec. Academica'  },
    ];
    firmas.forEach(function(f, i) {
      var fx = ML + FW * i;
      doc.save().rect(fx + 6, y, FW - 12, 70).lineWidth(0.4).stroke('#cccccc').restore();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a').text(f.rol, fx + 6, y + 5, { width: FW - 12, align: 'center', lineBreak: false });
      doc.save().moveTo(fx + 16, y + 46).lineTo(fx + FW - 16, y + 46).lineWidth(0.6).stroke('#374151').restore();
      doc.font('Helvetica').fontSize(8).fillColor('#111827').text(f.nombre || '—', fx + 6, y + 49, { width: FW - 12, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor('#6b7280').text(f.cargo, fx + 6, y + 60, { width: FW - 12, align: 'center', lineBreak: false });
    });

    doc.end();
  } catch (error) {
    console.error('ERROR PDF ORDEN COMPRA:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar el PDF' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
