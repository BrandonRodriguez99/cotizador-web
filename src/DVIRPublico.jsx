import { useEffect, useState, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const CATEGORIAS = {
  exterior_frente: 'Exterior — Frente',
  exterior_trasero: 'Exterior — Trasero',
  exterior_lado: 'Exterior — Lateral',
  interior_cabina: 'Interior — Cabina',
  interior_pasajeros: 'Interior — Pasajeros',
  otros: 'Otros',
}

const PUNTOS_INSPECCION = [
  { cat: 'exterior_frente', nombre: 'Batería' },
  { cat: 'exterior_frente', nombre: 'Correas y mangueras' },
  { cat: 'exterior_frente', nombre: 'Calefactor desempañador' },
  { cat: 'exterior_frente', nombre: 'Niveles de fluidos' },
  { cat: 'exterior_frente', nombre: 'Chasis' },
  { cat: 'exterior_frente', nombre: 'Tren delantero' },
  { cat: 'exterior_frente', nombre: 'Luces' },
  { cat: 'exterior_frente', nombre: 'Presión del aceite' },
  { cat: 'exterior_frente', nombre: 'Radiador' },
  { cat: 'exterior_frente', nombre: 'Motor de arranque' },
  { cat: 'exterior_frente', nombre: 'Transmisión' },
  { cat: 'exterior_frente', nombre: 'Parabrisas limpio' },
  { cat: 'exterior_frente', nombre: 'Líquido limpiaparabrisas' },
  { cat: 'exterior_trasero', nombre: 'Compresor de aire' },
  { cat: 'exterior_trasero', nombre: 'Líneas de aire' },
  { cat: 'exterior_trasero', nombre: 'Dispositivos de acoplamiento' },
  { cat: 'exterior_trasero', nombre: 'Luces' },
  { cat: 'exterior_trasero', nombre: 'Parte posterior' },
  { cat: 'exterior_trasero', nombre: 'Reflectores' },
  { cat: 'exterior_trasero', nombre: 'Cadenas para neumáticos' },
  { cat: 'exterior_lado', nombre: 'Sistema de escape' },
  { cat: 'exterior_lado', nombre: 'Quinta rueda' },
  { cat: 'exterior_lado', nombre: 'Silenciador' },
  { cat: 'exterior_lado', nombre: 'Aros' },
  { cat: 'exterior_lado', nombre: 'Techo' },
  { cat: 'exterior_lado', nombre: 'Suspensión' },
  { cat: 'exterior_lado', nombre: 'Neumáticos' },
  { cat: 'exterior_lado', nombre: 'Ruedas' },
  { cat: 'interior_cabina', nombre: 'Aire acondicionado' },
  { cat: 'interior_cabina', nombre: 'Frenos' },
  { cat: 'interior_cabina', nombre: 'Embrague' },
  { cat: 'interior_cabina', nombre: 'Puertas' },
  { cat: 'interior_cabina', nombre: 'Claxon' },
  { cat: 'interior_cabina', nombre: 'Espejos' },
  { cat: 'interior_cabina', nombre: 'Equipo de seguridad' },
  { cat: 'interior_cabina', nombre: 'Dirección' },
  { cat: 'interior_cabina', nombre: 'Registrador de viajes' },
  { cat: 'interior_cabina', nombre: 'Limpiaparabrisas' },
  { cat: 'interior_pasajeros', nombre: 'Ventanas' },
  { cat: 'otros', nombre: 'Accesorios de freno' },
  { cat: 'otros', nombre: 'Línea motriz' },
  { cat: 'otros', nombre: 'Motor' },
  { cat: 'otros', nombre: 'Tanques de combustible' },
  { cat: 'otros', nombre: 'Otro' },
]

const PUNTOS_REMOLQUE = [
  { cat: 'remolque_exterior', nombre: 'Frenos' },
  { cat: 'remolque_exterior', nombre: 'Conectores de frenos' },
  { cat: 'remolque_exterior', nombre: 'Dispositivos de acoplamiento' },
  { cat: 'remolque_exterior', nombre: 'Puertas' },
  { cat: 'remolque_exterior', nombre: 'Tren de aterrizaje' },
  { cat: 'remolque_exterior', nombre: 'Luces' },
  { cat: 'remolque_exterior', nombre: 'Reflectores' },
  { cat: 'remolque_exterior', nombre: 'Techo' },
  { cat: 'remolque_exterior', nombre: 'Suspensión' },
  { cat: 'remolque_exterior', nombre: 'Neumáticos' },
  { cat: 'remolque_exterior', nombre: 'Llantas de ruedas' },
  { cat: 'remolque_exterior', nombre: 'Otros' },
]

const FOTOS_ANGULOS = [
  { key: 'conductor', label: 'Lado conductor' },
  { key: 'delantera', label: 'Parte delantera' },
  { key: 'pasajero', label: 'Lado pasajero' },
  { key: 'atras', label: 'Parte trasera' },
]

const FOTOS_REMOLQUE = [
  { key: 'remolque_trasera', label: 'Parte trasera del remolque' },
  { key: 'remolque_izquierda', label: 'Parte izquierda del remolque' },
  { key: 'remolque_derecha', label: 'Parte derecha del remolque' },
]

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#374151', marginBottom: '6px',
}
const inputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#111827',
  background: '#fff',
}
const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '24px',
  marginBottom: '20px', border: '1px solid #e5e7eb',
}

function FotoGrid({ angulos, fotos, subiendoFoto, subirFoto }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: angulos.length <= 3 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
      {angulos.map(({ key, label }) => (
        <div key={key} style={{
          border: '2px dashed ' + (fotos[key] ? '#059669' : '#d1d5db'),
          borderRadius: '8px', textAlign: 'center', overflow: 'hidden',
          background: fotos[key] ? '#f0fdf4' : '#f9fafb', position: 'relative',
        }}>
          {fotos[key] ? (
            <div>
              <img src={fotos[key]} alt={label} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
              <p style={{ fontSize: '11px', color: '#059669', margin: '4px 0', fontWeight: '600' }}>&#10003; {label}</p>
            </div>
          ) : (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100px', cursor: subiendoFoto === key ? 'wait' : 'pointer', color: '#6b7280', fontSize: '12px',
            }}>
              {subiendoFoto === key ? 'Subiendo...' : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '4px' }}>
                    <path d="M3 7c0-1.1.9-2 2-2h2.2l1.4-2h6.8l1.4 2H19c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12.5" r="4" stroke="#FF6D00" strokeWidth="2"/>
                    <circle cx="17.5" cy="8.5" r="0.5" fill="#FF6D00"/>
                  </svg>
                  {label}
                </>
              )}
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                disabled={subiendoFoto === key}
                onChange={e => { if (e.target.files[0]) subirFoto(key, e.target.files[0]) }} />
            </label>
          )}
        </div>
      ))}
    </div>
  )
}

function InspeccionList({ puntos, offset, setPuntoEstado, setPuntoComentario, subirFotoDefecto, subiendoFotoDefecto, categorias }) {
  return Object.entries(categorias).map(([catKey, catLabel]) => {
    const items = puntos
      .map((p, idx) => ({ ...p, idx: idx + offset }))
      .filter(p => p.cat === catKey)
    if (items.length === 0) return null
    return (
      <div key={catKey} style={{ ...cardStyle, padding: '16px 20px' }}>
        <h3 style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px', fontWeight: '600' }}>{catLabel}</h3>
        {items.map(p => (
          <div key={p.idx} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 0', borderBottom: '1px solid #f3f4f6',
            flexWrap: 'wrap',
          }}>
            <span style={{ flex: 1, fontSize: '14px', color: '#111827', minWidth: '120px' }}>{p.nombre}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPuntoEstado(p.idx, 'ok')} style={{
                padding: '4px 12px', border: `1px solid ${p.estado === 'ok' ? '#059669' : '#d1d5db'}`,
                borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                background: p.estado === 'ok' ? '#ecfdf5' : '#fff',
                color: p.estado === 'ok' ? '#059669' : '#6b7280', fontWeight: p.estado === 'ok' ? '600' : '400',
              }}>OK</button>
              <button onClick={() => setPuntoEstado(p.idx, 'defecto')} style={{
                padding: '4px 12px', border: `1px solid ${p.estado === 'defecto' ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                background: p.estado === 'defecto' ? '#fef2f2' : '#fff',
                color: p.estado === 'defecto' ? '#dc2626' : '#6b7280', fontWeight: p.estado === 'defecto' ? '600' : '400',
              }}>Defecto</button>
            </div>
            {p.estado === 'defecto' && (
              <div style={{ width: '100%', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input style={{ ...inputStyle, width: '100%', fontSize: '12px' }}
                  placeholder="Comentario del defecto..."
                  value={p.comentario} onChange={e => setPuntoComentario(p.idx, e.target.value)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{
                    padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
                    fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#6b7280',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files[0]) subirFotoDefecto(p.idx, e.target.files[0]) }} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M3 7c0-1.1.9-2 2-2h2.2l1.4-2h6.8l1.4 2H19c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12.5" r="4" stroke="#FF6D00" strokeWidth="2"/>
                    </svg>
                    {subiendoFotoDefecto === p.idx ? 'Subiendo...' : p.fotoUrl ? 'Cambiar foto' : 'Foto del defecto'}
                  </label>
                  {p.fotoUrl && (
                    <img src={p.fotoUrl} alt="defecto" style={{
                      height: '40px', width: '40px', objectFit: 'cover', borderRadius: '6px',
                      border: '1px solid #fecaca',
                    }} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  })
}

export default function DVIRPublico() {
  const [tipoDVIR, setTipoDVIR] = useState(null)
  const [paso, setPaso] = useState(0)
  const [vehiculos, setVehiculos] = useState([])
  const [semirremolques, setSemirremolques] = useState([])
  const [loading, setLoading] = useState(true)

  // Paso 1
  const [operadorNombre, setOperadorNombre] = useState('')
  const [vehiculoId, setVehiculoId] = useState(null)
  const [vehiculoNombre, setVehiculoNombre] = useState('')
  const [matricula, setMatricula] = useState('')
  const [tipoInspeccion, setTipoInspeccion] = useState('')
  const [odometro, setOdometro] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [semirremolqueId, setSemirremolqueId] = useState(null)
  const [semirremolqueNombre, setSemirremolqueNombre] = useState('')

  // Paso 2 — fotos
  const [fotos, setFotos] = useState({})
  const [subiendoFoto, setSubiendoFoto] = useState(null)

  // Paso 3 — puntos vehículo + remolque
  const [puntos, setPuntos] = useState(
    PUNTOS_INSPECCION.map(p => ({ ...p, estado: '', comentario: '', fotoUrl: null }))
  )
  const [puntosRemolque, setPuntosRemolque] = useState(
    PUNTOS_REMOLQUE.map(p => ({ ...p, estado: '', comentario: '', fotoUrl: null }))
  )
  const [subiendoFotoDefecto, setSubiendoFotoDefecto] = useState(null)

  // Paso 4 — estado final
  const [estadoSeguridad, setEstadoSeguridad] = useState('')

  // Envío
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(null)

  const conRemolque = tipoDVIR === 'vehiculo_trailer'

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/dvir-publico/vehiculos`).then(r => r.json()),
      fetch(`${API_BASE}/dvir-publico/semirremolques`).then(r => r.json()),
    ])
      .then(([v, s]) => { setVehiculos(v); setSemirremolques(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function seleccionarVehiculo(vid) {
    const v = vehiculos.find(x => x.VehiculoId === vid)
    if (v) {
      setVehiculoId(v.VehiculoId)
      setVehiculoNombre(v.Nombre)
      setMatricula(v.Placa || '')
    } else {
      setVehiculoId(null)
      setVehiculoNombre('')
      setMatricula('')
    }
  }

  function seleccionarSemirremolque(sid) {
    const s = semirremolques.find(x => x.SemirremolqueId === sid)
    if (s) {
      setSemirremolqueId(s.SemirremolqueId)
      setSemirremolqueNombre(s.Nombre)
    } else {
      setSemirremolqueId(null)
      setSemirremolqueNombre('')
    }
  }

  async function subirFoto(angulo, file) {
    setSubiendoFoto(angulo)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'dvir_preset')
      formData.append('folder', 'dvir')
      const resp = await fetch('https://api.cloudinary.com/v1_1/kcj1hrdy/image/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await resp.json()
      if (data.secure_url) {
        setFotos(prev => ({ ...prev, [angulo]: data.secure_url }))
      } else {
        setError(data.error?.message || 'Error al subir foto')
      }
    } catch (e) {
      setError('Error al subir foto: ' + e.message)
    } finally {
      setSubiendoFoto(null)
    }
  }

  function setPuntoEstado(idx, estado) {
    if (idx < PUNTOS_INSPECCION.length) {
      setPuntos(prev => prev.map((p, i) => i === idx ? { ...p, estado } : p))
    } else {
      const ri = idx - PUNTOS_INSPECCION.length
      setPuntosRemolque(prev => prev.map((p, i) => i === ri ? { ...p, estado } : p))
    }
  }
  function setPuntoComentario(idx, comentario) {
    if (idx < PUNTOS_INSPECCION.length) {
      setPuntos(prev => prev.map((p, i) => i === idx ? { ...p, comentario } : p))
    } else {
      const ri = idx - PUNTOS_INSPECCION.length
      setPuntosRemolque(prev => prev.map((p, i) => i === ri ? { ...p, comentario } : p))
    }
  }

  async function subirFotoDefecto(idx, file) {
    setSubiendoFotoDefecto(idx)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'dvir_preset')
      formData.append('folder', 'dvir')
      const resp = await fetch('https://api.cloudinary.com/v1_1/kcj1hrdy/image/upload', {
        method: 'POST', body: formData,
      })
      const data = await resp.json()
      if (data.secure_url) {
        if (idx < PUNTOS_INSPECCION.length) {
          setPuntos(prev => prev.map((p, i) => i === idx ? { ...p, fotoUrl: data.secure_url } : p))
        } else {
          const ri = idx - PUNTOS_INSPECCION.length
          setPuntosRemolque(prev => prev.map((p, i) => i === ri ? { ...p, fotoUrl: data.secure_url } : p))
        }
      } else {
        setError(data.error?.message || 'Error al subir foto')
      }
    } catch (e) {
      setError('Error al subir foto: ' + e.message)
    } finally {
      setSubiendoFotoDefecto(null)
    }
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUbicacion(`${pos.coords.latitude}, ${pos.coords.longitude}`),
      () => setError('No se pudo obtener la ubicación')
    )
  }

  function validarPaso1() {
    if (!operadorNombre.trim()) return 'Ingresa tu nombre'
    if (!vehiculoId) return 'Selecciona un vehículo'
    if (!tipoInspeccion) return 'Selecciona el tipo de inspección'
    if (conRemolque && !semirremolqueId) return 'Selecciona un semirremolque'
    return null
  }

  function validarPaso3() {
    const sinRevisarV = puntos.filter(p => p.estado === '').length
    if (sinRevisarV > 0) return `Faltan ${sinRevisarV} punto(s) del vehículo por revisar`
    if (conRemolque) {
      const sinRevisarR = puntosRemolque.filter(p => p.estado === '').length
      if (sinRevisarR > 0) return `Faltan ${sinRevisarR} punto(s) del remolque por revisar`
    }
    return null
  }

  function validarPaso4() {
    if (!estadoSeguridad) return 'Selecciona el estado de seguridad'
    return null
  }

  async function enviar() {
    setError('')
    setEnviando(true)
    try {
      const fotosArr = Object.entries(fotos).map(([angulo, url]) => ({ angulo, url }))
      const allPuntos = [...puntos]
      if (conRemolque) allPuntos.push(...puntosRemolque)
      const puntosArr = allPuntos.map(p => ({
        categoria: p.cat,
        nombre: p.nombre,
        estado: p.estado,
        comentario: p.comentario || null,
        fotoUrl: p.fotoUrl || null,
      }))
      const body = {
        vehiculoId, vehiculoNombre, vin: null, ubicacion: ubicacion || null,
        matricula: matricula || null, odometro: odometro ? parseFloat(odometro) : null,
        tipoInspeccion, estadoSeguridad, operadorNombre: operadorNombre.trim(),
        tipoDVIR: conRemolque ? 'vehiculo_trailer' : 'solo_vehiculo',
        fotos: fotosArr, puntos: puntosArr,
      }
      if (conRemolque) {
        body.semirremolqueId = semirremolqueId
        body.semirremolqueNombre = semirremolqueNombre
      }
      const resp = await fetch(`${API_BASE}/dvir-publico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (data.ok) {
        setExito(data)
      } else {
        setError(data.error || 'Error al enviar')
      }
    } catch (e) {
      setError('Error de conexión: ' + e.message)
    } finally {
      setEnviando(false)
    }
  }

  function resetear() {
    setTipoDVIR(null)
    setPaso(0)
    setOperadorNombre('')
    setVehiculoId(null)
    setVehiculoNombre('')
    setMatricula('')
    setTipoInspeccion('')
    setOdometro('')
    setUbicacion('')
    setSemirremolqueId(null)
    setSemirremolqueNombre('')
    setFotos({})
    setPuntos(PUNTOS_INSPECCION.map(p => ({ ...p, estado: '', comentario: '', fotoUrl: null })))
    setPuntosRemolque(PUNTOS_REMOLQUE.map(p => ({ ...p, estado: '', comentario: '', fotoUrl: null })))
    setEstadoSeguridad('')
    setError('')
    setExito(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      </div>
    )
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '16px' }}>
        <div style={{ textAlign: 'center', background: '#fff', borderRadius: 16, overflow: 'hidden', maxWidth: 400, width: '100%' }}>
          <div style={{ background: '#1e293b', padding: '24px 24px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', textTransform: 'uppercase', marginBottom: 4 }}>DVIR</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Inspección enviada</h2>
          </div>
          <div style={{ padding: 32 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <p style={{ color: '#6b7280', marginBottom: 6, fontSize: 13 }}>DVIR #{exito.DVIRId}</p>
            <p style={{ color: '#374151', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
              <strong>{vehiculoNombre}</strong>
              {conRemolque && <><br /><span style={{ fontSize: '13px', color: '#6b7280' }}>+ {semirremolqueNombre}</span></>}
              <br />
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                {tipoInspeccion === 'previo' ? 'Previo al viaje' : 'Posterior al viaje'} &mdash; {estadoSeguridad === 'seguro' ? 'Seguro' : 'No seguro'}
              </span>
            </p>
            <button onClick={resetear} style={{
              width: '100%', padding: '12px', background: '#f59e0b', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>Nueva inspección</button>
            <a href="/portal" style={{ display: 'block', marginTop: 14, color: '#f59e0b', fontSize: 13, textDecoration: 'none' }}>← Portal</a>
          </div>
        </div>
      </div>
    )
  }

  const totalPuntos = conRemolque ? puntos.length + puntosRemolque.length : puntos.length
  const defectos = puntos.filter(p => p.estado === 'defecto').length + (conRemolque ? puntosRemolque.filter(p => p.estado === 'defecto').length : 0)
  const revisados = puntos.filter(p => p.estado !== '').length + (conRemolque ? puntosRemolque.filter(p => p.estado !== '').length : 0)
  const totalPasos = 4

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '20px 24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <a href="/portal" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: 10 }}>← Portal</a>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', textTransform: 'uppercase', marginBottom: 3 }}>SIGA</div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f1f5f9' }}>Inspección DVIR</h1>
        </div>
      </div>

      {/* Progress */}
      {paso > 0 && (
        <div style={{ display: 'flex', maxWidth: '640px', margin: '0 auto' }}>
          {[1, 2, 3, 4].map(p => (
            <div key={p} style={{
              flex: 1, height: '4px',
              background: paso >= p ? '#f59e0b' : '#334155',
            }} />
          ))}
        </div>
      )}

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px',
          }}>{error}</div>
        )}

        {/* PASO 0 — Tipo de DVIR */}
        {paso === 0 && (
          <>
            <h2 style={{ fontSize: '17px', color: '#f1f5f9', marginBottom: '20px', fontWeight: 700 }}>Selecciona el tipo de inspección</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { val: 'solo_vehiculo', label: 'Solo vehículo', desc: 'Inspección estándar del vehículo' },
                { val: 'vehiculo_trailer', label: 'Vehículo + semirremolque', desc: 'Inspección del vehículo y el semirremolque' },
              ].map(opt => (
                <button key={opt.val} onClick={() => { setTipoDVIR(opt.val); setPaso(1); setError('') }} style={{
                  padding: '20px 24px', border: '2px solid #d1d5db', borderRadius: '12px',
                  background: '#fff', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}
                >
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'block' }}>{opt.label}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', display: 'block' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* PASO 1 — Datos generales */}
        {paso === 1 && (
          <>
            <h2 style={{ fontSize: '17px', color: '#f1f5f9', marginBottom: '20px', fontWeight: 700 }}>
              Paso 1 — Datos del vehículo{conRemolque ? ' y semirremolque' : ''}
            </h2>
            <div style={cardStyle}>
              <label style={labelStyle}>Nombre del operador *</label>
              <input style={inputStyle} placeholder="Tu nombre completo"
                value={operadorNombre} onChange={e => setOperadorNombre(e.target.value)} />

              <label style={{ ...labelStyle, marginTop: '18px' }}>Vehículo *</label>
              <select style={inputStyle} value={vehiculoId || ''}
                onChange={e => seleccionarVehiculo(Number(e.target.value))}>
                <option value="">— Seleccionar vehículo —</option>
                {vehiculos.map(v => <option key={v.VehiculoId} value={v.VehiculoId}>{v.Nombre}</option>)}
              </select>

              {conRemolque && (
                <>
                  <label style={{ ...labelStyle, marginTop: '18px' }}>Semirremolque *</label>
                  <select style={inputStyle} value={semirremolqueId || ''}
                    onChange={e => seleccionarSemirremolque(Number(e.target.value))}>
                    <option value="">— Seleccionar semirremolque —</option>
                    {semirremolques.map(s => (
                      <option key={s.SemirremolqueId} value={s.SemirremolqueId}>
                        {s.Nombre} — {s.Marca} ({s.Año || ''})
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label style={{ ...labelStyle, marginTop: '18px' }}>Tipo de inspección *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['previo', 'posterior'].map(t => (
                  <button key={t} onClick={() => setTipoInspeccion(t)} style={{
                    flex: 1, padding: '10px', border: `2px solid ${tipoInspeccion === t ? '#f59e0b' : '#d1d5db'}`,
                    borderRadius: '8px', background: tipoInspeccion === t ? '#fffbeb' : '#fff',
                    color: tipoInspeccion === t ? '#92400e' : '#374151',
                    fontWeight: tipoInspeccion === t ? '600' : '400',
                    cursor: 'pointer', fontSize: '14px',
                  }}>{t === 'previo' ? 'Previo al viaje' : 'Posterior al viaje'}</button>
                ))}
              </div>

              <label style={{ ...labelStyle, marginTop: '18px' }}>Matrícula del vehículo</label>
              <input style={inputStyle} placeholder="Ej. 93AP7D"
                value={matricula} onChange={e => setMatricula(e.target.value)} />

              <label style={{ ...labelStyle, marginTop: '18px' }}>Odómetro (km)</label>
              <input style={inputStyle} type="number" placeholder="Lectura actual"
                value={odometro} onChange={e => setOdometro(e.target.value)} />

              <label style={{ ...labelStyle, marginTop: '18px' }}>Ubicación</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Escribe o usa GPS"
                  value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
                <button onClick={obtenerUbicacion} style={{
                  padding: '10px 14px', background: '#f3f4f6', border: '1px solid #d1d5db',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '18px',
                }} title="Obtener GPS">&#128205;</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setPaso(0); setTipoDVIR(null); setError('') }} style={{
                padding: '14px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                borderRadius: '8px', fontSize: '15px', cursor: 'pointer',
              }}>Atrás</button>
              <button onClick={() => {
                const err = validarPaso1()
                if (err) { setError(err); return }
                setError(''); setPaso(2)
              }} style={{
                flex: 1, padding: '14px', background: '#f59e0b', color: '#fff',
                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              }}>Siguiente</button>
            </div>
          </>
        )}

        {/* PASO 2 — Fotos */}
        {paso === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setPaso(1)} style={{
                background: 'none', border: 'none', color: '#f59e0b', fontSize: '22px', cursor: 'pointer', padding: 0,
              }}>&lsaquo;</button>
              <h2 style={{ fontSize: '17px', color: '#f1f5f9', margin: 0, fontWeight: 700 }}>Paso 2 — Fotos</h2>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', fontWeight: '600' }}>Fotos del vehículo</h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0 }}>
                Toma una foto de cada ángulo del vehículo.
              </p>
              <FotoGrid angulos={FOTOS_ANGULOS} fotos={fotos} subiendoFoto={subiendoFoto} subirFoto={subirFoto} />
            </div>

            {conRemolque && (
              <div style={cardStyle}>
                <h3 style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', fontWeight: '600' }}>Fotos del semirremolque</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0 }}>
                  Toma una foto de cada ángulo del remolque.
                </p>
                <FotoGrid angulos={FOTOS_REMOLQUE} fotos={fotos} subiendoFoto={subiendoFoto} subirFoto={subirFoto} />
              </div>
            )}

            <button onClick={() => { setError(''); setPaso(3) }} style={{
              width: '100%', padding: '14px', background: '#f59e0b', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            }}>Siguiente</button>
          </>
        )}

        {/* PASO 3 — Inspección */}
        {paso === 3 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button onClick={() => setPaso(2)} style={{
                background: 'none', border: 'none', color: '#f59e0b', fontSize: '22px', cursor: 'pointer', padding: 0,
              }}>&lsaquo;</button>
              <h2 style={{ fontSize: '17px', color: '#f1f5f9', margin: 0, fontWeight: 700 }}>Paso 3 — Inspección</h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              {revisados}/{totalPuntos} revisados &nbsp;|&nbsp; {defectos} defecto(s)
            </p>

            <h3 style={{ fontSize: '15px', color: '#f1f5f9', margin: '0 0 12px', fontWeight: '600' }}>
              Inspeccionar vehículo ({puntos.filter(p => p.estado !== '').length}/{puntos.length})
            </h3>
            <InspeccionList
              puntos={puntos} offset={0}
              setPuntoEstado={setPuntoEstado} setPuntoComentario={setPuntoComentario}
              subirFotoDefecto={subirFotoDefecto} subiendoFotoDefecto={subiendoFotoDefecto}
              categorias={CATEGORIAS}
            />

            {conRemolque && (
              <>
                <h3 style={{ fontSize: '15px', color: '#f1f5f9', margin: '24px 0 12px', fontWeight: '600' }}>
                  Inspeccionar remolque ({puntosRemolque.filter(p => p.estado !== '').length}/{puntosRemolque.length})
                </h3>
                <InspeccionList
                  puntos={puntosRemolque} offset={PUNTOS_INSPECCION.length}
                  setPuntoEstado={setPuntoEstado} setPuntoComentario={setPuntoComentario}
                  subirFotoDefecto={subirFotoDefecto} subiendoFotoDefecto={subiendoFotoDefecto}
                  categorias={{ remolque_exterior: 'Exterior — Frente' }}
                />
              </>
            )}

            <button onClick={() => {
              const err = validarPaso3()
              if (err) { setError(err); return }
              setError(''); setPaso(4)
            }} style={{
              width: '100%', padding: '14px', background: '#f59e0b', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            }}>Siguiente</button>
          </>
        )}

        {/* PASO 4 — Estado de seguridad */}
        {paso === 4 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setPaso(3)} style={{
                background: 'none', border: 'none', color: '#f59e0b', fontSize: '22px', cursor: 'pointer', padding: 0,
              }}>&lsaquo;</button>
              <h2 style={{ fontSize: '17px', color: '#f1f5f9', margin: 0, fontWeight: 700 }}>Paso 4 — Estado de seguridad</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0 }}>
                <strong>{vehiculoNombre}</strong>
                {conRemolque && <><br />+ {semirremolqueNombre}</>}
                <br />
                {tipoInspeccion === 'previo' ? 'Previo al viaje' : 'Posterior al viaje'} &mdash; {defectos} defecto(s)
              </p>
              <label style={labelStyle}>Estado general del vehículo *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { val: 'seguro', label: 'Seguro para operar', color: '#059669', bg: '#ecfdf5' },
                  { val: 'no_seguro', label: 'No seguro', color: '#dc2626', bg: '#fef2f2' },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setEstadoSeguridad(opt.val)} style={{
                    flex: 1, padding: '14px', border: `2px solid ${estadoSeguridad === opt.val ? opt.color : '#d1d5db'}`,
                    borderRadius: '8px', background: estadoSeguridad === opt.val ? opt.bg : '#fff',
                    color: estadoSeguridad === opt.val ? opt.color : '#374151',
                    fontWeight: estadoSeguridad === opt.val ? '600' : '400',
                    cursor: 'pointer', fontSize: '14px',
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
            <button disabled={enviando} onClick={() => {
              const err = validarPaso4()
              if (err) { setError(err); return }
              setError(''); enviar()
            }} style={{
              width: '100%', padding: '14px',
              background: enviando ? '#fbbf24' : '#f59e0b', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700',
              cursor: enviando ? 'wait' : 'pointer',
              opacity: enviando ? 0.8 : 1,
            }}>{enviando ? 'Enviando...' : 'Enviar inspección'}</button>
          </>
        )}
      </div>
    </div>
  )
}
