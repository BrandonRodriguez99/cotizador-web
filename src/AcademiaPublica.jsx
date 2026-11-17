import { useState, useEffect, useMemo } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

function fmtFecha(d) {
  if (!d) return ''
  const f = new Date(d)
  return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MODALIDAD_ICONS = {
  Presencial: { icon: '📍', color: '#059669', bg: '#ecfdf5' },
  'En línea': { icon: '💻', color: '#2563eb', bg: '#eff6ff' },
  Mixto: { icon: '🔄', color: '#7c3aed', bg: '#f5f3ff' },
}

const PLACEHOLDER_IMAGES = {
  Presencial: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=300&fit=crop',
  'En línea': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=300&fit=crop',
  Mixto: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
  default: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=300&fit=crop',
}

export default function AcademiaPublica() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroModalidad, setFiltroModalidad] = useState('Todos')
  const [cursoDetalle, setCursoDetalle] = useState(null)
  const [numEmpleado, setNumEmpleado] = useState('')
  const [inscribiendo, setInscribiendo] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/academia/cursos-publicos`)
      .then(r => r.json())
      .then(data => { setCursos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    let arr = cursos
    if (filtroModalidad !== 'Todos') arr = arr.filter(c => c.Modalidad === filtroModalidad)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      arr = arr.filter(c =>
        (c.Nombre || '').toLowerCase().includes(q) ||
        (c.Descripcion || '').toLowerCase().includes(q) ||
        (c.Instructor || '').toLowerCase().includes(q) ||
        (c.Modalidad || '').toLowerCase().includes(q)
      )
    }
    return arr
  }, [cursos, filtroModalidad, busqueda])

  const modalidades = ['Todos', ...new Set(cursos.map(c => c.Modalidad || 'Presencial'))]

  async function handleInscripcion(e) {
    e.preventDefault()
    if (!numEmpleado.trim() || !cursoDetalle) return
    setInscribiendo(true); setError(''); setResultado(null)
    try {
      const res = await fetch(`${API}/academia/auto-inscripcion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CursoAcademiaId: cursoDetalle.CursoAcademiaId, NumeroEmpleado: numEmpleado.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al inscribirse')
      setResultado(data)
      setCursos(prev => prev.map(c => c.CursoAcademiaId === cursoDetalle.CursoAcademiaId ? { ...c, Inscritos: c.Inscritos + 1 } : c))
      setCursoDetalle(prev => prev ? { ...prev, Inscritos: prev.Inscritos + 1 } : prev)
    } catch (err) { setError(err.message) } finally { setInscribiendo(false) }
  }

  const disponibles = cursoDetalle ? cursoDetalle.Capacidad - cursoDetalle.Inscritos : 0
  const pct = cursoDetalle ? Math.min(100, (cursoDetalle.Inscritos / (cursoDetalle.Capacidad || 1)) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)', color: '#fff', padding: '40px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <img src="/logo-udat.png" alt="UDAT" style={{ height: 40, objectFit: 'contain' }} />
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#ffffff' }}>Academia</h1>
          </div>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: 0 }}>Cursos disponibles para tu desarrollo profesional</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Busqueda y filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por nombre, tema o instructor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {modalidades.map(m => (
              <button
                key={m}
                onClick={() => setFiltroModalidad(m)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: filtroModalidad === m ? '#1e3a5f' : '#fff',
                  color: filtroModalidad === m ? '#fff' : '#475569',
                  boxShadow: filtroModalidad === m ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {m === 'Todos' ? `Todos (${cursos.length})` : m}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de cursos */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Cargando cursos...</p>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p style={{ fontSize: 15 }}>No se encontraron cursos disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtrados.map(c => {
              const mod = MODALIDAD_ICONS[c.Modalidad] || MODALIDAD_ICONS['Presencial']
              const lugaresDisp = c.Capacidad - c.Inscritos
              const horas = c.TotalSesiones * (c.HorasPorSesion || 1)
              return (
                <div key={c.CursoAcademiaId} style={{
                  background: '#fff', borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}>
                  {/* Card header con imagen */}
                  <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                    <img
                      src={c.ImagenURL || PLACEHOLDER_IMAGES[c.Modalidad] || PLACEHOLDER_IMAGES.default}
                      alt={c.Nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.src = PLACEHOLDER_IMAGES.default }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.2) 100%)' }} />
                    <div style={{ position: 'absolute', top: 12, left: 14 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: mod.bg, color: mod.color,
                      }}>
                        {mod.icon} {c.Modalidad || 'Presencial'}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                      <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 2px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{c.Nombre}</h3>
                      {c.Generacion && <span style={{ fontSize: 12, color: '#cbd5e1' }}>{c.Generacion}</span>}
                    </div>
                  </div>
                  {/* Card body */}
                  <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {c.Descripcion && (
                      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
                        {c.Descripcion.length > 100 ? c.Descripcion.slice(0, 100) + '...' : c.Descripcion}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                      {c.FechaInicio && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {fmtFecha(c.FechaInicio)}{c.FechaFin && c.FechaFin !== c.FechaInicio ? ` – ${fmtFecha(c.FechaFin)}` : ''}
                        </span>
                      )}
                      {horas > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {horas} h
                        </span>
                      )}
                      {c.Ubicacion && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {c.Ubicacion}
                        </span>
                      )}
                    </div>
                    {c.Instructor && (
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9 }}>
                          {c.Instructor.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        {c.Instructor}
                      </div>
                    )}
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          {lugaresDisp > 0 ? `${lugaresDisp} lugares disponibles` : 'Sin cupo'}
                        </span>
                        {lugaresDisp > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>Disponible</span>
                        )}
                      </div>
                      <button
                        onClick={() => { setCursoDetalle(c); setNumEmpleado(''); setResultado(null); setError('') }}
                        disabled={lugaresDisp <= 0}
                        style={{
                          width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: lugaresDisp > 0 ? 'pointer' : 'default',
                          background: lugaresDisp > 0 ? '#1e3a5f' : '#e2e8f0',
                          color: lugaresDisp > 0 ? '#fff' : '#94a3b8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {lugaresDisp > 0 ? 'Ver detalles del curso →' : 'Sin lugares disponibles'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal detalle + inscripcion */}
      {cursoDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setCursoDetalle(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', padding: '24px 24px 20px', borderRadius: '16px 16px 0 0', position: 'relative' }}>
              <button onClick={() => setCursoDetalle(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: (MODALIDAD_ICONS[cursoDetalle.Modalidad] || MODALIDAD_ICONS['Presencial']).bg,
                color: (MODALIDAD_ICONS[cursoDetalle.Modalidad] || MODALIDAD_ICONS['Presencial']).color,
              }}>
                {(MODALIDAD_ICONS[cursoDetalle.Modalidad] || MODALIDAD_ICONS['Presencial']).icon} {cursoDetalle.Modalidad || 'Presencial'}
              </span>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '10px 0 4px' }}>{cursoDetalle.Nombre}</h2>
              {cursoDetalle.Generacion && <span style={{ fontSize: 13, color: '#94a3b8' }}>{cursoDetalle.Generacion}</span>}
            </div>

            <div style={{ padding: 24 }}>
              {cursoDetalle.Descripcion && (
                <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px', lineHeight: 1.6 }}>{cursoDetalle.Descripcion}</p>
              )}

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {cursoDetalle.FechaInicio && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fechas</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtFecha(cursoDetalle.FechaInicio)}{cursoDetalle.FechaFin && cursoDetalle.FechaFin !== cursoDetalle.FechaInicio ? ` – ${fmtFecha(cursoDetalle.FechaFin)}` : ''}</div>
                  </div>
                )}
                {cursoDetalle.Instructor && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Instructor</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{cursoDetalle.Instructor}</div>
                  </div>
                )}
                {cursoDetalle.Ubicacion && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Ubicación</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{cursoDetalle.Ubicacion}</div>
                  </div>
                )}
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Sesiones</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{cursoDetalle.TotalSesiones} sesiones · {cursoDetalle.TotalSesiones * (cursoDetalle.HorasPorSesion || 1)} h</div>
                </div>
              </div>

              {/* Capacidad */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{cursoDetalle.Inscritos} / {cursoDetalle.Capacidad} inscritos</span>
                  <span style={{ color: disponibles > 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>{disponibles > 0 ? `${disponibles} disponible${disponibles !== 1 ? 's' : ''}` : 'Sin cupo'}</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                  <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.3s', width: `${pct}%`, background: pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : '#2563eb' }} />
                </div>
              </div>

              {/* Formulario inscripcion */}
              {resultado ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <h3 style={{ color: '#15803d', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>¡Inscripción exitosa!</h3>
                  <p style={{ color: '#166534', fontSize: 14, margin: 0 }}>
                    <strong>{resultado.nombre}</strong> ha sido inscrito en <strong>{resultado.curso}</strong>
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>Se envió una invitación de calendario a tu correo.</p>
                  <button onClick={() => setCursoDetalle(null)} style={{ marginTop: 14, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1e3a5f', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Volver a cursos</button>
                </div>
              ) : disponibles > 0 ? (
                <form onSubmit={handleInscripcion}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Inscribirme a este curso</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Número de empleado"
                      value={numEmpleado}
                      onChange={e => { setNumEmpleado(e.target.value); setError('') }}
                      required
                      autoFocus
                      style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none' }}
                    />
                    <button type="submit" disabled={inscribiendo || !numEmpleado.trim()} style={{
                      padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
                      background: inscribiendo ? '#94a3b8' : '#1e3a5f', color: '#fff', cursor: inscribiendo ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                    }}>
                      {inscribiendo ? 'Inscribiendo...' : 'Inscribirme'}
                    </button>
                  </div>
                  {error && (
                    <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626' }}>{error}</div>
                  )}
                </form>
              ) : (
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: 14, textAlign: 'center', color: '#991b1b', fontSize: 14 }}>
                  Este curso ya no tiene lugares disponibles.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
