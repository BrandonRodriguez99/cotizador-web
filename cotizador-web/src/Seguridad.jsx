import { useState, useEffect, useCallback } from 'react'
import {
  getDashboardSeguridad,
  getVehiculos, createVehiculo, updateVehiculo, deleteVehiculo,
  getExtintores, createExtintor, updateExtintor, deleteExtintor,
  getRevisionesExtintor, createRevisionExtintor,
  getPuntosRevision, createPuntoRevision, updatePuntoRevision,
  createAreaRevision, updateAreaRevision,
  getRondines, getRondinById, createRondin, marcarRegistroRondin, finalizarRondin, deleteRondin,
  getVisitas, createVisita, registrarSalidaVisita, deleteVisita,
  getOrdenesVehiculo, createOrdenVehiculo,
  autorizarOrdenVehiculo, rechazarOrdenVehiculo,
  registrarSalidaVehiculo, registrarLlegadaVehiculo, deleteOrdenVehiculo,
  uploadFotoVehiculo,
  uploadFotoRondin,
} from './api'

const ESTADOS_VEHICULO = {
  pendiente:  { label: 'Pendiente',  color: '#d97706', bg: '#fef3c7' },
  autorizada: { label: 'Autorizada', color: '#16a34a', bg: '#f0fdf4' },
  rechazada:  { label: 'Rechazada',  color: '#dc2626', bg: '#fef2f2' },
  en_curso:   { label: 'En curso',   color: '#2563eb', bg: '#eff6ff' },
  completada: { label: 'Completada', color: '#6b7280', bg: '#f3f4f6' },
}

const SEVERIDADES = {
  baja:    { label: 'Baja',    color: '#16a34a' },
  media:   { label: 'Media',   color: '#2563eb' },
  alta:    { label: 'Alta',    color: '#d97706' },
  critica: { label: 'Crítica', color: '#dc2626' },
}

function Badge({ estado, mapa }) {
  const cfg = mapa[estado] || { label: estado, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '12px',
      fontWeight: '600', color: cfg.color, background: cfg.bg || '#f3f4f6', border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.label}
    </span>
  )
}

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtDate(d) {
  if (!d) return '-'
  return String(d).substring(0, 10)
}

export default function Seguridad({ usuario, soloVehiculos = false }) {
  const rol        = usuario?.rol || ''
  const esAdmin    = rol === 'admin'
  const esSeguridad = rol === 'seguridad'
  const esEncargado = rol === 'encargado_vehiculos'
  const esJefeSeg  = rol === 'jefe_seguridad'

  const tabs = []
  if (!soloVehiculos && (esAdmin || esSeguridad || esJefeSeg)) {
    tabs.push({ id: 'dashboard', label: 'Resumen' })
    tabs.push({ id: 'rondines',  label: 'Rondines' })
    tabs.push({ id: 'extintores',label: 'Extintores' })
    tabs.push({ id: 'visitas',   label: 'Visitas' })
  }
  tabs.push({ id: 'vehiculos', label: 'Vehículos' })
  if ((esAdmin || esJefeSeg) && !soloVehiculos) tabs.push({ id: 'catalogos', label: 'Catálogos' })

  const [tab, setTab] = useState(tabs[0]?.id || 'vehiculos')

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  const [dash, setDash] = useState(null)
  const loadDash = useCallback(async () => {
    try { setDash(await getDashboardSeguridad()) } catch { /* ignore */ }
  }, [])
  useEffect(() => { if (tab === 'dashboard') loadDash() }, [tab, loadDash])

  // ─── RONDINES ──────────────────────────────────────────────────────────────
  const [rondines, setRondines]         = useState([])
  const [rondinActivo, setRondinActivo] = useState(null)
  const [loadingR, setLoadingR]         = useState(false)
  const [errorR, setErrorR]             = useState('')
  const [iniciandoR, setIniciandoR]     = useState(false)
  const [incidenciaForm, setIncidenciaForm] = useState({})
  const [registroModal, setRegistroModal]   = useState(null)
  const [fotoRondin, setFotoRondin]         = useState(null)
  const [uploadingFotoR, setUploadingFotoR] = useState(false)
  const [finalizarObs, setFinalizarObs]     = useState('')
  const [finalizarModal, setFinalizarModal] = useState(false)

  const loadRondines = useCallback(async () => {
    setLoadingR(true); setErrorR('')
    try { setRondines(await getRondines()) }
    catch (e) { setErrorR(e.message) }
    finally { setLoadingR(false) }
  }, [])

  useEffect(() => { if (tab === 'rondines') loadRondines() }, [tab, loadRondines])

  async function iniciarRondin() {
    setIniciandoR(true)
    try {
      const { rondinId } = await createRondin()
      const detalle = await getRondinById(rondinId)
      setRondinActivo(detalle)
      await loadRondines()
    } catch (e) { alert('Error al iniciar rondín: ' + e.message) }
    finally { setIniciandoR(false) }
  }

  async function verRondin(id) {
    try { setRondinActivo(await getRondinById(id)) } catch (e) { alert(e.message) }
  }

  async function handleFotoRondinChange(file) {
    if (!file) return
    setUploadingFotoR(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const { url } = await uploadFotoRondin(ev.target.result)
          setFotoRondin(url)
        } catch (e) { alert('Error subiendo foto: ' + e.message) }
        finally { setUploadingFotoR(false) }
      }
      reader.readAsDataURL(file)
    } catch { setUploadingFotoR(false) }
  }

  async function marcarRegistro(registroId, datos) {
    try {
      await marcarRegistroRondin(rondinActivo.RondinId, registroId, { ...datos, FotoUrl: fotoRondin })
      const detalle = await getRondinById(rondinActivo.RondinId)
      setRondinActivo(detalle)
      setRegistroModal(null)
      setIncidenciaForm({})
      setFotoRondin(null)
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleFinalizarRondin() {
    try {
      await finalizarRondin(rondinActivo.RondinId, { Observaciones: finalizarObs })
      setRondinActivo(null)
      setFinalizarModal(false)
      setFinalizarObs('')
      await loadRondines()
    } catch (e) { alert('Error al finalizar: ' + e.message) }
  }

  // ─── EXTINTORES ────────────────────────────────────────────────────────────
  const [extintores, setExtintores]             = useState([])
  const [extintorRevisando, setExtintorRevisando] = useState(null)
  const [revisionForm, setRevisionForm]           = useState({})
  const [loadingE, setLoadingE]                   = useState(false)
  const [errorE, setErrorE]                       = useState('')
  const [historialExt, setHistorialExt]           = useState([])
  const [verHistorialId, setVerHistorialId]       = useState(null)

  const loadExtintores = useCallback(async () => {
    setLoadingE(true); setErrorE('')
    try { setExtintores(await getExtintores()) }
    catch (e) { setErrorE(e.message) }
    finally { setLoadingE(false) }
  }, [])

  useEffect(() => { if (tab === 'extintores') loadExtintores() }, [tab, loadExtintores])

  async function guardarRevision() {
    if (!extintorRevisando) return
    try {
      await createRevisionExtintor({ ...revisionForm, ExtintorId: extintorRevisando.ExtintorId })
      setExtintorRevisando(null)
      setRevisionForm({})
      await loadExtintores()
      alert('Revisión registrada correctamente.')
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function verHistorial(extintor) {
    try {
      setVerHistorialId(extintor.ExtintorId)
      setHistorialExt(await getRevisionesExtintor(extintor.ExtintorId))
    } catch (e) { alert(e.message) }
  }

  // ─── VISITAS ───────────────────────────────────────────────────────────────
  const [visitas, setVisitas]       = useState([])
  const [loadingV, setLoadingV]     = useState(false)
  const [errorV, setErrorV]         = useState('')
  const [visitaForm, setVisitaForm] = useState({})
  const [nuevaVisita, setNuevaVisita] = useState(false)
  const [fechaVisitas, setFechaVisitas] = useState(new Date().toISOString().substring(0, 10))

  const loadVisitas = useCallback(async () => {
    setLoadingV(true); setErrorV('')
    try { setVisitas(await getVisitas(fechaVisitas)) }
    catch (e) { setErrorV(e.message) }
    finally { setLoadingV(false) }
  }, [fechaVisitas])

  useEffect(() => { if (tab === 'visitas') loadVisitas() }, [tab, loadVisitas])

  async function registrarEntrada() {
    if (!visitaForm.NombreVisitante?.trim()) { alert('El nombre del visitante es requerido.'); return }
    try {
      await createVisita(visitaForm)
      setVisitaForm({})
      setNuevaVisita(false)
      await loadVisitas()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function registrarSalida(id) {
    try {
      await registrarSalidaVisita(id, {})
      await loadVisitas()
    } catch (e) { alert('Error: ' + e.message) }
  }

  // ─── VEHÍCULOS ─────────────────────────────────────────────────────────────
  const [ordenesV, setOrdenesV]       = useState([])
  const [vehiculos, setVehiculos]     = useState([])
  const [loadingOV, setLoadingOV]     = useState(false)
  const [errorOV, setErrorOV]         = useState('')
  const [nuevaOrdenV, setNuevaOrdenV] = useState(false)
  const [ordenVForm, setOrdenVForm]   = useState({})
  const [rechazarModal, setRechazarModal] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [salidaModal, setSalidaModal]     = useState(null)
  const [llegadaModal, setLlegadaModal]   = useState(null)
  const [kmForm, setKmForm]               = useState('')
  const [obsForm, setObsForm]             = useState('')
  const [filtroEstado, setFiltroEstado]   = useState('')
  const ANGULOS = [
    { key: 'Frontal',    label: 'Frontal' },
    { key: 'Trasero',    label: 'Trasero' },
    { key: 'LateralIzq', label: 'Lat. Izquierdo' },
    { key: 'LateralDer', label: 'Lat. Derecho' },
  ]
  const fotoVacía = { Frontal: null, Trasero: null, LateralIzq: null, LateralDer: null }
  const [fotosSalida, setFotosSalida]     = useState(fotoVacía)
  const [fotosLlegada, setFotosLlegada]   = useState(fotoVacía)
  const [uploadingFoto, setUploadingFoto] = useState({})
  const [fotoModal, setFotoModal]         = useState(null)

  const loadOrdenesV = useCallback(async () => {
    setLoadingOV(true); setErrorOV('')
    try {
      const params = {}
      if (filtroEstado) params.estado = filtroEstado
      if (!esEncargado && !esAdmin && !esSeguridad && !esJefeSeg) params.mine = '1'
      setOrdenesV(await getOrdenesVehiculo(params))
    } catch (e) { setErrorOV(e.message) }
    finally { setLoadingOV(false) }
  }, [filtroEstado, esEncargado, esAdmin, esSeguridad, esJefeSeg])

  useEffect(() => {
    if (tab === 'vehiculos') {
      loadOrdenesV()
      getVehiculos().then(setVehiculos).catch(() => {})
    }
  }, [tab, loadOrdenesV])

  async function crearOrdenVehiculo() {
    if (!ordenVForm.VehiculoId) { alert('Selecciona un vehículo.'); return }
    if (!ordenVForm.Destino?.trim()) { alert('El destino es requerido.'); return }
    try {
      await createOrdenVehiculo(ordenVForm)
      setOrdenVForm({})
      setNuevaOrdenV(false)
      await loadOrdenesV()
      alert('Solicitud creada correctamente.')
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function autorizar(id) {
    if (!window.confirm('¿Autorizar esta solicitud?')) return
    try { await autorizarOrdenVehiculo(id); await loadOrdenesV() }
    catch (e) { alert('Error: ' + e.message) }
  }

  async function rechazar() {
    try {
      await rechazarOrdenVehiculo(rechazarModal, { MotivoRechazo: motivoRechazo })
      setRechazarModal(null); setMotivoRechazo('')
      await loadOrdenesV()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleFotoChange(angulo, tipo, file) {
    if (!file) return
    const key = `${tipo}_${angulo}`
    setUploadingFoto(p => ({ ...p, [key]: true }))
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const { url } = await uploadFotoVehiculo(ev.target.result)
          if (tipo === 'salida') setFotosSalida(p => ({ ...p, [angulo]: url }))
          else setFotosLlegada(p => ({ ...p, [angulo]: url }))
        } catch (e) { alert('Error subiendo foto: ' + e.message) }
        finally { setUploadingFoto(p => ({ ...p, [key]: false })) }
      }
      reader.readAsDataURL(file)
    } catch { setUploadingFoto(p => ({ ...p, [key]: false })) }
  }

  async function registrarSalida() {
    try {
      await registrarSalidaVehiculo(salidaModal, {
        KmInicial: kmForm,
        FotoSalidaFrontal:    fotosSalida.Frontal,
        FotoSalidaTrasero:    fotosSalida.Trasero,
        FotoSalidaLateralIzq: fotosSalida.LateralIzq,
        FotoSalidaLateralDer: fotosSalida.LateralDer,
      })
      setSalidaModal(null); setKmForm(''); setFotosSalida(fotoVacía)
      await loadOrdenesV()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function registrarLlegada() {
    try {
      await registrarLlegadaVehiculo(llegadaModal, {
        KmFinal: kmForm, Observaciones: obsForm,
        FotoLlegadaFrontal:    fotosLlegada.Frontal,
        FotoLlegadaTrasero:    fotosLlegada.Trasero,
        FotoLlegadaLateralIzq: fotosLlegada.LateralIzq,
        FotoLlegadaLateralDer: fotosLlegada.LateralDer,
      })
      setLlegadaModal(null); setKmForm(''); setObsForm(''); setFotosLlegada(fotoVacía)
      await loadOrdenesV()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function eliminarRondin(id) {
    if (!window.confirm('¿Eliminar este rondín? Esta acción no se puede deshacer.')) return
    try { await deleteRondin(id); await loadRondines() }
    catch (e) { alert('Error: ' + e.message) }
  }

  async function eliminarVisita(id) {
    if (!window.confirm('¿Eliminar este registro de visita?')) return
    try { await deleteVisita(id); await loadVisitas() }
    catch (e) { alert('Error: ' + e.message) }
  }

  async function eliminarOrdenV(id) {
    if (!window.confirm('¿Eliminar esta solicitud? Solo se pueden eliminar solicitudes pendientes o rechazadas.')) return
    try { await deleteOrdenVehiculo(id); await loadOrdenesV() }
    catch (e) { alert('Error: ' + e.message) }
  }

  // ─── CATÁLOGOS (admin) ─────────────────────────────────────────────────────
  const [catTab, setCatTab]         = useState('vehiculos')
  const [catVehiculos, setCatV]     = useState([])
  const [catExtintores, setCatE]    = useState([])
  const [catPuntos, setCatP]        = useState([])
  const [catForm, setCatForm]       = useState({})
  const [catModal, setCatModal]     = useState(null)
  const [catEditing, setCatEditing] = useState(null)
  const [areaModal, setAreaModal]   = useState(null)
  const [areaForm, setAreaForm]     = useState({ Nombre: '' })

  async function loadCatalogos() {
    const [v, e, p] = await Promise.all([getVehiculos(), getExtintores(), getPuntosRevision()])
    setCatV(v); setCatE(e); setCatP(p)
  }
  useEffect(() => { if (tab === 'catalogos') loadCatalogos() }, [tab])

  function openCat(tipo, item = null) {
    setCatModal(tipo); setCatEditing(item)
    setCatForm(item ? { ...item } : {})
  }

  async function saveCatalogo() {
    try {
      if (catModal === 'vehiculo') {
        catEditing ? await updateVehiculo(catEditing.VehiculoId, catForm) : await createVehiculo(catForm)
      } else if (catModal === 'extintor') {
        catEditing ? await updateExtintor(catEditing.ExtintorId, catForm) : await createExtintor(catForm)
      } else if (catModal === 'punto') {
        catEditing ? await updatePuntoRevision(catEditing.PuntoRevisionId, catForm) : await createPuntoRevision(catForm)
      }
      setCatModal(null); setCatEditing(null); setCatForm({})
      await loadCatalogos()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function saveArea() {
    try {
      areaForm.AreaRevisionId
        ? await updateAreaRevision(areaForm.AreaRevisionId, { Nombre: areaForm.Nombre })
        : await createAreaRevision(areaModal.PuntoRevisionId, { Nombre: areaForm.Nombre })
      setAreaModal(null); setAreaForm({ Nombre: '' })
      await loadCatalogos()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function eliminarCatVehiculo(id) {
    if (!window.confirm('¿Desactivar este vehículo del catálogo?')) return
    try { await deleteVehiculo(id); await loadCatalogos() }
    catch (e) { alert('Error: ' + e.message) }
  }

  async function eliminarCatExtintor(id) {
    if (!window.confirm('¿Desactivar este extintor?')) return
    try { await deleteExtintor(id); await loadCatalogos() }
    catch (e) { alert('Error: ' + e.message) }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const puntosAgrupados = rondinActivo?.registros
    ? Object.values(rondinActivo.registros.reduce((acc, r) => {
        const k = r.PuntoRevisionId || 'sin_punto'
        if (!acc[k]) acc[k] = { nombre: r.PuntoNombre || 'Sin punto', areas: [] }
        acc[k].areas.push(r)
        return acc
      }, {}))
    : []

  return (
    <div className="panel card" style={{ padding: 0 }}>
      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', padding: '0 24px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', padding: '14px 18px', cursor: 'pointer',
              fontWeight: tab === t.id ? '700' : '500', fontSize: '14px',
              color: tab === t.id ? '#1e3a5f' : '#6b7280',
              borderBottom: tab === t.id ? '2px solid #1e3a5f' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '24px' }}>

        {/* ══ DASHBOARD ═══════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ margin: '0 0 20px' }}>Resumen de Seguridad</h2>
            {dash ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Rondines hoy',       value: dash.rondinesHoy,         color: '#1e3a5f' },
                  { label: 'Rondines activos',    value: dash.rondinesActivos,     color: '#2563eb' },
                  { label: 'Visitas hoy',         value: dash.visitasHoy,          color: '#6b7280' },
                  { label: 'Visitas adentro',     value: dash.visitasAdentro,      color: '#d97706' },
                  { label: 'Vehículos pendientes',value: dash.vehiculosPendientes, color: '#dc2626' },
                  { label: 'Vehículos en curso',  value: dash.vehiculosEnCurso,    color: '#16a34a' },
                  { label: 'Incidencias total',   value: dash.totalIncidencias,    color: '#b91c1c' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>Cargando datos...</p>
            )}
            <button className="ghost-button" onClick={loadDash}>Actualizar</button>
          </div>
        )}

        {/* ══ RONDINES ════════════════════════════════════════════════════════ */}
        {tab === 'rondines' && (
          <div>
            {rondinActivo ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Rondín {rondinActivo.Folio}</h2>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
                      Guardia: {rondinActivo.Guardia} · Inicio: {fmt(rondinActivo.FechaInicio)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {rondinActivo.Estado === 'en_curso' && (
                      <button className="primary-button" style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        onClick={() => setFinalizarModal(true)}>
                        Finalizar rondín
                      </button>
                    )}
                    <button className="ghost-button" onClick={() => setRondinActivo(null)}>← Lista</button>
                  </div>
                </div>

                {/* Resumen */}
                {(() => {
                  const total    = rondinActivo.registros?.length || 0
                  const revisadas = rondinActivo.registros?.filter(r => r.Revisado).length || 0
                  const incidencias = rondinActivo.registros?.filter(r => r.TieneIncidencia).length || 0
                  const pct = total ? Math.round((revisadas / total) * 100) : 0
                  return (
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Total áreas', value: total, color: '#1e3a5f' },
                        { label: 'Revisadas', value: `${revisadas} (${pct}%)`, color: '#16a34a' },
                        { label: 'Con incidencia', value: incidencias, color: '#dc2626' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 18px' }}>
                          <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Por punto */}
                {puntosAgrupados.map(punto => (
                  <div key={punto.nombre} style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#1e3a5f', padding: '10px 16px', color: '#fff', fontWeight: '600', fontSize: '14px' }}>
                      {punto.nombre}
                    </div>
                    <table className="participants-table" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th>Área</th>
                          <th>Estado</th>
                          <th>Hora revisión</th>
                          <th>Incidencia</th>
                          {rondinActivo.Estado === 'en_curso' && <th>Acción</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {punto.areas.map(r => (
                          <tr key={r.RegistroId}>
                            <td>{r.AreaNombre || '-'}</td>
                            <td>
                              <span style={{ fontWeight: '600', color: r.Revisado ? '#16a34a' : '#d97706' }}>
                                {r.Revisado ? '✓ Revisado' : '○ Pendiente'}
                              </span>
                            </td>
                            <td>{r.HoraRevision ? fmt(r.HoraRevision) : '-'}</td>
                            <td>
                              {r.TieneIncidencia ? (
                                <Badge estado={r.NivelSeveridad} mapa={SEVERIDADES} />
                              ) : r.Revisado ? (
                                <span style={{ color: '#16a34a', fontSize: '13px' }}>Sin incidencia</span>
                              ) : '-'}
                            </td>
                            {rondinActivo.Estado === 'en_curso' && (
                              <td>
                                <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => { setRegistroModal(r); setFotoRondin(r.FotoUrl || null); setIncidenciaForm({ TieneIncidencia: r.TieneIncidencia, NivelSeveridad: r.NivelSeveridad, DescripcionIncidencia: r.DescripcionIncidencia, RequiereMantenimiento: r.RequiereMantenimiento }) }}>
                                  {r.Revisado ? 'Ver/Editar' : 'Revisar'}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {rondinActivo.registros?.length === 0 && (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '32px' }}>
                    No hay áreas configuradas. El admin debe configurar puntos y áreas de revisión en Catálogos.
                  </p>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Rondines</h2>
                  <button className="primary-button" onClick={iniciarRondin} disabled={iniciandoR}>
                    {iniciandoR ? 'Iniciando...' : '+ Iniciar rondín'}
                  </button>
                </div>
                {errorR && <div className="notification error">{errorR}</div>}
                {loadingR ? <p style={{ color: '#6b7280' }}>Cargando...</p> : (
                  <div className="table-wrap">
                    <table className="participants-table">
                      <thead><tr><th>Folio</th><th>Guardia</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Áreas</th><th>Incidencias</th><th>Acción</th></tr></thead>
                      <tbody>
                        {rondines.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Sin rondines registrados.</td></tr>
                        ) : rondines.map(r => (
                          <tr key={r.RondinId}>
                            <td style={{ fontWeight: '600', color: '#1e3a5f' }}>{r.Folio}</td>
                            <td>{r.Guardia || '-'}</td>
                            <td>{fmt(r.FechaInicio)}</td>
                            <td>{fmt(r.FechaFin)}</td>
                            <td>
                              <span style={{ fontWeight: '600', color: r.Estado === 'en_curso' ? '#d97706' : '#16a34a' }}>
                                {r.Estado === 'en_curso' ? 'En curso' : 'Finalizado'}
                              </span>
                            </td>
                            <td>{r.AreasRevisadas}/{r.TotalAreas}</td>
                            <td style={{ color: r.TotalIncidencias > 0 ? '#dc2626' : '#6b7280' }}>{r.TotalIncidencias || 0}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => verRondin(r.RondinId)}>
                                  {r.Estado === 'en_curso' ? 'Continuar' : 'Ver'}
                                </button>
                                {(esAdmin || esJefeSeg) && (
                                  <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                    onClick={() => eliminarRondin(r.RondinId)}>Eliminar</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Modal de registro de área */}
            {registroModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' }}>
                  <h3 style={{ margin: '0 0 16px' }}>Revisión: {registroModal.AreaNombre}</h3>
                  <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '13px' }}>Punto: {registroModal.PuntoNombre}</p>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!incidenciaForm.TieneIncidencia}
                      onChange={e => setIncidenciaForm(f => ({ ...f, TieneIncidencia: e.target.checked }))} />
                    <span style={{ fontWeight: '500' }}>Se encontró una incidencia</span>
                  </label>

                  {incidenciaForm.TieneIncidencia && (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Severidad</label>
                        <select className="form-control" value={incidenciaForm.NivelSeveridad || ''}
                          onChange={e => setIncidenciaForm(f => ({ ...f, NivelSeveridad: e.target.value }))}>
                          <option value="">Seleccionar...</option>
                          {Object.entries(SEVERIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Descripción</label>
                        <textarea className="form-control" rows={3} value={incidenciaForm.DescripcionIncidencia || ''}
                          onChange={e => setIncidenciaForm(f => ({ ...f, DescripcionIncidencia: e.target.value }))}
                          placeholder="Describe la incidencia..." />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!incidenciaForm.RequiereMantenimiento}
                          onChange={e => setIncidenciaForm(f => ({ ...f, RequiereMantenimiento: e.target.checked }))} />
                        <span style={{ fontSize: '13px' }}>Requiere orden de mantenimiento</span>
                      </label>
                    </>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Foto de evidencia (opcional)</label>
                    <label style={{ cursor: 'pointer', border: `2px dashed ${fotoRondin ? '#16a34a' : '#d1d5db'}`, borderRadius: '8px', overflow: 'hidden', background: fotoRondin ? '#f0fdf4' : '#f9fafb', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFotoRondinChange(e.target.files[0])} />
                      {uploadingFotoR ? (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Subiendo...</div>
                      ) : fotoRondin ? (
                        <img src={fotoRondin} alt="evidencia" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <div style={{ fontSize: '28px', marginBottom: '4px' }}>📷</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Toca para agregar foto</div>
                        </div>
                      )}
                    </label>
                    {fotoRondin && (
                      <button type="button" onClick={() => setFotoRondin(null)}
                        style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Quitar foto
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setRegistroModal(null); setIncidenciaForm({}); setFotoRondin(null) }}>Cancelar</button>
                    <button className="primary-button"
                      onClick={() => marcarRegistro(registroModal.RegistroId, incidenciaForm)}>
                      Marcar como revisado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal finalizar rondín */}
            {finalizarModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px' }}>
                  <h3 style={{ margin: '0 0 12px' }}>Finalizar rondín {rondinActivo?.Folio}</h3>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Observaciones generales (opcional)</label>
                  <textarea className="form-control" rows={3} value={finalizarObs}
                    onChange={e => setFinalizarObs(e.target.value)} placeholder="Observaciones del rondín..." style={{ marginBottom: '16px' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => setFinalizarModal(false)}>Cancelar</button>
                    <button className="primary-button" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={handleFinalizarRondin}>
                      Confirmar finalización
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ EXTINTORES ══════════════════════════════════════════════════════ */}
        {tab === 'extintores' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Extintores</h2>
            </div>
            {errorE && <div className="notification error">{errorE}</div>}
            {loadingE ? <p style={{ color: '#6b7280' }}>Cargando...</p> : (
              <div className="table-wrap">
                <table className="participants-table">
                  <thead><tr><th>Código</th><th>Tipo</th><th>Ubicación</th><th>Vencimiento</th><th>Última revisión</th><th>Condición</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {extintores.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Sin extintores configurados. El admin debe agregarlos en Catálogos.</td></tr>
                    ) : extintores.map(e => {
                      const vence = e.FechaVencimiento ? new Date(e.FechaVencimiento) : null
                      const vencido = vence && vence < new Date()
                      const pronto = vence && !vencido && (vence - new Date()) < 30 * 24 * 60 * 60 * 1000
                      return (
                        <tr key={e.ExtintorId}>
                          <td style={{ fontWeight: '600' }}>{e.Codigo}</td>
                          <td>{e.Tipo || '-'}</td>
                          <td>{e.Ubicacion || '-'}</td>
                          <td style={{ color: vencido ? '#dc2626' : pronto ? '#d97706' : undefined, fontWeight: (vencido || pronto) ? '600' : undefined }}>
                            {fmtDate(e.FechaVencimiento)} {vencido ? '⚠ VENCIDO' : pronto ? '⚠ Próximo' : ''}
                          </td>
                          <td>{fmtDate(e.UltimaRevision)}</td>
                          <td>{e.UltimaCondicion || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => { setExtintorRevisando(e); setRevisionForm({ FechaRevision: new Date().toISOString().substring(0, 10) }) }}>
                                + Revisión
                              </button>
                              <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => verHistorial(e)}>
                                Historial
                              </button>
                              {(esAdmin || esJefeSeg) && (
                                <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                  onClick={() => eliminarCatExtintor(e.ExtintorId)}>Desactivar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal revisión extintor */}
            {extintorRevisando && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px' }}>
                  <h3 style={{ margin: '0 0 4px' }}>Revisión de Extintor</h3>
                  <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '13px' }}>{extintorRevisando.Codigo} — {extintorRevisando.Ubicacion}</p>
                  {[
                    { label: 'Fecha de revisión', field: 'FechaRevision', type: 'date' },
                  ].map(f => (
                    <div key={f.field} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{f.label}</label>
                      <input type={f.type} className="form-control" value={revisionForm[f.field] || ''}
                        onChange={e => setRevisionForm(p => ({ ...p, [f.field]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Condición física</label>
                    <select className="form-control" value={revisionForm.CondicionFisica || ''}
                      onChange={e => setRevisionForm(p => ({ ...p, CondicionFisica: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      <option value="buena">Buena</option>
                      <option value="regular">Regular</option>
                      <option value="mala">Mala — requiere atención</option>
                    </select>
                  </div>
                  {[
                    { label: 'Presión adecuada', field: 'PresionAdecuada' },
                    { label: 'Vencimiento vigente', field: 'VencimientoVigente' },
                  ].map(f => (
                    <label key={f.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!revisionForm[f.field]}
                        onChange={e => setRevisionForm(p => ({ ...p, [f.field]: e.target.checked }))} />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{f.label}</span>
                    </label>
                  ))}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Observaciones</label>
                    <textarea className="form-control" rows={2} value={revisionForm.Observaciones || ''}
                      onChange={e => setRevisionForm(p => ({ ...p, Observaciones: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setExtintorRevisando(null); setRevisionForm({}) }}>Cancelar</button>
                    <button className="primary-button" onClick={guardarRevision}>Guardar revisión</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal historial */}
            {verHistorialId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Historial de revisiones</h3>
                    <button className="ghost-button" onClick={() => setVerHistorialId(null)}>Cerrar</button>
                  </div>
                  {historialExt.length === 0 ? <p style={{ color: '#6b7280' }}>Sin revisiones registradas.</p> : (
                    <table className="participants-table">
                      <thead><tr><th>Fecha</th><th>Guardia</th><th>Presión</th><th>Condición</th><th>Vencimiento</th><th>Obs.</th></tr></thead>
                      <tbody>
                        {historialExt.map(r => (
                          <tr key={r.RevisionId}>
                            <td>{fmtDate(r.FechaRevision)}</td>
                            <td>{r.Guardia || '-'}</td>
                            <td style={{ color: r.PresionAdecuada ? '#16a34a' : '#dc2626' }}>{r.PresionAdecuada ? 'Adecuada' : 'Baja'}</td>
                            <td>{r.CondicionFisica || '-'}</td>
                            <td style={{ color: r.VencimientoVigente ? '#16a34a' : '#dc2626' }}>{r.VencimientoVigente ? 'Vigente' : 'Vencido'}</td>
                            <td>{r.Observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ VISITAS ═════════════════════════════════════════════════════════ */}
        {tab === 'visitas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0 }}>Visitas</h2>
                <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaVisitas}
                  onChange={e => setFechaVisitas(e.target.value)} />
              </div>
              <button className="primary-button" onClick={() => setNuevaVisita(true)}>+ Registrar entrada</button>
            </div>
            {errorV && <div className="notification error">{errorV}</div>}
            {loadingV ? <p style={{ color: '#6b7280' }}>Cargando...</p> : (
              <div className="table-wrap">
                <table className="participants-table">
                  <thead><tr><th>Folio</th><th>Visitante</th><th>Empresa</th><th>A quién visita</th><th>Tipo</th><th>Entrada</th><th>Salida</th><th>Acción</th></tr></thead>
                  <tbody>
                    {visitas.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Sin visitas en esta fecha.</td></tr>
                    ) : visitas.map(v => (
                      <tr key={v.VisitaId}>
                        <td style={{ fontWeight: '600', color: '#1e3a5f' }}>{v.Folio || '-'}</td>
                        <td>{v.NombreVisitante}</td>
                        <td>{v.Empresa || '-'}</td>
                        <td>{v.AQuienVisita || '-'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{v.TipoVisita || '-'}</td>
                        <td>{fmt(v.HoraEntrada)}</td>
                        <td style={{ color: v.HoraSalida ? '#6b7280' : '#16a34a', fontWeight: v.HoraSalida ? undefined : '600' }}>
                          {v.HoraSalida ? fmt(v.HoraSalida) : '● Adentro'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {!v.HoraSalida && (
                              <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => { if (window.confirm(`Registrar salida de ${v.NombreVisitante}?`)) registrarSalida(v.VisitaId) }}>
                                Registrar salida
                              </button>
                            )}
                            {(esAdmin || esJefeSeg) && (
                              <button className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => eliminarVisita(v.VisitaId)}>Eliminar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal nueva visita */}
            {nuevaVisita && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' }}>
                  <h3 style={{ margin: '0 0 16px' }}>Registrar Visitante</h3>
                  {[
                    { label: 'Nombre del visitante *', field: 'NombreVisitante', placeholder: 'Nombre completo' },
                    { label: 'Empresa / Organización', field: 'Empresa', placeholder: 'Empresa' },
                    { label: 'Documento / ID', field: 'Documento', placeholder: 'INE, pasaporte...' },
                    { label: 'A quién visita', field: 'AQuienVisita', placeholder: 'Persona o área' },
                    { label: 'Motivo', field: 'Motivo', placeholder: 'Motivo de la visita' },
                  ].map(f => (
                    <div key={f.field} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{f.label}</label>
                      <input className="form-control" value={visitaForm[f.field] || ''} placeholder={f.placeholder}
                        onChange={e => setVisitaForm(p => ({ ...p, [f.field]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Tipo de visita</label>
                    <select className="form-control" value={visitaForm.TipoVisita || 'general'}
                      onChange={e => setVisitaForm(p => ({ ...p, TipoVisita: e.target.value }))}>
                      <option value="general">General</option>
                      <option value="proveedor">Proveedor</option>
                      <option value="contratista">Contratista</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setNuevaVisita(false); setVisitaForm({}) }}>Cancelar</button>
                    <button className="primary-button" onClick={registrarEntrada}>Registrar entrada</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ VEHÍCULOS ═══════════════════════════════════════════════════════ */}
        {tab === 'vehiculos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>
                  {esEncargado || esAdmin || esJefeSeg ? 'Solicitudes de Vehículo' : esSeguridad ? 'Control de Salidas' : 'Mis Solicitudes'}
                </h2>
                <select className="form-control" style={{ width: 'auto' }} value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {Object.entries(ESTADOS_VEHICULO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {!esSeguridad && (
                <button className="primary-button" onClick={() => setNuevaOrdenV(true)}>+ Nueva solicitud</button>
              )}
            </div>

            {errorOV && <div className="notification error">{errorOV}</div>}
            {loadingOV ? <p style={{ color: '#6b7280' }}>Cargando...</p> : (
              <div className="table-wrap">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Solicitante</th>
                      <th>Vehículo</th>
                      <th>Destino</th>
                      <th>Salida est.</th>
                      <th>Estado</th>
                      <th>Km ida/vuelta</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesV.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Sin solicitudes.</td></tr>
                    ) : ordenesV.map(o => (
                      <tr key={o.OrdenVehiculoId}>
                        <td style={{ fontWeight: '600', color: '#1e3a5f' }}>{o.Folio || '-'}</td>
                        <td>{o.Solicitante || '-'}</td>
                        <td>{o.VehiculoNombre || '-'}</td>
                        <td>{o.Destino || '-'}</td>
                        <td>{o.FechaSalidaEstimada ? `${fmtDate(o.FechaSalidaEstimada)} ${o.HoraSalidaEstimada || ''}`.trim() : '-'}</td>
                        <td><Badge estado={o.Estado} mapa={ESTADOS_VEHICULO} /></td>
                        <td style={{ fontSize: '12px', color: '#6b7280' }}>
                          {o.KmInicial != null ? `${o.KmInicial}` : '-'} / {o.KmFinal != null ? `${o.KmFinal}` : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {/* Encargado: autorizar/rechazar */}
                            {(esEncargado || esAdmin) && o.Estado === 'pendiente' && (<>
                              <button className="primary-button" style={{ padding: '3px 8px', fontSize: '12px', background: '#16a34a', borderColor: '#16a34a' }}
                                onClick={() => autorizar(o.OrdenVehiculoId)}>Autorizar</button>
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => { setRechazarModal(o.OrdenVehiculoId); setMotivoRechazo('') }}>Rechazar</button>
                            </>)}
                            {/* Guardia/jefe: registrar salida/llegada */}
                            {(esSeguridad || esAdmin || esJefeSeg) && o.Estado === 'autorizada' && (
                              <button className="primary-button" style={{ padding: '3px 8px', fontSize: '12px' }}
                                onClick={() => { setSalidaModal(o.OrdenVehiculoId); setKmForm('') }}>Registrar salida</button>
                            )}
                            {(esSeguridad || esAdmin || esJefeSeg) && o.Estado === 'en_curso' && (
                              <button className="primary-button" style={{ padding: '3px 8px', fontSize: '12px', background: '#16a34a', borderColor: '#16a34a' }}
                                onClick={() => { setLlegadaModal(o.OrdenVehiculoId); setKmForm(''); setObsForm('') }}>Registrar llegada</button>
                            )}
                            {/* Admin/jefe: eliminar pendientes y rechazadas */}
                            {(esAdmin || esJefeSeg) && (o.Estado === 'pendiente' || o.Estado === 'rechazada') && (
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => eliminarOrdenV(o.OrdenVehiculoId)}>Eliminar</button>
                            )}
                            {/* Ver fotos si hay alguna */}
                            {(o.FotoSalidaFrontal || o.FotoLlegadaFrontal) && (
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px' }}
                                onClick={() => setFotoModal(o)}>📷 Fotos</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal nueva solicitud */}
            {nuevaOrdenV && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' }}>
                  <h3 style={{ margin: '0 0 16px' }}>Nueva Solicitud de Vehículo</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Vehículo *</label>
                    <select className="form-control" value={ordenVForm.VehiculoId || ''}
                      onChange={e => setOrdenVForm(p => ({ ...p, VehiculoId: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {vehiculos.map(v => <option key={v.VehiculoId} value={v.VehiculoId}>{v.Marca} {v.Modelo} ({v.Placa})</option>)}
                    </select>
                  </div>
                  {[
                    { label: 'Destino *', field: 'Destino', placeholder: 'Lugar de destino' },
                    { label: 'Motivo', field: 'Motivo', placeholder: 'Motivo del viaje' },
                  ].map(f => (
                    <div key={f.field} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{f.label}</label>
                      <input className="form-control" value={ordenVForm[f.field] || ''} placeholder={f.placeholder}
                        onChange={e => setOrdenVForm(p => ({ ...p, [f.field]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Fecha salida estimada</label>
                      <input type="date" className="form-control" value={ordenVForm.FechaSalidaEstimada || ''}
                        onChange={e => setOrdenVForm(p => ({ ...p, FechaSalidaEstimada: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Hora estimada</label>
                      <input type="time" className="form-control" value={ordenVForm.HoraSalidaEstimada || ''}
                        onChange={e => setOrdenVForm(p => ({ ...p, HoraSalidaEstimada: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>No. de pasajeros</label>
                    <input type="number" className="form-control" min="1" value={ordenVForm.Pasajeros || ''}
                      onChange={e => setOrdenVForm(p => ({ ...p, Pasajeros: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setNuevaOrdenV(false); setOrdenVForm({}) }}>Cancelar</button>
                    <button className="primary-button" onClick={crearOrdenVehiculo}>Enviar solicitud</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal rechazo */}
            {rechazarModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px' }}>
                  <h3 style={{ margin: '0 0 12px', color: '#dc2626' }}>Rechazar solicitud</h3>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Motivo de rechazo (opcional)</label>
                  <textarea className="form-control" rows={3} value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)} style={{ marginBottom: '16px' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => setRechazarModal(null)}>Cancelar</button>
                    <button className="primary-button" style={{ background: '#dc2626', borderColor: '#dc2626' }} onClick={rechazar}>Confirmar rechazo</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal salida */}
            {salidaModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 16px' }}>Registrar Salida</h3>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Kilómetros iniciales</label>
                  <input type="number" className="form-control" value={kmForm} onChange={e => setKmForm(e.target.value)} style={{ marginBottom: '20px' }} />
                  <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1e3a5f' }}>Evidencia fotográfica del vehículo (salida)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    {ANGULOS.map(({ key, label }) => {
                      const uploading = uploadingFoto[`salida_${key}`]
                      const url = fotosSalida[key]
                      return (
                        <label key={key} style={{ cursor: 'pointer', border: `2px dashed ${url ? '#16a34a' : '#d1d5db'}`, borderRadius: '8px', overflow: 'hidden', background: url ? '#f0fdf4' : '#f9fafb', position: 'relative', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFotoChange(key, 'salida', e.target.files[0])} />
                          {uploading ? (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>Subiendo...</div>
                          ) : url ? (
                            <>
                              <img src={url} alt={label} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', padding: '2px' }}>✓ {label}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '22px' }}>📷</span>
                              <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center', padding: '0 4px' }}>{label}</span>
                            </>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setSalidaModal(null); setFotosSalida(fotoVacía) }}>Cancelar</button>
                    <button className="primary-button" onClick={registrarSalida}>Confirmar salida</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal llegada */}
            {llegadaModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 16px' }}>Registrar Llegada</h3>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Kilómetros finales</label>
                  <input type="number" className="form-control" value={kmForm} onChange={e => setKmForm(e.target.value)} style={{ marginBottom: '12px' }} />
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Observaciones</label>
                  <textarea className="form-control" rows={2} value={obsForm} onChange={e => setObsForm(e.target.value)} style={{ marginBottom: '20px' }} />
                  <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1e3a5f' }}>Evidencia fotográfica del vehículo (llegada)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    {ANGULOS.map(({ key, label }) => {
                      const uploading = uploadingFoto[`llegada_${key}`]
                      const url = fotosLlegada[key]
                      return (
                        <label key={key} style={{ cursor: 'pointer', border: `2px dashed ${url ? '#16a34a' : '#d1d5db'}`, borderRadius: '8px', overflow: 'hidden', background: url ? '#f0fdf4' : '#f9fafb', position: 'relative', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFotoChange(key, 'llegada', e.target.files[0])} />
                          {uploading ? (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>Subiendo...</div>
                          ) : url ? (
                            <>
                              <img src={url} alt={label} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', padding: '2px' }}>✓ {label}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '22px' }}>📷</span>
                              <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center', padding: '0 4px' }}>{label}</span>
                            </>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setLlegadaModal(null); setFotosLlegada(fotoVacía) }}>Cancelar</button>
                    <button className="primary-button" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={registrarLlegada}>Confirmar llegada</button>
                  </div>
                </div>
              </div>
            )}
            {/* Modal ver fotos */}
            {fotoModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Evidencia fotográfica — {fotoModal.Folio}</h3>
                    <button className="ghost-button" onClick={() => setFotoModal(null)}>Cerrar</button>
                  </div>
                  {[
                    { titulo: 'Fotos de Salida', keys: ['FotoSalidaFrontal', 'FotoSalidaTrasero', 'FotoSalidaLateralIzq', 'FotoSalidaLateralDer'], labels: ['Frontal', 'Trasero', 'Lat. Izquierdo', 'Lat. Derecho'] },
                    { titulo: 'Fotos de Llegada', keys: ['FotoLlegadaFrontal', 'FotoLlegadaTrasero', 'FotoLlegadaLateralIzq', 'FotoLlegadaLateralDer'], labels: ['Frontal', 'Trasero', 'Lat. Izquierdo', 'Lat. Derecho'] },
                  ].map(grupo => {
                    const hayFotos = grupo.keys.some(k => fotoModal[k])
                    if (!hayFotos) return null
                    return (
                      <div key={grupo.titulo} style={{ marginBottom: '24px' }}>
                        <p style={{ fontWeight: '600', fontSize: '14px', color: '#1e3a5f', marginBottom: '12px' }}>{grupo.titulo}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          {grupo.keys.map((k, i) => (
                            <div key={k}>
                              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>{grupo.labels[i]}</p>
                              {fotoModal[k] ? (
                                <a href={fotoModal[k]} target="_blank" rel="noreferrer">
                                  <img src={fotoModal[k]} alt={grupo.labels[i]} style={{ width: '100%', borderRadius: '6px', objectFit: 'cover', maxHeight: '160px', border: '1px solid #e5e7eb' }} />
                                </a>
                              ) : (
                                <div style={{ width: '100%', height: '100px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>Sin foto</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CATÁLOGOS (admin/jefe_seguridad) ═══════════════════════════════ */}
        {tab === 'catalogos' && (esAdmin || esJefeSeg) && (
          <div>
            <h2 style={{ margin: '0 0 16px' }}>Catálogos de Seguridad</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[{ id: 'vehiculos', label: 'Vehículos' }, { id: 'extintores', label: 'Extintores' }, { id: 'puntos', label: 'Puntos / Áreas' }].map(t => (
                <button key={t.id} type="button" onClick={() => setCatTab(t.id)}
                  className={catTab === t.id ? 'primary-button' : 'ghost-button'}
                  style={{ padding: '6px 16px' }}>{t.label}</button>
              ))}
            </div>

            {/* Sub-tab Vehículos */}
            {catTab === 'vehiculos' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Flota de Vehículos</h3>
                  <button className="ghost-button" onClick={() => openCat('vehiculo')}>+ Nuevo</button>
                </div>
                <div className="table-wrap">
                  <table className="participants-table">
                    <thead><tr><th>Marca</th><th>Modelo</th><th>Placa</th><th>Año</th><th>Color</th><th>Capacidad</th><th>Activo</th><th>Acc.</th></tr></thead>
                    <tbody>
                      {catVehiculos.map(v => (
                        <tr key={v.VehiculoId}>
                          <td>{v.Marca}</td><td>{v.Modelo}</td><td>{v.Placa}</td>
                          <td>{v.Año || '-'}</td><td>{v.Color || '-'}</td><td>{v.Capacidad || '-'}</td>
                          <td>{v.Activo ? '✓' : '✗'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px' }} onClick={() => openCat('vehiculo', v)}>Editar</button>
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => eliminarCatVehiculo(v.VehiculoId)}>Desactivar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Sub-tab Extintores */}
            {catTab === 'extintores' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Extintores</h3>
                  <button className="ghost-button" onClick={() => openCat('extintor')}>+ Nuevo</button>
                </div>
                <div className="table-wrap">
                  <table className="participants-table">
                    <thead><tr><th>Código</th><th>Tipo</th><th>Ubicación</th><th>Vencimiento</th><th>Activo</th><th>Acc.</th></tr></thead>
                    <tbody>
                      {catExtintores.map(e => (
                        <tr key={e.ExtintorId}>
                          <td>{e.Codigo}</td><td>{e.Tipo || '-'}</td><td>{e.Ubicacion || '-'}</td>
                          <td>{fmtDate(e.FechaVencimiento)}</td><td>{e.Activo ? '✓' : '✗'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px' }} onClick={() => openCat('extintor', e)}>Editar</button>
                              <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => eliminarCatExtintor(e.ExtintorId)}>Desactivar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Sub-tab Puntos / Áreas */}
            {catTab === 'puntos' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Puntos y Áreas de Revisión</h3>
                  <button className="ghost-button" onClick={() => openCat('punto')}>+ Nuevo punto</button>
                </div>
                {catPuntos.map(p => (
                  <div key={p.PuntoRevisionId} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden' }}>
                    <div style={{ background: '#f3f4f6', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600' }}>{p.Nombre}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px' }} onClick={() => openCat('punto', p)}>Editar punto</button>
                        <button className="ghost-button" style={{ padding: '3px 8px', fontSize: '12px' }}
                          onClick={() => { setAreaModal(p); setAreaForm({ Nombre: '' }) }}>+ Área</button>
                      </div>
                    </div>
                    {p.areas?.length > 0 && (
                      <div style={{ padding: '8px 16px' }}>
                        {p.areas.map(a => (
                          <div key={a.AreaRevisionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ fontSize: '13px' }}>— {a.Nombre}</span>
                            <button className="ghost-button" style={{ padding: '2px 6px', fontSize: '11px' }}
                              onClick={() => { setAreaModal(p); setAreaForm({ ...a }) }}>Editar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Modal catálogo genérico */}
            {catModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px' }}>
                  <h3 style={{ margin: '0 0 16px' }}>{catEditing ? 'Editar' : 'Nuevo'} {catModal === 'vehiculo' ? 'Vehículo' : catModal === 'extintor' ? 'Extintor' : 'Punto de Revisión'}</h3>

                  {catModal === 'vehiculo' && (
                    <>
                      {[{ l: 'Marca *', f: 'Marca' }, { l: 'Modelo *', f: 'Modelo' }, { l: 'Placa *', f: 'Placa' }, { l: 'Año', f: 'Año', t: 'number' }, { l: 'Color', f: 'Color' }, { l: 'Capacidad (personas)', f: 'Capacidad', t: 'number' }].map(i => (
                        <div key={i.f} style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{i.l}</label>
                          <input type={i.t || 'text'} className="form-control" value={catForm[i.f] || ''}
                            onChange={e => setCatForm(p => ({ ...p, [i.f]: e.target.value }))} />
                        </div>
                      ))}
                      {catEditing && (
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={catForm.Activo !== false}
                            onChange={e => setCatForm(p => ({ ...p, Activo: e.target.checked }))} />
                          <span style={{ fontSize: '13px' }}>Activo</span>
                        </label>
                      )}
                    </>
                  )}

                  {catModal === 'extintor' && (
                    <>
                      {[{ l: 'Código *', f: 'Codigo' }, { l: 'Tipo (ABC, CO2...)', f: 'Tipo' }, { l: 'Ubicación', f: 'Ubicacion' }].map(i => (
                        <div key={i.f} style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{i.l}</label>
                          <input className="form-control" value={catForm[i.f] || ''}
                            onChange={e => setCatForm(p => ({ ...p, [i.f]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Fecha de vencimiento</label>
                        <input type="date" className="form-control" value={catForm.FechaVencimiento ? String(catForm.FechaVencimiento).substring(0, 10) : ''}
                          onChange={e => setCatForm(p => ({ ...p, FechaVencimiento: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {catModal === 'punto' && (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Nombre *</label>
                        <input className="form-control" value={catForm.Nombre || ''}
                          onChange={e => setCatForm(p => ({ ...p, Nombre: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Descripción</label>
                        <textarea className="form-control" rows={2} value={catForm.Descripcion || ''}
                          onChange={e => setCatForm(p => ({ ...p, Descripcion: e.target.value }))} />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setCatModal(null); setCatEditing(null); setCatForm({}) }}>Cancelar</button>
                    <button className="primary-button" onClick={saveCatalogo}>Guardar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal área */}
            {areaModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px' }}>
                  <h3 style={{ margin: '0 0 4px' }}>{areaForm.AreaRevisionId ? 'Editar' : 'Nueva'} Área</h3>
                  <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '13px' }}>Punto: {areaModal.Nombre}</p>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Nombre del área *</label>
                  <input className="form-control" value={areaForm.Nombre || ''} style={{ marginBottom: '16px' }}
                    onChange={e => setAreaForm(p => ({ ...p, Nombre: e.target.value }))} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost-button" onClick={() => { setAreaModal(null); setAreaForm({ Nombre: '' }) }}>Cancelar</button>
                    <button className="primary-button" onClick={saveArea}>Guardar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
