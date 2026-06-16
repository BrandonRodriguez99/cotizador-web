import express from 'express';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { getPool } from '../db.js';

const router = express.Router();

// GET /api/usuarios
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT UsuarioId, Correo, Nombre, Rol, DebeReiniciarPass, Activo, FechaCreacion, UltimoAcceso
      FROM dbo.Usuarios
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ LISTAR USUARIOS:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
  try {
    const { correo, nombre, rol, passwordInicial } = req.body;
    if (!correo || !nombre) {
      return res.status(400).json({ error: 'Correo y nombre son requeridos' });
    }

    const hash = await bcrypt.hash(passwordInicial || 'Udat2024!', 10);
    const pool = await getPool();

    const result = await pool.request()
      .input('Correo', sql.NVarChar(150), correo.toLowerCase().trim())
      .input('Hash', sql.NVarChar(255), hash)
      .input('Nombre', sql.NVarChar(200), nombre.trim())
      .input('Rol', sql.NVarChar(50), rol || 'empleado')
      .query(`
        INSERT INTO dbo.Usuarios (Correo, PasswordHash, Nombre, Rol, DebeReiniciarPass)
        OUTPUT INSERTED.UsuarioId
        VALUES (@Correo, @Hash, @Nombre, @Rol, 1)
      `);

    res.status(201).json({ id: result.recordset[0].UsuarioId });
  } catch (err) {
    console.error('❌ CREAR USUARIO:', err);
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, rol, activo } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, id)
      .input('Nombre', sql.NVarChar(200), nombre)
      .input('Rol', sql.NVarChar(50), rol)
      .input('Activo', sql.Bit, activo !== false ? 1 : 0)
      .query('UPDATE dbo.Usuarios SET Nombre = @Nombre, Rol = @Rol, Activo = @Activo WHERE UsuarioId = @id');

    res.sendStatus(204);
  } catch (err) {
    console.error('❌ ACTUALIZAR USUARIO:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// POST /api/usuarios/:id/resetear — admin resetea la contraseña de un usuario
router.post('/:id/resetear', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const temp = req.body.password || 'Udat2024!';
    const hash = await bcrypt.hash(temp, 10);
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, id)
      .input('hash', sql.NVarChar(255), hash)
      .query('UPDATE dbo.Usuarios SET PasswordHash = @hash, DebeReiniciarPass = 1 WHERE UsuarioId = @id');

    res.json({ ok: true, passwordTemporal: temp });
  } catch (err) {
    console.error('❌ RESETEAR USUARIO:', err);
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
});

export default router;
