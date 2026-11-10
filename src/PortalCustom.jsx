import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

function AlumnoLogin({ onIdentified }) {
  const [generaciones, setGeneraciones] = useState([])
  const [genId, setGenId] = useState('')
  const [alumnos, setAlumnos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(`${API}/public/generaciones`)
      .then(r => r.json()).then(setGeneraciones).catch(() => {})
  }, [])

  useEffect(() => {
    if (!genId) { setAlumnos([]); return }
    setCargando(true)
    fetch(`${API}/public/alumnos-por-generacion?genId=${genId}`)
      .then(r => r.json()).then(d => { setAlumnos(Array.isArray(d) ? d : []); setCargando(false) })
      .catch(() => setCargando(false))
  }, [genId])

  const filtered = busqueda.length >= 2
    ? alumnos.filter(a => a.Matricula?.toLowerCase().includes(busqueda.toLowerCase()) || a.Nombre?.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 10)
    : []

  const inp = { width: '100%', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box', background: '#0f172a', color: '#f1f5f9' }

  return (
    <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 24, width: '100%', maxWidth: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginTop: 8 }}>Identifícate</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Selecciona tu generación y nombre para ver tus encuestas</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Generación</label>
        <select value={genId} onChange={e => { setGenId(e.target.value); setSelected(null); setBusqueda('') }}
          style={{ ...inp, cursor: 'pointer' }}>
          <option value="">Seleccionar generación</option>
          {generaciones.map(g => <option key={g.GeneracionId} value={g.GeneracionId}>{g.Nombre}</option>)}
        </select>
      </div>

      {genId && (
        <div style={{ marginBottom: 14, position: 'relative' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Buscar alumno</label>
          <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setSelected(null) }}
            placeholder={cargando ? 'Cargando...' : 'Buscar por matrícula o nombre...'}
            style={inp} disabled={cargando} />
          {filtered.length > 0 && !selected && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'auto', zIndex: 10 }}>
              {filtered.map(a => (
                <div key={a.OperadorId} onClick={() => { setSelected(a); setBusqueda(`${a.Matricula} - ${a.Nombre}`) }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontWeight: 600 }}>{a.Matricula}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{a.Nombre}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <button onClick={() => onIdentified(selected)}
          style={{
            width: '100%', padding: '12px', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            marginTop: 8,
          }}>
          Continuar como {selected.Nombre.split(' ')[0]}
        </button>
      )}
    </div>
  )
}

export default function PortalCustom() {
  const slug = window.location.pathname.split('/p/')[1]
  const [portal, setPortal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alumno, setAlumno] = useState(null)
  const [portalAlumno, setPortalAlumno] = useState(null)
  const [loadingAlumno, setLoadingAlumno] = useState(false)

  useEffect(() => {
    if (!slug) { setError('URL inválida'); setLoading(false); return }
    fetch(`${API}/public/portal/${slug}`)
      .then(r => { if (!r.ok) throw new Error('Portal no encontrado'); return r.json() })
      .then(d => { setPortal(d); setLoading(false) })
      .catch(() => { setError('Portal no encontrado o inactivo'); setLoading(false) })
  }, [slug])

  async function handleAlumnoIdentified(al) {
    setAlumno(al)
    setLoadingAlumno(true)
    try {
      const r = await fetch(`${API}/public/portal/${slug}/alumno?matricula=${encodeURIComponent(al.Matricula)}`)
      const data = await r.json()
      setPortalAlumno(data)
    } catch {
      setPortalAlumno({ formularios: [], mensaje: 'Error al consultar encuestas' })
    }
    setLoadingAlumno(false)
  }

  const wrap = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 16px',
  }

  if (loading) return <div style={wrap}><div style={{ color: '#94a3b8' }}>Cargando portal...</div></div>
  if (error) return (
    <div style={wrap}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center',
        maxWidth: 420, width: '100%',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{error}</div>
        <a href="/portal" style={{ color: '#3b82f6', fontSize: 14 }}>← Ir al portal principal</a>
      </div>
    </div>
  )

  const hasCalendario = portal.hasCalendario

  // Portal with calendario: show login first
  if (hasCalendario && !alumno) {
    return (
      <div style={wrap}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#3b82f6', textTransform: 'uppercase', marginBottom: 8 }}>
              {portal.Nombre}
            </div>
            {portal.Descripcion && <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>{portal.Descripcion}</p>}
          </div>
          <AlumnoLogin onIdentified={handleAlumnoIdentified} />
          <div style={{ marginTop: 40, fontSize: 12, color: '#475569', textAlign: 'center' }}>© {new Date().getFullYear()} UDAT</div>
        </div>
      </div>
    )
  }

  // After identification (or no calendario)
  const forms = hasCalendario ? (portalAlumno?.formularios || []) : (portal.formularios || [])
  const mensaje = portalAlumno?.mensaje
  const semana = portalAlumno?.semanaActual

  if (loadingAlumno) return <div style={wrap}><div style={{ color: '#94a3b8' }}>Consultando tus encuestas...</div></div>

  return (
    <div style={wrap}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#3b82f6', textTransform: 'uppercase', marginBottom: 8 }}>
            {portal.Nombre}
          </div>
          {portal.Descripcion && <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>{portal.Descripcion}</p>}
        </div>

        {alumno && (
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{alumno.Nombre}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{alumno.Matricula}</div>
              {semana && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>Semana {semana} en OPT</div>}
            </div>
            <button onClick={() => { setAlumno(null); setPortalAlumno(null) }}
              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
              Cambiar
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {forms.length === 0 && (
            <div style={{
              background: '#1e293b', borderRadius: 12, padding: 32,
              textAlign: 'center', color: '#64748b', fontSize: 14,
              border: '1px solid #334155',
            }}>
              {mensaje || 'No hay formularios disponibles en este momento.'}
            </div>
          )}

          {forms.map(f => (
            <a key={f.FormularioId} href={`/formulario/${f.Slug || f.FormularioId}`} style={{
              textDecoration: 'none', color: 'inherit',
              background: '#1e293b', borderRadius: 12,
              border: '1px solid #334155', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: '#0f172a', border: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/>
                  <line x1="9" y1="17" x2="12" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{f.Nombre}</div>
                {f.Descripcion && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{f.Descripcion}</div>}
              </div>
              <div style={{ color: '#475569', fontSize: 20 }}>›</div>
            </a>
          ))}
        </div>

        <div style={{ marginTop: 40, fontSize: 12, color: '#475569', textAlign: 'center' }}>
          © {new Date().getFullYear()} UDAT
        </div>
      </div>
    </div>
  )
}
