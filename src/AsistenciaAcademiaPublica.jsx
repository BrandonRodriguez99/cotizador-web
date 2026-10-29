import { useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function AsistenciaAcademiaPublica() {
  const params = new URLSearchParams(window.location.search)
  const sesionId = params.get('sesion')

  const [numEmpleado, setNumEmpleado] = useState('')
  const [empleado, setEmpleado] = useState(null)
  const [consentimiento, setConsentimiento] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(null)

  async function handleBuscar(e) {
    e.preventDefault()
    if (!numEmpleado.trim() || !sesionId) return
    setLoading(true); setError(''); setEmpleado(null)
    try {
      const res = await fetch(`${API_BASE_URL}/academia/validar-empleado?sesionId=${sesionId}&numeroEmpleado=${encodeURIComponent(numEmpleado)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setEmpleado(data)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function handleRegistrar() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/academia/asistencia-qr`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: Number(sesionId), numeroEmpleado: numEmpleado, firma: consentimiento ? empleado.NombreCompleto : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setExito(data)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  if (!sesionId) {
    return (
      <div style={{ fontFamily: 'Nunito, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20 }}>
        <div style={{ textAlign: 'center', color: '#dc2626' }}>
          <h2>Enlace inválido</h2>
          <p>No se encontró una sesión válida en este enlace.</p>
        </div>
      </div>
    )
  }

  if (exito) {
    return (
      <div style={{ fontFamily: 'Nunito, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, background: '#f0fdf4' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
            ✓
          </div>
          <h2 style={{ color: '#16a34a', margin: '0 0 8px' }}>Asistencia registrada</h2>
          <p style={{ color: '#374151', margin: '0 0 4px' }}><strong>{exito.participante}</strong></p>
          <p style={{ color: '#6b7280', margin: 0 }}>{exito.curso}</p>
          <p style={{ color: '#9ca3af', marginTop: 16, fontSize: 13 }}>{exito.mensaje}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Nunito, system-ui, sans-serif', minHeight: '100vh', background: '#f8f9fb', padding: '20px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo-udat.png" alt="UDAT" style={{ height: 48, marginBottom: 8 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#1e3a5f' }}>SIGA — Academia</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>Registro de asistencia</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
          {!empleado ? (
            <form onSubmit={handleBuscar}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Ingresa tu número de empleado</label>
              <input
                type="text" value={numEmpleado} onChange={e => setNumEmpleado(e.target.value)}
                placeholder="Ej: EMP-10254"
                required autoFocus
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }}
              />
              {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
          ) : (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Confirma tus datos</h3>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Nombre', value: empleado.NombreCompleto },
                  { label: 'No. Empleado', value: empleado.NumeroEmpleado },
                  { label: 'Empresa', value: empleado.Empresa || '-' },
                  { label: 'Curso', value: empleado.CursoNombre },
                  { label: 'Sesión', value: `Sesión ${empleado.Sesion}` },
                  { label: 'Fecha', value: new Date(empleado.FechaSesion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) },
                ].map(d => (
                  <div key={d.label} style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>{d.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{d.value}</div>
                  </div>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', marginBottom: 16 }}>
                <input
                  type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: '#16a34a', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                  Confirmo mi asistencia y autorizo el uso de mi nombre como firma de registro.
                </span>
              </label>
              {consentimiento && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Vista previa de firma</div>
                  <div style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 22, color: '#1e3a5f', borderBottom: '1px solid #d1d5db', paddingBottom: 4, display: 'inline-block', minWidth: 180 }}>
                    {empleado.NombreCompleto}
                  </div>
                </div>
              )}
              {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEmpleado(null); setConsentimiento(false); setError('') }} style={{ flex: 1, padding: 12, background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Corregir
                </button>
                <button onClick={handleRegistrar} disabled={loading || !consentimiento} style={{ flex: 1, padding: 12, background: consentimiento ? '#16a34a' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: consentimiento ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {loading ? 'Registrando...' : 'Confirmar asistencia'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
