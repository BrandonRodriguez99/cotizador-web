import { useState, useEffect, useMemo, useCallback } from 'react'
import { getDormitorios, updateDormitorio, seedDormitorios, checkinDormitorio, checkoutDormitorio, getHistorialDormitorio, buscarAlumnosDormitorio, getGeneracionesDormitorio, buscarOperadoresDormitorio, getHistorialGlobalDormitorios, getEmpresasOperadores, getDetalleAlumno, getDetalleOperador, getEstadisticasDormitorios } from './api'

const C = {
  disponible: '#2d9b4e', ocupada: '#0B2341', mantenimiento: '#b91c1c',
  parcial: '#FB6500',
  navy: '#0B2341', white: '#ffffff', g50: '#f9fafb', g100: '#f3f4f6',
  g200: '#e5e7eb', g400: '#9ca3af', g500: '#6b7280', g600: '#4b5563',
  g700: '#374151', g800: '#1f2937', g900: '#111827',
  mujeres: '#F6A334', hombres: '#1a5276',
}

const RW = 58, RH = 52, GAP = 6
const PLANTA_BAJA_MUJERES = [
  { codigo: 'DR-M-06', x: 200, y: 10, w: RW, h: RH },
  { codigo: 'DR-M-04', x: 200 + (RW + GAP), y: 10, w: RW, h: RH },
  { codigo: 'DR-M-02', x: 200 + 2 * (RW + GAP), y: 10, w: RW, h: RH },
  { codigo: 'DR-M-09', x: 200, y: 10 + RH + 30, w: RW, h: RH },
  { codigo: 'DR-M-08', x: 200 + (RW + GAP), y: 10 + RH + 30, w: RW, h: RH },
  { codigo: 'DR-M-07', x: 200 + 2 * (RW + GAP), y: 10 + RH + 30, w: RW, h: RH },
  { codigo: 'DR-M-05', x: 200 + 3 * (RW + GAP) + 20, y: 10 + RH + 30, w: RW, h: RH },
  { codigo: 'DR-M-03', x: 200 + 4 * (RW + GAP) + 20, y: 10 + RH + 30, w: RW, h: RH },
  { codigo: 'DR-M-01', x: 200 + 5 * (RW + GAP) + 20, y: 10 + RH + 30, w: RW, h: RH },
  { codigo: 'DR-M-10', x: 200, y: 10 + 2 * (RH + 30), w: RW, h: RH },
  { codigo: 'DR-M-11', x: 200 + (RW + GAP), y: 10 + 2 * (RH + 30), w: RW, h: RH },
  { codigo: 'DR-M-12', x: 200 + 2 * (RW + GAP), y: 10 + 2 * (RH + 30), w: RW, h: RH },
  { codigo: 'DR-M-13', x: 200 + 3 * (RW + GAP) + 20, y: 10 + 2 * (RH + 30), w: RW, h: RH },
  { codigo: 'DR-M-14', x: 200 + 4 * (RW + GAP) + 20, y: 10 + 2 * (RH + 30), w: RW, h: RH },
  { codigo: 'DR-M-15', x: 200 + 5 * (RW + GAP) + 20, y: 10 + 2 * (RH + 30), w: RW, h: RH },
]

const HX = 700, HY1 = 10, HY2 = 10 + RH + 30, HY3 = 10 + 2 * (RH + 30)
const HS = RW + GAP
const LAVW = 120
const HRX = HX + LAVW + 10
const PLANTA_BAJA_HOMBRES = [
  { codigo: 'DR-H-01', x: HRX, y: HY1, w: RW, h: RH },
  { codigo: 'DR-H-03', x: HRX + HS * 2, y: HY1, w: RW, h: RH },
  { codigo: 'DR-H-05', x: HRX + HS * 4, y: HY1, w: RW, h: RH },
  { codigo: 'DR-H-02', x: HRX, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-04', x: HRX + HS, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-06', x: HRX + HS * 2, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-07', x: HRX + HS * 3, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-08', x: HRX + HS * 4, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-09', x: HRX + HS * 5, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-10', x: HRX + HS * 6, y: HY2, w: RW, h: RH },
  { codigo: 'DR-H-20', x: HX, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-19', x: HX + HS, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-18', x: HX + HS * 2, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-17', x: HX + HS * 3, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-16', x: HX + HS * 4, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-15', x: HX + HS * 5, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-14', x: HX + HS * 6, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-13', x: HX + HS * 7, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-12', x: HX + HS * 8, y: HY3, w: RW, h: RH },
  { codigo: 'DR-H-11', x: HX + HS * 9, y: HY3, w: RW, h: RH },
]

const AY1 = 10, AY2 = 10 + RH + 24
const ALX = 160
const PLANTA_ALTA_IZQ = [
  { codigo: 'DR-H-21', x: ALX, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-23', x: ALX + HS * 2, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-25', x: ALX + HS * 4, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-22', x: ALX, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-24', x: ALX + HS, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-26', x: ALX + HS * 2, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-27', x: ALX + HS * 3, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-28', x: ALX + HS * 4, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-29', x: ALX + HS * 5, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-30', x: ALX + HS * 6, y: AY2, w: RW, h: RH },
]

const ARX = ALX + HS * 7 + 130
const PLANTA_ALTA_DER = [
  { codigo: 'DR-H-31', x: ARX, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-33', x: ARX + HS * 2, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-35', x: ARX + HS * 3, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-37', x: ARX + HS * 4, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-39', x: ARX + HS * 5, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-41', x: ARX + HS * 6, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-43', x: ARX + HS * 7, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-45', x: ARX + HS * 8, y: AY1, w: RW, h: RH },
  { codigo: 'DR-H-32', x: ARX, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-34', x: ARX + HS, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-36', x: ARX + HS * 2, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-38', x: ARX + HS * 3, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-40', x: ARX + HS * 4, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-42', x: ARX + HS * 5, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-44', x: ARX + HS * 6, y: AY2, w: RW, h: RH },
  { codigo: 'DR-H-46', x: ARX + HS * 7, y: AY2, w: RW, h: RH },
]

const PLANTA_ALTA = [...PLANTA_ALTA_IZQ, ...PLANTA_ALTA_DER]

function estadoColor(estado, ocupantes, capacidad) {
  if (estado === 'Mantenimiento') return C.mantenimiento
  if (ocupantes >= capacidad) return C.ocupada
  if (ocupantes > 0) return C.parcial
  return C.disponible
}

function estadoLabel(estado, ocupantes, capacidad) {
  if (estado === 'Mantenimiento') return 'Mantenimiento'
  if (ocupantes >= capacidad) return 'Ocupada'
  if (ocupantes > 0) return 'Parcial'
  return 'Disponible'
}

export default function Dormitorios() {
  const [dormitorios, setDormitorios] = useState([])
  const [ocupantes, setOcupantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [planta, setPlanta] = useState('Baja')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [generaciones, setGeneraciones] = useState([])
  const [filtroGen, setFiltroGen] = useState('')

  // Vista principal: plano vs historial
  const [vistaActiva, setVistaActiva] = useState('plano')

  // Dual check-in: alumno vs operador
  const [tipoCheckin, setTipoCheckin] = useState('alumno')
  const [operadores, setOperadores] = useState([])
  const [busqOperador, setBusqOperador] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [cargandoOps, setCargandoOps] = useState(false)

  // Historial global
  const [histGlobal, setHistGlobal] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [histFechaDesde, setHistFechaDesde] = useState('')
  const [histFechaHasta, setHistFechaHasta] = useState('')
  const [histBusqueda, setHistBusqueda] = useState('')
  const [histHabitacion, setHistHabitacion] = useState('')
  const [histActivo, setHistActivo] = useState('')
  const [histTipo, setHistTipo] = useState('')
  const [sortField, setSortField] = useState('FechaCheckIn')
  const [sortDir, setSortDir] = useState('desc')
  const [detallePersona, setDetallePersona] = useState(null)
  const [detalleCargando, setDetalleCargando] = useState(false)

  // Dashboard
  const [dashData, setDashData] = useState(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashDias, setDashDias] = useState(30)

  const load = useCallback(async () => {
    try {
      const data = await getDormitorios()
      setDormitorios(data.dormitorios || [])
      setOcupantes(data.ocupantes || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    getGeneracionesDormitorio().then(setGeneraciones).catch(() => {})
    getEmpresasOperadores().then(setEmpresas).catch(() => {})
  }, [load])

  useEffect(() => {
    if (dormitorios.length === 0 && !loading) {
      seedDormitorios().then(() => load())
    }
  }, [dormitorios, loading, load])

  const dormMap = useMemo(() => {
    const m = {}
    dormitorios.forEach(d => { m[d.Codigo] = d })
    return m
  }, [dormitorios])

  const ocupMap = useMemo(() => {
    const m = {}
    ocupantes.forEach(o => {
      if (!m[o.DormitorioId]) m[o.DormitorioId] = []
      m[o.DormitorioId].push(o)
    })
    return m
  }, [ocupantes])

  const stats = useMemo(() => {
    const plantaDorms = dormitorios.filter(d => d.Planta === planta)
    const disp = plantaDorms.filter(d => d.Estado !== 'Mantenimiento' && d.OcupantesActuales === 0).length
    const parcial = plantaDorms.filter(d => d.Estado !== 'Mantenimiento' && d.OcupantesActuales > 0 && d.OcupantesActuales < d.Capacidad).length
    const ocup = plantaDorms.filter(d => d.Estado !== 'Mantenimiento' && d.OcupantesActuales >= d.Capacidad).length
    const mant = plantaDorms.filter(d => d.Estado === 'Mantenimiento').length
    const totalOcupantes = plantaDorms.reduce((s, d) => s + d.OcupantesActuales, 0)
    return { total: plantaDorms.length, disp, parcial, ocup, mant, totalOcupantes }
  }, [dormitorios, planta])

  const handleRoomClick = (codigo) => {
    const d = dormMap[codigo]
    if (!d) return
    setSelected(d)
    setShowModal(true)
  }

  const handleEstadoChange = async (estado) => {
    if (!selected) return
    await updateDormitorio(selected.DormitorioId, { Estado: estado, Capacidad: selected.Capacidad, Notas: selected.Notas })
    setShowModal(false)
    load()
  }

  const cargarAlumnos = async (gen) => {
    setFiltroGen(gen)
    setBusqueda('')
    if (!gen) { setResultados([]); return }
    setBuscando(true)
    try {
      const r = await buscarAlumnosDormitorio('', gen)
      setResultados(r)
    } catch (e) { console.error(e) }
    setBuscando(false)
  }

  const cargarOperadores = async (emp) => {
    setFiltroEmpresa(emp)
    setBusqOperador('')
    setCargandoOps(true)
    try {
      const r = await buscarOperadoresDormitorio('', emp)
      setOperadores(r)
    } catch (e) { console.error(e) }
    setCargandoOps(false)
  }

  useEffect(() => {
    if (tipoCheckin === 'operador' && showCheckin) {
      cargarOperadores(filtroEmpresa)
    }
  }, [tipoCheckin, showCheckin])

  const alumnosFiltrados = useMemo(() => {
    if (!busqueda) return resultados
    const q = busqueda.toLowerCase()
    return resultados.filter(a => a.NombreCompleto.toLowerCase().includes(q) || (a.Matricula || '').toLowerCase().includes(q))
  }, [resultados, busqueda])

  const operadoresFiltrados = useMemo(() => {
    if (!busqOperador) return operadores
    const q = busqOperador.toLowerCase()
    return operadores.filter(o => o.NombreCompleto.toLowerCase().includes(q) || (o.Matricula || '').toLowerCase().includes(q))
  }, [operadores, busqOperador])

  const handleCheckin = async (persona) => {
    if (!selected) return
    await checkinDormitorio(selected.DormitorioId, { ...persona, TipoOcupante: tipoCheckin === 'alumno' ? 'Alumno' : 'Operador' })
    if (tipoCheckin === 'alumno') {
      setResultados(prev => prev.filter(a => a.Id !== persona.Id))
    } else {
      setOperadores(prev => prev.filter(o => o.Id !== persona.Id))
    }
    setBusqueda('')
    setBusqOperador('')
    setShowCheckin(false)
    setShowModal(false)
    load()
  }

  const handleCheckout = async (ocupanteId) => {
    if (!window.confirm('¿Confirmar check-out de este ocupante?')) return
    await checkoutDormitorio(ocupanteId)
    setShowModal(false)
    load()
  }

  const cargarHistorialGlobal = async () => {
    setHistLoading(true)
    try {
      const data = await getHistorialGlobalDormitorios({
        fechaDesde: histFechaDesde, fechaHasta: histFechaHasta,
        q: histBusqueda, habitacion: histHabitacion, activo: histActivo, tipo: histTipo,
      })
      setHistGlobal(data)
    } catch (e) { console.error(e) }
    setHistLoading(false)
  }

  useEffect(() => {
    if (vistaActiva === 'historial') cargarHistorialGlobal()
    if (vistaActiva === 'dashboard') cargarDashboard()
  }, [vistaActiva])

  const cargarDashboard = async (dias) => {
    setDashLoading(true)
    try {
      const data = await getEstadisticasDormitorios(dias || dashDias)
      setDashData(data)
    } catch (e) { console.error(e) }
    setDashLoading(false)
  }

  const exportarExcel = () => {
    if (!histOrdenado.length) return
    const headers = ['Habitación','Planta','Tipo','Nombre','Matrícula/ID','Empresa','Check-in','Check-out','Estado']
    const rows = histOrdenado.map(h => [
      h.Codigo, `${h.Planta} · ${h.Tipo}`, h.TipoOcupante || 'Alumno',
      h.NombreCompleto, h.Matricula, h.Empresa || '-',
      fmtFecha(h.FechaCheckIn, true), h.FechaCheckOut ? fmtFecha(h.FechaCheckOut, true) : '-',
      h.Activo ? 'Hospedado' : 'Finalizado',
    ])
    const esc = v => `"${String(v).replace(/"/g, '""')}"`
    const csv = '﻿' + [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dormitorios_historial_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  const sortIcon = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const histOrdenado = useMemo(() => {
    if (!sortField) return histGlobal
    return [...histGlobal].sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [histGlobal, sortField, sortDir])

  const abrirDetalle = async (registro) => {
    setDetalleCargando(true)
    setDetallePersona({ ...registro, _detalle: null })
    try {
      const tipo = (registro.TipoOcupante || 'Alumno')
      const data = tipo === 'Operador'
        ? await getDetalleOperador(registro.Matricula)
        : await getDetalleAlumno(registro.Matricula)
      setDetallePersona(prev => ({ ...prev, _detalle: data }))
    } catch (e) { console.error(e) }
    setDetalleCargando(false)
  }

  const renderRoom = (room) => {
    const d = dormMap[room.codigo]
    if (!d) return null
    const ocu = d.OcupantesActuales || 0
    const color = estadoColor(d.Estado, ocu, d.Capacidad)
    const label = estadoLabel(d.Estado, ocu, d.Capacidad)
    const matchesFiltro = filtroEstado === 'Todos' ||
      (filtroEstado === 'Disponible' && label === 'Disponible') ||
      (filtroEstado === 'Ocupada' && (label === 'Ocupada' || label === 'Parcial')) ||
      (filtroEstado === 'Mantenimiento' && label === 'Mantenimiento')
    const num = room.codigo.split('-').pop()
    const isM = room.codigo.startsWith('DR-M')
    const cap = d.Capacidad || 2
    const op = matchesFiltro ? 1 : 0.2
    const bw = 10, bh = 6, bgap = 4
    const totalBedsW = cap * bw + (cap - 1) * bgap
    const bx0 = room.x + (room.w - totalBedsW) / 2
    const by = room.y + 40
    return (
      <g key={room.codigo} onClick={() => handleRoomClick(room.codigo)} style={{ cursor: 'pointer' }}>
        <rect x={room.x} y={room.y} width={room.w} height={room.h} rx={6} ry={6}
          fill={color} stroke={matchesFiltro ? (isM ? C.mujeres : C.hombres) : '#e5e7eb'}
          strokeWidth={2} opacity={op} />
        <text x={room.x + room.w / 2} y={room.y + 18} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff" opacity={op}>
          {isM ? 'M' : 'H'}-{num}
        </text>
        <text x={room.x + room.w / 2} y={room.y + 30} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.8)" opacity={op}>
          {ocu}/{cap}
        </text>
        {Array.from({ length: cap }).map((_, i) => {
          const filled = i < ocu
          const bx = bx0 + i * (bw + bgap)
          return (
            <g key={i} opacity={op}>
              <rect x={bx} y={by} width={bw} height={bh} rx={1.5} fill={filled ? '#fff' : 'none'} stroke="#fff" strokeWidth={0.8} opacity={filled ? 1 : 0.4} />
              <rect x={bx + 1} y={by - 1.5} width={bw - 2} height={2} rx={1} fill={filled ? '#fff' : 'none'} stroke="#fff" strokeWidth={0.5} opacity={filled ? 1 : 0.4} />
            </g>
          )
        })}
      </g>
    )
  }

  const fmtFecha = (d, conHora = false) => {
    if (!d) return '-'
    const raw = String(d).replace(/\.000Z?$/, '').replace(/Z$/, '')
    const p = raw.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!p) {
      const f = new Date(raw + 'T00:00:00')
      return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const txt = `${p[3]} ${meses[+p[2]-1]} ${p[1]}`
    return conHora ? `${txt}, ${p[4]}:${p[5]}` : txt
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.g500 }}>Cargando dormitorios...</div>

  const plantaRooms = planta === 'Baja' ? [...PLANTA_BAJA_MUJERES, ...PLANTA_BAJA_HOMBRES] : PLANTA_ALTA
  const svgW = 1440
  const svgH = planta === 'Baja' ? 280 : 160

  return (
    <div style={{ padding: '0 24px 40px' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: C.g500, margin: 0 }}>Gestión y ocupación de habitaciones</p>
      </div>

      {/* Tabs principales: Plano / Historial */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `2px solid ${C.g200}` }}>
        {[
          { id: 'plano', label: 'Plano de Habitaciones' },
          { id: 'historial', label: 'Historial de Ocupación' },
          { id: 'dashboard', label: 'Dashboard' },
        ].map(t => (
          <button key={t.id} onClick={() => setVistaActiva(t.id)}
            style={{ padding: '10px 24px', border: 'none', borderBottom: vistaActiva === t.id ? `3px solid ${C.navy}` : '3px solid transparent',
              background: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              color: vistaActiva === t.id ? C.navy : C.g400, marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== VISTA PLANO ==================== */}
      {vistaActiva === 'plano' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['Baja', 'Alta'].map(p => (
              <button key={p} onClick={() => setPlanta(p)}
                style={{ padding: '8px 24px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14,
                  background: planta === p ? C.navy : C.g100, color: planta === p ? '#fff' : C.g600, cursor: 'pointer' }}>
                Planta {p}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total', value: stats.total, color: C.navy },
              { label: 'Disponibles', value: stats.disp, color: C.disponible },
              { label: 'Parciales', value: stats.parcial, color: C.parcial },
              { label: 'Ocupadas', value: stats.ocup, color: C.ocupada },
              { label: 'Mantenimiento', value: stats.mant, color: C.mantenimiento },
              { label: 'Ocupantes', value: stats.totalOcupantes, color: C.g700 },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.g500, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.g500, fontWeight: 500 }}>Filtrar:</span>
            {['Todos', 'Disponible', 'Ocupada', 'Mantenimiento'].map(f => (
              <button key={f} onClick={() => setFiltroEstado(f)}
                style={{ padding: '4px 14px', borderRadius: 20, border: `1px solid ${filtroEstado === f ? C.navy : C.g200}`,
                  background: filtroEstado === f ? C.navy : '#fff', color: filtroEstado === f ? '#fff' : C.g600,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12, color: C.g600 }}>
            {[
              { color: C.disponible, label: 'Disponible' },
              { color: C.parcial, label: 'Parcial' },
              { color: C.ocupada, label: 'Ocupada' },
              { color: C.mantenimiento, label: 'Mantenimiento' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: l.color }} />
                <span>{l.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${C.mujeres}`, background: 'transparent' }} />
              <span>Mujeres</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${C.hombres}`, background: 'transparent' }} />
              <span>Hombres</span>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 12 }}>
              Planta {planta} {planta === 'Baja' ? '— Mujeres + Hombres' : '— Hombres'}
            </h3>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxHeight: 400 }}>
              {planta === 'Baja' && (
                <>
                  <rect x={0} y={0} width={680} height={svgH} rx={10} fill="#fdf2f8" opacity={0.4} />
                  <text x={340} y={svgH - 6} textAnchor="middle" fontSize={11} fill={C.mujeres} fontWeight={600}>MUJERES</text>
                  <rect x={688} y={0} width={svgW - 688} height={svgH} rx={10} fill="#eff6ff" opacity={0.4} />
                  <text x={1060} y={svgH - 6} textAnchor="middle" fontSize={11} fill={C.hombres} fontWeight={600}>HOMBRES</text>
                  <rect x={10} y={10} width={180} height={52} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={100} y={40} textAnchor="middle" fontSize={10} fill={C.g500}>BAÑOS MUJERES</text>
                  <rect x={HX} y={HY1} width={50} height={RH} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={HX + 25} y={HY1 + 20} textAnchor="middle" fontSize={8} fill={C.g500}>CTO.</text>
                  <text x={HX + 25} y={HY1 + 32} textAnchor="middle" fontSize={7} fill={C.g500}>ELÉCT.</text>
                  <rect x={HX} y={HY2} width={LAVW} height={RH} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={HX + LAVW / 2} y={HY2 + 30} textAnchor="middle" fontSize={9} fill={C.g500}>LAVANDERÍA</text>
                  <rect x={HRX + HS * 5 + RW + 10} y={HY1} width={HS * 2} height={RH} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={HRX + HS * 5 + RW + 10 + HS} y={HY1 + 30} textAnchor="middle" fontSize={9} fill={C.g500}>BAÑOS HOMBRES</text>
                </>
              )}
              {planta === 'Alta' && (
                <>
                  <rect x={0} y={0} width={svgW} height={svgH} rx={10} fill="#eff6ff" opacity={0.3} />
                  <rect x={10} y={AY1} width={140} height={AY2 + RH - AY1} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={80} y={AY1 + (AY2 + RH - AY1) / 2 - 6} textAnchor="middle" fontSize={9} fill={C.g500}>BAÑOS</text>
                  <text x={80} y={AY1 + (AY2 + RH - AY1) / 2 + 6} textAnchor="middle" fontSize={9} fill={C.g500}>HOMBRES</text>
                  <rect x={ALX + HS * 6 + RW + 8} y={AY1} width={120} height={RH} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={ALX + HS * 6 + RW + 68} y={AY1 + 22} textAnchor="middle" fontSize={8} fill={C.g500}>BODEGA /</text>
                  <text x={ALX + HS * 6 + RW + 68} y={AY1 + 34} textAnchor="middle" fontSize={8} fill={C.g500}>SNK</text>
                  <rect x={ALX + HS * 6 + RW + 8} y={AY2} width={120} height={RH} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={ALX + HS * 6 + RW + 68} y={AY2 + 30} textAnchor="middle" fontSize={9} fill={C.g500}>ESCALERAS</text>
                  <rect x={ARX + HS * 8 + RW + 10} y={AY1} width={120} height={AY2 + RH - AY1} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
                  <text x={ARX + HS * 8 + RW + 70} y={AY1 + (AY2 + RH - AY1) / 2 - 6} textAnchor="middle" fontSize={9} fill={C.g500}>BAÑOS</text>
                  <text x={ARX + HS * 8 + RW + 70} y={AY1 + (AY2 + RH - AY1) / 2 + 6} textAnchor="middle" fontSize={9} fill={C.g500}>HOMBRES</text>
                  <text x={ALX + HS * 3} y={svgH - 4} textAnchor="middle" fontSize={10} fill={C.hombres} fontWeight={600}>ALA IZQUIERDA (H-21 a H-30)</text>
                  <text x={ARX + HS * 4} y={svgH - 4} textAnchor="middle" fontSize={10} fill={C.hombres} fontWeight={600}>ALA DERECHA (H-31 a H-46)</text>
                </>
              )}
              {plantaRooms.map(r => renderRoom(r))}
            </svg>
          </div>
        </>
      )}

      {/* ==================== VISTA HISTORIAL ==================== */}
      {vistaActiva === 'historial' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Historial de Ocupación</h3>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, color: C.g500, display: 'block', marginBottom: 4 }}>Desde</label>
              <input type="date" value={histFechaDesde} onChange={e => setHistFechaDesde(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.g500, display: 'block', marginBottom: 4 }}>Hasta</label>
              <input type="date" value={histFechaHasta} onChange={e => setHistFechaHasta(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.g500, display: 'block', marginBottom: 4 }}>Nombre / Matrícula</label>
              <input value={histBusqueda} onChange={e => setHistBusqueda(e.target.value)} placeholder="Buscar..."
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, width: 180 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.g500, display: 'block', marginBottom: 4 }}>Habitación</label>
              <input value={histHabitacion} onChange={e => setHistHabitacion(e.target.value)} placeholder="Ej: M-01, H-20..."
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, width: 140 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.g500, display: 'block', marginBottom: 4 }}>Estado</label>
              <select value={histActivo} onChange={e => setHistActivo(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, background: '#fff' }}>
                <option value="">Todos</option>
                <option value="1">Activos (hospedados)</option>
                <option value="0">Finalizados (check-out)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.g500, display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={histTipo} onChange={e => setHistTipo(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, background: '#fff' }}>
                <option value="">Todos</option>
                <option value="Alumno">Alumno</option>
                <option value="Operador">Operador</option>
              </select>
            </div>
            <button onClick={cargarHistorialGlobal}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', height: 36 }}>
              Buscar
            </button>
            {histGlobal.length > 0 && (
              <button onClick={exportarExcel}
                style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.navy}`, background: '#fff', color: C.navy, fontWeight: 600, fontSize: 13, cursor: 'pointer', height: 36 }}>
                ⬇ Exportar Excel
              </button>
            )}
          </div>

          {histLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: C.g400 }}>Cargando historial...</div>
          ) : histGlobal.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: C.g400 }}>No se encontraron registros</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.g400, marginBottom: 8 }}>{histOrdenado.length} registro{histOrdenado.length !== 1 ? 's' : ''}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.g200}` }}>
                      {[
                        { key: 'Codigo', label: 'Habitación' },
                        { key: 'Planta', label: 'Planta' },
                        { key: 'TipoOcupante', label: 'Tipo' },
                        { key: 'NombreCompleto', label: 'Nombre' },
                        { key: 'Matricula', label: 'Matrícula / ID' },
                        { key: 'Empresa', label: 'Empresa' },
                        { key: 'FechaCheckIn', label: 'Check-in' },
                        { key: 'FechaCheckOut', label: 'Check-out' },
                        { key: 'Activo', label: 'Estado' },
                      ].map(col => (
                        <th key={col.key} style={{ ...thS, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(col.key)}>
                          {col.label}{sortIcon(col.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {histOrdenado.map(h => (
                      <tr key={h.OcupanteId} onClick={() => abrirDetalle(h)} style={{ borderBottom: `1px solid ${C.g100}`, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={tdS}><span style={{ fontWeight: 600 }}>{h.Codigo}</span></td>
                        <td style={tdS}>{h.Planta} · {h.Tipo}</td>
                        <td style={tdS}>
                          <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: (h.TipoOcupante || 'Alumno') === 'Alumno' ? '#dbeafe' : '#fef3c7',
                            color: (h.TipoOcupante || 'Alumno') === 'Alumno' ? '#1d4ed8' : '#92400e' }}>
                            {h.TipoOcupante || 'Alumno'}
                          </span>
                        </td>
                        <td style={tdS}>{h.NombreCompleto}</td>
                        <td style={tdS}>{h.Matricula}</td>
                        <td style={tdS}>{h.Empresa || '-'}</td>
                        <td style={tdS}>{fmtFecha(h.FechaCheckIn, true)}</td>
                        <td style={tdS}>{h.FechaCheckOut ? fmtFecha(h.FechaCheckOut, true) : '-'}</td>
                        <td style={tdS}>
                          {h.Activo ? (
                            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Hospedado</span>
                          ) : (
                            <span style={{ background: C.g100, color: C.g500, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Finalizado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== VISTA DASHBOARD ==================== */}
      {vistaActiva === 'dashboard' && (
        <div>
          {dashLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.g400 }}>Cargando estadísticas...</div>
          ) : !dashData ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.g400 }}>Sin datos disponibles</div>
          ) : (() => {
            const r = dashData.resumen || {}
            const pctOcupacion = r.CapacidadTotal ? Math.round((r.OcupacionActual / r.CapacidadTotal) * 100) : 0
            return (
              <>
                {/* Selector de período */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: C.g500, fontWeight: 500 }}>Período:</span>
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => { setDashDias(d); cargarDashboard(d) }}
                      style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${dashDias === d ? C.navy : C.g200}`,
                        background: dashDias === d ? C.navy : '#fff', color: dashDias === d ? '#fff' : C.g600,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {d} días
                    </button>
                  ))}
                </div>

                {/* KPIs principales */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Hospedados ahora', value: r.HospedadosActuales || 0, color: C.disponible },
                    { label: 'Alumnos activos', value: r.AlumnosActivos || 0, color: C.hombres },
                    { label: 'Operadores activos', value: r.OperadoresActivos || 0, color: C.parcial },
                    { label: '% Ocupación', value: `${pctOcupacion}%`, color: pctOcupacion > 80 ? C.mantenimiento : pctOcupacion > 50 ? C.parcial : C.disponible },
                    { label: 'Capacidad total', value: `${r.OcupacionActual || 0}/${r.CapacidadTotal || 0}`, color: C.navy },
                    { label: 'Estancia promedio', value: `${(dashData.promedioEstanciaDias || 0).toFixed(1)} días`, color: C.g700 },
                    { label: 'En mantenimiento', value: r.HabitacionesMantenimiento || 0, color: C.mantenimiento },
                    { label: 'Total histórico', value: r.TotalHistorico || 0, color: C.g600 },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: C.g500, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Gráfica de check-ins por día */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 16 }}>Check-ins por día (últimos {dashDias} días)</h3>
                  {(!dashData.checkinsPorDia || dashData.checkinsPorDia.length === 0) ? (
                    <div style={{ padding: 20, textAlign: 'center', color: C.g400, fontSize: 13 }}>Sin registros en este período</div>
                  ) : (() => {
                    const datos = dashData.checkinsPorDia
                    const maxVal = Math.max(...datos.map(d => d.Total), 1)
                    const barW = Math.max(Math.floor(700 / datos.length) - 4, 8)
                    const chartH = 180
                    return (
                      <div style={{ overflowX: 'auto' }}>
                        <svg width={Math.max(datos.length * (barW + 4) + 60, 300)} height={chartH + 40} style={{ display: 'block' }}>
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                            <g key={pct}>
                              <line x1={40} y1={chartH - pct * chartH + 10} x2={datos.length * (barW + 4) + 50} y2={chartH - pct * chartH + 10} stroke={C.g100} strokeWidth={1} />
                              <text x={36} y={chartH - pct * chartH + 14} textAnchor="end" fontSize={9} fill={C.g400}>{Math.round(maxVal * pct)}</text>
                            </g>
                          ))}
                          {/* Barras */}
                          {datos.map((d, i) => {
                            const x = 44 + i * (barW + 4)
                            const hAlumnos = (d.Alumnos / maxVal) * chartH
                            const hOps = (d.Operadores / maxVal) * chartH
                            const showLabel = datos.length <= 15 || i % Math.ceil(datos.length / 15) === 0
                            return (
                              <g key={d.Fecha}>
                                <rect x={x} y={chartH - hAlumnos - hOps + 10} width={barW} height={hOps} rx={2} fill={C.parcial} />
                                <rect x={x} y={chartH - hAlumnos + 10} width={barW} height={hAlumnos} rx={2} fill={C.hombres} />
                                {d.Total > 0 && <text x={x + barW / 2} y={chartH - hAlumnos - hOps + 6} textAnchor="middle" fontSize={8} fill={C.g600}>{d.Total}</text>}
                                {showLabel && <text x={x + barW / 2} y={chartH + 24} textAnchor="middle" fontSize={8} fill={C.g400} transform={`rotate(-45, ${x + barW / 2}, ${chartH + 24})`}>{d.Fecha.slice(5)}</text>}
                              </g>
                            )
                          })}
                        </svg>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: C.g500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: C.hombres }} /> Alumnos</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: C.parcial }} /> Operadores</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Top habitaciones */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Top habitaciones más usadas</h3>
                    {(dashData.topHabitaciones || []).length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: C.g400, fontSize: 13 }}>Sin datos</div>
                    ) : (
                      <div>
                        {dashData.topHabitaciones.map((h, i) => {
                          const maxUsos = dashData.topHabitaciones[0]?.TotalUsos || 1
                          return (
                            <div key={h.Codigo} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: C.g400, width: 20, textAlign: 'right' }}>{i + 1}.</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.g800, width: 60 }}>{h.Codigo}</span>
                              <div style={{ flex: 1, background: C.g100, borderRadius: 4, height: 20, overflow: 'hidden' }}>
                                <div style={{ width: `${(h.TotalUsos / maxUsos) * 100}%`, height: '100%', background: C.navy, borderRadius: 4, transition: 'width 0.5s' }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, width: 30, textAlign: 'right' }}>{h.TotalUsos}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Por empresa */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Ocupación por empresa</h3>
                    {(dashData.porEmpresa || []).length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: C.g400, fontSize: 13 }}>Sin datos</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${C.g200}` }}>
                            <th style={{ ...thS }}>Empresa</th>
                            <th style={{ ...thS, textAlign: 'center' }}>Activos</th>
                            <th style={{ ...thS, textAlign: 'center' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashData.porEmpresa.map(e => (
                            <tr key={e.Empresa} style={{ borderBottom: `1px solid ${C.g100}` }}>
                              <td style={tdS}><span style={{ fontWeight: 600 }}>{e.Empresa}</span></td>
                              <td style={{ ...tdS, textAlign: 'center' }}>
                                {e.Activos > 0 && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{e.Activos}</span>}
                                {!e.Activos && <span style={{ color: C.g400 }}>0</span>}
                              </td>
                              <td style={{ ...tdS, textAlign: 'center', fontWeight: 600 }}>{e.Total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ==================== MODAL DETALLE HABITACIÓN ==================== */}
      {showModal && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { setShowModal(false); setShowCheckin(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>{selected.Codigo}</h3>
                <span style={{ fontSize: 12, color: C.g500 }}>Planta {selected.Planta} · {selected.Tipo}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff',
                  background: estadoColor(selected.Estado, selected.OcupantesActuales, selected.Capacidad) }}>
                  {estadoLabel(selected.Estado, selected.OcupantesActuales, selected.Capacidad)}
                </span>
                <button onClick={() => { setShowModal(false); setShowCheckin(false) }}
                  style={{ background: 'none', border: 'none', fontSize: 22, color: C.g400, cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: C.g50, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{selected.OcupantesActuales}/{selected.Capacidad}</div>
                <div style={{ fontSize: 11, color: C.g500 }}>Ocupantes</div>
              </div>
              <div style={{ background: C.g50, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: selected.Tipo === 'Mujeres' ? C.mujeres : C.hombres }}>
                  {selected.Tipo === 'Mujeres' ? '♀' : '♂'}
                </div>
                <div style={{ fontSize: 11, color: C.g500 }}>{selected.Tipo}</div>
              </div>
            </div>

            {(ocupMap[selected.DormitorioId] || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: C.g700, marginBottom: 8 }}>Ocupantes actuales</h4>
                {(ocupMap[selected.DormitorioId] || []).map(o => (
                  <div key={o.OcupanteId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: C.g50, borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.g800 }}>{o.NombreCompleto}</div>
                      <div style={{ fontSize: 11, color: C.g500 }}>{o.Matricula} · {o.Empresa || '-'} · Desde {fmtFecha(o.FechaCheckIn)}</div>
                    </div>
                    <button onClick={() => handleCheckout(o.OcupanteId)}
                      style={{ background: C.mantenimiento, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Check-out
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {selected.Estado !== 'Mantenimiento' && selected.OcupantesActuales < selected.Capacidad && (
                <button onClick={() => setShowCheckin(true)}
                  style={{ background: C.disponible, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Check-in
                </button>
              )}
              {selected.Estado !== 'Mantenimiento' ? (
                <button onClick={() => handleEstadoChange('Mantenimiento')}
                  style={{ background: C.mantenimiento, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Marcar Mantenimiento
                </button>
              ) : (
                <button onClick={() => handleEstadoChange('Disponible')}
                  style={{ background: C.disponible, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Marcar Disponible
                </button>
              )}
            </div>

            {/* ===== CHECK-IN DUAL: ALUMNO / OPERADOR ===== */}
            {showCheckin && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16 }}>
                {/* Toggle tipo */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.g200}` }}>
                  <button onClick={() => { setTipoCheckin('alumno'); setBusqOperador('') }}
                    style={{ flex: 1, padding: '8px 0', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      background: tipoCheckin === 'alumno' ? C.navy : '#fff', color: tipoCheckin === 'alumno' ? '#fff' : C.g600 }}>
                    Alumno
                  </button>
                  <button onClick={() => { setTipoCheckin('operador'); setBusqueda('') }}
                    style={{ flex: 1, padding: '8px 0', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      background: tipoCheckin === 'operador' ? C.navy : '#fff', color: tipoCheckin === 'operador' ? '#fff' : C.g600 }}>
                    Operador del grupo
                  </button>
                </div>

                {/* ---- ALUMNO ---- */}
                {tipoCheckin === 'alumno' && (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select value={filtroGen} onChange={e => cargarAlumnos(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, background: '#fff', minWidth: 160 }}>
                        <option value="">— Generación —</option>
                        {generaciones.map(g => { const num = (g.Nombre || g).replace(/\D/g, ''); return <option key={g.GeneracionId || num} value={num}>{g.Nombre || g}</option> })}
                      </select>
                      {resultados.length > 0 && (
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Filtrar por nombre..."
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13 }} />
                      )}
                    </div>
                    {buscando && <div style={{ fontSize: 12, color: C.g400 }}>Cargando alumnos...</div>}
                    {!filtroGen && !buscando && <div style={{ fontSize: 12, color: C.g400 }}>Selecciona una generación</div>}
                    {filtroGen && !buscando && alumnosFiltrados.length === 0 && <div style={{ fontSize: 12, color: C.g400 }}>No hay alumnos disponibles</div>}
                    {alumnosFiltrados.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: C.g400, marginBottom: 6 }}>{alumnosFiltrados.length} alumno{alumnosFiltrados.length !== 1 ? 's' : ''}</div>
                        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                          {alumnosFiltrados.map(a => (
                            <div key={a.Id} onClick={() => handleCheckin(a)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 6,
                                background: '#fff', marginBottom: 4, cursor: 'pointer', border: `1px solid ${C.g200}` }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.g800 }}>{a.NombreCompleto}</div>
                                <div style={{ fontSize: 11, color: C.g500 }}>{a.Matricula} · {a.Empresa}</div>
                              </div>
                              <span style={{ fontSize: 11, color: C.disponible, fontWeight: 600 }}>Asignar</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ---- OPERADOR DEL GRUPO ---- */}
                {tipoCheckin === 'operador' && (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select value={filtroEmpresa} onChange={e => cargarOperadores(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, background: '#fff', minWidth: 140 }}>
                        <option value="">— Todas las empresas —</option>
                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                      </select>
                      <input value={busqOperador} onChange={e => setBusqOperador(e.target.value)} placeholder="Filtrar por nombre..."
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13 }} />
                    </div>
                    {cargandoOps && <div style={{ fontSize: 12, color: C.g400 }}>Cargando operadores...</div>}
                    {!cargandoOps && operadoresFiltrados.length === 0 && <div style={{ fontSize: 12, color: C.g400 }}>No hay operadores disponibles</div>}
                    {operadoresFiltrados.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: C.g400, marginBottom: 6 }}>{operadoresFiltrados.length} operador{operadoresFiltrados.length !== 1 ? 'es' : ''}</div>
                        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                          {operadoresFiltrados.map(o => (
                            <div key={o.Id} onClick={() => handleCheckin(o)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 6,
                                background: '#fff', marginBottom: 4, cursor: 'pointer', border: `1px solid ${C.g200}` }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.g800 }}>{o.NombreCompleto}</div>
                                <div style={{ fontSize: 11, color: C.g500 }}>ID: {o.Matricula} · {o.Empresa}</div>
                              </div>
                              <span style={{ fontSize: 11, color: C.disponible, fontWeight: 600 }}>Asignar</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL DETALLE PERSONA ==================== */}
      {detallePersona && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
          onClick={() => setDetallePersona(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>{detallePersona.NombreCompleto}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: (detallePersona.TipoOcupante || 'Alumno') === 'Alumno' ? '#dbeafe' : '#fef3c7',
                    color: (detallePersona.TipoOcupante || 'Alumno') === 'Alumno' ? '#1d4ed8' : '#92400e' }}>
                    {detallePersona.TipoOcupante || 'Alumno'}
                  </span>
                  <span style={{ fontSize: 12, color: C.g500 }}>{detallePersona.Codigo} · {detallePersona.Empresa}</span>
                </div>
              </div>
              <button onClick={() => setDetallePersona(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: C.g400, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Info de hospedaje */}
            <div style={{ background: C.g50, borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.g700, marginBottom: 8 }}>Hospedaje</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoItem label="Habitación" value={detallePersona.Codigo} />
                <InfoItem label="Matrícula / No. Empleado" value={detallePersona.Matricula} />
                <InfoItem label="Check-in" value={fmtFecha(detallePersona.FechaCheckIn, true)} />
                <InfoItem label="Check-out" value={detallePersona.FechaCheckOut ? fmtFecha(detallePersona.FechaCheckOut, true) : 'Hospedado actualmente'} />
              </div>
            </div>

            {/* Info personal */}
            {detalleCargando && <div style={{ padding: 16, textAlign: 'center', color: C.g400, fontSize: 13 }}>Cargando información...</div>}
            {detallePersona._detalle && (detallePersona.TipoOcupante || 'Alumno') === 'Alumno' && (() => {
              const d = detallePersona._detalle
              return (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 8 }}>Información del Alumno</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <InfoItem label="Nombre" value={d.NombreCompleto} />
                    <InfoItem label="Matrícula" value={d.Matricula} />
                    <InfoItem label="Empresa" value={d.Empresa} />
                    <InfoItem label="CURP" value={d.CURP} />
                    <InfoItem label="Teléfono" value={d.Telefono} />
                    <InfoItem label="Correo" value={d.Correo} />
                    <InfoItem label="Sexo" value={d.Sexo} />
                    <InfoItem label="Fecha Nacimiento" value={fmtFecha(d.FechaNacimiento)} />
                    <InfoItem label="Fecha Ingreso" value={fmtFecha(d.FechaIngreso)} />
                    <InfoItem label="Fecha Egreso" value={fmtFecha(d.FechaEgreso)} />
                  </div>
                </div>
              )
            })()}
            {detallePersona._detalle && (detallePersona.TipoOcupante || 'Alumno') === 'Operador' && (() => {
              const d = detallePersona._detalle
              return (
                <div style={{ background: '#fefce8', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    {d.FotoUrl && <img src={d.FotoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: `2px solid ${C.g200}` }} />}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Información del Operador</div>
                      <div style={{ fontSize: 12, color: C.g500 }}>{d.Empresa} · {d.DivisionNombre}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <InfoItem label="Nombre" value={d.NombreCompleto} />
                    <InfoItem label="No. Empleado" value={d.NumeroEmpleadoCompuesto} />
                    <InfoItem label="CURP" value={d.CURP} />
                    <InfoItem label="Edad" value={d.Edad ? `${d.Edad} años` : null} />
                    <InfoItem label="Fecha Nacimiento" value={fmtFecha(d.FechaNacimiento)} />
                    <InfoItem label="Fecha Ingreso" value={fmtFecha(d.FechaIngreso)} />
                    <InfoItem label="Antigüedad" value={d.AntiguedadYears != null ? `${d.AntiguedadYears}a ${d.AntiguedadMonths || 0}m` : null} />
                    <InfoItem label="Teléfono Móvil" value={d.TelefonoMovil} />
                    <InfoItem label="Tel. Casa" value={d.TelefonoCasa} />
                    <InfoItem label="Tel. Emergencia" value={d.TelefonoContactoEmergencia} />
                    <InfoItem label="Licencia" value={d.LicenciaNumero} />
                    <InfoItem label="Tipo Licencia" value={d.LicenciaTipoNombre} />
                    <InfoItem label="Venc. Licencia" value={fmtFecha(d.LicenciaVencimientoFecha)} />
                    <InfoItem label="Área" value={d.AreaNombre} />
                    <InfoItem label="Unidad Negocio" value={d.UnidadNegocioNombre} />
                    <InfoItem label="Unidad Operativa" value={d.UnidadOperativaNombre} />
                    <InfoItem label="Terminal" value={d.TerminalNombre} />
                    <InfoItem label="Plaza" value={d.PlazaNombre} />
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>{value || '-'}</div>
    </div>
  )
}

const thS = { padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }
const tdS = { padding: '8px 10px', fontSize: 13, verticalAlign: 'middle' }
