import { useState, useEffect, useCallback } from 'react'
import {
  getAcademiaDashboard,
  getAcademiaCursos,
  getAcademiaCursoDetalle,
  createAcademiaCurso,
  updateAcademiaCurso,
  deleteAcademiaCurso,
  getAcademiaSesiones,
  createAcademiaSesion,
  updateAcademiaSesion,
  deleteAcademiaSesion,
  getAcademiaInscritos,
  verificarInscripciones,
  inscribirParticipantes,
  darDeBajaInscripcion,
  getAcademiaAsistencias,
  registrarAsistenciaManual,
  getAcademiaHistorico,
  searchParticipantes,
  getCursos,
  getCoaches,
} from './api'
import { generarListaAsistenciaPDF } from './generarListaAsistencia'

const TABS = [
  { id: 'cursos', label: 'Cursos' },
  { id: 'inscripciones', label: 'Inscripciones' },
  { id: 'asistencias', label: 'Asistencias' },
  { id: 'qr', label: 'QR en Aula' },
  { id: 'historico', label: 'Histórico' },
]

function fmtFecha(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function cursoLabel(c) {
  if (!c) return ''
  return c.Generacion ? `${c.Nombre} — ${c.Generacion}` : c.Nombre
}

export default function Academia({ usuario }) {
  const [tab, setTab] = useState('cursos')
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(false)
  const [dashboard, setDashboard] = useState(null)
  const [detalleCurso, setDetalleCurso] = useState(null)
  const [showNuevoCurso, setShowNuevoCurso] = useState(false)
  const [editandoCurso, setEditandoCurso] = useState(null)

  // inscripciones
  const [filtroNombreCursoInsc, setFiltroNombreCursoInsc] = useState('')
  const [filtroGeneracionInsc, setFiltroGeneracionInsc] = useState('')
  const [cursoInscripcion, setCursoInscripcion] = useState('')
  const [modalParticipantesOpen, setModalParticipantesOpen] = useState(false)
  const [searchParticipantesInput, setSearchParticipantesInput] = useState('')
  const [participantesDisponibles, setParticipantesDisponibles] = useState([])
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([])
  const [inscritosLista, setInscritosLista] = useState([])
  const [loadingInscritos, setLoadingInscritos] = useState(false)
  const [verificacionResult, setVerificacionResult] = useState(null)
  const [modalVerificacionOpen, setModalVerificacionOpen] = useState(false)

  // asistencias
  const [filtroNombreCurso, setFiltroNombreCurso] = useState('')
  const [filtroGeneracion, setFiltroGeneracion] = useState('')
  const [cursoAsistencia, setCursoAsistencia] = useState('')
  const [asistenciasData, setAsistenciasData] = useState(null)
  const [loadingAsistencias, setLoadingAsistencias] = useState(false)
  const [modalListaAsistOpen, setModalListaAsistOpen] = useState(false)

  // qr
  const [filtroNombreCursoQR, setFiltroNombreCursoQR] = useState('')
  const [filtroGeneracionQR, setFiltroGeneracionQR] = useState('')
  const [cursoQR, setCursoQR] = useState('')
  const [sesionQR, setSesionQR] = useState('')
  const [sesionesQR, setSesionesQR] = useState([])

  // historico
  const [historicoData, setHistoricoData] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [filtroHistEmpresa, setFiltroHistEmpresa] = useState('')
  const [filtroHistTerminal, setFiltroHistTerminal] = useState('')
  const [filtroHistPlaza, setFiltroHistPlaza] = useState('')
  const [filtroHistArea, setFiltroHistArea] = useState('')
  const [filtroHistBuscar, setFiltroHistBuscar] = useState('')
  const [filtroHistCurso, setFiltroHistCurso] = useState('')

  // filters
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroModalidad, setFiltroModalidad] = useState('')
  const [filtroBuscar, setFiltroBuscar] = useState('')

  const loadCursos = useCallback(async () => {
    try {
      setLoading(true)
      const [c, d] = await Promise.all([getAcademiaCursos(), getAcademiaDashboard()])
      setCursos(c)
      setDashboard(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCursos() }, [loadCursos])

  useEffect(() => {
    if (tab !== 'historico') return
    setLoadingHistorico(true)
    getAcademiaHistorico()
      .then(d => setHistoricoData(d))
      .catch(console.error)
      .finally(() => setLoadingHistorico(false))
  }, [tab])

  // search participantes (same as NuevaCotizacion)
  useEffect(() => {
    if (searchParticipantesInput.length < 2) { setParticipantesDisponibles([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await searchParticipantes(searchParticipantesInput)
        setParticipantesDisponibles(r)
      } catch { setParticipantesDisponibles([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchParticipantesInput])

  // load inscritos when cursoInscripcion changes
  useEffect(() => {
    if (!cursoInscripcion) { setInscritosLista([]); return }
    setLoadingInscritos(true)
    getAcademiaInscritos(cursoInscripcion)
      .then(r => setInscritosLista(r))
      .catch(() => setInscritosLista([]))
      .finally(() => setLoadingInscritos(false))
  }, [cursoInscripcion])

  // load asistencias
  useEffect(() => {
    if (!cursoAsistencia) { setAsistenciasData(null); return }
    setLoadingAsistencias(true)
    getAcademiaAsistencias(cursoAsistencia)
      .then(r => setAsistenciasData(r))
      .catch(() => setAsistenciasData(null))
      .finally(() => setLoadingAsistencias(false))
  }, [cursoAsistencia])

  // load sesiones for QR tab
  useEffect(() => {
    if (!cursoQR) { setSesionesQR([]); setSesionQR(''); return }
    getAcademiaSesiones(cursoQR).then(s => { setSesionesQR(s); setSesionQR(s[0]?.SesionId || '') }).catch(() => setSesionesQR([]))
  }, [cursoQR])

  function getParticipanteKey(p) {
    return p.EmpleadoId ?? p.NumeroEmpleado ?? p.NombreCompleto
  }

  function agregarParticipante(participante) {
    const cursoSel = cursos.find(c => c.CursoAcademiaId === Number(cursoInscripcion))
    const limite = cursoSel ? cursoSel.Capacidad - (cursoSel.Inscritos || 0) : null
    if (limite !== null && empleadosSeleccionados.length >= limite) return
    const key = getParticipanteKey(participante)
    if (!empleadosSeleccionados.some(p => getParticipanteKey(p) === key)) {
      setEmpleadosSeleccionados(prev => [...prev, participante])
      setSearchParticipantesInput('')
      setParticipantesDisponibles([])
    }
  }

  function quitarParticipante(key) {
    setEmpleadosSeleccionados(prev => prev.filter(p => getParticipanteKey(p) !== key))
  }

  async function handleInscribir() {
    if (!cursoInscripcion || empleadosSeleccionados.length === 0) return
    try {
      const verif = await verificarInscripciones({ CursoAcademiaId: Number(cursoInscripcion), participantes: empleadosSeleccionados })
      if (verif.bloqueados.length > 0 || verif.advertencias.length > 0) {
        setVerificacionResult(verif)
        setModalVerificacionOpen(true)
        return
      }
      await ejecutarInscripcion(empleadosSeleccionados, [])
    } catch (err) {
      window.alert('Error: ' + err.message)
    }
  }

  async function ejecutarInscripcion(participantes, inscripcionesPrevias) {
    try {
      await inscribirParticipantes({
        CursoAcademiaId: Number(cursoInscripcion),
        participantes,
        confirmarReinscripcion: inscripcionesPrevias.length > 0,
        inscripcionesPrevias
      })
      setEmpleadosSeleccionados([])
      setSearchParticipantesInput('')
      setParticipantesDisponibles([])
      setModalParticipantesOpen(false)
      setModalVerificacionOpen(false)
      setVerificacionResult(null)
      const r = await getAcademiaInscritos(cursoInscripcion)
      setInscritosLista(r)
      loadCursos()
      window.alert('Participantes inscritos correctamente')
    } catch (err) {
      window.alert('Error: ' + err.message)
    }
  }

  function handleConfirmarReinscripcion() {
    if (!verificacionResult) return
    const participantesPermitidos = [
      ...verificacionResult.nuevos,
      ...verificacionResult.advertencias
    ]
    const previas = verificacionResult.advertencias.map(a => a.inscripcionPreviaId).filter(Boolean)
    ejecutarInscripcion(participantesPermitidos, previas)
  }

  async function handleDarBaja(inscripcionId) {
    if (!window.confirm('¿Dar de baja a este participante?')) return
    try {
      await darDeBajaInscripcion(inscripcionId)
      setInscritosLista(prev => prev.filter(i => i.InscripcionId !== inscripcionId))
      loadCursos()
    } catch (err) { window.alert('Error: ' + err.message) }
  }

  async function handleToggleAsistencia(sesionId, inscripcionId, presente) {
    try {
      await registrarAsistenciaManual({ sesionId, inscripcionId, presente: !presente })
      const r = await getAcademiaAsistencias(cursoAsistencia)
      setAsistenciasData(r)
    } catch (err) { window.alert('Error: ' + err.message) }
  }

  async function openDetalle(cursoId) {
    try {
      const d = await getAcademiaCursoDetalle(cursoId)
      setDetalleCurso(d)
    } catch (err) { window.alert('Error: ' + err.message) }
  }

  const cursosFiltrados = cursos.filter(c => {
    if (filtroEstado && c.Estado !== filtroEstado) return false
    if (filtroModalidad && c.Modalidad !== filtroModalidad) return false
    if (filtroBuscar) {
      const q = filtroBuscar.toLowerCase()
      if (!c.Nombre?.toLowerCase().includes(q) && !c.Instructor?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const qrUrl = sesionQR
    ? `${window.location.origin}/asistencia-academia?sesion=${sesionQR}`
    : ''

  return (
    <section className="panel card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="panel-header" style={{ marginBottom: 0, paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
            Gestión de cursos, inscripciones y asistencia
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost-button" onClick={loadCursos} style={{ fontSize: 13 }}>Actualizar</button>
            <button className="primary-button" onClick={() => { setShowNuevoCurso(true); setEditandoCurso(null) }} style={{ fontSize: 13 }}>
              + Nuevo curso
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border, #e5e7eb)', margin: '12px 0 0', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t.id ? '#2563eb' : '#6b7280',
              borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CURSOS ═══ */}
      {tab === 'cursos' && (
        <div style={{ padding: '16px 0' }}>
          {/* Stats */}
          {dashboard && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Cursos activos', value: dashboard.cursosActivos, color: '#16a34a' },
                { label: 'Total cursos', value: dashboard.cursosTotal, color: '#2563eb' },
                { label: 'Participantes activos', value: dashboard.participantesActivos, color: '#d97706' },
                { label: 'Sesiones esta semana', value: dashboard.sesionesEstaSemana, color: '#7c3aed' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value ?? 0}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <select className="form-control" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ maxWidth: 160, fontSize: 13 }}>
              <option value="">Todos los estados</option>
              <option>Activo</option>
              <option>Próximo</option>
              <option>Completado</option>
            </select>
            <select className="form-control" value={filtroModalidad} onChange={e => setFiltroModalidad(e.target.value)} style={{ maxWidth: 160, fontSize: 13 }}>
              <option value="">Modalidad</option>
              <option>Presencial</option>
              <option>En línea</option>
              <option>Mixto</option>
            </select>
            <input className="form-control" placeholder="Buscar curso..." value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)} style={{ maxWidth: 180, fontSize: 13 }} />
            {(filtroEstado || filtroModalidad || filtroBuscar) && (
              <button className="ghost-button" style={{ fontSize: 12 }} onClick={() => { setFiltroEstado(''); setFiltroModalidad(''); setFiltroBuscar('') }}>Limpiar</button>
            )}
          </div>

          {loading && <p style={{ color: '#6b7280' }}>Cargando...</p>}

          {/* Table */}
          <div className="table-wrap">
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Modalidad</th>
                  <th>Sesiones</th>
                  <th>Fechas</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, color: '#6b7280', textAlign: 'center' }}>
                    {loading ? 'Cargando...' : 'No hay cursos registrados.'}
                  </td></tr>
                ) : cursosFiltrados.map(c => (
                  <tr key={c.CursoAcademiaId} style={{ cursor: 'pointer' }} onClick={() => openDetalle(c.CursoAcademiaId)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cursoLabel(c)}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.Instructor || 'Sin instructor'}</div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: c.Modalidad === 'Presencial' ? '#fef3c7' : c.Modalidad === 'En línea' ? '#eff6ff' : '#f3f4f6',
                        color: c.Modalidad === 'Presencial' ? '#d97706' : c.Modalidad === 'En línea' ? '#2563eb' : '#6b7280',
                      }}>{c.Modalidad}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.TotalSesiones || 0} {(c.TotalSesiones || 0) === 1 ? 'sesión' : 'sesiones'}</td>
                    <td style={{ fontSize: 12 }}>{fmtFecha(c.FechaInicio)}{c.FechaFin ? ` — ${fmtFecha(c.FechaFin)}` : ''}</td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: (c.Inscritos || 0) >= c.Capacidad ? '#dc2626' : (c.Inscritos || 0) >= c.Capacidad * 0.8 ? '#d97706' : '#16a34a' }}>
                        {c.Inscritos || 0} / {c.Capacidad}
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e5e7eb', borderRadius: 2, marginTop: 3 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, ((c.Inscritos || 0) / c.Capacidad) * 100)}%`, background: (c.Inscritos || 0) >= c.Capacidad ? '#dc2626' : '#16a34a', transition: 'width 0.3s' }} />
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: c.Estado === 'Activo' ? '#f0fdf4' : c.Estado === 'Próximo' ? '#eff6ff' : '#f3f4f6',
                        color: c.Estado === 'Activo' ? '#16a34a' : c.Estado === 'Próximo' ? '#2563eb' : '#6b7280',
                        border: '1px solid currentColor', opacity: 0.85,
                      }}>{c.Estado}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="ghost-button" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => { setEditandoCurso(c); setShowNuevoCurso(true) }}>Editar</button>
                        <button className="secondary-button" style={{ fontSize: 12, padding: '3px 10px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={async () => {
                          if (!window.confirm(`¿Eliminar el curso "${cursoLabel(c)}"?`)) return
                          try { await deleteAcademiaCurso(c.CursoAcademiaId); loadCursos() } catch (err) { window.alert(err.message) }
                        }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">Total: {cursosFiltrados.length} curso(s)</div>
        </div>
      )}

      {/* ═══ TAB INSCRIPCIONES ═══ */}
      {tab === 'inscripciones' && (() => {
        const cursosDisponibles = cursos.filter(c => c.Estado === 'Activo' || c.Estado === 'Próximo')
        const nombresUnicosInsc = [...new Set(cursosDisponibles.map(c => c.Nombre))].sort()
        const cursosDelNombreInsc = filtroNombreCursoInsc ? cursosDisponibles.filter(c => c.Nombre === filtroNombreCursoInsc) : []
        const generacionesInsc = cursosDelNombreInsc.map(c => ({ id: c.CursoAcademiaId, gen: c.Generacion || '', lugares: c.Capacidad - (c.Inscritos || 0) }))
        const cursoSel = cursos.find(c => c.CursoAcademiaId === Number(cursoInscripcion))
        const capacidadTotal = cursoSel?.Capacidad || 0
        const inscritosActuales = cursoSel?.Inscritos || 0
        const lugaresDisponibles = capacidadTotal - inscritosActuales
        return (
        <div style={{ padding: '16px 0' }}>
          {/* Course selector + participant panel */}
          <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', flex: 1, minWidth: 200 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Inscribir participantes</h3>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Curso *</label>
                  <select className="form-control" value={filtroNombreCursoInsc} onChange={e => {
                    const nombre = e.target.value
                    setFiltroNombreCursoInsc(nombre)
                    setFiltroGeneracionInsc('')
                    setEmpleadosSeleccionados([])
                    const matches = nombre ? cursosDisponibles.filter(c => c.Nombre === nombre) : []
                    if (matches.length === 1) {
                      setCursoInscripcion(String(matches[0].CursoAcademiaId))
                    } else {
                      setCursoInscripcion('')
                    }
                  }} style={{ minWidth: 220, fontSize: 13 }}>
                    <option value="">Seleccionar curso...</option>
                    {nombresUnicosInsc.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {filtroNombreCursoInsc && generacionesInsc.length > 1 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Generación *</label>
                    <select className="form-control" value={filtroGeneracionInsc} onChange={e => {
                      const gen = e.target.value
                      setFiltroGeneracionInsc(gen)
                      setEmpleadosSeleccionados([])
                      const match = cursosDelNombreInsc.find(c => (c.Generacion || '') === gen)
                      setCursoInscripcion(match ? String(match.CursoAcademiaId) : '')
                    }} style={{ minWidth: 180, fontSize: 13 }}>
                      <option value="">Seleccionar generación...</option>
                      {generacionesInsc.map(g => (
                        <option key={g.id} value={g.gen}>{(g.gen || '(Sin generación)') + ` (${g.lugares} lugares)`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {cursoInscripcion && (
                <button
                  type="button"
                  className="secondary-button btn-with-icon"
                  style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
                  onClick={() => setModalParticipantesOpen(true)}
                >
                  <span className="btn-icon" aria-hidden>✎</span>
                  Seleccionar Participantes
                </button>
              )}
            </div>

            {cursoInscripcion && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: empleadosSeleccionados.length > 0 ? '#2563eb' : '#6b7280' }}>
                {empleadosSeleccionados.length > 0
                  ? `${empleadosSeleccionados.length} colaborador(es) listo(s) para inscribir`
                  : `${inscritosActuales} de ${capacidadTotal} cupos ocupados — ${lugaresDisponibles} disponible(s)`}
              </p>
            )}

            {cursoInscripcion && empleadosSeleccionados.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="table-wrap">
                  <table className="participants-table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr><th>#</th><th>Colaborador</th><th>No. Empleado</th><th>Empresa</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {empleadosSeleccionados.map((p, index) => {
                        const k = getParticipanteKey(p)
                        return (
                          <tr key={k || index}>
                            <td>{index + 1}</td>
                            <td style={{ fontWeight: 600 }}>{p.NombreCompleto || '-'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.NumeroEmpleado || '-'}</td>
                            <td>{p.Empresa || '-'}</td>
                            <td>
                              <button type="button" className="icon-button" title="Quitar participante" onClick={() => quitarParticipante(k)}>✕</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0' }}>
                  <button className="primary-button" style={{ fontSize: 13 }} onClick={handleInscribir}>Inscribir {empleadosSeleccionados.length} participante(s)</button>
                </div>
              </div>
            )}
          </div>

          {/* Modal for participant selection (NuevaCotizacion style) */}
          {modalParticipantesOpen && (() => {
            const limite = lugaresDisponibles > 0 ? lugaresDisponibles : null
            const alLimite = limite !== null && empleadosSeleccionados.length >= limite
            return (
              <div className="modal-overlay" onClick={() => setModalParticipantesOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                  <div className="modal-header">
                    <div>
                      <h2 style={{ marginBottom: '4px' }}>Agregar Participantes</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', color: alLimite ? '#dc2626' : '#6b7280' }}>
                          {empleadosSeleccionados.length}{limite ? `/${limite}` : ''} participante{empleadosSeleccionados.length !== 1 ? 's' : ''} seleccionado{empleadosSeleccionados.length !== 1 ? 's' : ''}
                        </span>
                        {limite && (
                          <div style={{ flex: 1, maxWidth: '120px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, (empleadosSeleccionados.length / limite) * 100)}%`,
                              background: alLimite ? '#dc2626' : '#2563eb',
                              borderRadius: '3px',
                              transition: 'width 0.2s',
                            }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="button" className="modal-close" onClick={() => setModalParticipantesOpen(false)}>✕</button>
                  </div>

                  <div className="modal-body">
                    {alLimite && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#991b1b' }}>
                        Cupo completo: ya tienes {limite} participante{limite !== 1 ? 's' : ''} seleccionado{limite !== 1 ? 's' : ''}. Quita alguno para agregar otro.
                      </div>
                    )}

                    {!alLimite && (
                      <div className="form-field form-field-full" style={{ marginBottom: '12px' }}>
                        <span className="form-field-label">Buscar por nombre o número de empleado</span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Escriba al menos 2 caracteres..."
                          value={searchParticipantesInput}
                          onChange={e => setSearchParticipantesInput(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}

                    {!alLimite && searchParticipantesInput.length >= 2 && (
                      <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                        {participantesDisponibles.length === 0 ? (
                          <p style={{ color: '#6b7280', margin: '8px 0', fontSize: '13px' }}>No se encontraron colaboradores.</p>
                        ) : (
                          <>
                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                              {participantesDisponibles.length} resultado(s):
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {participantesDisponibles.map(participante => {
                                const pKey = getParticipanteKey(participante)
                                const isSelected = empleadosSeleccionados.some(p => getParticipanteKey(p) === pKey)
                                const yaInscrito = inscritosLista.some(i => i.NumeroEmpleado === participante.NumeroEmpleado)
                                return (
                                  <div
                                    key={pKey}
                                    style={{
                                      padding: '9px 12px',
                                      border: `1px solid ${yaInscrito ? '#d1d5db' : isSelected ? '#86efac' : '#e5e7eb'}`,
                                      borderRadius: '6px',
                                      backgroundColor: yaInscrito ? '#f3f4f6' : isSelected ? '#f0fdf4' : '#fff',
                                      cursor: yaInscrito || isSelected ? 'default' : 'pointer',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '8px',
                                      opacity: yaInscrito ? 0.6 : 1,
                                    }}
                                    onClick={() => !isSelected && !yaInscrito && agregarParticipante(participante)}
                                  >
                                    <div>
                                      <div style={{ fontWeight: '500', fontSize: '13px' }}>{participante.NombreCompleto}</div>
                                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                        {participante.Empresa && `${participante.Empresa}`}
                                        {participante.NumeroEmpleado && ` · Emp: ${participante.NumeroEmpleado}`}
                                      </div>
                                    </div>
                                    {yaInscrito
                                      ? <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>Ya inscrito</span>
                                      : isSelected
                                        ? <span style={{ fontSize: '12px', color: '#16a34a', whiteSpace: 'nowrap' }}>✓ Agregado</span>
                                        : <span style={{ fontSize: '12px', color: '#2563eb', whiteSpace: 'nowrap' }}>+ Agregar</span>
                                    }
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {!alLimite && searchParticipantesInput.length < 2 && (
                      <p style={{ fontSize: '13px', color: '#9ca3af', margin: '8px 0 12px' }}>
                        Escribe al menos 2 caracteres para buscar.
                      </p>
                    )}

                    {empleadosSeleccionados.length > 0 && (
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                          Participantes seleccionados:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                          {empleadosSeleccionados.map((p, index) => {
                            const k = getParticipanteKey(p)
                            return (
                              <div
                                key={k}
                                style={{
                                  padding: '7px 12px',
                                  backgroundColor: '#f9fafb',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '13px',
                                }}
                              >
                                <span><strong style={{ color: '#6b7280', marginRight: '6px' }}>{index + 1}.</strong>{p.NombreCompleto}</span>
                                <button type="button" className="icon-button" onClick={() => quitarParticipante(k)} title="Quitar">✕</button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="primary-button" onClick={() => setModalParticipantesOpen(false)}>
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Modal de verificación de reinscripción */}
          {modalVerificacionOpen && verificacionResult && (
            <div className="modal-overlay" onClick={() => setModalVerificacionOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
                <div className="modal-header">
                  <h2>Verificación de inscripción</h2>
                  <button className="icon-button" onClick={() => setModalVerificacionOpen(false)}>✕</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {verificacionResult.bloqueados.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ color: '#dc2626', fontSize: 14, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        No se pueden inscribir ({verificacionResult.bloqueados.length})
                      </h4>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>Ya completaron este curso y no pueden reinscribirse.</p>
                      {verificacionResult.bloqueados.map((b, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{b.NombreCompleto} <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>({b.NumeroEmpleado})</span></div>
                          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>{b.razon}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {verificacionResult.advertencias.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ color: '#d97706', fontSize: 14, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        Reinscripción ({verificacionResult.advertencias.length})
                      </h4>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>Estos participantes estaban inscritos pero no completaron el curso. Al confirmar, se darán de baja del curso anterior y se inscribirán en el nuevo.</p>
                      {verificacionResult.advertencias.map((a, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.NombreCompleto} <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>({a.NumeroEmpleado})</span></div>
                          <div style={{ fontSize: 12, color: '#d97706', marginTop: 2 }}>{a.razon}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {verificacionResult.nuevos.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ color: '#16a34a', fontSize: 14, margin: '0 0 8px' }}>
                        Nuevos ({verificacionResult.nuevos.length})
                      </h4>
                      {verificacionResult.nuevos.map((n, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{n.NombreCompleto} <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>({n.NumeroEmpleado})</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => setModalVerificacionOpen(false)}>Cancelar</button>
                  {(verificacionResult.nuevos.length > 0 || verificacionResult.advertencias.length > 0) && (
                    <button type="button" className="primary-button" onClick={handleConfirmarReinscripcion}>
                      Inscribir {verificacionResult.nuevos.length + verificacionResult.advertencias.length} participante(s)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inscritos list */}
          {cursoInscripcion && (
            <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
                Participantes inscritos — {cursoSel ? cursoLabel(cursoSel) : ''}
              </h3>
              {loadingInscritos ? <p style={{ color: '#6b7280' }}>Cargando...</p> : (
                <div className="table-wrap">
                  <table className="participants-table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr><th>Participante</th><th>No. Empleado</th><th>Empresa</th><th>Fecha inscripción</th><th>Asistencia</th><th></th></tr>
                    </thead>
                    <tbody>
                      {inscritosLista.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 24, color: '#6b7280', textAlign: 'center' }}>Sin participantes inscritos.</td></tr>
                      ) : inscritosLista.map(i => (
                        <tr key={i.InscripcionId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                                {i.NombreCompleto?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{i.NombreCompleto}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{i.Correo || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.NumeroEmpleado}</td>
                          <td style={{ fontSize: 12 }}>{i.Empresa || '-'}</td>
                          <td style={{ fontSize: 12 }}>{fmtFecha(i.FechaInscripcion)}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: (i.SesionesAsistidas || 0) > 0 ? '#16a34a' : '#6b7280' }}>
                              {i.SesionesAsistidas || 0}/{i.TotalSesiones || 0}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}> sesiones</span>
                          </td>
                          <td>
                            <button className="ghost-button" style={{ fontSize: 12, padding: '3px 10px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDarBaja(i.InscripcionId)}>
                              Dar de baja
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        )
      })()}

      {/* ═══ TAB ASISTENCIAS ═══ */}
      {tab === 'asistencias' && (() => {
        const nombresUnicos = [...new Set(cursos.map(c => c.Nombre))].sort()
        const cursosDelNombre = filtroNombreCurso ? cursos.filter(c => c.Nombre === filtroNombreCurso) : []
        const generaciones = cursosDelNombre.map(c => ({ id: c.CursoAcademiaId, gen: c.Generacion || '' }))
        return (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Curso</label>
              <select className="form-control" value={filtroNombreCurso} onChange={e => {
                const nombre = e.target.value
                setFiltroNombreCurso(nombre)
                setFiltroGeneracion('')
                const matches = nombre ? cursos.filter(c => c.Nombre === nombre) : []
                if (matches.length === 1) {
                  setCursoAsistencia(String(matches[0].CursoAcademiaId))
                } else {
                  setCursoAsistencia('')
                }
              }} style={{ minWidth: 220, fontSize: 13 }}>
                <option value="">Seleccionar curso...</option>
                {nombresUnicos.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {filtroNombreCurso && generaciones.length > 1 && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Generación</label>
                <select className="form-control" value={filtroGeneracion} onChange={e => {
                  const gen = e.target.value
                  setFiltroGeneracion(gen)
                  const match = cursosDelNombre.find(c => (c.Generacion || '') === gen)
                  setCursoAsistencia(match ? String(match.CursoAcademiaId) : '')
                }} style={{ minWidth: 180, fontSize: 13 }}>
                  <option value="">Seleccionar generación...</option>
                  {generaciones.map(g => (
                    <option key={g.id} value={g.gen}>{g.gen || '(Sin generación)'}</option>
                  ))}
                </select>
              </div>
            )}
            {filtroNombreCurso && generaciones.length > 1 && !filtroGeneracion && (
              <span style={{ fontSize: 12, color: '#d97706', alignSelf: 'center', paddingBottom: 6 }}>
                Hay {generaciones.length} generaciones — selecciona una
              </span>
            )}
          </div>

          {loadingAsistencias && <p style={{ color: '#6b7280' }}>Cargando asistencias...</p>}

          {asistenciasData && !loadingAsistencias && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Resumen del curso</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#f3f4f6', borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Inscritos</div>
                      <div style={{ fontWeight: 700 }}>{asistenciasData.inscritos.length}</div>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Sesiones</div>
                      <div style={{ fontWeight: 700 }}>{asistenciasData.sesiones.length}</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Por sesión</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {asistenciasData.sesiones.map(s => {
                      const asistentes = asistenciasData.asistencias.filter(a => a.SesionId === s.SesionId).length
                      const total = asistenciasData.inscritos.length
                      const pct = total > 0 ? Math.round((asistentes / total) * 100) : 0
                      const pasada = new Date(s.Fecha) <= new Date()
                      return (
                        <div key={s.SesionId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--border, #e5e7eb)', borderRadius: 6, fontSize: 12, opacity: pasada ? 1 : 0.5 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                            {s.NumeroSesion}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{fmtFecha(s.Fecha)}{s.HoraInicio ? ` · ${s.HoraInicio}` : ''}</div>
                            <div style={{ color: '#9ca3af', fontSize: 11 }}>{pasada ? `${asistentes} de ${total} asistieron` : 'Pendiente'}</div>
                          </div>
                          {pasada && <span style={{ fontFamily: 'monospace', fontWeight: 700, color: pct >= 80 ? '#16a34a' : '#d97706', fontSize: 12 }}>{pct}%</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
                      Matriz de Asistencia
                    </h3>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                      {asistenciasData.sesiones.length} sesiones programadas · Mínimo {asistenciasData.porcentajeMin}% de asistencia para constancia
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
                    onClick={() => setModalListaAsistOpen(true)}
                  >
                    ↓ Descargar Lista de Asistencia
                  </button>
                </div>
                <div style={{ height: 12 }} />

                <div style={{ overflowX: 'auto' }}>
                  <table className="participants-table" style={{ fontSize: 12, minWidth: 800 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', minWidth: 160 }}>Participante</th>
                        <th style={{ textAlign: 'left', minWidth: 100 }}>Empresa</th>
                        <th style={{ textAlign: 'left', minWidth: 100 }}>Terminal</th>
                        <th style={{ textAlign: 'left', minWidth: 140 }}>Correo</th>
                        {asistenciasData.sesiones.map(s => (
                          <th key={s.SesionId} style={{ textAlign: 'center' }}>
                            S{s.NumeroSesion}<br />
                            <span style={{ fontWeight: 400, fontSize: 10, textTransform: 'none' }}>{fmtFecha(s.Fecha)}</span>
                          </th>
                        ))}
                        <th style={{ textAlign: 'center' }}>%</th>
                        <th style={{ textAlign: 'center' }}>Constancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistenciasData.inscritos.map(insc => {
                        const totalSesiones = asistenciasData.sesiones.length
                        const asistidas = asistenciasData.sesiones.filter(s =>
                          asistenciasData.asistencias.some(a => a.SesionId === s.SesionId && a.InscripcionId === insc.InscripcionId)
                        ).length
                        const sesionesPasadas = asistenciasData.sesiones.filter(s => new Date(s.Fecha) <= new Date()).length
                        const pct = sesionesPasadas > 0 ? Math.round((asistidas / sesionesPasadas) * 100) : 0
                        const acreedor = totalSesiones > 0 && sesionesPasadas === totalSesiones && pct >= asistenciasData.porcentajeMin
                        const enRiesgo = sesionesPasadas > 0 && sesionesPasadas < totalSesiones && pct < asistenciasData.porcentajeMin
                        const noAcreedor = sesionesPasadas === totalSesiones && pct < asistenciasData.porcentajeMin

                        return (
                          <tr key={insc.InscripcionId}>
                            <td style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 600 }}>{insc.NombreCompleto}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{insc.NumeroEmpleado}</div>
                            </td>
                            <td style={{ textAlign: 'left', fontSize: 11 }}>{insc.Empresa || '-'}</td>
                            <td style={{ textAlign: 'left', fontSize: 11 }}>{insc.Terminal || '-'}</td>
                            <td style={{ textAlign: 'left', fontSize: 11 }}>{insc.Correo || '-'}</td>
                            {asistenciasData.sesiones.map(s => {
                              const presente = asistenciasData.asistencias.some(a => a.SesionId === s.SesionId && a.InscripcionId === insc.InscripcionId)
                              const pasada = new Date(s.Fecha) <= new Date()
                              return (
                                <td key={s.SesionId} style={{ textAlign: 'center' }}>
                                  {pasada ? (
                                    <span onClick={() => handleToggleAsistencia(s.SesionId, insc.InscripcionId, presente)}
                                      title={presente ? 'Clic para quitar asistencia' : 'Clic para marcar asistencia'}
                                      style={{
                                        display: 'inline-block', width: 22, height: 22, borderRadius: '50%', lineHeight: '22px', fontSize: 11, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
                                        background: presente ? '#f0fdf4' : '#fef2f2',
                                        color: presente ? '#16a34a' : '#dc2626',
                                      }}>
                                      {presente ? 'A' : 'F'}
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', lineHeight: '22px', fontSize: 11, color: '#9ca3af', border: '1px dashed #d1d5db', textAlign: 'center' }}>—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: pct >= asistenciasData.porcentajeMin ? '#16a34a' : pct > 0 ? '#d97706' : '#6b7280' }}>
                              {pct}%
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                background: acreedor ? '#f0fdf4' : noAcreedor ? '#fef2f2' : enRiesgo ? '#fef3c7' : '#f3f4f6',
                                color: acreedor ? '#16a34a' : noAcreedor ? '#dc2626' : enRiesgo ? '#d97706' : '#9ca3af',
                              }}>
                                {acreedor ? 'Acreedor' : noAcreedor ? 'No acreedor' : enRiesgo ? 'En riesgo' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!cursoAsistencia && !loadingAsistencias && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>📊</div>
              <p>Selecciona un curso{filtroNombreCurso && cursosDelNombre.length > 1 ? ' y generación' : ''} para ver la matriz de asistencia</p>
            </div>
          )}
        </div>
        )
      })()}

      {/* Modal Descargar Lista de Asistencia */}
      {modalListaAsistOpen && asistenciasData && (() => {
        const cursoObj = cursos.find(c => String(c.CursoAcademiaId) === cursoAsistencia)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setModalListaAsistOpen(false)}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '80vh', overflow: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Descargar Lista de Asistencia</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                Selecciona la sesión para generar el PDF con el formato FRH02-04.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {asistenciasData.sesiones.map(s => {
                  const asistentes = asistenciasData.asistencias.filter(a => a.SesionId === s.SesionId).length
                  const total = asistenciasData.inscritos.length
                  return (
                    <button key={s.SesionId}
                      onClick={async () => {
                        await generarListaAsistenciaPDF({
                          cursoNombre: cursoObj?.Nombre || '',
                          generacion: cursoObj?.Generacion || '',
                          sesion: s,
                          inscritos: asistenciasData.inscritos,
                          instructor: cursoObj?.Instructor || '',
                        })
                        setModalListaAsistOpen(false)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, background: '#fff',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseOut={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        S{s.NumeroSesion}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtFecha(s.Fecha)}{s.HoraInicio ? ` · ${s.HoraInicio}` : ''}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{asistentes} de {total} asistentes</div>
                      </div>
                      <span style={{ fontSize: 18, color: '#2563eb' }}>↓</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="secondary-button" style={{ fontSize: 13 }} onClick={() => setModalListaAsistOpen(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ TAB QR ═══ */}
      {tab === 'qr' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Registro de Asistencia por QR</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Genera un código QR por sesión. Los participantes lo escanean con su celular, ingresan su número de empleado, confirman sus datos y la fecha se valida automáticamente.
            </p>

            {(() => {
              const cursosNoCompletados = cursos.filter(c => c.Estado !== 'Completado')
              const nombresUnicosQR = [...new Set(cursosNoCompletados.map(c => c.Nombre))].sort()
              const cursosDelNombreQR = filtroNombreCursoQR ? cursosNoCompletados.filter(c => c.Nombre === filtroNombreCursoQR) : []
              const generacionesQR = cursosDelNombreQR.map(c => ({ id: c.CursoAcademiaId, gen: c.Generacion || '' }))
              return (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Curso</label>
                  <select className="form-control" value={filtroNombreCursoQR} onChange={e => {
                    const nombre = e.target.value
                    setFiltroNombreCursoQR(nombre)
                    setFiltroGeneracionQR('')
                    const matches = nombre ? cursosNoCompletados.filter(c => c.Nombre === nombre) : []
                    if (matches.length === 1) {
                      setCursoQR(String(matches[0].CursoAcademiaId))
                    } else {
                      setCursoQR('')
                    }
                  }} style={{ width: '100%', fontSize: 13 }}>
                    <option value="">Seleccionar curso...</option>
                    {nombresUnicosQR.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {filtroNombreCursoQR && generacionesQR.length > 1 && (
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Generación</label>
                    <select className="form-control" value={filtroGeneracionQR} onChange={e => {
                      const gen = e.target.value
                      setFiltroGeneracionQR(gen)
                      const match = cursosDelNombreQR.find(c => (c.Generacion || '') === gen)
                      setCursoQR(match ? String(match.CursoAcademiaId) : '')
                    }} style={{ width: '100%', fontSize: 13 }}>
                      <option value="">Seleccionar generación...</option>
                      {generacionesQR.map(g => (
                        <option key={g.id} value={g.gen}>{g.gen || '(Sin generación)'}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Sesión</label>
                  <select className="form-control" value={sesionQR} onChange={e => setSesionQR(e.target.value)} style={{ width: '100%', fontSize: 13 }} disabled={!cursoQR}>
                    <option value="">Seleccionar sesión...</option>
                    {sesionesQR.map(s => (
                      <option key={s.SesionId} value={s.SesionId}>Sesión {s.NumeroSesion} — {fmtFecha(s.Fecha)}{s.HoraInicio ? `, ${s.HoraInicio}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              )
            })()}

            {sesionQR && (
              <div style={{ textAlign: 'center', padding: 24, border: '2px dashed var(--border, #e5e7eb)', borderRadius: 8 }}>
                <div style={{ padding: 16, background: '#fff', display: 'inline-block', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                    alt="QR" style={{ width: 180, height: 180, display: 'block' }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  Sesión {sesionesQR.find(s => s.SesionId === Number(sesionQR))?.NumeroSesion} — {cursoLabel(cursos.find(c => c.CursoAcademiaId === Number(cursoQR)))}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  {fmtFecha(sesionesQR.find(s => s.SesionId === Number(sesionQR))?.Fecha)}
                  {sesionesQR.find(s => s.SesionId === Number(sesionQR))?.Ubicacion ? ` · ${sesionesQR.find(s => s.SesionId === Number(sesionQR))?.Ubicacion}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12, wordBreak: 'break-all' }}>
                  {qrUrl}
                </div>
              </div>
            )}

            {!sesionQR && (
              <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>📱</div>
                <p>Selecciona un curso y sesión para generar el QR</p>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16, marginTop: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Flujo del participante al escanear</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { num: 1, title: 'Escanea el QR', desc: 'Con la cámara del celular en el aula', color: '#2563eb', bg: '#eff6ff' },
                { num: 2, title: 'Ingresa su No. Empleado', desc: 'Se muestran sus datos para confirmar', color: '#2563eb', bg: '#eff6ff' },
                { num: 3, title: 'Valida fecha y curso', desc: 'El sistema verifica inscripción y fecha', color: '#2563eb', bg: '#eff6ff' },
                { num: 4, title: 'Asistencia registrada', desc: 'Se guarda automáticamente en la matriz', color: '#16a34a', bg: '#f0fdf4' },
              ].map(s => (
                <div key={s.num} style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontWeight: 700, fontSize: 16 }}>
                    {s.num}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB HISTÓRICO ═══ */}
      {tab === 'historico' && (() => {
        const filtered = historicoData.filter(r => {
          if (filtroHistEmpresa && r.Empresa !== filtroHistEmpresa) return false
          if (filtroHistTerminal && r.Terminal !== filtroHistTerminal) return false
          if (filtroHistPlaza && r.Plaza !== filtroHistPlaza) return false
          if (filtroHistArea && r.Area !== filtroHistArea) return false
          if (filtroHistCurso && r.CursoNombre !== filtroHistCurso) return false
          if (filtroHistBuscar) {
            const q = filtroHistBuscar.toLowerCase()
            if (!(r.NombreCompleto || '').toLowerCase().includes(q) && !(r.NumeroEmpleado || '').includes(q)) return false
          }
          return true
        })
        const uniqueVals = (key) => [...new Set(historicoData.map(r => r[key]).filter(Boolean))].sort()

        function descargarCSV() {
          const headers = ['No. Empleado','Nombre','Empresa','Terminal','Plaza','Área','Correo','Curso','Generación','Instructor','Modalidad','Sesiones Asistidas','Total Sesiones','% Asistencia','Constancia']
          const rows = filtered.map(r => {
            const pct = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : 0
            const constancia = r.TotalSesiones > 0 && pct >= r.PorcentajeMinAsistencia ? 'Acreedor' : 'Pendiente'
            return [r.NumeroEmpleado, r.NombreCompleto, r.Empresa, r.Terminal, r.Plaza, r.Area, r.Correo, r.CursoNombre, r.Generacion, r.Instructor, r.Modalidad, r.SesionesAsistidas, r.TotalSesiones, pct + '%', constancia]
          })
          const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
          const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'Historico_Academia.csv'
          a.click()
          URL.revokeObjectURL(url)
        }

        return (
          <div style={{ padding: '16px 0' }}>
            <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Histórico de Cursos</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{filtered.length} registro(s){historicoData.length !== filtered.length ? ` de ${historicoData.length}` : ''}</p>
                </div>
                <button className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }} onClick={descargarCSV} disabled={filtered.length === 0}>
                  ↓ Descargar CSV
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <input
                  type="text" placeholder="Buscar por nombre o No. empleado..."
                  value={filtroHistBuscar} onChange={e => setFiltroHistBuscar(e.target.value)}
                  style={{ flex: '1 1 200px', minWidth: 180, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                />
                <select value={filtroHistCurso} onChange={e => setFiltroHistCurso(e.target.value)} style={{ minWidth: 140, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todos los cursos</option>
                  {uniqueVals('CursoNombre').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistEmpresa} onChange={e => setFiltroHistEmpresa(e.target.value)} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las empresas</option>
                  {uniqueVals('Empresa').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistTerminal} onChange={e => setFiltroHistTerminal(e.target.value)} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las terminales</option>
                  {uniqueVals('Terminal').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistPlaza} onChange={e => setFiltroHistPlaza(e.target.value)} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las plazas</option>
                  {uniqueVals('Plaza').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistArea} onChange={e => setFiltroHistArea(e.target.value)} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las áreas</option>
                  {uniqueVals('Area').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {loadingHistorico ? <p style={{ color: '#6b7280' }}>Cargando histórico...</p> : (
              <div className="table-wrap">
                <table className="participants-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: 160 }}>Participante</th>
                      <th style={{ textAlign: 'left' }}>Empresa</th>
                      <th style={{ textAlign: 'left' }}>Terminal</th>
                      <th style={{ textAlign: 'left' }}>Plaza</th>
                      <th style={{ textAlign: 'left' }}>Área</th>
                      <th style={{ textAlign: 'left' }}>Curso</th>
                      <th style={{ textAlign: 'center' }}>Generación</th>
                      <th style={{ textAlign: 'center' }}>Asistencia</th>
                      <th style={{ textAlign: 'center' }}>Constancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>Sin registros</td></tr>
                    ) : filtered.map(r => {
                      const pct = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : 0
                      const acreedor = r.TotalSesiones > 0 && pct >= r.PorcentajeMinAsistencia
                      return (
                        <tr key={r.InscripcionId}>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{r.NombreCompleto}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.NumeroEmpleado}</div>
                          </td>
                          <td style={{ fontSize: 11 }}>{r.Empresa || '-'}</td>
                          <td style={{ fontSize: 11 }}>{r.Terminal || '-'}</td>
                          <td style={{ fontSize: 11 }}>{r.Plaza || '-'}</td>
                          <td style={{ fontSize: 11 }}>{r.Area || '-'}</td>
                          <td style={{ fontSize: 11, fontWeight: 600 }}>{r.CursoNombre}</td>
                          <td style={{ textAlign: 'center', fontSize: 11 }}>{r.Generacion || '-'}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: pct >= r.PorcentajeMinAsistencia ? '#16a34a' : pct > 0 ? '#d97706' : '#6b7280' }}>
                            {r.SesionesAsistidas}/{r.TotalSesiones} ({pct}%)
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                              background: acreedor ? '#f0fdf4' : '#f3f4f6',
                              color: acreedor ? '#16a34a' : '#9ca3af',
                            }}>
                              {acreedor ? 'Acreedor' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* ═══ SIDE PANEL: Detalle curso ═══ */}
      {detalleCurso && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 900, backdropFilter: 'blur(1px)' }} onClick={() => setDetalleCurso(null)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(580px, 100vw)', background: '#fff', boxShadow: '-6px 0 32px rgba(0,0,0,0.14)', zIndex: 901, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.22s ease' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle del curso</div>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700 }}>{cursoLabel(detalleCurso.curso)}</h2>
                  <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: 13 }}>{detalleCurso.curso.Instructor || 'Sin instructor'} · {detalleCurso.curso.Modalidad}</p>
                </div>
                <button onClick={() => setDetalleCurso(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { label: 'Modalidad', value: detalleCurso.curso.Modalidad },
                  { label: 'Capacidad', value: `${detalleCurso.inscritos.length} / ${detalleCurso.curso.Capacidad}` },
                  { label: 'Sesiones', value: `${detalleCurso.sesiones.length} sesiones` },
                  { label: 'Ubicación', value: detalleCurso.curso.Ubicacion || '-' },
                  { label: 'Min. Asistencia', value: `${detalleCurso.curso.PorcentajeMinAsistencia}%` },
                  { label: 'Estado', value: detalleCurso.curso.Estado },
                ].map(d => (
                  <div key={d.label} style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{d.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.value}</div>
                  </div>
                ))}
              </div>

              {detalleCurso.curso.Descripcion && (
                <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Descripción</div>
                  <div style={{ fontSize: 13 }}>{detalleCurso.curso.Descripcion}</div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Sesiones programadas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detalleCurso.sesiones.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin sesiones programadas</p>
                  ) : detalleCurso.sesiones.map(s => {
                    const pasada = new Date(s.Fecha) < new Date()
                    const hoy = new Date(s.Fecha).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                    return (
                      <div key={s.SesionId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, borderColor: hoy ? '#2563eb' : '#e5e7eb' }}>
                        <span style={{ width: 26, height: 26, borderRadius: '50%', background: hoy ? '#2563eb' : '#eff6ff', color: hoy ? '#fff' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {s.NumeroSesion}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtFecha(s.Fecha)}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>
                            {s.HoraInicio ? `${s.HoraInicio}${s.HoraFin ? ` — ${s.HoraFin}` : ''}` : ''}
                            {s.Ubicacion ? ` · ${s.Ubicacion}` : ''}
                          </div>
                        </div>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                          background: pasada ? '#f3f4f6' : hoy ? '#eff6ff' : '#f3f4f6',
                          color: pasada ? '#6b7280' : hoy ? '#2563eb' : '#9ca3af',
                        }}>
                          {pasada ? 'Realizada' : hoy ? 'Hoy' : 'Próxima'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Participantes ({detalleCurso.inscritos.length})
                </div>
                {detalleCurso.inscritos.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin participantes inscritos</p>
                ) : detalleCurso.inscritos.map(i => (
                  <div key={i.InscripcionId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {i.NombreCompleto?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{i.NombreCompleto}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{i.NumeroEmpleado} · {i.Empresa || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', gap: 8 }}>
              <button className="ghost-button" style={{ flex: 1 }} onClick={() => { setCursoInscripcion(String(detalleCurso.curso.CursoAcademiaId)); setTab('inscripciones'); setDetalleCurso(null) }}>Inscribir participantes</button>
              <button className="primary-button" style={{ flex: 1 }} onClick={() => { setEditandoCurso(detalleCurso.curso); setShowNuevoCurso(true); setDetalleCurso(null) }}>Editar curso</button>
            </div>
          </div>
        </>
      )}

      {/* ═══ MODAL: Nuevo/Editar Curso ═══ */}
      {showNuevoCurso && (
        <NuevoCursoModal
          cursoInicial={editandoCurso}
          onClose={() => { setShowNuevoCurso(false); setEditandoCurso(null) }}
          onSaved={() => { setShowNuevoCurso(false); setEditandoCurso(null); loadCursos() }}
        />
      )}

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </section>
  )
}

function NuevoCursoModal({ cursoInicial, onClose, onSaved }) {
  const isEdit = Boolean(cursoInicial)
  const [nombre, setNombre] = useState(cursoInicial?.Nombre || '')
  const [descripcion, setDescripcion] = useState(cursoInicial?.Descripcion || '')
  const [instructor, setInstructor] = useState(cursoInicial?.Instructor || '')
  const [modalidad, setModalidad] = useState(cursoInicial?.Modalidad || 'Presencial')
  const [generacion, setGeneracion] = useState(cursoInicial?.Generacion || '')
  const [ubicacion, setUbicacion] = useState(cursoInicial?.Ubicacion || '')
  const [capacidad, setCapacidad] = useState(String(cursoInicial?.Capacidad || 25))
  const [pctMin, setPctMin] = useState(String(cursoInicial?.PorcentajeMinAsistencia || 75))
  const [estado, setEstado] = useState(cursoInicial?.Estado || 'Activo')
  const [sesiones, setSesiones] = useState([])
  const [saving, setSaving] = useState(false)

  const [catalogCursos, setCatalogCursos] = useState([])
  const [cursoSearch, setCursoSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const [catalogCoaches, setCatalogCoaches] = useState([])
  const [coachSearch, setCoachSearch] = useState('')
  const [showCoachDropdown, setShowCoachDropdown] = useState(false)

  useEffect(() => {
    getCursos().then(setCatalogCursos).catch(() => setCatalogCursos([]))
    getCoaches().then(setCatalogCoaches).catch(() => setCatalogCoaches([]))
  }, [])

  const coachesFiltrados = catalogCoaches.filter(c => {
    if (!coachSearch) return true
    return c.Nombre?.toLowerCase().includes(coachSearch.toLowerCase())
  })

  useEffect(() => {
    if (isEdit && cursoInicial?.CursoAcademiaId) {
      getAcademiaSesiones(cursoInicial.CursoAcademiaId).then(s => setSesiones(s.map(x => ({
        SesionId: x.SesionId, Fecha: x.Fecha ? new Date(x.Fecha).toISOString().split('T')[0] : '', HoraInicio: x.HoraInicio || '', HoraFin: x.HoraFin || '', Ubicacion: x.Ubicacion || '',
      })))).catch(() => {})
    }
  }, [isEdit, cursoInicial])

  const cursosFiltrados = catalogCursos.filter(c => {
    if (!cursoSearch) return true
    const q = cursoSearch.toLowerCase()
    return c.Nombre?.toLowerCase().includes(q) || c.TipoCurso?.toLowerCase().includes(q)
  })

  function selectCatalogCurso(c) {
    setNombre(c.Nombre)
    setDescripcion(c.Descripcion || '')
    setCursoSearch('')
    setShowDropdown(false)
    if (c.DuracionDefaultDias && sesiones.length === 0) {
      const dias = Number(c.DuracionDefaultDias) || 0
      if (dias > 0) {
        const nuevas = []
        const hoy = new Date()
        for (let i = 0; i < dias; i++) {
          const fecha = new Date(hoy)
          fecha.setDate(hoy.getDate() + i)
          nuevas.push({ Fecha: fecha.toISOString().split('T')[0], HoraInicio: '09:00', HoraFin: '13:00', Ubicacion: ubicacion })
        }
        setSesiones(nuevas)
      }
    }
  }

  function addSesion() {
    setSesiones(prev => [...prev, { Fecha: '', HoraInicio: '09:00', HoraFin: '13:00', Ubicacion: ubicacion }])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) { window.alert('El nombre es requerido'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await updateAcademiaCurso(cursoInicial.CursoAcademiaId, { Nombre: nombre, Descripcion: descripcion, Instructor: instructor, Modalidad: modalidad, Ubicacion: ubicacion, Capacidad: Number(capacidad), PorcentajeMinAsistencia: Number(pctMin), Estado: estado, Generacion: generacion || null })
        for (const s of sesiones) {
          if (s.SesionId) {
            await updateAcademiaSesion(s.SesionId, { Fecha: s.Fecha, HoraInicio: s.HoraInicio, HoraFin: s.HoraFin, Ubicacion: s.Ubicacion })
          } else if (s.Fecha) {
            await createAcademiaSesion(cursoInicial.CursoAcademiaId, { Fecha: s.Fecha, HoraInicio: s.HoraInicio, HoraFin: s.HoraFin, Ubicacion: s.Ubicacion })
          }
        }
      } else {
        const sesionesValidas = sesiones.filter(s => s.Fecha)
        await createAcademiaCurso({ Nombre: nombre, Descripcion: descripcion, Instructor: instructor, Modalidad: modalidad, Ubicacion: ubicacion, Capacidad: Number(capacidad), PorcentajeMinAsistencia: Number(pctMin), Generacion: generacion || null, sesiones: sesionesValidas })
      }
      onSaved()
    } catch (err) { window.alert('Error: ' + err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, 95vw)', maxHeight: '90vh', background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1001, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Editar curso' : 'Nuevo curso'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Curso (del catálogo) *</label>
              {!isEdit && catalogCursos.length > 0 ? (
                <>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      value={showDropdown ? cursoSearch : nombre}
                      onChange={e => { setCursoSearch(e.target.value); setNombre(e.target.value); setShowDropdown(true) }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Buscar en catálogo de cursos..."
                      required
                      style={{ width: '100%' }}
                    />
                    {nombre && !showDropdown && (
                      <button type="button" onClick={() => { setNombre(''); setCursoSearch(''); setShowDropdown(true) }}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>✕</button>
                    )}
                  </div>
                  {showDropdown && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 10, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                      {cursosFiltrados.length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: 13, color: '#9ca3af' }}>Sin resultados en el catálogo</div>
                      ) : cursosFiltrados.map(c => (
                        <div key={c.CursoId} onClick={() => selectCatalogCurso(c)}
                          style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{c.Nombre}</div>
                            {c.Descripcion && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{c.Descripcion}</div>}
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>
                              {c.TipoCurso || ''}{c.Horas ? ` · ${c.Horas}h` : ''}{c.DuracionDefaultDias ? ` · ${c.DuracionDefaultDias} día(s)` : ''}
                            </div>
                          </div>
                          {c.Costo > 0 && <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>${Number(c.Costo).toFixed(0)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required style={{ width: '100%' }} />
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Descripción</label>
                <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Generación</label>
                <input className="form-control" value={generacion} onChange={e => setGeneracion(e.target.value)} placeholder="Ej: Gen 1, 2024-B, Grupo A" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Instructor (del catálogo)</label>
                {catalogCoaches.length > 0 ? (
                  <>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        value={showCoachDropdown ? coachSearch : instructor}
                        onChange={e => { setCoachSearch(e.target.value); setInstructor(e.target.value); setShowCoachDropdown(true) }}
                        onFocus={() => setShowCoachDropdown(true)}
                        placeholder="Buscar coach..."
                        style={{ width: '100%' }}
                      />
                      {instructor && !showCoachDropdown && (
                        <button type="button" onClick={() => { setInstructor(''); setCoachSearch(''); setShowCoachDropdown(true) }}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>✕</button>
                      )}
                    </div>
                    {showCoachDropdown && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 10, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
                        {coachesFiltrados.length === 0 ? (
                          <div style={{ padding: '12px 14px', fontSize: 13, color: '#9ca3af' }}>Sin resultados</div>
                        ) : coachesFiltrados.map(c => (
                          <div key={c.CoachId} onClick={() => { setInstructor(c.Nombre); setCoachSearch(''); setShowCoachDropdown(false) }}
                            style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontWeight: 600 }}>{c.Nombre}</span>
                            {c.Costo > 0 && <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>${Number(c.Costo).toFixed(0)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <input className="form-control" value={instructor} onChange={e => setInstructor(e.target.value)} style={{ width: '100%' }} />
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Modalidad</label>
                <select className="form-control" value={modalidad} onChange={e => setModalidad(e.target.value)} style={{ width: '100%' }}>
                  <option>Presencial</option>
                  <option>En línea</option>
                  <option>Mixto</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Ubicación</label>
                <input className="form-control" value={ubicacion} onChange={e => setUbicacion(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Capacidad</label>
                <input className="form-control" type="number" value={capacidad} onChange={e => setCapacidad(e.target.value)} min={1} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>% Min. Asistencia</label>
                <input className="form-control" type="number" value={pctMin} onChange={e => setPctMin(e.target.value)} min={0} max={100} style={{ width: '100%' }} />
              </div>
            </div>
            {isEdit && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Estado</label>
                <select className="form-control" value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%' }}>
                  <option>Activo</option>
                  <option>Próximo</option>
                  <option>Completado</option>
                </select>
              </div>
            )}

            {/* Sesiones */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Sesiones ({sesiones.length})</label>
                <button type="button" className="ghost-button" style={{ fontSize: 12 }} onClick={addSesion}>+ Agregar sesión</button>
              </div>
              {sesiones.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#2563eb', flexShrink: 0 }}>{idx + 1}</span>
                  <input className="form-control" type="date" value={s.Fecha} onChange={e => { const n = [...sesiones]; n[idx] = { ...n[idx], Fecha: e.target.value }; setSesiones(n) }} style={{ flex: 1, fontSize: 12 }} />
                  <input className="form-control" type="time" value={s.HoraInicio} onChange={e => { const n = [...sesiones]; n[idx] = { ...n[idx], HoraInicio: e.target.value }; setSesiones(n) }} style={{ width: 90, fontSize: 12 }} />
                  <input className="form-control" type="time" value={s.HoraFin} onChange={e => { const n = [...sesiones]; n[idx] = { ...n[idx], HoraFin: e.target.value }; setSesiones(n) }} style={{ width: 90, fontSize: 12 }} />
                  <button type="button" onClick={async () => {
                    if (s.SesionId) {
                      if (!window.confirm('¿Eliminar esta sesión?')) return
                      try { await deleteAcademiaSesion(s.SesionId) } catch (err) { window.alert(err.message); return }
                    }
                    setSesiones(prev => prev.filter((_, i) => i !== idx))
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: 4 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </form>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear curso'}
          </button>
        </div>
      </div>
    </>
  )
}
