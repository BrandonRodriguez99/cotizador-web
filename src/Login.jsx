import { useState } from 'react'
import { login as apiLogin, recuperarPassword, restablecerPassword } from './api'

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [view, setView] = useState('login') // 'login' | 'recuperar' | 'restablecer'
  const [correoRecuperar, setCorreoRecuperar] = useState('')
  const [codigoGenerado, setCodigoGenerado] = useState('')
  const [correoRestablecer, setCorreoRestablecer] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevoPass, setNuevoPass] = useState('')
  const [confirmarPass, setConfirmarPass] = useState('')

  function goTo(v) {
    setView(v)
    setError('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiLogin(correo, password)
      onLogin(data.token, data.usuario)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await recuperarPassword(correoRecuperar)
      if (data.codigo) {
        setCodigoGenerado(data.codigo)
        setCorreoRestablecer(correoRecuperar)
        setCodigo(data.codigo)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestablecer(e) {
    e.preventDefault()
    setError('')
    if (nuevoPass !== confirmarPass) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (nuevoPass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await restablecerPassword(correoRestablecer, codigo, nuevoPass)
      setCorreo(correoRestablecer)
      goTo('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon"></div>
          <p className="brand-label">UDAT</p>
          <span>COTIZADOR</span>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <h2>Iniciar sesión</h2>
            {error && <p className="login-error">{error}</p>}
            <div className="form-field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" className="login-link" onClick={() => goTo('recuperar')}>
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {view === 'recuperar' && (
          <form onSubmit={handleRecuperar} className="login-form">
            <h2>Recuperar contraseña</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
              Ingresa tu correo y se generará un código de recuperación.
            </p>
            {error && <p className="login-error">{error}</p>}

            {codigoGenerado ? (
              <div className="login-code-box">
                <p style={{ marginBottom: '8px', color: '#374151' }}>Código generado:</p>
                <span className="recovery-code">{codigoGenerado}</span>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  Guarda este código — lo necesitarás en el siguiente paso.
                </p>
                <button
                  type="button"
                  className="login-btn"
                  style={{ marginTop: '16px' }}
                  onClick={() => goTo('restablecer')}
                >
                  Continuar → usar este código
                </button>
              </div>
            ) : (
              <>
                <div className="form-field">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={correoRecuperar}
                    onChange={e => setCorreoRecuperar(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? 'Generando...' : 'Generar código'}
                </button>
              </>
            )}

            <button type="button" className="login-link" onClick={() => { goTo('login'); setCodigoGenerado('') }}>
              Volver al inicio de sesión
            </button>
          </form>
        )}

        {view === 'restablecer' && (
          <form onSubmit={handleRestablecer} className="login-form">
            <h2>Nueva contraseña</h2>
            {error && <p className="login-error">{error}</p>}
            <div className="form-field">
              <label>Correo</label>
              <input
                type="email"
                value={correoRestablecer}
                onChange={e => setCorreoRestablecer(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Código de recuperación</label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                required
                maxLength={8}
                style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
              />
            </div>
            <div className="form-field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={nuevoPass}
                onChange={e => setNuevoPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="form-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmarPass}
                onChange={e => setConfirmarPass(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
            <button type="button" className="login-link" onClick={() => goTo('login')}>
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
