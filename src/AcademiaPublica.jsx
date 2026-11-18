import { useState, useEffect, useMemo } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const C = {
  navy: '#1a2e44', navyDark: '#0f1f30', orange: '#e8692d', orangeHover: '#d45a20',
  white: '#ffffff', g50: '#f9fafb', g100: '#f3f4f6', g200: '#e5e7eb', g400: '#9ca3af',
  g500: '#6b7280', g600: '#4b5563', g700: '#374151', g800: '#1f2937', g900: '#111827',
}

const HERO_BG = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=600&fit=crop'
const FALLBACK_RAMA_IMG = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=350&fit=crop'

const NIVELES = [
  { n: '01', titulo: 'Directores', bg: C.navy },
  { n: '02', titulo: 'Gerentes', bg: C.navy },
  { n: '03', titulo: 'Jefes y Coordinadores', bg: C.navy },
  { n: '04', titulo: 'Auxiliares y Personal operativo', bg: C.orange },
]

export default function AcademiaPublica() {
  const [ramas, setRamas] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [ramaAbierta, setRamaAbierta] = useState(null)
  const [cursoDetalle, setCursoDetalle] = useState(null)
  const [showExternos, setShowExternos] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    fetch(`${API}/academia/catalogo-publico`)
      .then(r => r.json())
      .then(d => { setRamas(d.ramas || []); setCursos(d.cursos || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const internos = useMemo(() => cursos.filter(c => c.TipoCurso !== 'Proveedor Externo'), [cursos])
  const externos = useMemo(() => cursos.filter(c => c.TipoCurso === 'Proveedor Externo'), [cursos])

  const ramasConCursos = useMemo(() => {
    return ramas.map(r => ({
      ...r,
      cursos: internos.filter(c => c.Rama === r.Nombre),
    })).filter(r => r.cursos.length > 0)
  }, [ramas, internos])

  const sinRama = useMemo(() => {
    const ramaNames = new Set(ramas.map(r => r.Nombre))
    return internos.filter(c => !c.Rama || !ramaNames.has(c.Rama))
  }, [internos, ramas])

  const busquedaResultados = useMemo(() => {
    if (!busqueda.trim()) return null
    const q = busqueda.toLowerCase()
    return cursos.filter(c =>
      (c.Nombre || '').toLowerCase().includes(q) ||
      (c.Descripcion || '').toLowerCase().includes(q) ||
      (c.Rama || '').toLowerCase().includes(q) ||
      (c.Niveles || '').toLowerCase().includes(q)
    )
  }, [cursos, busqueda])

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navColor = scrolled ? C.g700 : C.white

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", color: C.g800 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .nl { background: none; border: none; font-size: 14px; font-weight: 500; cursor: pointer; padding: 8px 14px; border-radius: 6px; transition: opacity 0.2s; }
        .nl:hover { opacity: 0.7; }
        .cta { background: ${C.orange}; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .cta:hover { background: ${C.orangeHover}; transform: translateY(-1px); }
        .ch:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? C.white : 'transparent',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: scrolled ? C.navy : C.white, letterSpacing: 2 }}>UDAT</span>
            <div style={{ width: 1, height: 28, background: scrolled ? C.g200 : 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: scrolled ? C.g600 : 'rgba(255,255,255,0.9)', letterSpacing: 1 }}>TRAYECTO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="nl" style={{ color: navColor }} onClick={() => scrollTo('inicio')}>Inicio</button>
            <button className="nl" style={{ color: navColor }} onClick={() => scrollTo('niveles')}>Niveles</button>
            <button className="nl" style={{ color: navColor }} onClick={() => scrollTo('catalogo')}>Catálogo</button>
            <button className="nl" style={{ color: navColor }} onClick={() => scrollTo('cursos-adicionales')}>Cursos adicionales</button>
            <button className="cta" onClick={() => scrollTo('solicitar')}>Solicitar capacitación</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="inicio" style={{
        position: 'relative', minHeight: 520, display: 'flex', alignItems: 'center',
        background: `linear-gradient(135deg, rgba(15,31,48,0.85) 0%, rgba(26,46,68,0.75) 100%), url("${HERO_BG}") center/cover no-repeat`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, color: C.white, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>
            Universidad de Autotransporte
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: C.white, lineHeight: 1.1, maxWidth: 700, marginBottom: 20 }}>
            Desarrollando talento,<br /><span style={{ color: C.orange, fontStyle: 'italic' }}>construyendo historias.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 580, lineHeight: 1.6, marginBottom: 32 }}>
            Encuentra la formación que necesitas para desarrollar nuevas competencias, fortalecer tu desempeño y continuar creciendo dentro de Trayecto.
          </p>
          <button className="cta" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => scrollTo('catalogo')}>Explorar cursos</button>
        </div>
      </section>

      {/* NIVELES */}
      <section id="niveles" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Formación</span>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: C.g900, marginTop: 8 }}>Niveles Organizacionales</h2>
        <p style={{ fontSize: 15, color: C.g500, marginTop: 8, maxWidth: 600, marginBottom: 32 }}>
          Conoce las diferentes opciones de formación de acuerdo con tu nivel organizacional dentro de Trayecto.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {NIVELES.map((n, i) => (
            <div key={i} style={{ background: n.bg, borderRadius: 14, padding: '28px 24px', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Nivel {n.n}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, minHeight: 48 }}>{n.titulo}</h3>
              <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.08)', lineHeight: 1 }}>{i + 1}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: C.g500 }}>
          <span style={{ color: C.orange }}>⚡</span> Selecciona un nivel para consultar los cursos dirigidos a ese nivel.
        </p>
      </section>

      {/* CATÁLOGO */}
      <section id="catalogo" style={{ padding: '60px 24px 80px', background: C.g50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Oferta de capacitación</span>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: C.g900, marginTop: 8 }}>Catálogo de Cursos</h2>
              <p style={{ fontSize: 15, color: C.g500, marginTop: 8 }}>
                Consulta los cursos impartidos directamente por UDAT, organizados por rama, o revisa los cursos adicionales de proveedores externos.
              </p>
            </div>
            <div style={{ position: 'relative', minWidth: 280 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.g400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Buscar un curso..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid ' + C.g200, borderRadius: 10, fontSize: 14, outline: 'none', background: C.white }} />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.g500 }}>
              <div style={{ width: 40, height: 40, border: '3px solid ' + C.g200, borderTopColor: C.orange, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              Cargando catálogo...
            </div>
          ) : busquedaResultados ? (
            <>
              <p style={{ fontSize: 14, color: C.g500, marginBottom: 16 }}>{busquedaResultados.length} resultado{busquedaResultados.length !== 1 ? 's' : ''} para "{busqueda}"</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {busquedaResultados.map(c => <CursoCard key={c.CatalogoCursoId} c={c} onClick={() => setCursoDetalle(c)} />)}
              </div>
            </>
          ) : (
            <>
              {/* Formación interna - Ramas */}
              <div style={{ marginBottom: 48 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Formación interna</span>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.g900, marginTop: 6, marginBottom: 6 }}>Cursos impartidos directamente por UDAT</h3>
                <p style={{ fontSize: 14, color: C.g500, marginBottom: 24 }}>Selecciona una rama para consultar los cursos, sus objetivos y temarios.</p>

                {/* Rama cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                  {ramasConCursos.map(r => (
                    <div key={r.RamaId} className="ch" onClick={() => setRamaAbierta(ramaAbierta === r.Nombre ? null : r.Nombre)}
                      style={{ background: C.white, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                      <div style={{ height: 180, overflow: 'hidden' }}>
                        <img src={r.ImagenURL || FALLBACK_RAMA_IMG} alt={r.Nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.src = FALLBACK_RAMA_IMG }} />
                      </div>
                      <div style={{ padding: '20px 24px' }}>
                        <h4 style={{ fontSize: 18, fontWeight: 700, color: C.g900, marginBottom: 8 }}>{r.Nombre}</h4>
                        <p style={{ fontSize: 13, color: C.g500, marginBottom: 14, lineHeight: 1.5 }}>
                          {r.Descripcion || `Conoce los cursos y herramientas de ${r.Nombre.toLowerCase()}.`}
                        </p>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.orange }}>Ver {r.cursos.length} curso{r.cursos.length !== 1 ? 's' : ''} →</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cursos de rama abierta */}
                {ramaAbierta && (() => {
                  const r = ramasConCursos.find(x => x.Nombre === ramaAbierta)
                  if (!r) return null
                  return (
                    <div style={{ marginTop: 32 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h4 style={{ fontSize: 22, fontWeight: 800, color: C.g900 }}>{r.Nombre}</h4>
                        <button onClick={() => setRamaAbierta(null)} style={{ background: 'none', border: 'none', color: C.orange, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ocultar cursos ↑</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                        {r.cursos.map(c => <CursoCard key={c.CatalogoCursoId} c={c} onClick={() => setCursoDetalle(c)} />)}
                      </div>
                    </div>
                  )
                })()}

                {/* Cursos sin rama */}
                {sinRama.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <h4 style={{ fontSize: 18, fontWeight: 700, color: C.g900, marginBottom: 16 }}>Otros cursos internos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                      {sinRama.map(c => <CursoCard key={c.CatalogoCursoId} c={c} onClick={() => setCursoDetalle(c)} />)}
                    </div>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid ' + C.g200, margin: '0 0 48px' }} />

              {/* Formación complementaria */}
              <div id="cursos-adicionales">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Formación complementaria</span>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: C.g900, marginTop: 6 }}>Cursos adicionales · Proveedores externos</h3>
                    <p style={{ fontSize: 14, color: C.g500, marginTop: 4 }}>Opciones impartidas por proveedores externos, independientes de la oferta directa de UDAT.</p>
                  </div>
                  {externos.length > 0 && (
                    <button onClick={() => setShowExternos(!showExternos)} style={{ background: 'none', border: 'none', color: C.orange, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      {showExternos ? 'Ocultar cursos ↑' : `Ver ${externos.length} cursos ↓`}
                    </button>
                  )}
                </div>

                {showExternos && externos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {externos.map(c => <CursoCard key={c.CatalogoCursoId} c={c} onClick={() => setCursoDetalle(c)} externo />)}
                  </div>
                )}

                {!showExternos && externos.length > 0 && (
                  <div style={{ background: C.white, borderRadius: 14, padding: 32, maxWidth: 500, border: '1px solid ' + C.g200 }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>🌐</div>
                    <h4 style={{ fontSize: 20, fontWeight: 700, color: C.g900, marginBottom: 12 }}>Proveedores externos</h4>
                    <p style={{ fontSize: 14, color: C.g500, lineHeight: 1.6, marginBottom: 16 }}>
                      Los cursos adicionales están organizados en el catálogo para que puedas consultar sus objetivos y temarios.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                      {externos.slice(0, 4).map(c => (
                        <li key={c.CatalogoCursoId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: C.g700 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {c.Nombre}
                        </li>
                      ))}
                    </ul>
                    <button className="cta" onClick={() => setShowExternos(true)}>Ver cursos adicionales →</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CURSOS ADICIONALES INFO */}
      <section style={{ padding: '60px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase' }}>Otras opciones de desarrollo</span>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: C.g900, marginTop: 8, marginBottom: 8 }}>Cursos adicionales</h2>
        <p style={{ fontSize: 15, color: C.g500, maxWidth: 600, lineHeight: 1.6, marginBottom: 32 }}>
          Consulta los cursos complementarios impartidos por proveedores externos, separados de los programas que UDAT imparte directamente.
        </p>
        <div style={{ background: C.white, borderRadius: 14, padding: 32, maxWidth: 540, border: '1px solid ' + C.g200 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🌐</div>
          <h4 style={{ fontSize: 20, fontWeight: 700, color: C.g900, marginBottom: 12 }}>Proveedores externos</h4>
          <p style={{ fontSize: 14, color: C.g500, lineHeight: 1.6, marginBottom: 16 }}>
            Los cursos adicionales están organizados en el catálogo para que puedas consultar sus objetivos y temarios. Selecciona el apartado de cursos adicionales.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
            {externos.slice(0, 4).map(c => (
              <li key={c.CatalogoCursoId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: C.g700 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {c.Nombre}
              </li>
            ))}
          </ul>
          <button className="cta" onClick={() => { scrollTo('cursos-adicionales'); setTimeout(() => setShowExternos(true), 400) }}>Ver cursos adicionales →</button>
        </div>
      </section>

      {/* SOLICITAR CAPACITACIÓN */}
      <section id="solicitar" style={{ background: C.navyDark, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase' }}>¿Necesitas capacitación?</span>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: C.white, marginTop: 8, marginBottom: 8 }}>Cuéntanos qué necesita tu empresa</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 700, lineHeight: 1.6, marginBottom: 40 }}>
            No necesitas conocer el nombre del curso. Cuéntanos qué necesidad tiene tu empresa, qué quieren desarrollar
            o qué situación desean mejorar y UDAT analizará la necesidad para recomendarte la opción de capacitación más adecuada.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 24 }}>¿Qué información necesitamos?</h3>
              {['Nombre de la empresa','Nombre y puesto de quien solicita','Área o equipo que necesita capacitación','Necesidad o situación que desean atender','Número aproximado de participantes','Información adicional que consideres importante'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {t}
                </div>
              ))}
              <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Envía tu solicitud a</div>
                <div style={{ fontSize: 14, color: C.white, fontWeight: 600 }}>elena.morantes@udat.com.mx</div>
                <div style={{ fontSize: 14, color: C.white, fontWeight: 600, marginTop: 4 }}>fernanda.mata@udat.com.mx</div>
              </div>
            </div>
            <div style={{ background: C.white, borderRadius: 14, padding: 32 }}>
              <form onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.target)
                const d = Object.fromEntries(fd.entries())
                window.open(`mailto:elena.morantes@udat.com.mx,fernanda.mata@udat.com.mx?subject=${encodeURIComponent('Solicitud de capacitación - ' + d.empresa)}&body=${encodeURIComponent(`Empresa: ${d.empresa}\nNombre: ${d.nombre}\nPuesto: ${d.puesto}\nÁrea: ${d.area}\nParticipantes: ${d.participantes}\n\nNecesidad:\n${d.necesidad}\n\nInformación adicional:\n${d.info || 'N/A'}`)}`, '_blank')
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div><label style={lbl}>Empresa</label><input name="empresa" required placeholder="Nombre de la empresa" style={inp} /></div>
                  <div><label style={lbl}>Nombre de quien solicita</label><input name="nombre" required placeholder="Nombre completo" style={inp} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div><label style={lbl}>Puesto</label><input name="puesto" placeholder="Puesto dentro de la empresa" style={inp} /></div>
                  <div><label style={lbl}>Área o equipo</label><input name="area" placeholder="Área que requiere capacitación" style={inp} /></div>
                </div>
                <div style={{ marginBottom: 16 }}><label style={lbl}>Número aproximado de participantes</label><input name="participantes" placeholder="Ej. 20" style={inp} /></div>
                <div style={{ marginBottom: 16 }}><label style={lbl}>Cuéntanos la necesidad de tu empresa</label><textarea name="necesidad" required rows={4} placeholder="Cuéntanos qué situación están enfrentando..." style={{ ...inp, resize: 'vertical' }} /></div>
                <div style={{ marginBottom: 24 }}><label style={lbl}>Información adicional</label><textarea name="info" rows={3} placeholder="Fechas tentativas, modalidad, ubicación..." style={{ ...inp, resize: 'vertical' }} /></div>
                <button type="submit" className="cta" style={{ width: '100%', padding: '14px 0', fontSize: 15 }}>Enviar solicitud por correo →</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: C.navy, padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>© {new Date().getFullYear()} UDAT · Universidad de Autotransporte · Trayecto</p>
      </footer>

      {/* MODAL DETALLE CURSO */}
      {cursoDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setCursoDetalle(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid ' + C.g200, position: 'relative' }}>
              <button onClick={() => setCursoDetalle(null)} style={{ position: 'absolute', top: 14, right: 14, background: C.g100, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: C.g500 }}>✕</button>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: C.g900, marginBottom: 8, paddingRight: 40 }}>{cursoDetalle.Nombre}</h2>
              {cursoDetalle.Niveles && (
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: C.g100, color: C.g700, textTransform: 'uppercase' }}>
                  Niveles {cursoDetalle.Niveles}
                </span>
              )}
            </div>
            <div style={{ padding: 28 }}>
              {cursoDetalle.Descripcion && <p style={{ fontSize: 14, color: C.g600, lineHeight: 1.7, marginBottom: 20 }}>{cursoDetalle.Descripcion}</p>}

              {/* Info meta */}
              {(cursoDetalle.Rama || cursoDetalle.NumeroSesiones || cursoDetalle.Horas || cursoDetalle.Modalidad) && (
                <div style={{ background: C.g50, borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: C.g500 }}>
                  {[
                    cursoDetalle.Rama && `Rama: ${cursoDetalle.Rama}`,
                    cursoDetalle.NumeroSesiones && `${cursoDetalle.NumeroSesiones} sesiones`,
                    cursoDetalle.Horas && `${cursoDetalle.Horas} horas`,
                    cursoDetalle.Modalidad,
                  ].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Temario */}
              {cursoDetalle.Temario && (
                <div style={{ background: C.g50, borderRadius: 12, padding: '20px 24px' }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: C.g900, marginBottom: 12 }}>Temario</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {cursoDetalle.Temario.split('\n').filter(l => l.trim()).map((item, i) => (
                      <li key={i} style={{ fontSize: 14, color: C.g700, padding: '4px 0', lineHeight: 1.5 }}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = { display: 'block', fontSize: 13, fontWeight: 700, color: C.g800, marginBottom: 6 }
const inp = { width: '100%', padding: '10px 14px', border: '1px solid ' + C.g200, borderRadius: 8, fontSize: 14, outline: 'none', background: C.white, boxSizing: 'border-box', fontFamily: 'inherit' }

function CursoCard({ c, onClick, externo }) {
  return (
    <div className="ch" onClick={onClick} style={{
      background: C.white, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
      border: '1px solid ' + C.g200, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      {(externo || c.TipoCurso === 'Proveedor Externo') && <div style={{ height: 4, background: C.orange }} />}
      <div style={{ padding: '20px 24px' }}>
        {c.Niveles && (
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: C.g100, color: C.g700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Niveles {c.Niveles}
          </span>
        )}
        {(externo || c.TipoCurso === 'Proveedor Externo') && !c.Niveles && (
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fff7ed', color: C.orange, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Proveedor externo
          </span>
        )}
        <h4 style={{ fontSize: 16, fontWeight: 700, color: C.g900, marginBottom: 8 }}>{c.Nombre}</h4>
        {(c.Rama || c.NumeroSesiones || c.Horas || c.Modalidad) && (
          <div style={{ background: C.g50, borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: 12, color: C.g500 }}>
            {[c.Rama && `Rama: ${c.Rama}`, c.NumeroSesiones && `${c.NumeroSesiones} sesiones`, c.Horas && `${c.Horas} horas`, c.Modalidad].filter(Boolean).join(' · ')}
          </div>
        )}
        {c.Descripcion && <p style={{ fontSize: 13, color: C.g500, lineHeight: 1.5, marginBottom: 14 }}>{c.Descripcion.length > 120 ? c.Descripcion.slice(0, 120) + '...' : c.Descripcion}</p>}
        <span style={{ fontSize: 14, fontWeight: 600, color: C.orange }}>Ver información →</span>
      </div>
    </div>
  )
}
