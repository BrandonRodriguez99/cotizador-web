import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  getClientes,
  getCursos,
  getCoaches,
  getModalidades,
  getConceptos,
  getEstados,
  getProveedores,
  getUnidadesNegocio,
  searchParticipantes,
  generateFolio,
  getCotizaciones,
  getCotizacionesPendientes,
  getCotizacionById,
  deleteCotizacion,
  aprobarCotizacion,
  getOrdenesCompra,
  createOrdenCompra,
  approveOrdenCompra,
  rejectOrdenCompra,
  deleteOrdenCompra,
  getMe,
} from './api'
import { CATALOG_DEFINITIONS } from './catalogConfig'
import CatalogFormModal from './CatalogFormModal'
import NuevaCotizacion from './NuevaCotizacion'
import OrdenesCompra from './OrdenesCompra'
import CotizacionDetallesModal from './CotizacionDetallesModal'
import HistorialCotizaciones from './HistorialCotizaciones'
import Login from './Login'
import ChangePasswordModal from './ChangePasswordModal'
import Usuarios from './Usuarios'
import Dashboard from './Dashboard'
import Inicio from './Inicio'
import OrdenesMantenimiento from './OrdenesMantenimiento'
import Inventario from './Inventario'
import Seguridad from './Seguridad'
import RegistroProveedores from './RegistroProveedores'
import SolicitudVehiculoPublica from './SolicitudVehiculoPublica'
import RegistroVisitaPublica from './RegistroVisitaPublica'

const NAV_ICONS = {
  dashboard:            <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  inicio:               <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><polyline points="9 21 9 12 15 12 15 21"/></>,
  mantenimiento:        <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></>,
  inventario:           <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  vehiculos:            <><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  ordenesCompra:        <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  registroProveedores:  <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></>,
  cotizacion:           <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
  historial:            <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  aprobaciones:         <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  cursos:               <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  conceptos:            <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  coaches:              <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  modalidades:          <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>,
  clientes:             <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  proveedores:          <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></>,
  unidadesNegocio:      <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  areasConsumo:         <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  usuarios:             <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  seguridad:            <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
}

function NavIcon({ i }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {NAV_ICONS[i]}
    </svg>
  )
}

function App() {
  // ─── Auth ───────────────────────────────────────────────────────────────────
  const [token, setToken] = useState(() => window.localStorage.getItem('cotizador-token'))
  const [usuario, setUsuario] = useState(() => {
    try {
      if (!window.localStorage.getItem('cotizador-token')) return null
      const raw = window.localStorage.getItem('cotizador-usuario')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [checkingAuth, setCheckingAuth] = useState(() => !!window.localStorage.getItem('cotizador-token'))

  function handleLogin(newToken, newUsuario) {
    window.localStorage.setItem('cotizador-token', newToken)
    window.localStorage.setItem('cotizador-usuario', JSON.stringify(newUsuario))
    setToken(newToken)
    setUsuario(newUsuario)
  }

  function handlePasswordChanged() {
    const updated = { ...usuario, debeReiniciarPass: false }
    window.localStorage.setItem('cotizador-usuario', JSON.stringify(updated))
    setUsuario(updated)
  }

  function handleLogout() {
    window.localStorage.removeItem('cotizador-token')
    window.localStorage.removeItem('cotizador-usuario')
    setToken(null)
    setUsuario(null)
  }

  // ─── App state ──────────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState([])
  const [cursos, setCursos] = useState([])
  const [coaches, setCoaches] = useState([])
  const [modalidades, setModalidades] = useState([])
  const [conceptos, setConceptos] = useState([])
  const [estados, setEstados] = useState([])
  const [participantes, setParticipantes] = useState([])
  const [selectedCliente, setSelectedCliente] = useState('')
  const [selectedCurso, setSelectedCurso] = useState('')
  const [selectedCoach, setSelectedCoach] = useState('')
  const [selectedModalidad, setSelectedModalidad] = useState('')
  const [selectedUnidadNegocio, setSelectedUnidadNegocio] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const rolInicial = usuario?.rol
  const [activeView, setActiveView] = useState(
    rolInicial === 'mantenimiento'
      ? 'mantenimiento'
      : rolInicial === 'seguridad'
        ? 'seguridad'
        : (rolInicial === 'admin' || rolInicial === 'autorizador1' || rolInicial === 'autorizador2')
          ? 'dashboard'
          : 'inicio'
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [catalogItems, setCatalogItems] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState(null)
  const [catalogSuccess, setCatalogSuccess] = useState(null)
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)
  const [catalogEditingItem, setCatalogEditingItem] = useState(null)
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [catalogFormError, setCatalogFormError] = useState(null)
  const [duracionDias, setDuracionDias] = useState('')
  const [sesionesPorDia, setSesionesPorDia] = useState('')
  const [participantesCantidad, setParticipantesCantidad] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [margenPct, setMargenPct] = useState('35')
  const [margenPctDirectos, setMargenPctDirectos] = useState('35')
  const [margenPctIndirectos, setMargenPctIndirectos] = useState('10')

  // Estados para participantes y folio
  const [folio, setFolio] = useState('')
  const creadoPor = usuario?.nombre || ''
  const [participantesSeleccionados, setParticipantesSeleccionados] = useState([])
  const [modalParticipantesOpen, setModalParticipantesOpen] = useState(false)
  const [searchParticipantesInput, setSearchParticipantesInput] = useState('')
  const [participantesDisponibles, setParticipantesDisponibles] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [unidadesNegocio, setUnidadesNegocio] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [ordenesLoading, setOrdenesLoading] = useState(false)
  const [ordenesError, setOrdenesError] = useState(null)
  const [orderFolio, setOrderFolio] = useState('')
  const [editingCotizacion, setEditingCotizacion] = useState(null)
  const skipFolioGenRef = useRef(false)

  function getNextOrderSequence() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 1
    }
    const storageKey = 'ordenesCompraUltimoFolio'
    const current = Number(window.localStorage.getItem(storageKey) || '0')
    return current + 1
  }

  function reserveOrderSequence() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 1
    }
    const storageKey = 'ordenesCompraUltimoFolio'
    const next = Number(window.localStorage.getItem(storageKey) || '0') + 1
    window.localStorage.setItem(storageKey, String(next))
    return next
  }

  function generateOrderFolio() {
    const year = new Date().getFullYear()
    const sequence = getNextOrderSequence()
    return `OC-${year}-${String(sequence).padStart(6, '0')}`
  }

  // Verificar token al cargar: si está expirado, cerrar sesión directamente
  useEffect(() => {
    if (!token) { setCheckingAuth(false); return }
    getMe(token).then((data) => {
      if (!data) {
        handleLogout()
      } else {
        const rolActual = usuario?.rol
        if (data.usuario.rol !== rolActual) {
          window.localStorage.setItem('cotizador-token', data.token)
          window.localStorage.setItem('cotizador-usuario', JSON.stringify(data.usuario))
          setToken(data.token)
          setUsuario(data.usuario)
        }
      }
    }).catch(() => {
      handleLogout()
    }).finally(() => {
      setCheckingAuth(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function loadCatalogs() {
      try {
        setLoading(true)
        const [clientesRes, cursosRes, coachesRes, modalidadesRes, conceptosRes, estadosRes, proveedoresRes, unidadesNegocioRes] = await Promise.all([
          getClientes(),
          getCursos(),
          getCoaches(),
          getModalidades(),
          getConceptos(),
          getEstados(),
          getProveedores(),
          getUnidadesNegocio(),
        ])

        setClientes(clientesRes)
        setCursos(cursosRes)
        setCoaches(coachesRes)
        setModalidades(modalidadesRes)
        setConceptos(conceptosRes)
        setEstados(estadosRes)
        setProveedores(proveedoresRes)
        setUnidadesNegocio(unidadesNegocioRes)
      } catch (err) {
        console.error(err)
        setError('No se pudieron cargar los catálogos. Verifique que el backend esté levantado.')
      } finally {
        setLoading(false)
      }
    }

    loadCatalogs()
  }, [])

  useEffect(() => {
    loadParticipantes()
  }, [])

  useEffect(() => {
    if (activeView === 'aprobaciones') {
      loadPendientes()
    } else if (activeView === 'historial') {
      loadHistorial()
    } else if (activeView !== 'cotizacion' && activeView !== 'ordenesCompra') {
      loadCatalogView(activeView)
    }
    setCatalogSuccess(null)
  }, [activeView])

  // Estados para aprobaciones
  const [pendientes, setPendientes] = useState([])
  const [pendientesLoading, setPendientesLoading] = useState(false)
  const [pendientesError, setPendientesError] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [comentarioRechazo, setComentarioRechazo] = useState('')
  const [aprobandoId, setAprobandoId] = useState(null)
  const [cotizaciones, setCotizaciones] = useState([])
  const [cotizacionesLoading, setCotizacionesLoading] = useState(false)
  const [cotizacionesError, setCotizacionesError] = useState(null)
  
  // Estados para modal de detalles de cotización
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null)
  const [detallesCotizacionOpen, setDetallesCotizacionOpen] = useState(false)
  const [detallesLoading, setDetallesLoading] = useState(false)
  const [detallesError, setDetallesError] = useState(null)
  

  async function loadPendientes() {
    try {
      setPendientesLoading(true)
      setPendientesError(null)
      const list = await getCotizacionesPendientes()
      setPendientes(list)
    } catch (err) {
      console.error(err)
      setPendientesError('No se pudieron cargar cotizaciones pendientes')
    } finally {
      setPendientesLoading(false)
    }
  }

  async function loadHistorial() {
    try {
      setCotizacionesLoading(true)
      setCotizacionesError(null)
      const list = await getCotizaciones()
      setCotizaciones(list)
    } catch (err) {
      console.error(err)
      setCotizacionesError('No se pudo cargar el historial de cotizaciones')
    } finally {
      setCotizacionesLoading(false)
    }
  }

  async function loadOrdenes() {
    try {
      setOrdenesLoading(true)
      setOrdenesError(null)
      const list = await getOrdenesCompra()
      setOrdenes(list)
    } catch (err) {
      console.error(err)
      setOrdenesError('No se pudieron cargar las órdenes de compra.')
    } finally {
      setOrdenesLoading(false)
    }
  }

  async function handleCreateOrden(orden) {
    reserveOrderSequence()
    await createOrdenCompra(orden)
    await loadOrdenes()
    setOrderFolio(generateOrderFolio())
  }

  async function handleApproveOrden(id, aprobador) {
    await approveOrdenCompra(id, aprobador, usuario?.nombre)
    await loadOrdenes()
  }

  async function handleRejectOrden(id, aprobador, motivo) {
    await rejectOrdenCompra(id, aprobador, motivo)
    await loadOrdenes()
  }

  async function handleUpdateOrden() {
    await loadOrdenes()
  }

  async function handleDeleteOrden(id) {
    await deleteOrdenCompra(id)
    await loadOrdenes()
  }

  async function handleDeleteCotizacion(cotizacionId, folio) {
    if (!window.confirm(`¿Eliminar la cotización ${folio}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteCotizacion(cotizacionId)
      setCotizaciones(prev => prev.filter(c => c.CotizacionId !== cotizacionId))
    } catch (err) {
      alert('No se pudo eliminar la cotización: ' + err.message)
    }
  }

  async function loadDetallesCotizacion(cotizacionId) {
    try {
      setDetallesLoading(true)
      setDetallesError(null)
      const detalles = await getCotizacionById(cotizacionId)
      setCotizacionSeleccionada(detalles)
      setDetallesCotizacionOpen(true)
    } catch (err) {
      console.error(err)
      setDetallesError('No se pudo cargar los detalles de la cotización')
    } finally {
      setDetallesLoading(false)
    }
  }

  async function handleEditarCotizacion(cotizacionId) {
    try {
      const { cotizacion, costos, participantes: partic } = await getCotizacionById(cotizacionId)

      setSelectedCliente(String(cotizacion.ClienteId || ''))
      setSelectedCurso(String(cotizacion.CursoId || ''))
      setSelectedCoach(String(cotizacion.CoachId || ''))
      setSelectedModalidad(String(cotizacion.ModalidadId || ''))
      setSelectedUnidadNegocio(String(cotizacion.UnidadNegocioId || ''))
      setDuracionDias(String(cotizacion.DuracionDias || ''))
      setSesionesPorDia(String(cotizacion.SesionesPorDia || ''))
      setParticipantesCantidad(String(cotizacion.ParticipantesCantidad || ''))
      setFechaInicio(cotizacion.FechaInicio ? String(cotizacion.FechaInicio).substring(0, 10) : '')
      setFechaFin(cotizacion.FechaFin ? String(cotizacion.FechaFin).substring(0, 10) : '')
      setObservaciones(cotizacion.Observaciones || '')
      setMargenPctDirectos(String(cotizacion.MargenUtilidadPctDirectos ?? 35))
      setMargenPctIndirectos(String(cotizacion.MargenUtilidadPctIndirectos ?? 10))
      setFolio(cotizacion.Folio)

      const participantesMapeados = partic.map(p => ({
        EmpleadoId: p.EmpleadoId || null,
        NombreCompleto: p.NombreCompleto,
        Empresa: p.Empresa,
        Factura2: p.Factura2,
        Factura3: p.Factura3,
        observaciones: p.Observaciones,
      }))
      setParticipantesSeleccionados(participantesMapeados)

      const costosMapeados = costos.map(c => ({
        ConceptoCostoId: c.CotizacionCostoId,
        Nombre: c.Concepto || '',
        TipoCalculo: c.TipoCalculo || '',
        Formula: c.Formula || '',
        TipoCosto: c.TipoCosto || 'Directos',
        CostoUnitario: Number(c.CostoUnitario) || 0,
        quantityOverride: c.Cantidad ?? '',
      }))

      setEditingCotizacion({ id: cotizacion.CotizacionId, initialConcepts: costosMapeados })
      skipFolioGenRef.current = true
      setActiveView('cotizacion')
    } catch (err) {
      alert('No se pudo cargar la cotización para editar: ' + err.message)
    }
  }

  async function handleCotizacionSaved() {
    resetCotizacionForm()
    setEditingCotizacion(null)
    await loadHistorial()
    setActiveView('historial')
  }

  useEffect(() => {
    async function generateAutomaticFolio() {
      try {
        const response = await generateFolio()
        setFolio(response.folio)
      } catch (err) {
        console.error('Error generando folio:', err)
        setFolio(`COT-${new Date().getFullYear()}-000001`)
      }
    }
    if (activeView === 'cotizacion') {
      if (skipFolioGenRef.current) {
        skipFolioGenRef.current = false
      } else {
        generateAutomaticFolio()
      }
    } else {
      setFolio('')
    }
  }, [activeView])

  useEffect(() => {
    async function refreshOrdenesData() {
      if (activeView === 'ordenesCompra') {
        setOrderFolio(generateOrderFolio())
        await loadOrdenes()
      } else {
        setOrderFolio('')
      }
    }
    refreshOrdenesData()
  }, [activeView])

  // Buscar participantes disponibles conforme se escribe
  useEffect(() => {
    async function searchParticipantesDisponibles() {
      if (searchParticipantesInput.length >= 2) {
        try {
          const results = await searchParticipantes(searchParticipantesInput)
          setParticipantesDisponibles(results)
        } catch (err) {
          console.error('Error buscando participantes:', err)
          setParticipantesDisponibles([])
        }
      } else {
        setParticipantesDisponibles([])
      }
    }
    const timer = setTimeout(searchParticipantesDisponibles, 300)
    return () => clearTimeout(timer)
  }, [searchParticipantesInput])

  function getParticipanteKey(p) {
    return p.EmpleadoId ?? p.NumeroEmpleado ?? p.NombreCompleto
  }

  function agregarParticipante(participante) {
    const limite = Number(participantesCantidad)
    if (limite && participantesSeleccionados.length >= limite) return
    const key = getParticipanteKey(participante)
    if (!participantesSeleccionados.some((p) => getParticipanteKey(p) === key)) {
      setParticipantesSeleccionados([...participantesSeleccionados, participante])
      setSearchParticipantesInput('')
      setParticipantesDisponibles([])
    }
  }

  function quitarParticipante(key) {
    setParticipantesSeleccionados(participantesSeleccionados.filter((p) => getParticipanteKey(p) !== key))
  }

  function resetCotizacionForm() {
    setSelectedCliente('')
    setSelectedCurso('')
    setSelectedCoach('')
    setSelectedModalidad('')
    setSelectedUnidadNegocio('')
    setSelectedEstado('')
    setDuracionDias('')
    setSesionesPorDia('')
    setParticipantesCantidad('')
    setFechaInicio('')
    setFechaFin('')
    setObservaciones('')
    setParticipantesSeleccionados([])
    setModalParticipantesOpen(false)
    setSearchParticipantesInput('')
    setParticipantesDisponibles([])
  }

  async function refreshMainCatalogs() {
    const [clientesRes, cursosRes, coachesRes, modalidadesRes, conceptosRes, proveedoresRes, unidadesNegocioRes] = await Promise.all([
      getClientes(),
      getCursos(),
      getCoaches(),
      getModalidades(),
      getConceptos(),
      getProveedores(),
      getUnidadesNegocio(),
    ])

    setClientes(clientesRes)
    setCursos(cursosRes)
    setCoaches(coachesRes)
    setModalidades(modalidadesRes)
    setConceptos(conceptosRes)
    setProveedores(proveedoresRes)
    setUnidadesNegocio(unidadesNegocioRes)
  }

  function openCatalogModal(item = null) {
    if (item && item.target) {
      item = null
    }
    setCatalogFormError(null)
    setCatalogEditingItem(item)
    setCatalogModalOpen(true)
  }

  function closeCatalogModal() {
    setCatalogModalOpen(false)
    setCatalogEditingItem(null)
    setCatalogFormError(null)
  }

  async function handleSaveCatalog(formData) {
    const definition = CATALOG_DEFINITIONS[activeView]
    if (!definition) return

    try {
      setCatalogSaving(true)
      setCatalogFormError(null)

      if (catalogEditingItem && definition.update) {
        await definition.update(catalogEditingItem[definition.idField], formData)
        setCatalogSuccess(`Registro actualizado en ${definition.title}.`)
        try { window.alert(`Registro actualizado en ${definition.title}.`) } catch (e) { /* ignore */ }
      } else if (!catalogEditingItem && definition.create) {
        await definition.create(formData)
        setCatalogSuccess(`Registro guardado en ${definition.title}.`)
        try { window.alert(`Registro guardado en ${definition.title}.`) } catch (e) { /* ignore */ }
      } else {
        return
      }

      await loadCatalogView(activeView)
      await refreshMainCatalogs()
      closeCatalogModal()
    } catch (err) {
      console.error(err)
      setCatalogFormError(err.message || 'No se pudo guardar el registro.')
    } finally {
      setCatalogSaving(false)
    }
  }

  async function handleDeleteCatalog(item) {
    const definition = CATALOG_DEFINITIONS[activeView]
    if (!definition || !definition.delete) return

    // Confirm with user before deleting
    const displayName = item[definition.idField] || item.Nombre || JSON.stringify(item)
    const confirmMsg = `¿Eliminar registro ${displayName} de ${definition.title}? Esta acción borrará el registro de la base de datos.`
    if (!window.confirm(confirmMsg)) return

    try {
      setCatalogLoading(true)
      setCatalogError(null)
      // force hard delete
      await definition.delete(item[definition.idField], true)
      setCatalogSuccess(`Registro eliminado de ${definition.title}.`)
      try { window.alert(`Registro eliminado de ${definition.title}.`) } catch (e) { /* ignore */ }
      await loadCatalogView(activeView)
      await refreshMainCatalogs()
    } catch (err) {
      console.error(err)
      setCatalogError(err.message || 'No se pudo eliminar el registro.')
      try { window.alert(`Error: ${err.message || 'No se pudo eliminar el registro.'}`) } catch (e) {}
    } finally {
      setCatalogLoading(false)
    }
  }

  async function loadCatalogView(view) {
    const definition = CATALOG_DEFINITIONS[view]
    if (!definition) {
      setCatalogItems([])
      return
    }

    try {
      setCatalogError(null)
      setCatalogLoading(true)
      const items = await definition.fetch()
      setCatalogItems(items)
    } catch (err) {
      console.error(err)
      setCatalogError(`No se pudieron cargar los registros de ${definition.title}.`)
    } finally {
      setCatalogLoading(false)
    }
  }

  async function loadParticipantes(search = '') {
    try {
      const participantsRes = await searchParticipantes(search)
      setParticipantes(participantsRes)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los participantes.')
    }
  }

  function handleNavClick(view) {
    setActiveView(view)
    setSidebarOpen(false)
    if (detallesCotizacionOpen) {
      setDetallesCotizacionOpen(false)
      setCotizacionSeleccionada(null)
    }
  }

  const activeCatalogDefinition = CATALOG_DEFINITIONS[activeView] || null
  const isCatalogView = Boolean(activeCatalogDefinition)
  const hasCatalogActions = Boolean(activeCatalogDefinition && (activeCatalogDefinition.update || activeCatalogDefinition.delete))
  const pageTitle = activeView === 'inicio'
    ? 'Inicio'
    : activeView === 'dashboard'
      ? 'Dashboard'
      : activeView === 'usuarios'
        ? 'Usuarios'
        : activeView === 'ordenesCompra'
          ? 'Ordenes de Compra'
          : activeView === 'cotizacion'
            ? (editingCotizacion ? 'Editar Cotización' : 'Nueva Cotización')
            : activeView === 'historial'
              ? 'Historial de Cotizaciones'
              : activeView === 'aprobaciones'
                ? 'Aprobaciones'
                : activeView === 'mantenimiento'
                  ? 'Órdenes de Mantenimiento'
                  : activeView === 'inventario'
                    ? 'Inventario'
                    : activeView === 'seguridad'
                      ? 'Módulo de Seguridad'
                      : activeView === 'registroProveedores'
                          ? 'Registro de Proveedores'
                          : (activeCatalogDefinition ? activeCatalogDefinition.title : '')
  const breadcrumb = activeView === 'inicio'
    ? 'Inicio'
    : activeView === 'dashboard'
      ? 'Inicio > Dashboard'
      : activeView === 'usuarios'
        ? 'Administración > Usuarios'
        : activeView === 'ordenesCompra'
          ? 'Ordenes de Compra > Nueva Orden'
          : activeView === 'cotizacion'
            ? (editingCotizacion ? 'Cotizaciones > Editar Cotización' : 'Cotizaciones > Nueva Cotización')
            : activeView === 'historial'
              ? 'Cotizaciones > Historial de Cotizaciones'
              : activeView === 'aprobaciones'
                ? 'Cotizaciones > Aprobaciones'
                : activeView === 'mantenimiento'
                  ? 'Herramientas > Órdenes de Mantenimiento'
                  : activeView === 'inventario'
                    ? 'Herramientas > Inventario'
                    : activeView === 'seguridad'
                      ? 'Seguridad > Módulo de Seguridad'
                      : (activeCatalogDefinition ? `Catálogos > ${activeCatalogDefinition.title}` : '')

  if (window.location.pathname === '/solicitud-vehiculo') {
    return <SolicitudVehiculoPublica />
  }
  if (window.location.pathname === '/registrar-visita') {
    return <RegistroVisitaPublica />
  }

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px', color: '#6b7280' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '14px' }}>Verificando sesión...</span>
      </div>
    )
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />
  }

  if (usuario.debeReiniciarPass) {
    return <ChangePasswordModal usuario={usuario} token={token} onChanged={handlePasswordChanged} />
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"></div>
          <div>
            <p className="brand-label">UDAT</p>
            <span></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {usuario?.rol === 'seguridad' ? (
            // Rol seguridad: solo ve el módulo de seguridad
            <div className="nav-section">
              <p className="nav-title">Seguridad</p>
              <button type="button" className={`nav-link${activeView === 'seguridad' ? ' active' : ''}`} onClick={() => handleNavClick('seguridad')}>
                <NavIcon i="seguridad" />Módulo de Seguridad
              </button>
            </div>
          ) : (
            <>
              {usuario?.rol !== 'mantenimiento' && (
                (usuario?.rol === 'admin' || usuario?.rol === 'autorizador1' || usuario?.rol === 'autorizador2') ? (
                  <div className="nav-section">
                    <p className="nav-title">Inicio</p>
                    <button type="button" className={`nav-link${activeView === 'dashboard' ? ' active' : ''}`} onClick={() => handleNavClick('dashboard')}>
                      <NavIcon i="dashboard" />Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="nav-section">
                    <p className="nav-title">Inicio</p>
                    <button type="button" className={`nav-link${activeView === 'inicio' ? ' active' : ''}`} onClick={() => handleNavClick('inicio')}>
                      <NavIcon i="inicio" />Inicio
                    </button>
                  </div>
                )
              )}
              <div className="nav-section">
                <p className="nav-title">Herramientas</p>
                <button type="button" className={`nav-link${activeView === 'mantenimiento' ? ' active' : ''}`} onClick={() => handleNavClick('mantenimiento')}>
                  <NavIcon i="mantenimiento" />Órdenes de Mantenimiento
                </button>
                {usuario?.rol !== 'mantenimiento' && (<>
                  <button type="button" className={`nav-link${activeView === 'inventario' ? ' active' : ''}`} onClick={() => handleNavClick('inventario')}>
                    <NavIcon i="inventario" />Inventario
                  </button>
                  <button type="button" className={`nav-link${activeView === 'ordenesCompra' ? ' active' : ''}`} onClick={() => handleNavClick('ordenesCompra')}>
                    <NavIcon i="ordenesCompra" />Ordenes de Compra
                  </button>
                  <button type="button" className={`nav-link${activeView === 'registroProveedores' ? ' active' : ''}`} onClick={() => handleNavClick('registroProveedores')}>
                    <NavIcon i="registroProveedores" />Registro de Proveedores
                  </button>
                  <button type="button" className={`nav-link${activeView === 'cotizacion' ? ' active' : ''}`} onClick={() => handleNavClick('cotizacion')}>
                    <NavIcon i="cotizacion" />Nueva Cotización
                  </button>
                  <button type="button" className={`nav-link${activeView === 'historial' ? ' active' : ''}`} onClick={() => handleNavClick('historial')}>
                    <NavIcon i="historial" />Historial de Cotizaciones
                  </button>
                  <button type="button" className={`nav-link${activeView === 'aprobaciones' ? ' active' : ''}`} onClick={() => handleNavClick('aprobaciones')}>
                    <NavIcon i="aprobaciones" />Aprobaciones
                  </button>
                </>)}
              </div>
              {usuario?.rol !== 'mantenimiento' && <div className="nav-section">
                <p className="nav-title">Catálogos</p>
                <button type="button" className={`nav-link${activeView === 'cursos' ? ' active' : ''}`} onClick={() => handleNavClick('cursos')}><NavIcon i="cursos" />Cursos</button>
                <button type="button" className={`nav-link${activeView === 'conceptos' ? ' active' : ''}`} onClick={() => handleNavClick('conceptos')}><NavIcon i="conceptos" />Conceptos de Costo</button>
                <button type="button" className={`nav-link${activeView === 'coaches' ? ' active' : ''}`} onClick={() => handleNavClick('coaches')}><NavIcon i="coaches" />Coaches</button>
                <button type="button" className={`nav-link${activeView === 'modalidades' ? ' active' : ''}`} onClick={() => handleNavClick('modalidades')}><NavIcon i="modalidades" />Modalidades</button>
                <button type="button" className={`nav-link${activeView === 'clientes' ? ' active' : ''}`} onClick={() => handleNavClick('clientes')}><NavIcon i="clientes" />Empresas</button>
                <button type="button" className={`nav-link${activeView === 'proveedores' ? ' active' : ''}`} onClick={() => handleNavClick('proveedores')}><NavIcon i="proveedores" />Proveedores</button>
                <button type="button" className={`nav-link${activeView === 'unidadesNegocio' ? ' active' : ''}`} onClick={() => handleNavClick('unidadesNegocio')}><NavIcon i="unidadesNegocio" />Unidad de Negocio</button>
                <button type="button" className={`nav-link${activeView === 'areasConsumo' ? ' active' : ''}`} onClick={() => handleNavClick('areasConsumo')}><NavIcon i="areasConsumo" />Áreas de Consumo</button>
              </div>}
              {usuario?.rol === 'admin' && (
                <div className="nav-section">
                  <p className="nav-title">Administración</p>
                  <button type="button" className={`nav-link${activeView === 'usuarios' ? ' active' : ''}`} onClick={() => handleNavClick('usuarios')}><NavIcon i="usuarios" />Usuarios</button>
                  <button type="button" className={`nav-link${activeView === 'seguridad' ? ' active' : ''}`} onClick={() => handleNavClick('seguridad')}><NavIcon i="seguridad" />Seguridad</button>
                </div>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">
            {(usuario?.nombre || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="sidebar-user">{usuario?.nombre || ''}</p>
            <span className="sidebar-role" style={{ textTransform: 'capitalize' }}>{usuario?.rol || ''}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: '18px', padding: '4px',
              borderRadius: '6px', transition: 'color 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-strong)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            ⏻
          </button>
        </div>
      </aside>

      <main className="main-view">
        <header className="page-header">
          <div className="page-header-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Abrir menú de navegación"
            >
              ☰
            </button>
            <div>
              <h1>{pageTitle}</h1>
            </div>
          </div>
          {!isCatalogView && (
            <div className="page-header-actions">
              <div className="header-avatar" title={usuario?.nombre || ''}>
                {(usuario?.nombre || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {loading && !isCatalogView && <div className="notification">Cargando datos de catálogo...</div>}
        {error && !isCatalogView && <div className="notification error">{error}</div>}
        {isCatalogView && catalogLoading && <div className="notification">Cargando catálogo...</div>}
        {isCatalogView && catalogError && <div className="notification error">{catalogError}</div>}
        {isCatalogView && catalogSuccess && <div className="notification success">{catalogSuccess}</div>}

        {activeView === 'inicio' ? (
          <Inicio usuario={usuario} onNavigate={handleNavClick} />
        ) : activeView === 'dashboard' ? (
          <Dashboard usuario={usuario} />
        ) : activeView === 'usuarios' ? (
          <Usuarios token={token} />
        ) : isCatalogView ? (
          <section className="panel card">
            <div className="panel-header space-between">
              <div>
                <p style={{ margin: '8px 0 0', color: '#6b7280' }}>{activeCatalogDefinition.subtitle}</p>
              </div>
              {(activeView !== 'proveedores' || usuario?.rol === 'admin') && (
                <button className="ghost-button" type="button" onClick={() => openCatalogModal()}>
                  Nuevo registro
                </button>
              )}
            </div>
            <div className="table-wrap">
              <table className="participants-table">
                <thead>
                  <tr>
                    {activeCatalogDefinition.columns.map((column) => (
                      <th key={column.header}>{column.header}</th>
                    ))}
                    {hasCatalogActions && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {catalogItems.length === 0 && !catalogLoading ? (
                    <tr>
                      <td colSpan={activeCatalogDefinition.columns.length + (hasCatalogActions ? 1 : 0)} style={{ padding: '24px', color: '#6b7280' }}>
                        No hay registros disponibles.
                      </td>
                    </tr>
                  ) : (
                    catalogItems.map((item, rowIndex) => (
                      <tr key={item[activeCatalogDefinition.columns[0].accessor] || rowIndex}>
                        {activeCatalogDefinition.columns.map((column) => (
                          <td key={column.accessor || column.header}>
                            {column.render ? column.render(item[column.accessor]) : item[column.accessor] ?? '-'}
                          </td>
                        ))}
                        {hasCatalogActions && (
                          <td>
                            {activeCatalogDefinition.update && (activeView !== 'proveedores' || usuario?.rol === 'admin') && (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => openCatalogModal(item)}
                              >
                                Editar
                              </button>
                            )}
                            {activeCatalogDefinition.delete && (activeView !== 'proveedores' || usuario?.rol === 'admin') && (
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleDeleteCatalog(item)}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">Total registros: {catalogItems.length}</div>
          </section>
        ) : activeView === 'ordenesCompra' ? (
          <OrdenesCompra
            proveedores={proveedores}
            unidadesNegocio={unidadesNegocio}
            ordenes={ordenes}
            currentUser={creadoPor}
            currentUserRol={usuario?.rol}
            folio={orderFolio}
            onCreateOrden={handleCreateOrden}
            onUpdateOrden={handleUpdateOrden}
            onApproveOrden={handleApproveOrden}
            onRejectOrden={handleRejectOrden}
            onDeleteOrden={handleDeleteOrden}
          />
        ) : activeView === 'historial' ? (
          <HistorialCotizaciones
            cotizaciones={cotizaciones}
            loading={cotizacionesLoading}
            error={cotizacionesError}
            onVerCotizacion={loadDetallesCotizacion}
            onEditarCotizacion={handleEditarCotizacion}
            onDeleteCotizacion={handleDeleteCotizacion}
            currentUser={creadoPor}
            currentUserRol={usuario?.rol}
          />
          ) : activeView === 'mantenimiento' ? (
          <OrdenesMantenimiento
            currentUser={creadoPor}
            currentUserRol={usuario?.rol}
          />
        ) : activeView === 'inventario' ? (
          <section className="panel card">
            <div className="panel-header">
              <div>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
                  Gestiona el stock de materiales y refacciones
                </p>
              </div>
            </div>
            <Inventario isAdmin={usuario?.rol === 'admin'} />
          </section>
        ) : activeView === 'registroProveedores' ? (
          <RegistroProveedores currentUser={usuario?.nombre} currentUserRol={usuario?.rol} />
        ) : activeView === 'seguridad' ? (
          <Seguridad usuario={usuario} />
        ) : activeView === 'aprobaciones' ? (
            <section className="panel card">
              <div className="panel-header space-between">
                <div>
                  <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
                    {pendientes.length > 0
                      ? `${pendientes.length} cotización${pendientes.length !== 1 ? 'es' : ''} pendiente${pendientes.length !== 1 ? 's' : ''} de aprobación`
                      : 'Sin cotizaciones pendientes de aprobación'}
                  </p>
                </div>
              </div>

              {usuario?.rol !== 'autorizador1' && usuario?.rol !== 'admin' && (
                <div className="notification" style={{ marginBottom: '16px' }}>
                  Solo el autorizador 1 puede aprobar o rechazar cotizaciones. Puedes consultar el listado.
                </div>
              )}

              {pendientesLoading && <div className="notification">Cargando pendientes...</div>}
              {pendientesError && <div className="notification error">{pendientesError}</div>}

              {/* Modal de rechazo inline */}
              {rechazandoId && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ fontWeight: '600', color: '#991b1b', marginBottom: '10px' }}>
                    Rechazar cotización {pendientes.find(p => p.CotizacionId === rechazandoId)?.Folio}
                  </p>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                    Motivo de rechazo (opcional)
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={comentarioRechazo}
                    onChange={e => setComentarioRechazo(e.target.value)}
                    placeholder="Describe el motivo del rechazo..."
                    style={{ marginBottom: '10px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="secondary-button"
                      style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                      disabled={aprobandoId !== null}
                      onClick={async () => {
                        setAprobandoId(rechazandoId)
                        try {
                          await aprobarCotizacion(rechazandoId, false, usuario.nombre, comentarioRechazo)
                          setRechazandoId(null)
                          setComentarioRechazo('')
                          await loadPendientes()
                          await loadHistorial()
                        } catch (err) {
                          window.alert('Error al rechazar: ' + err.message)
                        } finally {
                          setAprobandoId(null)
                        }
                      }}
                    >
                      Confirmar rechazo
                    </button>
                    <button
                      className="ghost-button"
                      disabled={aprobandoId !== null}
                      onClick={() => { setRechazandoId(null); setComentarioRechazo('') }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="table-wrap">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Cliente</th>
                      <th>Curso</th>
                      <th>Coach</th>
                      <th>Total</th>
                      <th>Creado por</th>
                      <th>Fecha</th>
                      {(usuario?.rol === 'autorizador1' || usuario?.rol === 'admin') && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.length === 0 ? (
                      <tr>
                        <td colSpan={usuario?.rol === 'autorizador1' || usuario?.rol === 'admin' ? 8 : 7}
                            style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                          No hay cotizaciones pendientes de aprobación.
                        </td>
                      </tr>
                    ) : (
                      pendientes.map((p) => (
                        <tr key={p.CotizacionId}>
                          <td style={{ fontWeight: '600', color: '#2563eb' }}>{p.Folio}</td>
                          <td>{p.Cliente || '-'}</td>
                          <td>{p.Curso || '-'}</td>
                          <td>{p.Coach || '-'}</td>
                          <td>{'$' + Number(p.TotalConGanancia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td>{p.CreadoPor || '-'}</td>
                          <td>{p.FechaCreacion ? new Date(p.FechaCreacion).toLocaleDateString('es-MX') : '-'}</td>
                          {(usuario?.rol === 'autorizador1' || usuario?.rol === 'admin') && (
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="primary-button"
                                  style={{ padding: '4px 12px', fontSize: '13px', background: '#16a34a', borderColor: '#16a34a' }}
                                  disabled={aprobandoId !== null || rechazandoId !== null}
                                  onClick={async () => {
                                    if (!window.confirm(`¿Aprobar la cotización ${p.Folio}?`)) return
                                    setAprobandoId(p.CotizacionId)
                                    try {
                                      await aprobarCotizacion(p.CotizacionId, true, usuario.nombre, '')
                                      await loadPendientes()
                                      await loadHistorial()
                                    } catch (err) {
                                      window.alert('Error al aprobar: ' + err.message)
                                    } finally {
                                      setAprobandoId(null)
                                    }
                                  }}
                                >
                                  {aprobandoId === p.CotizacionId ? '...' : 'Aprobar'}
                                </button>
                                <button
                                  className="ghost-button"
                                  style={{ padding: '4px 12px', fontSize: '13px', color: '#dc2626', borderColor: '#fca5a5' }}
                                  disabled={aprobandoId !== null || rechazandoId !== null}
                                  onClick={() => { setRechazandoId(p.CotizacionId); setComentarioRechazo('') }}
                                >
                                  Rechazar
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">Total pendientes: {pendientes.length}</div>
            </section>
          ) : (
            <NuevaCotizacion
              clientes={clientes}
              cursos={cursos}
              coaches={coaches}
              modalidades={modalidades}
              unidadesNegocio={unidadesNegocio}
              participantes={participantes}
              conceptos={conceptos}
              selectedCliente={selectedCliente}
              setSelectedCliente={setSelectedCliente}
              selectedCurso={selectedCurso}
              setSelectedCurso={setSelectedCurso}
              selectedCoach={selectedCoach}
              setSelectedCoach={setSelectedCoach}
              selectedModalidad={selectedModalidad}
              setSelectedModalidad={setSelectedModalidad}
              selectedUnidadNegocio={selectedUnidadNegocio}
              setSelectedUnidadNegocio={setSelectedUnidadNegocio}
              duracionDias={duracionDias}
              setDuracionDias={setDuracionDias}
              sesionesPorDia={sesionesPorDia}
              setSesionesPorDia={setSesionesPorDia}
              participantesCantidad={participantesCantidad}
              setParticipantesCantidad={setParticipantesCantidad}
              fechaInicio={fechaInicio}
              setFechaInicio={setFechaInicio}
              fechaFin={fechaFin}
              setFechaFin={setFechaFin}
              observaciones={observaciones}
              setObservaciones={setObservaciones}
              estados={estados}
              selectedEstado={selectedEstado}
              folio={folio}
              creadoPor={creadoPor}
              participantesSeleccionados={participantesSeleccionados}
              agregarParticipante={agregarParticipante}
              quitarParticipante={quitarParticipante}
              modalParticipantesOpen={modalParticipantesOpen}
              setModalParticipantesOpen={setModalParticipantesOpen}
              searchParticipantesInput={searchParticipantesInput}
              setSearchParticipantesInput={setSearchParticipantesInput}
              participantesDisponibles={participantesDisponibles}
              margenPctDirectos={margenPctDirectos}
              setMargenPctDirectos={setMargenPctDirectos}
              margenPctIndirectos={margenPctIndirectos}
              setMargenPctIndirectos={setMargenPctIndirectos}
              editingCotizacionId={editingCotizacion?.id ?? null}
              initialConcepts={editingCotizacion?.initialConcepts ?? []}
              onSaved={handleCotizacionSaved}
            />
          )}
      </main>

      <CatalogFormModal
        open={catalogModalOpen && isCatalogView}
        catalogKey={activeView}
        definition={activeCatalogDefinition}
        initialData={catalogEditingItem}
        mode={catalogEditingItem ? 'edit' : 'create'}
        onClose={closeCatalogModal}
        onSubmit={handleSaveCatalog}
        saving={catalogSaving}
        error={catalogFormError}
      />

      <CotizacionDetallesModal
        open={detallesCotizacionOpen}
        cotizacionData={cotizacionSeleccionada}
        loading={detallesLoading}
        error={detallesError}
        onClose={() => {
          setDetallesCotizacionOpen(false)
          setCotizacionSeleccionada(null)
        }}
      />
    </div>
  )
}

export default App
