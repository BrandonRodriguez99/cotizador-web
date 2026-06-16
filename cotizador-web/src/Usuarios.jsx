import { useState, useEffect } from 'react'
import { getUsuarios, createUsuario, updateUsuario, resetearPasswordUsuario } from './api'

export default function Usuarios({ token }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ correo: '', nombre: '', rol: 'empleado', passwordInicial: 'Udat2024!' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setUsuarios(await getUsuarios(token))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingUser(null)
    setForm({ correo: '', nombre: '', rol: 'empleado', passwordInicial: 'Udat2024!' })
    setFormError('')
    setSuccess('')
    setModalOpen(true)
  }

  function openEdit(user) {
    setEditingUser(user)
    setForm({ nombre: user.Nombre, rol: user.Rol, activo: Boolean(user.Activo) })
    setFormError('')
    setSuccess('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editingUser) {
        await updateUsuario(token, editingUser.UsuarioId, {
          nombre: form.nombre,
          rol: form.rol,
          activo: form.activo !== false,
        })
        setSuccess(`Usuario "${form.nombre}" actualizado.`)
      } else {
        await createUsuario(token, {
          correo: form.correo,
          nombre: form.nombre,
          rol: form.rol,
          passwordInicial: form.passwordInicial,
        })
        setSuccess(`Usuario creado. Contraseña inicial: ${form.passwordInicial}`)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(user) {
    const pass = window.prompt(`Nueva contraseña temporal para ${user.Nombre}:`, 'Udat2024!')
    if (!pass) return
    setSuccess('')
    setError('')
    try {
      await resetearPasswordUsuario(token, user.UsuarioId, pass)
      setSuccess(`Contraseña de "${user.Nombre}" restablecida a: ${pass}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <section className="panel card">
      <div className="panel-header space-between">
        <div>
          <h2>Usuarios</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Gestión de acceso al sistema</p>
        </div>
        <button className="ghost-button" type="button" onClick={openCreate}>Nuevo usuario</button>
      </div>

      {loading && <div className="notification">Cargando usuarios...</div>}
      {error && <div className="notification error">{error}</div>}
      {success && <div className="notification success">{success}</div>}

      <div className="table-wrap">
        <table className="participants-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', color: '#6b7280' }}>No hay usuarios registrados.</td>
              </tr>
            ) : (
              usuarios.map(u => (
                <tr key={u.UsuarioId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '600', flexShrink: 0,
                      }}>
                        {initials(u.Nombre)}
                      </div>
                      {u.Nombre}
                    </div>
                  </td>
                  <td>{u.Correo}</td>
                  <td>{{
                    admin: 'Administrador del sistema',
                    autorizador1: 'Autorizador 1 — Administración',
                    autorizador2: 'Autorizador 2 — Sec. Académica',
                    empleado: 'Empleado',
                  }[u.Rol] || u.Rol}</td>
                  <td>
                    <span style={{
                      padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: u.Activo ? '#d1fae5' : '#fee2e2',
                      color: u.Activo ? '#065f46' : '#991b1b',
                    }}>
                      {u.Activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '13px' }}>
                    {u.UltimoAcceso ? new Date(u.UltimoAcceso).toLocaleString() : 'Nunca'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="ghost-button" type="button" onClick={() => openEdit(u)}>Editar</button>
                      <button className="secondary-button" type="button" onClick={() => handleReset(u)}>Reset pass</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">Total usuarios: {usuarios.length}</div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="modal" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button className="modal-close" type="button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {formError && <p className="login-error" style={{ marginBottom: '16px' }}>{formError}</p>}
              <form onSubmit={handleSave} className="login-form">
                {!editingUser && (
                  <div className="form-field">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      value={form.correo}
                      onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                      placeholder="empleado@empresa.com"
                      required
                      autoFocus
                    />
                  </div>
                )}
                <div className="form-field">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Nombre Apellido"
                    required
                    autoFocus={Boolean(editingUser)}
                  />
                </div>
                <div className="form-field">
                  <label>Rol</label>
                  <select
                    value={form.rol}
                    onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                  >
                    <option value="empleado">Empleado (Solicitante)</option>
                    <option value="autorizador1">Autorizador 1 — Administración</option>
                    <option value="autorizador2">Autorizador 2 — Secretaría Académica</option>
                    <option value="admin">Administrador del sistema</option>
                  </select>
                </div>
                {!editingUser && (
                  <div className="form-field">
                    <label>Contraseña inicial</label>
                    <input
                      type="text"
                      value={form.passwordInicial}
                      onChange={e => setForm(f => ({ ...f, passwordInicial: e.target.value }))}
                      placeholder="Udat2024!"
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      El empleado deberá cambiarla en su primer acceso.
                    </span>
                  </div>
                )}
                {editingUser && (
                  <div className="form-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.activo !== false}
                        onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                      />
                      Usuario activo
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" className="login-btn" disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
