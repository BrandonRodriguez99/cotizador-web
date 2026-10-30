import { useState, useEffect, useCallback } from 'react'
import {
  getAcademiaDashboard,
  getAcademiaCursos,
  getAcademiaCursoDetalle,
  createAcademiaCurso,
  updateAcademiaCurso,
  toggleHabilitadoCurso,
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
  getAcademiaCalendario,
  searchParticipantes,
  getCursos,
  getCoaches,
  getSolicitudesCatalogo,
  createSolicitudCatalogo,
  aprobarSolicitudCatalogo,
  rechazarSolicitudCatalogo,
  getAcademiaUbits,
} from './api'
import { generarListaAsistenciaPDF } from './generarListaAsistencia'

const TABS_ALL = [
  { id: 'cursos',        label: 'Cursos' },
  { id: 'inscripciones', label: 'Inscripciones' },
  { id: 'asistencias',   label: 'Asistencias' },
  { id: 'solicitudes',   label: 'Solicitudes' },
  { id: 'historico',     label: 'Histórico' },
  { id: 'ubits',         label: 'Ubits' },
  { id: 'kardex',        label: 'Kardex' },
  { id: 'calendario',    label: 'Calendario' },
  { id: 'qr',            label: 'QR en Aula' },
]

const TABS_CAPACITACION = new Set(['cursos', 'inscripciones', 'asistencias', 'historico', 'ubits', 'kardex', 'calendario', 'solicitudes'])

// ── Calendario helpers ────────────────────────────────────────────────────────
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CURSO_COLORS = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
  { bg: '#f0fdf4', border: '#4ade80', text: '#166534' },
]
function cursoColor(id) { return CURSO_COLORS[id % CURSO_COLORS.length] }

function getDiasDelMes(year, month) {
  const primero = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  return { primero, total }
}
function padISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function fmtHora(h) {
  if (!h) return ''
  return h.substring(0, 5)
}

function fmtFecha(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function cursoLabel(c) {
  if (!c) return ''
  return c.Generacion ? `${c.Nombre} — ${c.Generacion}` : c.Nombre
}

export default function Academia({ usuario, activeTab }) {
  const esCapacitacion = usuario?.rol === 'capacitacion'
  const TABS = esCapacitacion
    ? TABS_ALL.filter(t => TABS_CAPACITACION.has(t.id))
    : TABS_ALL
  const [tab, setTab] = useState(activeTab || (esCapacitacion ? 'inscripciones' : 'cursos'))

  useEffect(() => {
    if (activeTab && TABS.some(t => t.id === activeTab)) setTab(activeTab)
  }, [activeTab])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(false)
  const [dashboard, setDashboard] = useState(null)
  const [detalleCurso, setDetalleCurso] = useState(null)
  const [showNuevoCurso, setShowNuevoCurso] = useState(false)
  const [editandoCurso, setEditandoCurso] = useState(null)
  const [convocandoCurso] = useState(null)

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

  // solicitudes catálogo
  const esAprobador = ['admin', 'academia'].includes(usuario?.rol)
  const [solicitudes, setSolicitudes] = useState([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [showSolicitudModal, setShowSolicitudModal] = useState(false)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [comentarioRechazo, setComentarioRechazo] = useState('')

  // calendario
  const hoy = new Date()
  const [calYear, setCalYear] = useState(hoy.getFullYear())
  const [calMonth, setCalMonth] = useState(hoy.getMonth())
  const [sesionesCalendario, setSesionesCalendario] = useState([])
  const [loadingCal, setLoadingCal] = useState(false)
  const [calEventoSel, setCalEventoSel] = useState(null)

  // historico
  const [historicoData, setHistoricoData] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [filtroHistEmpresa, setFiltroHistEmpresa] = useState('')
  const [filtroHistTerminal, setFiltroHistTerminal] = useState('')
  const [filtroHistPlaza, setFiltroHistPlaza] = useState('')
  const [filtroHistArea, setFiltroHistArea] = useState('')
  const [filtroHistBuscar, setFiltroHistBuscar] = useState('')
  const [filtroHistCurso, setFiltroHistCurso] = useState('')
  const [filtroHistTipo, setFiltroHistTipo] = useState('')
  const [historicoPagina, setHistoricoPagina] = useState(1)
  const HISTORICO_POR_PAGINA = 25

  // ubits
  const [ubitsData, setUbitsData] = useState([])
  const [loadingUbits, setLoadingUbits] = useState(false)
  const [filtroUbitsBuscar, setFiltroUbitsBuscar] = useState('')
  const [filtroUbitsPlan, setFiltroUbitsPlan] = useState('')
  const [filtroUbitsEstado, setFiltroUbitsEstado] = useState('')
  const [filtroUbitsEmpresa, setFiltroUbitsEmpresa] = useState('')
  const [filtroUbitsArea, setFiltroUbitsArea] = useState('')
  const [filtroUbitsTerminal, setFiltroUbitsTerminal] = useState('')
  const [filtroUbitsFormato, setFiltroUbitsFormato] = useState('')
  const [ubitsPagina, setUbitsPagina] = useState(1)
  const UBITS_POR_PAGINA = 30

  // kardex
  const [kardexBusqueda, setKardexBusqueda] = useState('')
  const [kardexEmpleado, setKardexEmpleado] = useState(null)
  const [kardexFiltroEstado, setKardexFiltroEstado] = useState('')
  const [kardexFiltroTipo, setKardexFiltroTipo] = useState('')

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

  function loadHistorico() {
    setLoadingHistorico(true)
    getAcademiaHistorico()
      .then(d => setHistoricoData(d))
      .catch(console.error)
      .finally(() => setLoadingHistorico(false))
  }

  useEffect(() => {
    if (tab !== 'historico' && tab !== 'kardex') return
    if (historicoData.length > 0) return
    loadHistorico()
  }, [tab])

  function loadCalendario() {
    setLoadingCal(true)
    getAcademiaCalendario()
      .then(d => setSesionesCalendario(d))
      .catch(console.error)
      .finally(() => setLoadingCal(false))
  }

  useEffect(() => {
    if (tab !== 'calendario') return
    if (sesionesCalendario.length > 0) return
    loadCalendario()
  }, [tab, sesionesCalendario.length])

  function loadSolicitudes() {
    setLoadingSolicitudes(true)
    getSolicitudesCatalogo().then(setSolicitudes).catch(console.error).finally(() => setLoadingSolicitudes(false))
  }

  useEffect(() => {
    if (tab === 'solicitudes') loadSolicitudes()
  }, [tab])

  function loadUbits() {
    setLoadingUbits(true)
    getAcademiaUbits()
      .then(d => setUbitsData(d))
      .catch(console.error)
      .finally(() => setLoadingUbits(false))
  }

  useEffect(() => {
    if (tab !== 'ubits' && tab !== 'kardex') return
    if (ubitsData.length > 0) return
    loadUbits()
  }, [tab])

  function actualizar() {
    if (tab === 'cursos' || tab === 'inscripciones' || tab === 'asistencias' || tab === 'qr') {
      loadCursos()
    } else if (tab === 'historico' || tab === 'kardex') {
      setHistoricoData([])
      loadHistorico()
    } else if (tab === 'calendario') {
      setSesionesCalendario([])
      loadCalendario()
    } else if (tab === 'solicitudes') {
      loadSolicitudes()
    } else if (tab === 'ubits') {
      setUbitsData([])
      loadUbits()
    }
  }

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
      loadHistorico()
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

  async function handleToggleHabilitado(e, c) {
    e.stopPropagation()
    const nuevoValor = c.Habilitado === false ? true : false
    try {
      await toggleHabilitadoCurso(c.CursoAcademiaId, nuevoValor)
      setCursos(prev => prev.map(x => x.CursoAcademiaId === c.CursoAcademiaId ? { ...x, Habilitado: nuevoValor } : x))
    } catch (err) { window.alert(err.message) }
  }

  async function convocarCurso(e, curso) {
    e.stopPropagation()
    const nombre = cursoLabel(curso)

    let inscritos = []
    let sesiones = []
    try { inscritos = await getAcademiaInscritos(curso.CursoAcademiaId) } catch (_) {}
    try { sesiones = await getAcademiaSesiones(curso.CursoAcademiaId) } catch (_) {}

    const correos = inscritos.filter(i => i.Correo).map(i => i.Correo)

    const fmtFecha = d => d ? String(d).slice(0, 10) : ''
    const fmtHora = h => h ? String(h).slice(0, 5) : ''

    let sesionesTexto = ''
    if (sesiones.length > 0) {
      sesionesTexto = '\nSesiones:\n' + sesiones.map(s =>
        `  • Sesión ${s.NumeroSesion}: ${fmtFecha(s.Fecha)}` +
        (s.HoraInicio ? `  ${fmtHora(s.HoraInicio)} – ${fmtHora(s.HoraFin)}` : '') +
        (s.Ubicacion ? `  (${s.Ubicacion})` : '')
      ).join('\n')
    } else {
      const fi = fmtFecha(curso.FechaInicio)
      const ff = fmtFecha(curso.FechaFin)
      if (fi) sesionesTexto = `\nFechas: ${fi}${ff && ff !== fi ? ' al ' + ff : ''}`
    }

    const asunto = encodeURIComponent(`Convocatoria: ${nombre}`)
    const cuerpo = encodeURIComponent(
      `Quedan convocados al curso ${nombre}.\n\n` +
      `Instructor: ${curso.Instructor || 'Por definir'}\n` +
      `Modalidad: ${curso.Modalidad || '—'}\n` +
      (curso.Ubicacion ? `Lugar: ${curso.Ubicacion}\n` : '') +
      sesionesTexto +
      `\n\nParticipantes inscritos: ${curso.Inscritos || 0}/${curso.Capacidad}`
    )
    const para = correos.join(';')
    window.location.href = `mailto:${para}?subject=${asunto}&body=${cuerpo}`
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
            <button className="ghost-button" onClick={actualizar} style={{ fontSize: 13 }}>Actualizar</button>
            {!esCapacitacion && (
              <button className="primary-button" onClick={() => { setShowNuevoCurso(true); setEditandoCurso(null) }} style={{ fontSize: 13 }}>
                + Nuevo curso
              </button>
            )}
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
            {t.id === 'solicitudes' && esAprobador && solicitudes.filter(s => s.Estado === 'Pendiente').length > 0 && (
              <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700, verticalAlign: 'middle' }}>
                {solicitudes.filter(s => s.Estado === 'Pendiente').length}
              </span>
            )}
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
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {c.TotalSesiones || 0} {(c.TotalSesiones || 0) === 1 ? 'sesión' : 'sesiones'}
                      {c.HorasPorSesion > 0 && <span style={{ color: '#2563eb', fontWeight: 600, marginLeft: 6 }}>· {fmtHoras(c.HorasPorSesion * 60 * (c.TotalSesiones || 0))}</span>}
                    </td>
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
                      {!esCapacitacion && (
                        <button
                          onClick={e => handleToggleHabilitado(e, c)}
                          title={c.Habilitado !== false ? 'Deshabilitar inscripciones' : 'Habilitar inscripciones'}
                          style={{
                            display: 'block', marginTop: 4, fontSize: 10, padding: '1px 8px', borderRadius: 999, cursor: 'pointer',
                            border: '1px solid', fontWeight: 700,
                            background: c.Habilitado !== false ? '#eff6ff' : '#fef2f2',
                            borderColor: c.Habilitado !== false ? '#93c5fd' : '#fca5a5',
                            color: c.Habilitado !== false ? '#2563eb' : '#dc2626',
                          }}
                        >
                          {c.Habilitado !== false ? '✓ Inscripciones ON' : '✗ Inscripciones OFF'}
                        </button>
                      )}
                      {esCapacitacion && c.Habilitado === false && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 10, color: '#dc2626', fontWeight: 700 }}>Sin inscripciones</span>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(c.Inscritos || 0) > 0 && (
                          <button
                            title={`Abrir correo para ${c.Inscritos} participante(s)`}
                            onClick={e => convocarCurso(e, c)}
                            disabled={convocandoCurso === c.CursoAcademiaId}
                            style={{
                              fontSize: 12, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                              border: `1px solid ${(c.Inscritos || 0) >= c.Capacidad ? '#f59e0b' : '#d1d5db'}`,
                              background: (c.Inscritos || 0) >= c.Capacidad ? '#fffbeb' : '#f9fafb',
                              color: (c.Inscritos || 0) >= c.Capacidad ? '#d97706' : '#6b7280',
                              fontWeight: (c.Inscritos || 0) >= c.Capacidad ? 700 : 400,
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            {convocandoCurso === c.CursoAcademiaId ? '...' : 'Convocar'}
                          </button>
                        )}
                        {!esCapacitacion && (
                          <>
                            <button className="ghost-button" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => { setEditandoCurso(c); setShowNuevoCurso(true) }}>Editar</button>
                            <button className="secondary-button" style={{ fontSize: 12, padding: '3px 10px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={async () => {
                              if (!window.confirm(`¿Eliminar el curso "${cursoLabel(c)}"?`)) return
                              try { await deleteAcademiaCurso(c.CursoAcademiaId); loadCursos() } catch (err) { window.alert(err.message) }
                            }}>Eliminar</button>
                          </>
                        )}
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
        const cursosDisponibles = cursos.filter(c => c.Habilitado !== false && (c.Estado === 'Activo' || c.Estado === 'Próximo'))
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 10px' }}>
                  <button className="primary-button" style={{ fontSize: 13 }} onClick={handleInscribir}>Inscribir {empleadosSeleccionados.length} participante(s)</button>
                </div>
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
                        <th style={{ textAlign: 'center' }}>Firma</th>
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
                            <td style={{ textAlign: 'center', minWidth: 120 }}>
                              {(() => {
                                const firmaVal = asistenciasData.asistencias.find(a => a.InscripcionId === insc.InscripcionId && a.Firma)?.Firma
                                return firmaVal
                                  ? <span style={{ fontSize: 12, color: '#1e3a5f', fontWeight: 500 }}>{firmaVal}</span>
                                  : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                              })()}
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
                          asistencias: asistenciasData.asistencias,
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
          if (filtroHistTipo && r.TipoCurso !== filtroHistTipo) return false
          if (filtroHistBuscar) {
            const q = filtroHistBuscar.toLowerCase()
            if (!(r.NombreCompleto || '').toLowerCase().includes(q) && !(r.NumeroEmpleado || '').includes(q)) return false
          }
          return true
        })
        const totalPaginas = Math.max(1, Math.ceil(filtered.length / HISTORICO_POR_PAGINA))
        const paginaActual = Math.min(historicoPagina, totalPaginas)
        const paginados = filtered.slice((paginaActual - 1) * HISTORICO_POR_PAGINA, paginaActual * HISTORICO_POR_PAGINA)
        const uniqueVals = (key) => [...new Set(historicoData.map(r => r[key]).filter(Boolean))].sort()

        function descargarCSV() {
          const headers = ['No. Empleado','Nombre','Empresa','Terminal','Plaza','Área','Correo','Tipo','Curso','Generación','Instructor','Modalidad','Sesiones Asistidas','Total Sesiones','% Asistencia','Horas Asistidas','Horas Totales','Constancia']
          const rows = filtered.map(r => {
            const pct = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : 0
            const esBaja = r.InscripcionActiva === false || r.InscripcionActiva === 0
            const constancia = esBaja ? 'Baja' : r.TotalSesiones > 0 && pct >= r.PorcentajeMinAsistencia ? 'Acreedor' : 'Pendiente'
            return [r.NumeroEmpleado, r.NombreCompleto, r.Empresa, r.Terminal, r.Plaza, r.Area, r.Correo, r.TipoCurso || '', r.CursoNombre, r.Generacion, r.Instructor, r.Modalidad, r.SesionesAsistidas, r.TotalSesiones, pct + '%', fmtHoras(r.MinutosAsistidos), fmtHoras(r.MinutosTotales), constancia]
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
                  value={filtroHistBuscar} onChange={e => { setFiltroHistBuscar(e.target.value); setHistoricoPagina(1) }}
                  style={{ flex: '1 1 200px', minWidth: 180, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                />
                <select value={filtroHistCurso} onChange={e => { setFiltroHistCurso(e.target.value); setHistoricoPagina(1) }} style={{ minWidth: 140, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todos los cursos</option>
                  {uniqueVals('CursoNombre').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistEmpresa} onChange={e => { setFiltroHistEmpresa(e.target.value); setHistoricoPagina(1) }} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las empresas</option>
                  {uniqueVals('Empresa').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistTerminal} onChange={e => { setFiltroHistTerminal(e.target.value); setHistoricoPagina(1) }} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las terminales</option>
                  {uniqueVals('Terminal').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistPlaza} onChange={e => { setFiltroHistPlaza(e.target.value); setHistoricoPagina(1) }} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las plazas</option>
                  {uniqueVals('Plaza').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistArea} onChange={e => { setFiltroHistArea(e.target.value); setHistoricoPagina(1) }} style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todas las áreas</option>
                  {uniqueVals('Area').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtroHistTipo} onChange={e => { setFiltroHistTipo(e.target.value); setHistoricoPagina(1) }} style={{ minWidth: 130, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Todos los tipos</option>
                  {uniqueVals('TipoCurso').map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {loadingHistorico ? <p style={{ color: '#6b7280' }}>Cargando histórico...</p> : (<>
              <div className="table-wrap">
                <table className="participants-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: 160 }}>Participante</th>
                      <th style={{ textAlign: 'left' }}>Empresa</th>
                      <th style={{ textAlign: 'left' }}>Terminal</th>
                      <th style={{ textAlign: 'left' }}>Plaza</th>
                      <th style={{ textAlign: 'left' }}>Área</th>
                      <th style={{ textAlign: 'left' }}>Tipo</th>
                      <th style={{ textAlign: 'left' }}>Curso</th>
                      <th style={{ textAlign: 'center' }}>Generación</th>
                      <th style={{ textAlign: 'center' }}>Asistencia</th>
                      <th style={{ textAlign: 'center' }}>Horas</th>
                      <th style={{ textAlign: 'center' }}>Constancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.length === 0 ? (
                      <tr><td colSpan={11} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>Sin registros</td></tr>
                    ) : paginados.map(r => {
                      const pct = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : 0
                      const acreedor = r.TotalSesiones > 0 && pct >= r.PorcentajeMinAsistencia
                      const esBaja = r.InscripcionActiva === false || r.InscripcionActiva === 0
                      const tipoColor = r.TipoCurso === 'Mandatorio' ? { bg: '#eff6ff', color: '#1d4ed8' } : r.TipoCurso === 'Extraordinario' ? { bg: '#fdf4ff', color: '#7e22ce' } : { bg: '#f3f4f6', color: '#6b7280' }
                      return (
                        <tr key={r.InscripcionId} style={{ opacity: esBaja ? 0.65 : 1 }}>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{r.NombreCompleto}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.NumeroEmpleado}</div>
                          </td>
                          <td style={{ fontSize: 11 }}>{r.Empresa || '-'}</td>
                          <td style={{ fontSize: 11 }}>{r.Terminal || '-'}</td>
                          <td style={{ fontSize: 11 }}>{r.Plaza || '-'}</td>
                          <td style={{ fontSize: 11 }}>{r.Area || '-'}</td>
                          <td style={{ fontSize: 11 }}>
                            {r.TipoCurso
                              ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: tipoColor.bg, color: tipoColor.color }}>{r.TipoCurso}</span>
                              : <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                          <td style={{ fontSize: 11, fontWeight: 600 }}>
                            {r.CursoNombre}
                            {esBaja && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 999, padding: '1px 6px' }}>Baja</span>}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 11 }}>{r.Generacion || '-'}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: pct >= r.PorcentajeMinAsistencia ? '#16a34a' : pct > 0 ? '#d97706' : '#6b7280' }}>
                            {r.SesionesAsistidas}/{r.TotalSesiones} ({pct}%)
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 11 }}>
                            <span style={{ fontWeight: 700, color: '#1e3a5f' }}>{fmtHoras(r.MinutosAsistidos)}</span>
                            {r.MinutosTotales > 0 && <span style={{ color: '#9ca3af' }}> / {fmtHoras(r.MinutosTotales)}</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {esBaja ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#dc2626' }}>Baja</span>
                            ) : (
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                background: acreedor ? '#f0fdf4' : '#f3f4f6',
                                color: acreedor ? '#16a34a' : '#9ca3af',
                              }}>
                                {acreedor ? 'Acreedor' : 'Pendiente'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    className="secondary-button" style={{ fontSize: 12, padding: '4px 10px' }}
                    disabled={paginaActual <= 1} onClick={() => setHistoricoPagina(paginaActual - 1)}
                  >Anterior</button>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) => typeof p === 'string'
                      ? <span key={`e${i}`} style={{ color: '#9ca3af', fontSize: 12 }}>...</span>
                      : <button key={p} onClick={() => setHistoricoPagina(p)} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db',
                          background: p === paginaActual ? '#2563eb' : '#fff',
                          color: p === paginaActual ? '#fff' : '#374151',
                          cursor: 'pointer', fontWeight: p === paginaActual ? 700 : 400
                        }}>{p}</button>
                    )}
                  <button
                    className="secondary-button" style={{ fontSize: 12, padding: '4px 10px' }}
                    disabled={paginaActual >= totalPaginas} onClick={() => setHistoricoPagina(paginaActual + 1)}
                  >Siguiente</button>
                  <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                    Página {paginaActual} de {totalPaginas}
                  </span>
                </div>
              )}
            </>)}
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
              {!esCapacitacion && (
                <button className="ghost-button" style={{ flex: 1 }} onClick={() => { setCursoInscripcion(String(detalleCurso.curso.CursoAcademiaId)); setTab('inscripciones'); setDetalleCurso(null) }}>Inscribir participantes</button>
              )}
              {!esCapacitacion && (
                <button className="primary-button" style={{ flex: 1 }} onClick={() => { setEditandoCurso(detalleCurso.curso); setShowNuevoCurso(true); setDetalleCurso(null) }}>Editar curso</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ TAB CALENDARIO ═══ */}
      {tab === 'calendario' && (() => {
        const { primero, total } = getDiasDelMes(calYear, calMonth)
        const hoyISO = padISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

        // Index sessions by date
        const byDate = {}
        sesionesCalendario.forEach(s => {
          if (!byDate[s.Fecha]) byDate[s.Fecha] = []
          byDate[s.Fecha].push(s)
        })

        // Unique course color mapping
        const cursoIds = [...new Set(sesionesCalendario.map(s => s.CursoAcademiaId))]
        const colorMap = {}
        cursoIds.forEach((id, i) => { colorMap[id] = CURSO_COLORS[i % CURSO_COLORS.length] })

        // Build grid cells: leading blanks + day cells
        const cells = []
        for (let i = 0; i < primero; i++) cells.push(null)
        for (let d = 1; d <= total; d++) cells.push(d)

        function prevMes() {
          if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
          else setCalMonth(m => m - 1)
        }
        function nextMes() {
          if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
          else setCalMonth(m => m + 1)
        }

        return (
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 180px)' }}>
            {loadingCal && <p style={{ color: '#9ca3af', fontSize: 13 }}>Cargando sesiones...</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button className="ghost-button" style={{ padding: '6px 14px' }} onClick={prevMes}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 16, minWidth: 180, textAlign: 'center' }}>
                {MESES[calMonth]} {calYear}
              </span>
              <button className="ghost-button" style={{ padding: '6px 14px' }} onClick={nextMes}>›</button>
              <button className="ghost-button" style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => { setCalYear(hoy.getFullYear()); setCalMonth(hoy.getMonth()) }}>
                Hoy
              </button>
              <button className="ghost-button" style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => { setSesionesCalendario([]); setLoadingCal(true); getAcademiaCalendario().then(d => setSesionesCalendario(d)).catch(console.error).finally(() => setLoadingCal(false)) }}>
                ↻ Actualizar
              </button>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1 }}>
              {/* Calendario grid */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: '#e5e7eb', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  {DIAS.map(d => (
                    <div key={d} style={{ background: '#f9fafb', padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                  ))}
                  {cells.map((d, i) => {
                    if (d === null) return <div key={`b${i}`} style={{ background: '#fafafa', minHeight: 120 }} />
                    const iso = padISO(calYear, calMonth, d)
                    const eventos = byDate[iso] || []
                    const esHoy = iso === hoyISO
                    return (
                      <div key={iso} style={{ background: '#fff', minHeight: 120, padding: 6, position: 'relative', borderTop: esHoy ? '2px solid #2563eb' : 'none' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: esHoy ? 700 : 400,
                          background: esHoy ? '#2563eb' : 'transparent', color: esHoy ? '#fff' : '#374151',
                          marginBottom: 4,
                        }}>{d}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {eventos.map((ev, ei) => {
                            const c = colorMap[ev.CursoAcademiaId] || CURSO_COLORS[0]
                            const sel = calEventoSel?.SesionId === ev.SesionId
                            return (
                              <button key={ei} onClick={() => setCalEventoSel(sel ? null : ev)}
                                style={{
                                  background: sel ? c.border : c.bg, color: sel ? '#fff' : c.text,
                                  border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 5px',
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                                  lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                }}>
                                {fmtHora(ev.HoraInicio) && <span style={{ opacity: 0.8, marginRight: 3 }}>{fmtHora(ev.HoraInicio)}</span>}
                                {ev.Nombre}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Panel de detalle */}
              {calEventoSel && (() => {
                const c = colorMap[calEventoSel.CursoAcademiaId] || CURSO_COLORS[0]
                return (
                  <div style={{
                    width: 300, flexShrink: 0, border: `2px solid ${c.border}`, borderRadius: 12,
                    overflow: 'hidden', animation: 'slideInRight 0.18s ease',
                  }}>
                    <div style={{ background: c.border, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.3 }}>{calEventoSel.Nombre}</div>
                        {calEventoSel.Generacion && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{calEventoSel.Generacion}</div>}
                      </div>
                      <button onClick={() => setCalEventoSel(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ padding: 16, background: '#fff' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        {[
                          { label: 'Fecha', value: fmtFecha(calEventoSel.Fecha) },
                          { label: 'Sesión', value: `#${calEventoSel.NumeroSesion}` },
                          { label: 'Horario', value: calEventoSel.HoraInicio ? `${fmtHora(calEventoSel.HoraInicio)}${calEventoSel.HoraFin ? ` – ${fmtHora(calEventoSel.HoraFin)}` : ''}` : '—' },
                          { label: 'Participantes', value: calEventoSel.Inscritos ?? '—' },
                          { label: 'Estado', value: calEventoSel.Estado },
                          { label: 'Modalidad', value: calEventoSel.Modalidad || '—' },
                        ].map(item => (
                          <div key={item.label} style={{ background: c.bg, borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: c.text }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {calEventoSel.Instructor && (
                        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>Instructor:</span> {calEventoSel.Instructor}
                        </div>
                      )}
                      {calEventoSel.Ubicacion && (
                        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>Ubicación:</span> {calEventoSel.Ubicacion}
                        </div>
                      )}
                      {calEventoSel.Capacidad && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Ocupación</div>
                          <div style={{ background: '#f3f4f6', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 99, background: c.border,
                              width: `${Math.min(100, Math.round(((calEventoSel.Inscritos || 0) / calEventoSel.Capacidad) * 100))}%`,
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                            {calEventoSel.Inscritos || 0} / {calEventoSel.Capacidad} participantes
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })()}

      {/* ═══ TAB UBITS ═══ */}
      {tab === 'ubits' && (() => {
        const busqU = filtroUbitsBuscar.toLowerCase().trim()
        const uFiltrado = ubitsData.filter(r => {
          if (busqU) {
            const nombre = `${r.Nombre || ''} ${r.Apellido || ''}`.toLowerCase()
            const nEmp = String(r.NumeroEmpleado || '').toLowerCase()
            if (!nombre.includes(busqU) && !nEmp.includes(busqU)) return false
          }
          if (filtroUbitsEmpresa && r.Empresa !== filtroUbitsEmpresa) return false
          if (filtroUbitsArea && r.Area !== filtroUbitsArea) return false
          if (filtroUbitsTerminal && r.Terminal !== filtroUbitsTerminal) return false
          if (filtroUbitsPlan && r.NombrePlan !== filtroUbitsPlan) return false
          if (filtroUbitsEstado && r.EstadoAprendizaje !== filtroUbitsEstado) return false
          if (filtroUbitsFormato && r.FormatoContenido !== filtroUbitsFormato) return false
          return true
        })
        const uTotalPags = Math.max(1, Math.ceil(uFiltrado.length / UBITS_POR_PAGINA))
        const uPagActual = Math.min(ubitsPagina, uTotalPags)
        const uPaginados = uFiltrado.slice((uPagActual - 1) * UBITS_POR_PAGINA, uPagActual * UBITS_POR_PAGINA)

        // Opciones en cascada: cada selector filtra con los padres activos
        function uOpts(campo, key, padres = {}) {
          const base = ubitsData.filter(r => {
            for (const [k, v] of Object.entries(padres)) if (v && r[k] !== v) return false
            return true
          })
          return [...new Set(base.map(r => r[key]).filter(Boolean))].sort()
        }
        const empresaOpts  = uOpts('empresa','Empresa')
        const areaOpts     = uOpts('area','Area',    { Empresa: filtroUbitsEmpresa })
        const terminalOpts = uOpts('terminal','Terminal', { Empresa: filtroUbitsEmpresa })
        const planOpts     = uOpts('plan','NombrePlan', { Empresa: filtroUbitsEmpresa, Area: filtroUbitsArea, Terminal: filtroUbitsTerminal })
        const estadoOpts   = uOpts('estado','EstadoAprendizaje')
        const formatoOpts  = uOpts('formato','FormatoContenido')

        function exportarUbitsCSV() {
          const cols = ['NumeroEmpleado','Nombre','Apellido','Empresa','Terminal','Area','Cargo','NombrePlan','NombreContenido','FormatoContenido','EstadoAprendizaje','PctAvance','HorasEstudiadas','FechaFin']
          const headers = ['No. Empleado','Nombre','Apellido','Empresa','Terminal','Área','Cargo','Plan','Contenido','Formato','Estado','% Avance','Horas','Fecha Fin']
          const rows = uFiltrado.map(r => cols.map(c => {
            const v = r[c]
            if (c === 'HorasEstudiadas') return fmtHorasDecimal(v)
            if (c === 'FechaFin') return v ? String(v).slice(0,10) : ''
            return v != null ? String(v).replace(/"/g,'""') : ''
          }))
          const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
          const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
          a.download = `Ubits_2026_${new Date().toISOString().slice(0,10)}.csv`
          a.click(); URL.revokeObjectURL(a.href)
        }

        const hayFiltros = !!(filtroUbitsBuscar || filtroUbitsEmpresa || filtroUbitsArea || filtroUbitsTerminal || filtroUbitsPlan || filtroUbitsEstado || filtroUbitsFormato)
        function limpiarFiltrosUbits() {
          setFiltroUbitsBuscar(''); setFiltroUbitsEmpresa(''); setFiltroUbitsArea('')
          setFiltroUbitsTerminal(''); setFiltroUbitsPlan(''); setFiltroUbitsEstado('')
          setFiltroUbitsFormato(''); setUbitsPagina(1)
        }

        const estadoUbitsColor = { Completado: '#16a34a', Aprobado: '#16a34a', 'En progreso': '#d97706', Iniciado: '#d97706', Asignado: '#6b7280', Pendiente: '#9ca3af' }
        const estadoUbitsBg   = { Completado: '#dcfce7', Aprobado: '#dcfce7', 'En progreso': '#fef3c7', Iniciado: '#fef3c7', Asignado: '#f3f4f6', Pendiente: '#f9fafb' }

        return (
          <div style={{ padding: '16px 0' }}>
            <div style={{ background: 'var(--surface,#f9fafb)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Progreso Ubits 2026</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                    {uFiltrado.length} registro(s){ubitsData.length !== uFiltrado.length ? ` de ${ubitsData.length}` : ''}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <input
                    type="text" placeholder="Buscar por nombre o No. empleado..."
                    value={filtroUbitsBuscar} onChange={e => { setFiltroUbitsBuscar(e.target.value); setUbitsPagina(1) }}
                    style={{ flex: '1 1 200px', minWidth: 180, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                  />
                  <select value={filtroUbitsEmpresa} onChange={e => { setFiltroUbitsEmpresa(e.target.value); setFiltroUbitsArea(''); setFiltroUbitsTerminal(''); setUbitsPagina(1) }}
                    style={{ minWidth: 130, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Todas las empresas</option>
                    {empresaOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={filtroUbitsArea} onChange={e => { setFiltroUbitsArea(e.target.value); setFiltroUbitsTerminal(''); setUbitsPagina(1) }}
                    style={{ minWidth: 130, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Todas las áreas</option>
                    {areaOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={filtroUbitsTerminal} onChange={e => { setFiltroUbitsTerminal(e.target.value); setUbitsPagina(1) }}
                    style={{ minWidth: 130, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Todas las terminales</option>
                    {terminalOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <select value={filtroUbitsPlan} onChange={e => { setFiltroUbitsPlan(e.target.value); setUbitsPagina(1) }}
                    style={{ minWidth: 160, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Todos los planes</option>
                    {planOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={filtroUbitsEstado} onChange={e => { setFiltroUbitsEstado(e.target.value); setUbitsPagina(1) }}
                    style={{ minWidth: 130, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Todos los estados</option>
                    {estadoOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={filtroUbitsFormato} onChange={e => { setFiltroUbitsFormato(e.target.value); setUbitsPagina(1) }}
                    style={{ minWidth: 120, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Todos los formatos</option>
                    {formatoOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <div style={{ flex: 1 }} />
                  {hayFiltros && (
                    <button className="ghost-button" style={{ fontSize: 12 }} onClick={limpiarFiltrosUbits}>Limpiar filtros</button>
                  )}
                  <button className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }} onClick={exportarUbitsCSV}>
                    ↓ Exportar CSV ({uFiltrado.length})
                  </button>
                </div>
              </div>
            </div>

            {loadingUbits ? <p style={{ color: '#6b7280' }}>Cargando datos Ubits...</p> : (
              <>
                <div className="table-wrap">
                  <table className="participants-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', minWidth: 160 }}>Colaborador</th>
                        <th style={{ textAlign: 'left' }}>Empresa</th>
                        <th style={{ textAlign: 'left' }}>Área</th>
                        <th style={{ textAlign: 'left', minWidth: 140 }}>Plan</th>
                        <th style={{ textAlign: 'left', minWidth: 180 }}>Contenido</th>
                        <th style={{ textAlign: 'center' }}>Formato</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                        <th style={{ textAlign: 'center' }}>% Avance</th>
                        <th style={{ textAlign: 'center' }}>Horas</th>
                        <th style={{ textAlign: 'center' }}>Fecha fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uPaginados.length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>
                          {loadingUbits ? 'Cargando...' : 'Sin registros'}
                        </td></tr>
                      ) : uPaginados.map((r, idx) => {
                        const estado = r.EstadoAprendizaje || ''
                        const colorE = estadoUbitsColor[estado] || '#6b7280'
                        const bgE    = estadoUbitsBg[estado]   || '#f3f4f6'
                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{`${r.Nombre || ''} ${r.Apellido || ''}`.trim()}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.NumeroEmpleado}</div>
                            </td>
                            <td style={{ fontSize: 11 }}>{r.Empresa || '-'}</td>
                            <td style={{ fontSize: 11 }}>{r.Area || '-'}</td>
                            <td style={{ fontSize: 11, fontWeight: 600 }}>{r.NombrePlan || '-'}</td>
                            <td style={{ fontSize: 11 }}>{r.NombreContenido || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                                {r.FormatoContenido || '-'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: bgE, color: colorE, fontWeight: 700 }}>
                                {estado || '-'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: (r.PctAvance || 0) >= 100 ? '#16a34a' : (r.PctAvance || 0) > 0 ? '#d97706' : '#6b7280' }}>
                              {r.PctAvance != null ? `${r.PctAvance}%` : '-'}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: 11 }}>
                              {fmtHorasDecimal(r.HorasEstudiadas)}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: 11 }}>
                              {r.FechaFin ? String(r.FechaFin).slice(0, 10) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {uTotalPags > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="secondary-button" style={{ fontSize: 12, padding: '4px 10px' }} disabled={uPagActual <= 1} onClick={() => setUbitsPagina(uPagActual - 1)}>Anterior</button>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Página {uPagActual} de {uTotalPags}</span>
                    <button className="secondary-button" style={{ fontSize: 12, padding: '4px 10px' }} disabled={uPagActual >= uTotalPags} onClick={() => setUbitsPagina(uPagActual + 1)}>Siguiente</button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ═══ TAB KARDEX ═══ */}
      {tab === 'kardex' && (() => {
        // Empleados únicos del histórico + Ubits (para que se puedan buscar aunque no tengan cursos academia)
        const empleadosMap = {}
        historicoData.forEach(r => {
          if (!empleadosMap[r.NumeroEmpleado]) {
            empleadosMap[r.NumeroEmpleado] = {
              NumeroEmpleado: r.NumeroEmpleado,
              NombreCompleto: r.NombreCompleto,
              Empresa: r.Empresa,
              Terminal: r.Terminal,
              Plaza: r.Plaza,
              Area: r.Area,
              Correo: r.Correo,
            }
          }
        })
        ubitsData.forEach(r => {
          if (r.NumeroEmpleado && !empleadosMap[r.NumeroEmpleado]) {
            const nombre = [r.Nombre, r.Apellido].filter(Boolean).join(' ')
            empleadosMap[r.NumeroEmpleado] = {
              NumeroEmpleado: r.NumeroEmpleado,
              NombreCompleto: nombre,
              Empresa: r.Empresa || '',
              Terminal: r.Terminal || '',
              Plaza: r.Cargo || '',
              Area: r.Area || '',
              Correo: r.Correo || '',
            }
          }
        })
        const empleados = Object.values(empleadosMap)

        const qBusq = kardexBusqueda.toLowerCase().trim()
        const sugerencias = qBusq.length >= 2
          ? empleados.filter(e =>
              (e.NombreCompleto || '').toLowerCase().includes(qBusq) ||
              (e.NumeroEmpleado || '').toLowerCase().includes(qBusq)
            ).slice(0, 8)
          : []

        // Cursos del empleado seleccionado
        const cursosEmpleado = kardexEmpleado
          ? historicoData.filter(r => String(r.NumeroEmpleado) === String(kardexEmpleado.NumeroEmpleado))
          : []

        const getEstado = r => {
          if (r.InscripcionActiva === false || r.InscripcionActiva === 0) return 'Baja'
          if (!r.TotalSesiones) return 'Sin sesiones'
          const pct = Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100)
          if (pct >= (r.PorcentajeMinAsistencia || 75)) return 'Completado'
          if (r.SesionesAsistidas > 0) return 'En progreso'
          return 'Pendiente'
        }

        const estadoColor = { Completado: '#16a34a', 'En progreso': '#d97706', Pendiente: '#6b7280', 'Sin sesiones': '#9ca3af', Baja: '#dc2626' }
        const estadoBg = { Completado: '#dcfce7', 'En progreso': '#fef3c7', Pendiente: '#f3f4f6', 'Sin sesiones': '#f9fafb', Baja: '#fef2f2' }

        const cursosFiltrados = cursosEmpleado.filter(r => {
          if (kardexFiltroEstado && getEstado(r) !== kardexFiltroEstado) return false
          if (kardexFiltroTipo && r.TipoCurso !== kardexFiltroTipo) return false
          return true
        })

        const completados = cursosEmpleado.filter(r => getEstado(r) === 'Completado').length
        const enProgreso = cursosEmpleado.filter(r => getEstado(r) === 'En progreso').length
        const pendientes = cursosEmpleado.filter(r => getEstado(r) === 'Pendiente').length
        const pctGeneral = cursosEmpleado.length > 0 ? Math.round((completados / cursosEmpleado.length) * 100) : 0
        const totalMinutosTotales = cursosEmpleado.reduce((s, r) => s + (r.MinutosTotales || 0), 0)
        const totalMinutosAsistidos = cursosEmpleado.reduce((s, r) => s + (r.MinutosAsistidos || 0), 0)

        function descargarKardexCSV() {
          const headers = ['Curso','Generación','Instructor','Modalidad','Fecha inscripción','Estado','Asistencias','Total sesiones','% Avance','Horas Asistidas','Horas Totales']
          const rows = cursosFiltrados.map(r => {
            const pct = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : 0
            return [r.CursoNombre, r.Generacion, r.Instructor, r.Modalidad, r.FechaInscripcion ? String(r.FechaInscripcion).slice(0,10) : '', getEstado(r), r.SesionesAsistidas, r.TotalSesiones, pct + '%', fmtHoras(r.MinutosAsistidos), fmtHoras(r.MinutosTotales)]
          })
          const csv = [headers, ...rows].map(row => row.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
          const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `Kardex_${kardexEmpleado?.NombreCompleto || 'empleado'}.csv`
          a.click()
        }

        async function imprimirKardex(emp, cursos, getEst, pct, comp, prog, pend, ubitsEmp = []) {
          async function toDataURL(url) {
            try {
              const res = await fetch(url)
              const blob = await res.blob()
              return new Promise(resolve => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
              })
            } catch { return '' }
          }
          const origin = window.location.origin
          const [selloSrc, nombreSrc, ubitsSrc, selloHdSrc, udatDarkSrc] = await Promise.all([
            toDataURL(`${origin}/logo-udat-sello.png`),
            toDataURL(`${origin}/logo-udat.png`),
            toDataURL(`${origin}/logo-trayecto.png`),
            toDataURL(`${origin}/logo-udat-sello-hd.png`),
            toDataURL(`${origin}/logo-udat-dark.png`),
          ])

          // Marca de agua: sello HD, una sola grande centrada
          const selloWM = await new Promise(resolve => {
            const src = selloHdSrc || selloSrc
            if (!src) return resolve('')
            const img = new Image()
            img.onload = () => {
              const sz = 500
              const cv = document.createElement('canvas')
              cv.width = sz; cv.height = sz
              const ctx = cv.getContext('2d')
              ctx.globalAlpha = 0.07
              ctx.drawImage(img, 0, 0, sz, sz)
              resolve(cv.toDataURL())
            }
            img.onerror = () => resolve('')
            img.src = src
          })

          const totalMinTot = cursos.reduce((s, r) => s + (r.MinutosTotales || 0), 0)
          const totalMinAsis = cursos.reduce((s, r) => s + (r.MinutosAsistidos || 0), 0)

          function buildFilasCursos(lista) {
            return lista.map(r => {
              const est = getEst(r)
              const avance = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : null
              const constancia = r.TotalSesiones > 0 && avance >= (r.PorcentajeMinAsistencia || 75)
              const colores = { Completado: '#16a34a', 'En progreso': '#d97706', Pendiente: '#6b7280', 'Sin sesiones': '#9ca3af' }
              const horasCell = r.MinutosAsistidos > 0
                ? `<strong style="color:#1e3a5f">${fmtHoras(r.MinutosAsistidos)}</strong>${r.MinutosTotales > 0 ? ` <span style="color:#9ca3af">/ ${fmtHoras(r.MinutosTotales)}</span>` : ''}`
                : r.MinutosTotales > 0 ? `<span style="color:#9ca3af">— / ${fmtHoras(r.MinutosTotales)}</span>` : '—'
              return `<tr>
                <td><strong>${r.CursoNombre || ''}</strong>${r.Generacion ? `<br><small style="color:#6b7280">${r.Generacion}</small>` : ''}</td>
                <td>${r.Modalidad || '—'}</td>
                <td>${r.Instructor || '—'}</td>
                <td>${r.FechaInscripcion ? String(r.FechaInscripcion).slice(0,10) : '—'}</td>
                <td><span style="background:${colores[est]}22;color:${colores[est]};padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px">${est}</span></td>
                <td>${avance !== null ? `${r.SesionesAsistidas}/${r.TotalSesiones} (${avance}%)` : '—'}</td>
                <td style="white-space:nowrap">${horasCell}</td>
                <td style="color:${constancia ? '#16a34a' : '#9ca3af'};font-weight:600">${r.TotalSesiones > 0 ? (constancia ? '✓ Acreedor' : 'Pendiente') : '—'}</td>
              </tr>`
            }).join('')
          }
          const cursosTable = `<thead><tr><th>Curso</th><th>Modalidad</th><th>Instructor</th><th>Fecha inscripción</th><th>Estado</th><th>Avance</th><th>Horas</th><th>Constancia</th></tr></thead>`
          const mandatorios = cursos.filter(r => r.TipoCurso === 'Mandatorio')
          const extraordinarios = cursos.filter(r => r.TipoCurso === 'Extraordinario')
          const otros = cursos.filter(r => r.TipoCurso !== 'Mandatorio' && r.TipoCurso !== 'Extraordinario')
          const bloqueTabla = (titulo, color, lista) => lista.length === 0 ? '' : `
            <div style="margin-top:20px">
              <div style="margin-bottom:8px">
                <h2 style="font-size:13px;font-weight:700;color:#0b2341;margin:0">${titulo} <span style="font-size:12px;color:${color};font-weight:600">(${lista.length})</span></h2>
              </div>
              <table>${cursosTable}<tbody>${buildFilasCursos(lista)}</tbody></table>
            </div>`
          const filasUbits = ubitsEmp.map(r => {
            const colU = { Completado: '#16a34a', Aprobado: '#16a34a', 'En progreso': '#d97706', Iniciado: '#d97706', Asignado: '#6b7280', Pendiente: '#9ca3af' }
            const estado = r.EstadoAprendizaje || '—'
            const color = colU[estado] || '#6b7280'
            return `<tr>
              <td><strong>${r.NombrePlan || '—'}</strong></td>
              <td>${r.NombreContenido || '—'}</td>
              <td>${r.FormatoContenido || '—'}</td>
              <td><span style="background:${color}22;color:${color};padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px">${estado}</span></td>
              <td style="text-align:center;font-weight:700;color:${(r.PctAvance||0)>=100?'#16a34a':(r.PctAvance||0)>0?'#d97706':'#6b7280'}">${r.PctAvance!=null?r.PctAvance+'%':'—'}</td>
              <td style="text-align:center">${fmtHorasDecimal(r.HorasEstudiadas)}</td>
              <td style="text-align:center">${r.FechaFin?String(r.FechaFin).slice(0,10):'—'}</td>
            </tr>`
          }).join('')

          const bloqueUbits = ubitsEmp.length === 0 ? '' : `
            <div style="margin-top:28px">
              <div style="margin-bottom:8px">
                <h2 style="font-size:13px;font-weight:700;color:#0b2341;margin:0">UBITS 2026 <span style="font-size:12px;color:#2563eb;font-weight:600">(${ubitsEmp.length})</span></h2>
              </div>
              <table>
                <thead><tr><th>Plan</th><th>Contenido</th><th>Formato</th><th>Estado</th><th style="text-align:center">% Avance</th><th style="text-align:center">Horas</th><th style="text-align:center">Fecha fin</th></tr></thead>
                <tbody>${filasUbits}</tbody>
              </table>
            </div>`

          const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
            <title>Kardex — ${emp.NombreCompleto}</title>
            <style>
              *{box-sizing:border-box;margin:0;padding:0}
              html,body{margin:0;padding:0;width:100%}
              body{font-family:Arial,sans-serif;font-size:12px;color:#111}
              .cintilla{background:#1e293b;padding:16px 28px;display:flex;align-items:center;gap:16px;margin-bottom:20px;width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
              .cintilla img.nombre{height:44px;width:auto;display:block;flex-shrink:0;mix-blend-mode:screen}
              .cintilla img.trayecto{height:44px;width:auto;display:block;flex-shrink:0;margin-left:auto;mix-blend-mode:lighten}
              .content{padding:0 24px 24px;background-image:url(${selloWM});background-repeat:no-repeat;background-position:center 200px;background-size:500px 500px}
              h1{font-size:18px;margin-bottom:4px}
              .emp-header{background:#1e293b;color:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px}
              .emp-header .sub{font-size:11px;color:#94a3b8;margin-top:4px;display:flex;flex-wrap:wrap;gap:12px}
              .stats{display:flex;gap:12px;margin-bottom:16px}
              .stat{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
              .stat .val{font-size:22px;font-weight:800}
              .stat .lbl{font-size:11px;color:#6b7280;margin-top:2px}
              table{width:100%;border-collapse:collapse;margin-top:8px}
              th{background:#f1f5f9;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#374151;border-bottom:2px solid #e5e7eb}
              td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
              tr:last-child td{border-bottom:none}
              tr{page-break-inside:avoid}
              .footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:right}
              @media print{@page{margin:0;size:A4}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
            </style>
          </head><body>
            <div class="cintilla">
              ${udatDarkSrc ? `<img class="nombre" src="${udatDarkSrc}" alt="UDAT"/>` : ''}
              ${ubitsSrc && ubitsEmp.length > 0 ? `<img class="trayecto" src="${ubitsSrc}" alt="Ubits"/>` : ''}
            </div>
            <div class="content">
            <div class="emp-header">
              <h1>${emp.NombreCompleto}</h1>
              <div class="sub">
                ${emp.NumeroEmpleado ? `<span>No. ${emp.NumeroEmpleado}</span>` : ''}
                ${emp.Area ? `<span>Área: ${emp.Area}</span>` : ''}
                ${emp.Plaza ? `<span>Plaza: ${emp.Plaza}</span>` : ''}
                ${emp.Empresa ? `<span>Empresa: ${emp.Empresa}</span>` : ''}
                ${emp.Terminal ? `<span>Terminal: ${emp.Terminal}</span>` : ''}
              </div>
            </div>
            <div class="stats">
              <div class="stat"><div class="val" style="color:#2563eb">${cursos.length}</div><div class="lbl">Asignados</div></div>
              <div class="stat"><div class="val" style="color:#16a34a">${comp}</div><div class="lbl">Completados</div></div>
              <div class="stat"><div class="val" style="color:#d97706">${prog}</div><div class="lbl">En progreso</div></div>
              <div class="stat"><div class="val" style="color:#6b7280">${pend}</div><div class="lbl">Pendientes</div></div>
              <div class="stat"><div class="val" style="color:#2563eb">${pct}%</div><div class="lbl">Avance general</div></div>
              ${totalMinAsis > 0 ? `<div class="stat"><div class="val" style="color:#0ea5e9;font-size:18px">${fmtHoras(totalMinAsis)}</div><div class="lbl">Horas asistidas</div></div>` : ''}
              ${totalMinTot > 0 ? `<div class="stat"><div class="val" style="color:#64748b;font-size:18px">${fmtHoras(totalMinTot)}</div><div class="lbl">Horas totales</div></div>` : ''}
            </div>
            ${bloqueTabla('Cursos Mandatorios', '#1d4ed8', mandatorios)}
            ${bloqueTabla('Cursos Extraordinarios', '#7e22ce', extraordinarios)}
            ${bloqueTabla('Otros cursos', '#6b7280', otros)}
            ${bloqueUbits}
            <div class="footer">Generado el ${new Date().toLocaleDateString('es-MX', {day:'2-digit',month:'long',year:'numeric'})} · UDAT Academia</div>
            </div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
            <script>
              window.onload = function() {
                var opt = {
                  margin: 0,
                  filename: 'Kardex_${(emp.NombreCompleto || 'empleado').replace(/[^a-zA-Z0-9_áéíóúÁÉÍÓÚüÜñÑ ]/g,'').trim().replace(/ +/g,'_')}.pdf',
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true, logging: false },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(document.body).save().then(function(){ window.close(); });
              };
            <\/script>
          </body></html>`

          const w = window.open('', '_blank', 'width=900,height=700')
          w.document.write(html)
          w.document.close()
        }

        // Donut SVG helpers
        const R = 40, C = 2 * Math.PI * R
        const stroke = C * (pctGeneral / 100)

        return (
          <div style={{ padding: '16px 0' }}>
            {/* Búsqueda */}
            <div style={{ background: 'var(--surface,#f9fafb)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Kardex de Capacitación</h3>
                {kardexEmpleado && (
                  <button className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => imprimirKardex(kardexEmpleado, cursosEmpleado, getEstado, pctGeneral, completados, enProgreso, pendientes, ubitsData.filter(r => String(r.NumeroEmpleado) === String(kardexEmpleado.NumeroEmpleado)))}>
                    ↓ Descargar PDF
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', maxWidth: 420 }}>
                <input
                  type="text"
                  placeholder="Buscar colaborador por nombre o No. empleado..."
                  value={kardexBusqueda}
                  onChange={e => { setKardexBusqueda(e.target.value); setKardexEmpleado(null) }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
                {sugerencias.length > 0 && !kardexEmpleado && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 50, marginTop: 4, overflow: 'hidden' }}>
                    {sugerencias.map(emp => (
                      <button key={emp.NumeroEmpleado} onClick={() => { setKardexEmpleado(emp); setKardexBusqueda(emp.NombreCompleto); setKardexFiltroEstado(''); setKardexFiltroTipo('') }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background='none'}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{emp.NombreCompleto}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>No. {emp.NumeroEmpleado} · {emp.Empresa} · {emp.Area}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {loadingHistorico && <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0' }}>Cargando datos...</p>}
            </div>

            {/* Kardex del empleado */}
            {kardexEmpleado && (
              <>
                {/* Tarjeta empleado + resumen */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>
                  {/* Info empleado */}
                  <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', color: '#f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{kardexEmpleado.NombreCompleto}</div>
                        <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                          {kardexEmpleado.NumeroEmpleado && <span>No. {kardexEmpleado.NumeroEmpleado}</span>}
                          {kardexEmpleado.Area && <span>Área: {kardexEmpleado.Area}</span>}
                          {kardexEmpleado.Plaza && <span>Plaza: {kardexEmpleado.Plaza}</span>}
                          {kardexEmpleado.Empresa && <span>Empresa: {kardexEmpleado.Empresa}</span>}
                          {kardexEmpleado.Terminal && <span>Terminal: {kardexEmpleado.Terminal}</span>}
                        </div>
                      </div>
                      <span style={{ background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Activo</span>
                    </div>
                  </div>

                  {/* Resumen circular */}
                  <div style={{ background: 'var(--surface,#f9fafb)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 12, padding: '20px 24px', minWidth: 280 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#374151' }}>Resumen de cursos</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      {/* Donut */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <svg width="96" height="96" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
                          <circle cx="48" cy="48" r={R} fill="none" stroke="#2563eb" strokeWidth="10"
                            strokeDasharray={`${stroke} ${C}`} strokeLinecap="round"
                            transform="rotate(-90 48 48)"/>
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{pctGeneral}%</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Stat label="Asignados" value={cursosEmpleado.length} color="#2563eb"/>
                        <Stat label="Completados" value={completados} color="#16a34a"/>
                        <Stat label="En progreso" value={enProgreso} color="#d97706"/>
                        <Stat label="Pendientes" value={pendientes} color="#6b7280"/>
                        {totalMinutosTotales > 0 && <>
                          <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }}/>
                          <Stat label="Horas asistidas" value={fmtHoras(totalMinutosAsistidos)} color="#0ea5e9"/>
                          <Stat label="Horas totales" value={fmtHoras(totalMinutosTotales)} color="#64748b"/>
                        </>}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
                      {completados} de {cursosEmpleado.length} cursos completados
                    </div>
                  </div>
                </div>

                {/* Tabla cursos */}
                <div style={{ background: 'var(--surface,#f9fafb)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Historial de cursos</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={kardexFiltroTipo} onChange={e => setKardexFiltroTipo(e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                        <option value="">Todos los tipos</option>
                        <option value="Mandatorio">Mandatorio</option>
                        <option value="Extraordinario">Extraordinario</option>
                      </select>
                      <select value={kardexFiltroEstado} onChange={e => setKardexFiltroEstado(e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                        <option value="">Todos los estados</option>
                        {['Completado','En progreso','Pendiente','Sin sesiones'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }} onClick={descargarKardexCSV}>
                        ↓ Exportar CSV
                      </button>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="participants-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Curso</th>
                          <th>Modalidad</th>
                          <th>Instructor</th>
                          <th>Fecha inscripción</th>
                          <th>Estado</th>
                          <th>Avance</th>
                          <th>Horas</th>
                          <th>Constancia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cursosFiltrados.length === 0
                          ? <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>Sin cursos{kardexFiltroEstado ? ' con ese estado' : ''}</td></tr>
                          : cursosFiltrados.map((r, i) => {
                            const estado = getEstado(r)
                            const pct = r.TotalSesiones > 0 ? Math.round((r.SesionesAsistidas / r.TotalSesiones) * 100) : 0
                            const constancia = r.TotalSesiones > 0 && pct >= (r.PorcentajeMinAsistencia || 75)
                            const tipoKardex = r.TipoCurso === 'Mandatorio' ? { bg: '#eff6ff', color: '#1d4ed8' } : r.TipoCurso === 'Extraordinario' ? { bg: '#fdf4ff', color: '#7e22ce' } : { bg: '#f3f4f6', color: '#6b7280' }
                            return (
                              <tr key={i}>
                                <td>
                                  {r.TipoCurso
                                    ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: tipoKardex.bg, color: tipoKardex.color, whiteSpace: 'nowrap' }}>{r.TipoCurso}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {r.CursoNombre}
                                  {r.Generacion && <div style={{ fontWeight: 400, color: '#6b7280', fontSize: 11 }}>{r.Generacion}</div>}
                                </td>
                                <td>{r.Modalidad || '—'}</td>
                                <td>{r.Instructor || '—'}</td>
                                <td>{r.FechaInscripcion ? String(r.FechaInscripcion).slice(0,10) : '—'}</td>
                                <td>
                                  <span style={{ background: estadoBg[estado], color: estadoColor[estado], fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                                    {estado}
                                  </span>
                                </td>
                                <td>
                                  {r.TotalSesiones > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, minWidth: 60 }}>
                                        <div style={{ width: pct + '%', height: '100%', background: estadoColor[estado], borderRadius: 3, transition: 'width .3s' }}/>
                                      </div>
                                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{r.SesionesAsistidas}/{r.TotalSesiones}</span>
                                    </div>
                                  ) : <span style={{ color: '#9ca3af' }}>—</span>}
                                </td>
                                <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                                  {r.MinutosAsistidos > 0
                                    ? <><span style={{ fontWeight: 700, color: '#1e3a5f' }}>{fmtHoras(r.MinutosAsistidos)}</span>{r.MinutosTotales > 0 && <span style={{ color: '#9ca3af' }}> / {fmtHoras(r.MinutosTotales)}</span>}</>
                                    : r.MinutosTotales > 0
                                      ? <span style={{ color: '#9ca3af' }}>— / {fmtHoras(r.MinutosTotales)}</span>
                                      : <span style={{ color: '#9ca3af' }}>—</span>}
                                </td>
                                <td>
                                  {r.TotalSesiones > 0
                                    ? <span style={{ color: constancia ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>{constancia ? '✓ Acreedor' : 'Pendiente'}</span>
                                    : <span style={{ color: '#9ca3af' }}>—</span>}
                                </td>
                              </tr>
                            )
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ubits del empleado */}
                {(() => {
                  const ubitsEmp = ubitsData.filter(r => String(r.NumeroEmpleado) === String(kardexEmpleado.NumeroEmpleado))
                  if (ubitsEmp.length === 0) return null
                  const estadoUbitsColor = { Completado: '#16a34a', Aprobado: '#16a34a', 'En progreso': '#d97706', Iniciado: '#d97706', Asignado: '#6b7280', Pendiente: '#9ca3af' }
                  const estadoUbitsBg   = { Completado: '#dcfce7', Aprobado: '#dcfce7', 'En progreso': '#fef3c7', Iniciado: '#fef3c7', Asignado: '#f3f4f6', Pendiente: '#f9fafb' }
                  return (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ background: '#1a1a1a', borderRadius: 6, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          <img src="/logo-trayecto.png" alt="Trayecto" style={{ height: 22, width: 'auto', display: 'block' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0b2341' }}>UBITS 2026</span>
                        <span style={{ fontSize: 11, color: '#6b7280', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '1px 8px', fontWeight: 600 }}>{ubitsEmp.length}</span>
                      </div>
                      <div className="table-wrap">
                        <table className="participants-table" style={{ fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Plan</th>
                              <th style={{ textAlign: 'left' }}>Contenido</th>
                              <th style={{ textAlign: 'center' }}>Formato</th>
                              <th style={{ textAlign: 'center' }}>Estado</th>
                              <th style={{ textAlign: 'center' }}>% Avance</th>
                              <th style={{ textAlign: 'center' }}>Horas</th>
                              <th style={{ textAlign: 'center' }}>Fecha fin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ubitsEmp.map((r, i) => {
                              const estado = r.EstadoAprendizaje || ''
                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600, fontSize: 11 }}>{r.NombrePlan || '-'}</td>
                                  <td style={{ fontSize: 11 }}>{r.NombreContenido || '-'}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>{r.FormatoContenido || '-'}</span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: estadoUbitsBg[estado] || '#f3f4f6', color: estadoUbitsColor[estado] || '#6b7280', fontWeight: 700 }}>{estado || '-'}</span>
                                  </td>
                                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: (r.PctAvance || 0) >= 100 ? '#16a34a' : (r.PctAvance || 0) > 0 ? '#d97706' : '#6b7280' }}>
                                    {r.PctAvance != null ? `${r.PctAvance}%` : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center', fontSize: 11 }}>{fmtHorasDecimal(r.HorasEstudiadas)}</td>
                                  <td style={{ textAlign: 'center', fontSize: 11 }}>{r.FechaFin ? String(r.FechaFin).slice(0, 10) : '-'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}

            {!kardexEmpleado && !loadingHistorico && historicoData.length > 0 && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#9ca3af' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <p style={{ margin: 0, fontSize: 14 }}>Busca un colaborador para ver su kardex</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ═══ TAB SOLICITUDES CATÁLOGO ═══ */}
      {tab === 'solicitudes' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                {esAprobador ? 'Solicitudes de nuevos cursos al catálogo' : 'Mis solicitudes al catálogo'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                {esAprobador
                  ? 'Aprueba o rechaza solicitudes para agregar cursos al catálogo.'
                  : 'Solicita que se agregue un curso al catálogo para que pueda ser impartido.'}
              </p>
            </div>
            <button className="primary-button" style={{ fontSize: 13 }} onClick={() => setShowSolicitudModal(true)}>
              + Nueva solicitud
            </button>
          </div>

          {loadingSolicitudes ? (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>Cargando...</p>
          ) : solicitudes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <p style={{ margin: 0 }}>No hay solicitudes aún</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {solicitudes.map(s => {
                const colores = { Pendiente: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' }, Aprobado: { bg: '#dcfce7', text: '#166534', border: '#86efac' }, Rechazado: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' } }
                const c = colores[s.Estado] || colores.Pendiente
                return (
                  <div key={s.SolicitudId} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{s.Nombre}</span>
                          <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{s.Estado}</span>
                          {s.TipoCurso && <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 8, padding: '2px 8px' }}>{s.TipoCurso}</span>}
                        </div>
                        {s.Descripcion && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#4b5563' }}>{s.Descripcion}</p>}
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                          {s.Horas > 0 && <span style={{ fontSize: 12, color: '#6b7280' }}><span style={{ color: '#0b2341', fontWeight: 700 }}>h</span> {s.Horas}h</span>}
                          {s.Costo > 0 && <span style={{ fontSize: 12, color: '#6b7280' }}><span style={{ color: '#0b2341', fontWeight: 700 }}>$</span> {Number(s.Costo).toLocaleString('es-MX')}</span>}
                          {s.DuracionDefaultDias > 0 && <span style={{ fontSize: 12, color: '#6b7280' }}><span style={{ color: '#0b2341', fontWeight: 700 }}>días</span> {s.DuracionDefaultDias}</span>}
                          {s.Justificacion && <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>"{s.Justificacion}"</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                          Solicitado por <strong>{s.SolicitadoPor}</strong> · {s.FechaSolicitud ? new Date(s.FechaSolicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          {s.ResueltoPor && <> · Resuelto por <strong>{s.ResueltoPor}</strong></>}
                          {s.Comentario && <> · <em>"{s.Comentario}"</em></>}
                        </div>
                      </div>
                      {esAprobador && s.Estado === 'Pendiente' && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button className="primary-button" style={{ fontSize: 12, padding: '5px 14px', background: '#16a34a', borderColor: '#16a34a' }}
                            onClick={async () => {
                              if (!window.confirm(`¿Aprobar "${s.Nombre}" y agregarlo al catálogo?`)) return
                              try { await aprobarSolicitudCatalogo(s.SolicitudId); loadSolicitudes() }
                              catch (err) { window.alert('Error: ' + err.message) }
                            }}>✓ Aprobar</button>
                          <button className="secondary-button" style={{ fontSize: 12, padding: '5px 14px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => { setRechazandoId(s.SolicitudId); setComentarioRechazo('') }}>
                            ✕ Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                    {rechazandoId === s.SolicitudId && (
                      <div style={{ marginTop: 12, padding: '12px', background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: 6 }}>Motivo del rechazo</label>
                        <textarea value={comentarioRechazo} onChange={e => setComentarioRechazo(e.target.value)} rows={2}
                          placeholder="Escribe el motivo..." className="form-control" style={{ width: '100%', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="ghost-button" style={{ fontSize: 12 }} onClick={() => setRechazandoId(null)}>Cancelar</button>
                          <button className="secondary-button" style={{ fontSize: 12, color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={async () => {
                              try { await rechazarSolicitudCatalogo(s.SolicitudId, { Comentario: comentarioRechazo }); setRechazandoId(null); loadSolicitudes() }
                              catch (err) { window.alert('Error: ' + err.message) }
                            }}>Confirmar rechazo</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL: Nueva Solicitud al Catálogo ═══ */}
      {showSolicitudModal && (
        <SolicitudCatalogoModal
          onClose={() => setShowSolicitudModal(false)}
          onSaved={() => { setShowSolicitudModal(false); loadSolicitudes() }}
        />
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

function fmtHoras(minutos) {
  if (!minutos || minutos <= 0) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtHorasDecimal(hDec) {
  if (hDec == null || hDec <= 0) return '—'
  const totalMin = Math.round(hDec * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }}/>
      <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginLeft: 'auto' }}>{value}</span>
    </div>
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
  const [horasPorSesion, setHorasPorSesion] = useState(cursoInicial?.HorasPorSesion != null ? String(cursoInicial.HorasPorSesion) : '')
  const [tipoCurso, setTipoCurso] = useState(cursoInicial?.TipoCurso || '')
  const [estado, setEstado] = useState(cursoInicial?.Estado || 'Activo')
  const [habilitado, setHabilitado] = useState(cursoInicial?.Habilitado !== false)
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
    if (c.TipoCurso) setTipoCurso(c.TipoCurso)
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
        await updateAcademiaCurso(cursoInicial.CursoAcademiaId, { Nombre: nombre, Descripcion: descripcion, Instructor: instructor, Modalidad: modalidad, Ubicacion: ubicacion, Capacidad: Number(capacidad), PorcentajeMinAsistencia: Number(pctMin), Estado: estado, Generacion: generacion || null, HorasPorSesion: horasPorSesion !== '' ? Number(horasPorSesion) : null, TipoCurso: tipoCurso || null, Habilitado: habilitado })
        for (const s of sesiones) {
          if (s.SesionId) {
            await updateAcademiaSesion(s.SesionId, { Fecha: s.Fecha, HoraInicio: s.HoraInicio, HoraFin: s.HoraFin, Ubicacion: s.Ubicacion })
          } else if (s.Fecha) {
            await createAcademiaSesion(cursoInicial.CursoAcademiaId, { Fecha: s.Fecha, HoraInicio: s.HoraInicio, HoraFin: s.HoraFin, Ubicacion: s.Ubicacion })
          }
        }
      } else {
        const sesionesValidas = sesiones.filter(s => s.Fecha)
        await createAcademiaCurso({ Nombre: nombre, Descripcion: descripcion, Instructor: instructor, Modalidad: modalidad, Ubicacion: ubicacion, Capacidad: Number(capacidad), PorcentajeMinAsistencia: Number(pctMin), Generacion: generacion || null, HorasPorSesion: horasPorSesion !== '' ? Number(horasPorSesion) : null, TipoCurso: tipoCurso || null, sesiones: sesionesValidas })
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
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Tipo de curso</label>
              <select className="form-control" value={tipoCurso} onChange={e => setTipoCurso(e.target.value)} style={{ width: '100%' }}>
                <option value="">Sin tipo</option>
                <option value="Mandatorio">Mandatorio</option>
                <option value="Extraordinario">Extraordinario</option>
              </select>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Horas por sesión</label>
                <input className="form-control" type="number" value={horasPorSesion} onChange={e => setHorasPorSesion(e.target.value)} min={0} step={0.5} placeholder="Ej: 2, 1.5" style={{ width: '100%' }} />
              </div>
              {horasPorSesion && Number(horasPorSesion) > 0 && (
                <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Total estimado</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f', marginTop: 2 }}>
                    {fmtHoras(Number(horasPorSesion) * 60 * sesiones.length)}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{sesiones.length} sesión(es) × {horasPorSesion}h</div>
                </div>
              )}
            </div>
            {isEdit && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Estado</label>
                  <select className="form-control" value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%' }}>
                    <option>Activo</option>
                    <option>Próximo</option>
                    <option>Completado</option>
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setHabilitado(v => !v)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, background: habilitado ? '#2563eb' : '#d1d5db',
                      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: habilitado ? 20 : 3, width: 16, height: 16,
                      borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Habilitado para inscripciones
                  </span>
                  <span style={{ fontSize: 11, color: habilitado ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                    {habilitado ? 'Sí' : 'No'}
                  </span>
                </label>
              </>
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

function SolicitudCatalogoModal({ onClose, onSaved }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoCurso, setTipoCurso] = useState('')
  const [horas, setHoras] = useState('')
  const [costo, setCosto] = useState('')
  const [duracionDias, setDuracionDias] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) { window.alert('El nombre es requerido'); return }
    setSaving(true)
    try {
      await createSolicitudCatalogo({
        Nombre: nombre.trim(),
        Descripcion: descripcion || null,
        TipoCurso: tipoCurso || null,
        Horas: horas !== '' ? Number(horas) : null,
        Costo: costo !== '' ? Number(costo) : null,
        DuracionDefaultDias: duracionDias !== '' ? Number(duracionDias) : null,
        Justificacion: justificacion || null,
      })
      onSaved()
    } catch (err) { window.alert('Error: ' + err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(500px, 95vw)', maxHeight: '90vh', background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1001, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Solicitar nuevo curso</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>La solicitud será revisada por el área de Academia</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Nombre del curso *</label>
              <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Excel Avanzado" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Descripción</label>
              <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} placeholder="¿De qué trata el curso?" style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Tipo de curso</label>
              <select className="form-control" value={tipoCurso} onChange={e => setTipoCurso(e.target.value)} style={{ width: '100%' }}>
                <option value="">Seleccionar...</option>
                <option>Mandatorio</option>
                <option>Extraordinario</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Horas</label>
                <input className="form-control" type="number" value={horas} onChange={e => setHoras(e.target.value)} min={0} step={0.5} placeholder="0" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Costo ($)</label>
                <input className="form-control" type="number" value={costo} onChange={e => setCosto(e.target.value)} min={0} placeholder="0" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Duración (días)</label>
                <input className="form-control" type="number" value={duracionDias} onChange={e => setDuracionDias(e.target.value)} min={1} placeholder="1" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>Justificación</label>
              <textarea className="form-control" value={justificacion} onChange={e => setJustificacion(e.target.value)} rows={2} placeholder="¿Por qué se necesita este curso?" style={{ width: '100%', resize: 'vertical' }} />
            </div>
          </div>
        </form>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </>
  )
}
