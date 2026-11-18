import { useState, useEffect, useMemo, useCallback } from 'react'
import { getDormitorios, updateDormitorio, seedDormitorios, checkinDormitorio, checkoutDormitorio, getHistorialDormitorio, buscarAlumnosDormitorio } from './api'

const C = {
  disponible: '#22c55e', ocupada: '#f59e0b', mantenimiento: '#ef4444',
  parcial: '#3b82f6',
  navy: '#0b2341', white: '#ffffff', g50: '#f9fafb', g100: '#f3f4f6',
  g200: '#e5e7eb', g400: '#9ca3af', g500: '#6b7280', g600: '#4b5563',
  g700: '#374151', g800: '#1f2937', g900: '#111827',
  mujeres: '#ec4899', hombres: '#3b82f6',
}

const PLANTA_BAJA_MUJERES = [
  { codigo: 'DR-M-01', x: 580, y: 10, w: 54, h: 50 },
  { codigo: 'DR-M-02', x: 520, y: 10, w: 54, h: 50 },
  { codigo: 'DR-M-03', x: 460, y: 10, w: 54, h: 50 },
  { codigo: 'DR-M-04', x: 400, y: 10, w: 54, h: 50 },
  { codigo: 'DR-M-05', x: 340, y: 10, w: 54, h: 50 },
  { codigo: 'DR-M-06', x: 400, y: 130, w: 54, h: 50 },
  { codigo: 'DR-M-07', x: 340, y: 130, w: 54, h: 50 },
  { codigo: 'DR-M-08', x: 280, y: 130, w: 54, h: 50 },
  { codigo: 'DR-M-09', x: 220, y: 130, w: 54, h: 50 },
  { codigo: 'DR-M-10', x: 220, y: 230, w: 54, h: 50 },
  { codigo: 'DR-M-11', x: 280, y: 230, w: 54, h: 50 },
  { codigo: 'DR-M-12', x: 340, y: 230, w: 54, h: 50 },
  { codigo: 'DR-M-13', x: 400, y: 230, w: 54, h: 50 },
  { codigo: 'DR-M-14', x: 460, y: 230, w: 54, h: 50 },
  { codigo: 'DR-M-15', x: 520, y: 230, w: 54, h: 50 },
]

const PLANTA_BAJA_HOMBRES = [
  { codigo: 'DR-H-01', x: 780, y: 10, w: 54, h: 50 },
  { codigo: 'DR-H-02', x: 840, y: 10, w: 54, h: 50 },
  { codigo: 'DR-H-03', x: 900, y: 10, w: 54, h: 50 },
  { codigo: 'DR-H-04', x: 960, y: 10, w: 54, h: 50 },
  { codigo: 'DR-H-05', x: 1020, y: 10, w: 54, h: 50 },
  { codigo: 'DR-H-06', x: 960, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-07', x: 900, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-08', x: 840, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-09', x: 1020, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-10', x: 1080, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-11', x: 1140, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-12', x: 1200, y: 130, w: 54, h: 50 },
  { codigo: 'DR-H-13', x: 1200, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-14', x: 1140, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-15', x: 1080, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-16', x: 1020, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-17', x: 960, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-18', x: 900, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-19', x: 840, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-20', x: 780, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-21', x: 720, y: 230, w: 54, h: 50 },
  { codigo: 'DR-H-22', x: 660, y: 230, w: 54, h: 50 },
]

const PLANTA_ALTA = []
for (let i = 23; i <= 48; i++) {
  const idx = i - 23
  const col = idx % 13
  const row = Math.floor(idx / 13)
  PLANTA_ALTA.push({ codigo: `DR-H-${String(i).padStart(2, '0')}`, x: 60 + col * 62, y: 10 + row * 110, w: 54, h: 50 })
}

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
  const [showHistorial, setShowHistorial] = useState(false)
  const [historial, setHistorial] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const load = useCallback(async () => {
    try {
      const data = await getDormitorios()
      setDormitorios(data.dormitorios || [])
      setOcupantes(data.ocupantes || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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

  const handleBuscar = async (q) => {
    setBusqueda(q)
    if (q.length < 2) { setResultados([]); return }
    setBuscando(true)
    try {
      const r = await buscarAlumnosDormitorio(q)
      setResultados(r)
    } catch (e) { console.error(e) }
    setBuscando(false)
  }

  const handleCheckin = async (alumno) => {
    if (!selected) return
    await checkinDormitorio(selected.DormitorioId, alumno)
    setShowCheckin(false)
    setBusqueda('')
    setResultados([])
    setShowModal(false)
    load()
  }

  const handleCheckout = async (ocupanteId) => {
    if (!window.confirm('¿Confirmar check-out de este ocupante?')) return
    await checkoutDormitorio(ocupanteId)
    setShowModal(false)
    load()
  }

  const handleVerHistorial = async (dormId) => {
    const h = await getHistorialDormitorio(dormId)
    setHistorial(h)
    setShowHistorial(true)
  }

  const renderRoom = (room) => {
    const d = dormMap[room.codigo]
    if (!d) return null
    const ocu = d.OcupantesActuales || 0
    const color = estadoColor(d.Estado, ocu, d.Capacidad)
    const label = estadoLabel(d.Estado, ocu, d.Capacidad)
    if (filtroEstado !== 'Todos') {
      const matches = filtroEstado === 'Disponible' ? label === 'Disponible'
        : filtroEstado === 'Ocupada' ? (label === 'Ocupada' || label === 'Parcial')
        : filtroEstado === 'Mantenimiento' ? label === 'Mantenimiento' : true
      if (!matches) {
        // dim non-matching
      }
    }
    const num = room.codigo.split('-').pop()
    const isM = room.codigo.startsWith('DR-M')
    return (
      <g key={room.codigo} onClick={() => handleRoomClick(room.codigo)} style={{ cursor: 'pointer' }}>
        <rect x={room.x} y={room.y} width={room.w} height={room.h} rx={6} ry={6}
          fill={color} stroke={filtroEstado !== 'Todos' && !((filtroEstado === 'Disponible' && label === 'Disponible') || (filtroEstado === 'Ocupada' && (label === 'Ocupada' || label === 'Parcial')) || (filtroEstado === 'Mantenimiento' && label === 'Mantenimiento')) ? '#e5e7eb' : (isM ? C.mujeres : C.hombres)}
          strokeWidth={2} opacity={filtroEstado !== 'Todos' && !((filtroEstado === 'Disponible' && label === 'Disponible') || (filtroEstado === 'Ocupada' && (label === 'Ocupada' || label === 'Parcial')) || (filtroEstado === 'Mantenimiento' && label === 'Mantenimiento')) ? 0.2 : 1} />
        <text x={room.x + room.w / 2} y={room.y + 20} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff"
          opacity={filtroEstado !== 'Todos' && !((filtroEstado === 'Disponible' && label === 'Disponible') || (filtroEstado === 'Ocupada' && (label === 'Ocupada' || label === 'Parcial')) || (filtroEstado === 'Mantenimiento' && label === 'Mantenimiento')) ? 0.2 : 1}>
          {isM ? 'M' : 'H'}-{num}
        </text>
        <text x={room.x + room.w / 2} y={room.y + 36} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.85)"
          opacity={filtroEstado !== 'Todos' && !((filtroEstado === 'Disponible' && label === 'Disponible') || (filtroEstado === 'Ocupada' && (label === 'Ocupada' || label === 'Parcial')) || (filtroEstado === 'Mantenimiento' && label === 'Mantenimiento')) ? 0.2 : 1}>
          {ocu}/{d.Capacidad}
        </text>
      </g>
    )
  }

  const fmtFecha = (d) => {
    if (!d) return '-'
    return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.g500 }}>Cargando dormitorios...</div>

  const plantaRooms = planta === 'Baja' ? [...PLANTA_BAJA_MUJERES, ...PLANTA_BAJA_HOMBRES] : PLANTA_ALTA
  const svgW = planta === 'Baja' ? 1300 : 880
  const svgH = planta === 'Baja' ? 300 : 220

  return (
    <div style={{ padding: '0 24px 40px' }}>
      <style>{`
        .dr:hover rect { filter: brightness(1.15); }
        .stat-card { background: #fff; borderRadius: 12; padding: 16px 20px; textAlign: center; boxShadow: 0 1px 4px rgba(0,0,0,0.06); }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.navy, margin: 0 }}>Dormitorios UDAT</h2>
          <p style={{ fontSize: 13, color: C.g500, margin: '4px 0 0' }}>Gestión y ocupación de habitaciones</p>
        </div>
      </div>

      {/* Tabs de planta */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['Baja', 'Alta'].map(p => (
          <button key={p} onClick={() => setPlanta(p)}
            style={{ padding: '8px 24px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14,
              background: planta === p ? C.navy : C.g100, color: planta === p ? '#fff' : C.g600, cursor: 'pointer' }}>
            Planta {p}
          </button>
        ))}
      </div>

      {/* Stats */}
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

      {/* Filtros */}
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

      {/* Leyenda */}
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

      {/* Plano SVG */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 12 }}>
          Planta {planta} {planta === 'Baja' ? '— Mujeres + Hombres' : '— Hombres'}
        </h3>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxHeight: 400 }}>
          {/* Background areas */}
          {planta === 'Baja' && (
            <>
              <rect x={200} y={0} width={450} height={svgH} rx={10} fill="#fdf2f8" opacity={0.5} />
              <text x={425} y={svgH - 8} textAnchor="middle" fontSize={11} fill={C.mujeres} fontWeight={600}>MUJERES</text>
              <rect x={640} y={0} width={620} height={svgH} rx={10} fill="#eff6ff" opacity={0.5} />
              <text x={950} y={svgH - 8} textAnchor="middle" fontSize={11} fill={C.hombres} fontWeight={600}>HOMBRES</text>
              {/* Facilities */}
              <rect x={10} y={10} width={180} height={50} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
              <text x={100} y={40} textAnchor="middle" fontSize={10} fill={C.g500}>BAÑOS MUJERES</text>
              <rect x={10} y={130} width={180} height={50} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
              <text x={100} y={160} textAnchor="middle" fontSize={10} fill={C.g500}>CIRCULACIÓN</text>
              <rect x={660} y={10} width={80} height={50} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
              <text x={700} y={40} textAnchor="middle" fontSize={10} fill={C.g500}>LAVANDERÍA</text>
              <rect x={1100} y={10} width={160} height={50} rx={6} fill={C.g100} stroke={C.g200} strokeWidth={1} />
              <text x={1180} y={40} textAnchor="middle" fontSize={10} fill={C.g500}>BAÑOS HOMBRES</text>
            </>
          )}
          {planta === 'Alta' && (
            <rect x={0} y={0} width={svgW} height={svgH} rx={10} fill="#eff6ff" opacity={0.3} />
          )}
          {plantaRooms.map(r => renderRoom(r))}
        </svg>
      </div>

      {/* Modal de detalle de habitación */}
      {showModal && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { setShowModal(false); setShowCheckin(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 500, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
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

            {/* Ocupantes actuales */}
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

            {/* Acciones */}
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
              <button onClick={() => handleVerHistorial(selected.DormitorioId)}
                style={{ background: C.g100, color: C.g700, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Ver historial
              </button>
            </div>

            {/* Check-in form */}
            {showCheckin && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: C.g700, marginBottom: 8 }}>Buscar alumno OPT</h4>
                <input value={busqueda} onChange={e => handleBuscar(e.target.value)} placeholder="Nombre o matrícula..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.g200}`, fontSize: 13, marginBottom: 8 }} />
                {buscando && <div style={{ fontSize: 12, color: C.g400 }}>Buscando...</div>}
                {resultados.map(a => (
                  <div key={a.Matricula} onClick={() => handleCheckin(a)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 6,
                      background: '#fff', marginBottom: 4, cursor: 'pointer', border: `1px solid ${C.g200}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.g800 }}>{a.NombreCompleto}</div>
                      <div style={{ fontSize: 11, color: C.g500 }}>{a.Matricula} · {a.Empresa}</div>
                    </div>
                    <span style={{ fontSize: 11, color: C.disponible, fontWeight: 600 }}>Asignar →</span>
                  </div>
                ))}
              </div>
            )}

            {/* Historial */}
            {showHistorial && (
              <div style={{ marginTop: 8 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: C.g700, marginBottom: 8 }}>Historial de ocupación</h4>
                {historial.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.g400 }}>Sin historial</div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {historial.map(h => (
                      <div key={h.OcupanteId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: `1px solid ${C.g100}` }}>
                        <div>
                          <span style={{ fontWeight: 600, color: C.g800 }}>{h.NombreCompleto}</span>
                          <span style={{ color: C.g400 }}> · {h.Matricula}</span>
                        </div>
                        <div style={{ color: C.g500 }}>
                          {fmtFecha(h.FechaCheckIn)} → {h.FechaCheckOut ? fmtFecha(h.FechaCheckOut) : <span style={{ color: C.disponible, fontWeight: 600 }}>Actual</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowHistorial(false)}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: C.g400, fontSize: 12, cursor: 'pointer' }}>
                  Cerrar historial
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
