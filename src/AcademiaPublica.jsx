import { useState, useEffect, useMemo, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

function fmtFecha(d) {
  if (!d) return ''
  const f = new Date(d)
  return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const COLORS = {
  navy: '#1a2e44',
  navyDark: '#0f1f30',
  orange: '#e8692d',
  orangeHover: '#d45a20',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  green: '#059669',
  red: '#dc2626',
}

const HERO_BG = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=600&fit=crop'

const RAMA_IMAGES = {
  'Metodología Lean': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=350&fit=crop',
  'Cultura y Desarrollo': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=350&fit=crop',
  'Formación de Operadores': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&h=350&fit=crop',
  default: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=350&fit=crop',
}

const NIVELES = [
  { nivel: '01', titulo: 'Directores', color: COLORS.navy, icon: 'director' },
  { nivel: '02', titulo: 'Gerentes', color: COLORS.navy, icon: 'gerente' },
  { nivel: '03', titulo: 'Jefes y Coordinadores', color: COLORS.navy, icon: 'jefe' },
  { nivel: '04', titulo: 'Auxiliares y Personal operativo', color: COLORS.orange, icon: 'operativo' },
]

function NivelIcon({ type, size = 60 }) {
  const s = { width: size, height: size, display: 'block', margin: '0 auto' }
  if (type === 'director') return (
    <svg style={s} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="22" r="12" stroke="white" strokeWidth="2.5"/>
      <path d="M20 65c0-11 9-20 20-20s20 9 20 20" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="58" cy="30" r="8" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M53 30l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (type === 'gerente') return (
    <svg style={s} viewBox="0 0 80 80" fill="none">
      <circle cx="30" cy="20" r="10" stroke="white" strokeWidth="2.5"/>
      <circle cx="50" cy="20" r="10" stroke="white" strokeWidth="2.5"/>
      <circle cx="40" cy="40" r="6" stroke="#e8692d" strokeWidth="2" fill="none"/>
      <path d="M15 65c0-9 7-16 15-16h20c8 0 15 7 15 16" stroke="white" strokeWidth="2.5" fill="none"/>
    </svg>
  )
  if (type === 'jefe') return (
    <svg style={s} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="22" r="12" stroke="white" strokeWidth="2.5"/>
      <path d="M22 65c0-10 8-18 18-18s18 8 18 18" stroke="white" strokeWidth="2.5" fill="none"/>
      <rect x="48" y="40" width="18" height="14" rx="2" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M51 46h12M51 50h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
  return (
    <svg style={s} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="20" r="10" stroke="white" strokeWidth="2.5"/>
      <path d="M24 65c0-9 7-16 16-16s16 7 16 16" stroke="white" strokeWidth="2.5" fill="none"/>
      <path d="M30 12h20v4c0 2-4 4-10 4s-10-2-10-4z" stroke="white" strokeWidth="2" fill="none"/>
      <rect x="34" y="4" width="12" height="8" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
    </svg>
  )
}

export default function AcademiaPublica() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [cursoDetalle, setCursoDetalle] = useState(null)
  const [numEmpleado, setNumEmpleado] = useState('')
  const [inscribiendo, setInscribiendo] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [showExternos, setShowExternos] = useState(false)
  const [nivelSeleccionado, setNivelSeleccionado] = useState(null)
  const [ramaSeleccionada, setRamaSeleccionada] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const catalogoRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/academia/cursos-publicos`)
      .then(r => r.json())
      .then(data => { setCursos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const cursosInternos = useMemo(() => cursos.filter(c => c.TipoCurso !== 'Proveedor Externo'), [cursos])
  const cursosExternos = useMemo(() => cursos.filter(c => c.TipoCurso === 'Proveedor Externo'), [cursos])

  const ramas = useMemo(() => {
    const ramaMap = {}
    cursosInternos.forEach(c => {
      const r = c.Rama || 'General'
      if (!ramaMap[r]) ramaMap[r] = []
      ramaMap[r].push(c)
    })
    return Object.entries(ramaMap).map(([nombre, lista]) => ({ nombre, cursos: lista, imagen: RAMA_IMAGES[nombre] || RAMA_IMAGES.default }))
  }, [cursosInternos])

  const cursosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return null
    const q = busqueda.toLowerCase()
    return cursos.filter(c =>
      (c.Nombre || '').toLowerCase().includes(q) ||
      (c.Descripcion || '').toLowerCase().includes(q) ||
      (c.Instructor || '').toLowerCase().includes(q) ||
      (c.Rama || '').toLowerCase().includes(q)
    )
  }, [cursos, busqueda])

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

  function scrollTo(id) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const disponibles = cursoDetalle ? cursoDetalle.Capacidad - cursoDetalle.Inscritos : 0
  const pct = cursoDetalle ? Math.min(100, (cursoDetalle.Inscritos / (cursoDetalle.Capacidad || 1)) * 100) : 0

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    background: scrolled ? COLORS.white : 'transparent',
    boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.3s',
  }
  const navLinkColor = scrolled ? COLORS.gray700 : COLORS.white

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: COLORS.gray800 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        body { overflow-x: hidden; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .nav-link { background: none; border: none; font-size: 14px; font-weight: 500; cursor: pointer; padding: 8px 14px; border-radius: 6px; transition: all 0.2s; }
        .nav-link:hover { opacity: 0.8; }
        .cta-btn { background: ${COLORS.orange}; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .cta-btn:hover { background: ${COLORS.orangeHover}; transform: translateY(-1px); }
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important; }
        .rama-card { cursor: pointer; overflow: hidden; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; }
        .rama-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
        .nivel-card { cursor: pointer; border-radius: 14px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; padding: 28px 24px; }
        .nivel-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.2); }
        .externo-card { border-radius: 12px; border: 1px solid ${COLORS.gray200}; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .externo-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <nav style={navStyle}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: scrolled ? COLORS.navy : COLORS.white, letterSpacing: 2 }}>UDAT</span>
            <div style={{ width: 1, height: 28, background: scrolled ? COLORS.gray200 : 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: scrolled ? COLORS.gray600 : 'rgba(255,255,255,0.9)', letterSpacing: 1 }}>TRAYECTO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="nav-link" style={{ color: navLinkColor }} onClick={() => scrollTo('inicio')}>Inicio</button>
            <button className="nav-link" style={{ color: navLinkColor }} onClick={() => scrollTo('niveles')}>Niveles</button>
            <button className="nav-link" style={{ color: navLinkColor }} onClick={() => scrollTo('catalogo')}>Catálogo</button>
            <button className="nav-link" style={{ color: navLinkColor }} onClick={() => scrollTo('cursos-adicionales')}>Cursos adicionales</button>
            <button className="cta-btn" onClick={() => scrollTo('solicitar')}>Solicitar capacitación</button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section id="inicio" style={{
        position: 'relative', minHeight: 520, display: 'flex', alignItems: 'center',
        background: `linear-gradient(135deg, rgba(15,31,48,0.85) 0%, rgba(26,46,68,0.75) 100%), url("${HERO_BG}") center/cover no-repeat`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', padding: '6px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)',
            fontSize: 11, fontWeight: 700, color: COLORS.white, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24,
          }}>
            Universidad de Autotransporte
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: COLORS.white, lineHeight: 1.1, maxWidth: 700, marginBottom: 20 }}>
            Desarrollando talento,<br />
            <span style={{ color: COLORS.orange, fontStyle: 'italic' }}>construyendo historias.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 580, lineHeight: 1.6, marginBottom: 32 }}>
            Encuentra la formación que necesitas para desarrollar nuevas competencias,
            fortalecer tu desempeño y continuar creciendo dentro de Trayecto.
          </p>
          <button className="cta-btn" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => scrollTo('catalogo')}>
            Explorar cursos
          </button>
        </div>
      </section>

      {/* ─── NIVELES ORGANIZACIONALES ─── */}
      <section id="niveles" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Formación</span>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: COLORS.gray900, marginTop: 8 }}>Niveles Organizacionales</h2>
          <p style={{ fontSize: 15, color: COLORS.gray500, marginTop: 8, maxWidth: 600 }}>
            Conoce las diferentes opciones de formación de acuerdo con tu nivel organizacional dentro de Trayecto.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {NIVELES.map((n, i) => (
            <div key={i} className="nivel-card" style={{ background: n.color, position: 'relative' }}
              onClick={() => { setNivelSeleccionado(nivelSeleccionado === n.titulo ? null : n.titulo); scrollTo('catalogo') }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Nivel {n.nivel}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: COLORS.white, marginBottom: 20, minHeight: 48 }}>{n.titulo}</h3>
              <NivelIcon type={n.icon} size={70} />
              <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.08)', lineHeight: 1 }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: COLORS.gray500, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: COLORS.orange }}>⚡</span> Selecciona un nivel para consultar los cursos dirigidos a ese nivel.
        </p>
      </section>

      {/* ─── CATÁLOGO DE CURSOS ─── */}
      <section id="catalogo" ref={catalogoRef} style={{ padding: '60px 24px 80px', background: COLORS.gray50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Oferta de capacitación</span>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: COLORS.gray900, marginTop: 8 }}>Catálogo de Cursos</h2>
              <p style={{ fontSize: 15, color: COLORS.gray500, marginTop: 8 }}>
                Consulta los cursos impartidos directamente por UDAT, organizados por rama, o revisa los cursos adicionales de proveedores externos.
              </p>
            </div>
            <div style={{ position: 'relative', minWidth: 280 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text" placeholder="Buscar un curso..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid ' + COLORS.gray200, borderRadius: 10, fontSize: 14, outline: 'none', background: COLORS.white }}
              />
            </div>
          </div>

          {nivelSeleccionado && (
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: 13, color: '#1d4ed8' }}>Filtrando por nivel: <strong>{nivelSeleccionado}</strong></span>
              <button onClick={() => setNivelSeleccionado(null)} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>✕</button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: COLORS.gray500 }}>
              <div style={{ width: 40, height: 40, border: '3px solid ' + COLORS.gray200, borderTopColor: COLORS.orange, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Cargando cursos...
            </div>
          ) : cursosFiltrados ? (
            /* ── Resultados de búsqueda ── */
            <>
              <p style={{ fontSize: 14, color: COLORS.gray500, marginBottom: 16 }}>{cursosFiltrados.length} resultado{cursosFiltrados.length !== 1 ? 's' : ''} para "{busqueda}"</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {cursosFiltrados.map(c => <CursoCard key={c.CursoAcademiaId} curso={c} onDetalle={() => { setCursoDetalle(c); setNumEmpleado(''); setResultado(null); setError('') }} />)}
              </div>
            </>
          ) : (
            <>
              {/* ── Formación Interna ── */}
              <div style={{ marginBottom: 48 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Formación interna</span>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: COLORS.gray900, marginTop: 6, marginBottom: 6 }}>Cursos impartidos directamente por UDAT</h3>
                <p style={{ fontSize: 14, color: COLORS.gray500, marginBottom: 24 }}>Selecciona una rama para consultar los cursos, sus objetivos y temarios.</p>

                {ramaSeleccionada ? (
                  /* Vista de cursos dentro de una rama */
                  <>
                    <button onClick={() => setRamaSeleccionada(null)} style={{
                      background: 'none', border: 'none', fontSize: 14, color: COLORS.orange, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0,
                    }}>
                      ← Volver a ramas
                    </button>
                    <h4 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{ramaSeleccionada}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                      {(ramas.find(r => r.nombre === ramaSeleccionada)?.cursos || []).map(c =>
                        <CursoCard key={c.CursoAcademiaId} curso={c} onDetalle={() => { setCursoDetalle(c); setNumEmpleado(''); setResultado(null); setError('') }} />
                      )}
                    </div>
                  </>
                ) : ramas.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                    {ramas.map(r => (
                      <div key={r.nombre} className="rama-card" onClick={() => setRamaSeleccionada(r.nombre)} style={{ background: COLORS.white }}>
                        <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                          <img src={r.imagen} alt={r.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.src = RAMA_IMAGES.default }} />
                        </div>
                        <div style={{ padding: '20px 24px' }}>
                          <h4 style={{ fontSize: 18, fontWeight: 700, color: COLORS.gray900, marginBottom: 8 }}>{r.nombre}</h4>
                          <p style={{ fontSize: 13, color: COLORS.gray500, marginBottom: 14, lineHeight: 1.5 }}>
                            {r.cursos[0]?.Descripcion ? r.cursos[0].Descripcion.slice(0, 90) + '...' : `Conoce los cursos y herramientas de ${r.nombre.toLowerCase()}.`}
                          </p>
                          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.orange }}>
                            Ver {r.cursos.length} curso{r.cursos.length !== 1 ? 's' : ''} →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: COLORS.gray500, fontSize: 14, padding: 20 }}>No hay cursos internos disponibles por el momento.</p>
                )}
              </div>

              {/* ── Divider ── */}
              <hr style={{ border: 'none', borderTop: '1px solid ' + COLORS.gray200, margin: '0 0 48px' }} />

              {/* ── Formación Complementaria ── */}
              <div id="cursos-adicionales">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Formación complementaria</span>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: COLORS.gray900, marginTop: 6 }}>Cursos adicionales · Proveedores externos</h3>
                    <p style={{ fontSize: 14, color: COLORS.gray500, marginTop: 4 }}>Opciones impartidas por proveedores externos, independientes de la oferta directa de UDAT.</p>
                  </div>
                  {cursosExternos.length > 0 && (
                    <button onClick={() => setShowExternos(!showExternos)} style={{
                      background: 'none', border: 'none', color: COLORS.orange, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {showExternos ? 'Ocultar cursos ↑' : `Ver ${cursosExternos.length} cursos ↓`}
                    </button>
                  )}
                </div>

                {showExternos && cursosExternos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {cursosExternos.map(c => (
                      <div key={c.CursoAcademiaId} className="externo-card"
                        onClick={() => { setCursoDetalle(c); setNumEmpleado(''); setResultado(null); setError('') }}>
                        <div style={{ height: 4, background: COLORS.orange }} />
                        <div style={{ padding: '20px 24px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: '#fff7ed', color: COLORS.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
                          }}>
                            Proveedor externo
                          </span>
                          <h4 style={{ fontSize: 17, fontWeight: 700, color: COLORS.gray900, marginBottom: 10 }}>{c.Nombre}</h4>
                          {c.Descripcion && <p style={{ fontSize: 13, color: COLORS.gray500, lineHeight: 1.5, marginBottom: 14 }}>{c.Descripcion.length > 120 ? c.Descripcion.slice(0, 120) + '...' : c.Descripcion}</p>}
                          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.orange }}>Ver información →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showExternos && cursosExternos.length > 0 && (
                  <div style={{ background: COLORS.white, borderRadius: 14, padding: 32, maxWidth: 500, border: '1px solid ' + COLORS.gray200 }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>🌐</div>
                    <h4 style={{ fontSize: 20, fontWeight: 700, color: COLORS.gray900, marginBottom: 12 }}>Proveedores externos</h4>
                    <p style={{ fontSize: 14, color: COLORS.gray500, lineHeight: 1.6, marginBottom: 16 }}>
                      Los cursos adicionales están organizados en el catálogo para que puedas consultar sus objetivos y temarios. Selecciona el apartado de cursos adicionales.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                      {cursosExternos.slice(0, 4).map(c => (
                        <li key={c.CursoAcademiaId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: COLORS.gray700 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {c.Nombre}
                        </li>
                      ))}
                      {cursosExternos.length > 4 && (
                        <li style={{ fontSize: 13, color: COLORS.gray400, paddingTop: 4 }}>y {cursosExternos.length - 4} más...</li>
                      )}
                    </ul>
                    <button className="cta-btn" onClick={() => setShowExternos(true)}>Ver cursos adicionales →</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── CURSOS ADICIONALES INFO ─── */}
      <section style={{ padding: '60px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Otras opciones de desarrollo</span>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: COLORS.gray900, marginTop: 8, marginBottom: 8 }}>Cursos adicionales</h2>
        <p style={{ fontSize: 15, color: COLORS.gray500, maxWidth: 600, lineHeight: 1.6, marginBottom: 32 }}>
          Consulta los cursos complementarios impartidos por proveedores externos, separados de los programas que UDAT imparte directamente.
        </p>
        <div style={{ background: COLORS.white, borderRadius: 14, padding: 32, maxWidth: 540, border: '1px solid ' + COLORS.gray200 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🌐</div>
          <h4 style={{ fontSize: 20, fontWeight: 700, color: COLORS.gray900, marginBottom: 12 }}>Proveedores externos</h4>
          <p style={{ fontSize: 14, color: COLORS.gray500, lineHeight: 1.6, marginBottom: 16 }}>
            Los cursos adicionales están organizados en el catálogo para que puedas consultar sus objetivos y temarios. Selecciona el apartado de cursos adicionales.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
            {cursosExternos.slice(0, 4).map(c => (
              <li key={c.CursoAcademiaId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: COLORS.gray700 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {c.Nombre}
              </li>
            ))}
          </ul>
          <button className="cta-btn" onClick={() => { scrollTo('cursos-adicionales'); setTimeout(() => setShowExternos(true), 400) }}>Ver cursos adicionales →</button>
        </div>
      </section>

      {/* ─── SOLICITAR CAPACITACIÓN ─── */}
      <section id="solicitar" style={{ background: COLORS.navyDark, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.orange, letterSpacing: 2, textTransform: 'uppercase' }}>¿Necesitas capacitación?</span>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: COLORS.white, marginTop: 8, marginBottom: 8 }}>Cuéntanos qué necesita tu empresa</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 700, lineHeight: 1.6, marginBottom: 40 }}>
            No necesitas conocer el nombre del curso. Cuéntanos qué necesidad tiene tu empresa, qué quieren desarrollar
            o qué situación desean mejorar y UDAT analizará la necesidad para recomendarte la opción de capacitación más adecuada.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
            {/* Info */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: COLORS.white, marginBottom: 24 }}>¿Qué información necesitamos?</h3>
              {[
                'Nombre de la empresa',
                'Nombre y puesto de quien solicita',
                'Área o equipo que necesita capacitación',
                'Necesidad o situación que desean atender',
                'Número aproximado de participantes',
                'Información adicional que consideres importante',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </div>
              ))}
              <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Envía tu solicitud a</div>
                <div style={{ fontSize: 14, color: COLORS.white, fontWeight: 600 }}>elena.morantes@udat.com.mx</div>
                <div style={{ fontSize: 14, color: COLORS.white, fontWeight: 600, marginTop: 4 }}>fernanda.mata@udat.com.mx</div>
              </div>
            </div>
            {/* Formulario */}
            <div style={{ background: COLORS.white, borderRadius: 14, padding: 32 }}>
              <form onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.target)
                const datos = Object.fromEntries(fd.entries())
                const mailto = `mailto:elena.morantes@udat.com.mx,fernanda.mata@udat.com.mx?subject=${encodeURIComponent('Solicitud de capacitación - ' + datos.empresa)}&body=${encodeURIComponent(
                  `Empresa: ${datos.empresa}\nNombre: ${datos.nombre}\nPuesto: ${datos.puesto}\nÁrea: ${datos.area}\nParticipantes: ${datos.participantes}\n\nNecesidad:\n${datos.necesidad}\n\nInformación adicional:\n${datos.info || 'N/A'}`
                )}`
                window.open(mailto, '_blank')
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Empresa</label>
                    <input name="empresa" required placeholder="Nombre de la empresa" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Nombre de quien solicita</label>
                    <input name="nombre" required placeholder="Nombre completo" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Puesto</label>
                    <input name="puesto" placeholder="Puesto dentro de la empresa" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Área o equipo</label>
                    <input name="area" placeholder="Área que requiere capacitación" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Número aproximado de participantes</label>
                  <input name="participantes" placeholder="Ej. 20" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Cuéntanos la necesidad de tu empresa</label>
                  <textarea name="necesidad" required rows={4} placeholder="Cuéntanos qué situación están enfrentando, qué competencia desean desarrollar o qué resultado esperan obtener..." style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Información adicional</label>
                  <textarea name="info" rows={3} placeholder="Fechas tentativas, modalidad, ubicación u otra información relevante." style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <button type="submit" className="cta-btn" style={{ width: '100%', padding: '14px 0', fontSize: 15 }}>
                  Enviar solicitud por correo →
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: COLORS.navy, padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>© {new Date().getFullYear()} UDAT · Universidad de Autotransporte · Trayecto</p>
      </footer>

      {/* ─── MODAL DETALLE + INSCRIPCIÓN ─── */}
      {cursoDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setCursoDetalle(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.white, borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #2d5a8e 100%)`, padding: '28px 28px 24px', borderRadius: '16px 16px 0 0', position: 'relative' }}>
              <button onClick={() => setCursoDetalle(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
              {cursoDetalle.TipoCurso === 'Proveedor Externo' && (
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fff7ed', color: COLORS.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Proveedor externo</span>
              )}
              {cursoDetalle.Modalidad && (
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: COLORS.white, marginBottom: 10, marginLeft: cursoDetalle.TipoCurso === 'Proveedor Externo' ? 8 : 0 }}>
                  {cursoDetalle.Modalidad}
                </span>
              )}
              <h2 style={{ color: COLORS.white, fontSize: 24, fontWeight: 800, margin: '8px 0 4px' }}>{cursoDetalle.Nombre}</h2>
              {cursoDetalle.Generacion && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{cursoDetalle.Generacion}</span>}
            </div>

            <div style={{ padding: 28 }}>
              {cursoDetalle.Descripcion && <p style={{ fontSize: 14, color: COLORS.gray600, margin: '0 0 20px', lineHeight: 1.6 }}>{cursoDetalle.Descripcion}</p>}

              {cursoDetalle.Objetivo && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Objetivo</h4>
                  <p style={{ fontSize: 13, color: COLORS.gray600, lineHeight: 1.6 }}>{cursoDetalle.Objetivo}</p>
                </div>
              )}

              {cursoDetalle.Temario && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray800, marginBottom: 6 }}>Temario</h4>
                  <p style={{ fontSize: 13, color: COLORS.gray600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{cursoDetalle.Temario}</p>
                </div>
              )}

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {cursoDetalle.FechaInicio && (
                  <InfoBox label="Fechas" value={`${fmtFecha(cursoDetalle.FechaInicio)}${cursoDetalle.FechaFin && cursoDetalle.FechaFin !== cursoDetalle.FechaInicio ? ` – ${fmtFecha(cursoDetalle.FechaFin)}` : ''}`} />
                )}
                {cursoDetalle.Instructor && <InfoBox label="Instructor" value={cursoDetalle.Instructor} />}
                {cursoDetalle.Ubicacion && <InfoBox label="Ubicación" value={cursoDetalle.Ubicacion} />}
                <InfoBox label="Sesiones" value={`${cursoDetalle.TotalSesiones} sesiones · ${cursoDetalle.TotalSesiones * (cursoDetalle.HorasPorSesion || 1)} h`} />
              </div>

              {/* Capacidad */}
              <div style={{ background: COLORS.gray50, borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: COLORS.gray600, fontWeight: 600 }}>{cursoDetalle.Inscritos} / {cursoDetalle.Capacidad} inscritos</span>
                  <span style={{ color: disponibles > 0 ? COLORS.green : COLORS.red, fontWeight: 700 }}>{disponibles > 0 ? `${disponibles} disponible${disponibles !== 1 ? 's' : ''}` : 'Sin cupo'}</span>
                </div>
                <div style={{ width: '100%', height: 8, background: COLORS.gray200, borderRadius: 4 }}>
                  <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.3s', width: `${pct}%`, background: pct >= 100 ? COLORS.red : pct >= 80 ? '#d97706' : COLORS.orange }} />
                </div>
              </div>

              {/* Inscripción */}
              {resultado ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <h3 style={{ color: '#15803d', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>¡Inscripción exitosa!</h3>
                  <p style={{ color: '#166534', fontSize: 14, margin: 0 }}>
                    <strong>{resultado.nombre}</strong> ha sido inscrito en <strong>{resultado.curso}</strong>
                  </p>
                  <p style={{ color: COLORS.gray500, fontSize: 12, marginTop: 8 }}>Se envió una invitación de calendario a tu correo.</p>
                  <button onClick={() => setCursoDetalle(null)} className="cta-btn" style={{ marginTop: 14 }}>Volver a cursos</button>
                </div>
              ) : disponibles > 0 ? (
                <form onSubmit={handleInscripcion}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray800, marginBottom: 10 }}>Inscribirme a este curso</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text" placeholder="Número de empleado"
                      value={numEmpleado} onChange={e => { setNumEmpleado(e.target.value); setError('') }}
                      required autoFocus style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="submit" disabled={inscribiendo || !numEmpleado.trim()} className="cta-btn" style={{
                      opacity: inscribiendo || !numEmpleado.trim() ? 0.5 : 1,
                      cursor: inscribiendo ? 'default' : 'pointer', whiteSpace: 'nowrap',
                    }}>
                      {inscribiendo ? 'Inscribiendo...' : 'Inscribirme'}
                    </button>
                  </div>
                  {error && (
                    <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: COLORS.red }}>{error}</div>
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

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid ' + COLORS.gray200,
  borderRadius: 8, fontSize: 14, outline: 'none', background: COLORS.white,
  boxSizing: 'border-box', fontFamily: 'inherit',
}

function InfoBox({ label, value }) {
  return (
    <div style={{ background: COLORS.gray50, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, color: COLORS.gray400, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.gray800 }}>{value}</div>
    </div>
  )
}

function CursoCard({ curso: c, onDetalle }) {
  const lugaresDisp = c.Capacidad - c.Inscritos
  const horas = c.TotalSesiones * (c.HorasPorSesion || 1)
  return (
    <div className="card-hover" style={{
      background: COLORS.white, borderRadius: 12, overflow: 'hidden',
      border: '1px solid ' + COLORS.gray200, display: 'flex', flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {c.TipoCurso === 'Proveedor Externo' && <div style={{ height: 4, background: COLORS.orange }} />}
      <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {c.TipoCurso === 'Proveedor Externo' && (
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
            background: '#fff7ed', color: COLORS.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, alignSelf: 'flex-start',
          }}>Proveedor externo</span>
        )}
        <h4 style={{ fontSize: 16, fontWeight: 700, color: COLORS.gray900, marginBottom: 8 }}>{c.Nombre}</h4>
        {c.Descripcion && <p style={{ fontSize: 13, color: COLORS.gray500, lineHeight: 1.5, marginBottom: 14 }}>{c.Descripcion.length > 100 ? c.Descripcion.slice(0, 100) + '...' : c.Descripcion}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12, color: COLORS.gray500, marginBottom: 14 }}>
          {c.FechaInicio && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {fmtFecha(c.FechaInicio)}
            </span>
          )}
          {horas > 0 && <span>{horas} h</span>}
          {c.Modalidad && <span>{c.Modalidad}</span>}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12 }}>
            <span style={{ color: COLORS.gray500 }}>{lugaresDisp > 0 ? `${lugaresDisp} lugares` : 'Sin cupo'}</span>
            {lugaresDisp > 0 && <span style={{ color: COLORS.green, fontWeight: 700, fontSize: 11 }}>Disponible</span>}
          </div>
          <button onClick={onDetalle} style={{
            width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: lugaresDisp > 0 ? COLORS.navy : COLORS.gray200,
            color: lugaresDisp > 0 ? COLORS.white : COLORS.gray400,
          }}>
            {lugaresDisp > 0 ? 'Ver detalles →' : 'Sin lugares'}
          </button>
        </div>
      </div>
    </div>
  )
}
