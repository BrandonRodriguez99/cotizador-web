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
  inscribirParticipantes,
  darDeBajaInscripcion,
  getAcademiaAsistencias,
  registrarAsistenciaManual,
  buscarEmpleadosAcademia,
} from './api'

const TABS = [
  { id: 'cursos', label: 'Cursos' },
  { id: 'inscripciones', label: 'Inscripciones' },
  { id: 'asistencias', label: 'Asistencias' },
  { id: 'qr', label: 'QR en Aula' },
]

function fmtFecha(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
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
  const [cursoInscripcion, setCursoInscripcion] = useState('')
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('')
  const [empleadosResultado, setEmpleadosResultado] = useState([])
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([])
  const [inscritosLista, setInscritosLista] = useState([])
  const [loadingInscritos, setLoadingInscritos] = useState(false)

  // asistencias
  const [cursoAsistencia, setCursoAsistencia] = useState('')
  const [asistenciasData, setAsistenciasData] = useState(null)
  const [loadingAsistencias, setLoadingAsistencias] = useState(false)

  // qr
  const [cursoQR, setCursoQR] = useState('')
  const [sesionQR, setSesionQR] = useState('')
  const [sesionesQR, setSesionesQR] = useState([])

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

  // search empleados
  useEffect(() => {
    if (busquedaEmpleado.length < 2) { setEmpleadosResultado([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await buscarEmpleadosAcademia(busquedaEmpleado)
        setEmpleadosResultado(r)
      } catch { setEmpleadosResultado([]) }
    }, 350)
    return () => clearTimeout(t)
  }, [busquedaEmpleado])

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

  async function handleInscribir() {
    if (!cursoInscripcion || empleadosSeleccionados.length === 0) return
    try {
      await inscribirParticipantes({ CursoAcademiaId: Number(cursoInscripcion), participantes: empleadosSeleccionados })
      setEmpleadosSeleccionados([])
      setBusquedaEmpleado('')
      const r = await getAcademiaInscritos(cursoInscripcion)
      setInscritosLista(r)
      loadCursos()
      window.alert('Participantes inscritos correctamente')
    } catch (err) {
      window.alert('Error: ' + err.message)
    }
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
                      <div style={{ fontWeight: 600 }}>{c.Nombre}</div>
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
                          if (!window.confirm(`¿Eliminar el curso "${c.Nombre}"?`)) return
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
      {tab === 'inscripciones' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Inscribir participantes a un curso</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Curso *</label>
                <select className="form-control" value={cursoInscripcion} onChange={e => { setCursoInscripcion(e.target.value); setEmpleadosSeleccionados([]) }} style={{ width: '100%', fontSize: 13 }}>
                  <option value="">Seleccionar curso...</option>
                  {cursos.filter(c => c.Estado === 'Activo' || c.Estado === 'Próximo').map(c => (
                    <option key={c.CursoAcademiaId} value={c.CursoAcademiaId}>
                      {c.Nombre} ({c.Capacidad - (c.Inscritos || 0)} lugares)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {cursoInscripcion && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Buscar colaborador (nombre, No. empleado o correo)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-control" style={{ flex: 1, fontSize: 13 }} placeholder="Ej: Juan Pérez, 10254, juan@empresa.com"
                      value={busquedaEmpleado} onChange={e => setBusquedaEmpleado(e.target.value)} />
                  </div>
                </div>

                {empleadosResultado.length > 0 && (
                  <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, overflow: 'hidden', marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
                    <table className="participants-table" style={{ fontSize: 12 }}>
                      <thead><tr><th style={{ width: 32 }}></th><th>Colaborador</th><th>No. Empleado</th><th>Empresa</th><th>Correo</th></tr></thead>
                      <tbody>
                        {empleadosResultado.map(e => {
                          const sel = empleadosSeleccionados.some(s => s.NumeroEmpleado === e.NumeroEmpleado)
                          return (
                            <tr key={e.NumeroEmpleado} style={{ cursor: 'pointer' }} onClick={() => {
                              if (sel) setEmpleadosSeleccionados(prev => prev.filter(s => s.NumeroEmpleado !== e.NumeroEmpleado))
                              else setEmpleadosSeleccionados(prev => [...prev, e])
                            }}>
                              <td><input type="checkbox" checked={sel} readOnly /></td>
                              <td style={{ fontWeight: 600 }}>{e.NombreCompleto}</td>
                              <td style={{ fontFamily: 'monospace' }}>{e.NumeroEmpleado}</td>
                              <td>{e.Empresa || '-'}</td>
                              <td style={{ color: '#6b7280' }}>{e.Correo || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {empleadosSeleccionados.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{empleadosSeleccionados.length} colaborador(es) seleccionado(s)</span>
                    <button className="primary-button" style={{ fontSize: 13 }} onClick={handleInscribir}>Inscribir seleccionados</button>
                  </div>
                )}
              </>
            )}
          </div>

          {cursoInscripcion && (
            <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
                Participantes inscritos — {cursos.find(c => c.CursoAcademiaId === Number(cursoInscripcion))?.Nombre || ''}
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
      )}

      {/* ═══ TAB ASISTENCIAS ═══ */}
      {tab === 'asistencias' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="form-control" value={cursoAsistencia} onChange={e => setCursoAsistencia(e.target.value)} style={{ maxWidth: 320, fontSize: 13 }}>
              <option value="">Seleccionar curso...</option>
              {cursos.map(c => <option key={c.CursoAcademiaId} value={c.CursoAcademiaId}>{c.Nombre}</option>)}
            </select>
          </div>

          {loadingAsistencias && <p style={{ color: '#6b7280' }}>Cargando asistencias...</p>}

          {asistenciasData && !loadingAsistencias && (
            <>
              <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
                  Matriz de Asistencia
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
                  {asistenciasData.sesiones.length} sesiones programadas · Mínimo {asistenciasData.porcentajeMin}% de asistencia para constancia
                </p>

                <div style={{ overflowX: 'auto' }}>
                  <table className="participants-table" style={{ fontSize: 12, minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', minWidth: 160 }}>Participante</th>
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

              {/* Session summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
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
            </>
          )}

          {!cursoAsistencia && !loadingAsistencias && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>📊</div>
              <p>Selecciona un curso para ver la matriz de asistencia</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB QR ═══ */}
      {tab === 'qr' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{ background: 'var(--surface, #f9fafb)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Registro de Asistencia por QR</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Genera un código QR por sesión. Los participantes lo escanean con su celular, ingresan su número de empleado, confirman sus datos y la fecha se valida automáticamente.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Curso</label>
                <select className="form-control" value={cursoQR} onChange={e => setCursoQR(e.target.value)} style={{ width: '100%', fontSize: 13 }}>
                  <option value="">Seleccionar curso...</option>
                  {cursos.filter(c => c.Estado !== 'Completado').map(c => (
                    <option key={c.CursoAcademiaId} value={c.CursoAcademiaId}>{c.Nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Sesión</label>
                <select className="form-control" value={sesionQR} onChange={e => setSesionQR(e.target.value)} style={{ width: '100%', fontSize: 13 }} disabled={!cursoQR}>
                  <option value="">Seleccionar sesión...</option>
                  {sesionesQR.map(s => (
                    <option key={s.SesionId} value={s.SesionId}>Sesión {s.NumeroSesion} — {fmtFecha(s.Fecha)}{s.HoraInicio ? `, ${s.HoraInicio}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {sesionQR && (
              <div style={{ textAlign: 'center', padding: 24, border: '2px dashed var(--border, #e5e7eb)', borderRadius: 8 }}>
                <div style={{ padding: 16, background: '#fff', display: 'inline-block', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                    alt="QR" style={{ width: 180, height: 180, display: 'block' }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  Sesión {sesionesQR.find(s => s.SesionId === Number(sesionQR))?.NumeroSesion} — {cursos.find(c => c.CursoAcademiaId === Number(cursoQR))?.Nombre}
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

      {/* ═══ SIDE PANEL: Detalle curso ═══ */}
      {detalleCurso && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 900, backdropFilter: 'blur(1px)' }} onClick={() => setDetalleCurso(null)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(580px, 100vw)', background: '#fff', boxShadow: '-6px 0 32px rgba(0,0,0,0.14)', zIndex: 901, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.22s ease' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle del curso</div>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700 }}>{detalleCurso.curso.Nombre}</h2>
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
  const [ubicacion, setUbicacion] = useState(cursoInicial?.Ubicacion || '')
  const [capacidad, setCapacidad] = useState(String(cursoInicial?.Capacidad || 25))
  const [pctMin, setPctMin] = useState(String(cursoInicial?.PorcentajeMinAsistencia || 75))
  const [estado, setEstado] = useState(cursoInicial?.Estado || 'Activo')
  const [sesiones, setSesiones] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && cursoInicial?.CursoAcademiaId) {
      getAcademiaSesiones(cursoInicial.CursoAcademiaId).then(s => setSesiones(s.map(x => ({
        SesionId: x.SesionId, Fecha: x.Fecha ? new Date(x.Fecha).toISOString().split('T')[0] : '', HoraInicio: x.HoraInicio || '', HoraFin: x.HoraFin || '', Ubicacion: x.Ubicacion || '',
      })))).catch(() => {})
    }
  }, [isEdit, cursoInicial])

  function addSesion() {
    setSesiones(prev => [...prev, { Fecha: '', HoraInicio: '09:00', HoraFin: '13:00', Ubicacion: ubicacion }])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) { window.alert('El nombre es requerido'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await updateAcademiaCurso(cursoInicial.CursoAcademiaId, { Nombre: nombre, Descripcion: descripcion, Instructor: instructor, Modalidad: modalidad, Ubicacion: ubicacion, Capacidad: Number(capacidad), PorcentajeMinAsistencia: Number(pctMin), Estado: estado })
        for (const s of sesiones) {
          if (s.SesionId) {
            await updateAcademiaSesion(s.SesionId, { Fecha: s.Fecha, HoraInicio: s.HoraInicio, HoraFin: s.HoraFin, Ubicacion: s.Ubicacion })
          } else if (s.Fecha) {
            await createAcademiaSesion(cursoInicial.CursoAcademiaId, { Fecha: s.Fecha, HoraInicio: s.HoraInicio, HoraFin: s.HoraFin, Ubicacion: s.Ubicacion })
          }
        }
      } else {
        const sesionesValidas = sesiones.filter(s => s.Fecha)
        await createAcademiaCurso({ Nombre: nombre, Descripcion: descripcion, Instructor: instructor, Modalidad: modalidad, Ubicacion: ubicacion, Capacidad: Number(capacidad), PorcentajeMinAsistencia: Number(pctMin), sesiones: sesionesValidas })
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
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Nombre del curso *</label>
              <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Descripción</label>
              <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Instructor</label>
                <input className="form-control" value={instructor} onChange={e => setInstructor(e.target.value)} style={{ width: '100%' }} />
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
