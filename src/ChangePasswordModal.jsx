import { useState } from 'react'
import { cambiarPassword } from './api'

export default function ChangePasswordModal({ usuario, token, onChanged }) {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (passwordNuevo !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (passwordNuevo.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (passwordNuevo === passwordActual) {
      setError('La nueva contraseña debe ser diferente a la actual')
      return
    }
    setLoading(true)
    try {
      await cambiarPassword(token, passwordActual, passwordNuevo)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="modal-header">
          <h2 className="modal-title">Cambiar contraseña</h2>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '20px', color: '#4b5563', lineHeight: '1.5' }}>
            Bienvenido/a <strong>{usuario.nombre}</strong>. Por seguridad debes establecer una contraseña personal antes de continuar.
          </p>
          {error && <p className="login-error" style={{ marginBottom: '16px' }}>{error}</p>}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label>Contraseña actual (inicial)</label>
              <input
                type="password"
                value={passwordActual}
                onChange={e => setPasswordActual(e.target.value)}
                placeholder="La contraseña que te dieron"
                required
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={passwordNuevo}
                onChange={e => setPasswordNuevo(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="form-field">
              <label>Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Guardando...' : 'Establecer contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
