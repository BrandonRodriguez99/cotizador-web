import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getPool } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'udat-cotizador-secret-2024';

export async function initAuthTables() {
  const pool = await getPool();

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

  const countResult = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.Usuarios');
  if (countResult.recordset[0].total === 0) {
    const hash = await bcrypt.hash('Udat2024!', 10);
    await pool.request()
      .input('Correo', sql.NVarChar(150), 'admin@udat.com')
      .input('Hash', sql.NVarChar(255), hash)
      .input('Nombre', sql.NVarChar(200), 'Administrador')
      .input('Rol', sql.NVarChar(50), 'admin')
      .query(`
        INSERT INTO dbo.Usuarios (Correo, PasswordHash, Nombre, Rol, DebeReiniciarPass)
        VALUES (@Correo, @Hash, @Nombre, @Rol, 1)
      `);
    console.log('✅ Usuario admin creado → admin@udat.com / Udat2024!');
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const pool = await getPool();
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
    console.error('❌ LOGIN:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST /api/auth/cambiar-password  (requiere Authorization: Bearer <token>)
router.post('/cambiar-password', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });

    let decoded;
    try { decoded = jwt.verify(auth.slice(7), JWT_SECRET); }
    catch { return res.status(401).json({ error: 'Token inválido o expirado' }); }

    const { passwordActual, passwordNuevo } = req.body;
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({ error: 'Se requieren contraseña actual y nueva' });
    }
    if (passwordNuevo.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const pool = await getPool();
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
    console.error('❌ CAMBIAR PASSWORD:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// POST /api/auth/recuperar — genera código de recuperación
router.post('/recuperar', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: 'Correo requerido' });

    const pool = await getPool();
    const result = await pool.request()
      .input('Correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .query('SELECT UsuarioId FROM dbo.Usuarios WHERE Correo = @Correo AND Activo = 1');

    if (!result.recordset[0]) {
      return res.json({ ok: true });
    }

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

    console.log(`🔑 Código recuperación para ${correo}: ${code}`);
    res.json({ ok: true, codigo: code });
  } catch (err) {
    console.error('❌ RECUPERAR:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST /api/auth/restablecer — usa el código para cambiar contraseña
router.post('/restablecer', async (req, res) => {
  try {
    const { correo, codigo, passwordNuevo } = req.body;
    if (!correo || !codigo || !passwordNuevo) {
      return res.status(400).json({ error: 'Correo, código y nueva contraseña son requeridos' });
    }
    if (passwordNuevo.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .input('token', sql.NVarChar(20), codigo.toUpperCase().trim())
      .query(`
        SELECT u.UsuarioId, t.TokenId
        FROM dbo.Usuarios u
        JOIN dbo.TokensRecuperacion t ON t.UsuarioId = u.UsuarioId
        WHERE u.Correo = @correo
          AND t.Token = @token
          AND t.Usado = 0
          AND t.Expiracion > SYSUTCDATETIME()
          AND u.Activo = 1
      `);

    if (!result.recordset[0]) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

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
    console.error('❌ RESTABLECER:', err);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

export default router;
