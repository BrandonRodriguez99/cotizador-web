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

const FOTOS_ANGULOS = [
  { key: 'conductor', label: 'Lado conductor' },
  { key: 'delantera', label: 'Parte delantera' },
  { key: 'pasajero', label: 'Lado pasajero' },
  { key: 'atras', label: 'Parte trasera' },
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

export default function DVIRPublico() {
  const [paso, setPaso] = useState(1)
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)

  // Paso 1
  const [operadorNombre, setOperadorNombre] = useState('')
  const [vehiculoId, setVehiculoId] = useState(null)
  const [vehiculoNombre, setVehiculoNombre] = useState('')
  const [matricula, setMatricula] = useState('')
  const [tipoInspeccion, setTipoInspeccion] = useState('')
  const [odometro, setOdometro] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  // Paso 2 — fotos
  const [fotos, setFotos] = useState({})
  const [subiendoFoto, setSubiendoFoto] = useState(null)

  // Paso 3 — puntos
  const [puntos, setPuntos] = useState(
    PUNTOS_INSPECCION.map(p => ({ ...p, estado: '', comentario: '' }))
  )

  // Paso 4 — estado final
  const [estadoSeguridad, setEstadoSeguridad] = useState('')

  // Envío
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/dvir-publico/vehiculos`)
      .then(r => r.json())
      .then(data => { setVehiculos(data); setLoading(false) })
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

  async function subirFoto(angulo, file) {
    setSubiendoFoto(angulo)
    try {
      const reader = new FileReader()
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const resp = await fetch(`${API_BASE}/dvir-publico/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 }),
      })
      const data = await resp.json()
      if (data.url) {
        setFotos(prev => ({ ...prev, [angulo]: data.url }))
      } else {
        setError(data.error || 'Error al subir foto')
      }
    } catch (e) {
      setError('Error al subir foto: ' + e.message)
    } finally {
      setSubiendoFoto(null)
    }
  }

  function setPuntoEstado(idx, estado) {
    setPuntos(prev => prev.map((p, i) => i === idx ? { ...p, estado } : p))
  }
  function setPuntoComentario(idx, comentario) {
    setPuntos(prev => prev.map((p, i) => i === idx ? { ...p, comentario } : p))
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
    return null
  }

  function validarPaso3() {
    const sinRevisar = puntos.filter(p => p.estado === '').length
    if (sinRevisar > 0) return `Faltan ${sinRevisar} punto(s) por revisar`
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
      const puntosArr = puntos.map(p => ({
        categoria: p.cat,
        nombre: p.nombre,
        estado: p.estado,
        comentario: p.comentario || null,
        fotoUrl: null,
      }))
      const resp = await fetch(`${API_BASE}/dvir-publico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId, vehiculoNombre, vin: null, ubicacion: ubicacion || null,
          matricula: matricula || null, odometro: odometro ? parseFloat(odometro) : null,
          tipoInspeccion, estadoSeguridad, operadorNombre: operadorNombre.trim(),
          fotos: fotosArr, puntos: puntosArr,
        }),
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
    setPaso(1)
    setOperadorNombre('')
    setVehiculoId(null)
    setVehiculoNombre('')
    setMatricula('')
    setTipoInspeccion('')
    setOdometro('')
    setUbicacion('')
    setFotos({})
    setPuntos(PUNTOS_INSPECCION.map(p => ({ ...p, estado: '', comentario: '' })))
    setEstadoSeguridad('')
    setError('')
    setExito(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      </div>
    )
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', ...cardStyle, maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#10003;</div>
          <h2 style={{ color: '#059669', marginBottom: '8px' }}>Inspección enviada</h2>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>DVIR #{exito.DVIRId}</p>
          <p style={{ color: '#374151', marginBottom: '24px' }}>
            {vehiculoNombre}<br />
            <span style={{ color: '#6b7280', fontSize: '13px' }}>
              {tipoInspeccion === 'previo' ? 'Previo al viaje' : 'Posterior al viaje'} &mdash; {estadoSeguridad === 'seguro' ? 'Seguro' : 'No seguro'}
            </span>
          </p>
          <button onClick={resetear} style={{
            padding: '10px 24px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
          }}>Nueva inspección</button>
        </div>
      </div>
    )
  }

  const defectos = puntos.filter(p => p.estado === 'defecto').length
  const revisados = puntos.filter(p => p.estado !== '').length

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, letterSpacing: '0.05em' }}>UDAT360</p>
          <h1 style={{ margin: '4px 0 0', fontSize: '20px', color: '#111827' }}>Inspección DVIR</h1>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', maxWidth: '640px', margin: '0 auto' }}>
        {[1, 2, 3, 4].map(p => (
          <div key={p} style={{
            flex: 1, height: '4px',
            background: paso >= p ? '#2563eb' : '#e5e7eb',
          }} />
        ))}
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px',
          }}>{error}</div>
        )}

        {/* PASO 1 — Datos generales */}
        {paso === 1 && (
          <>
            <h2 style={{ fontSize: '17px', color: '#111827', marginBottom: '20px' }}>Paso 1 — Datos del vehículo</h2>
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

              <label style={{ ...labelStyle, marginTop: '18px' }}>Tipo de inspección *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['previo', 'posterior'].map(t => (
                  <button key={t} onClick={() => setTipoInspeccion(t)} style={{
                    flex: 1, padding: '10px', border: `2px solid ${tipoInspeccion === t ? '#2563eb' : '#d1d5db'}`,
                    borderRadius: '8px', background: tipoInspeccion === t ? '#eff6ff' : '#fff',
                    color: tipoInspeccion === t ? '#2563eb' : '#374151',
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
            <button onClick={() => {
              const err = validarPaso1()
              if (err) { setError(err); return }
              setError(''); setPaso(2)
            }} style={{
              width: '100%', padding: '14px', background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}>Siguiente</button>
          </>
        )}

        {/* PASO 2 — Fotos */}
        {paso === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setPaso(1)} style={{
                background: 'none', border: 'none', color: '#2563eb', fontSize: '22px', cursor: 'pointer', padding: 0,
              }}>&lsaquo;</button>
              <h2 style={{ fontSize: '17px', color: '#111827', margin: 0 }}>Paso 2 — Fotos del vehículo</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0 }}>
                Toma una foto de cada ángulo del vehículo.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {FOTOS_ANGULOS.map(({ key, label }) => (
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
                        height: '100px', cursor: subiendoFoto === key ? 'wait' : 'pointer', color: '#6b7280', fontSize: '13px',
                      }}>
                        {subiendoFoto === key ? 'Subiendo...' : (
                          <>
                            <span style={{ fontSize: '24px', marginBottom: '4px' }}>&#128247;</span>
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
            </div>
            <button onClick={() => { setError(''); setPaso(3) }} style={{
              width: '100%', padding: '14px', background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}>Siguiente</button>
          </>
        )}

        {/* PASO 3 — Inspección */}
        {paso === 3 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button onClick={() => setPaso(2)} style={{
                background: 'none', border: 'none', color: '#2563eb', fontSize: '22px', cursor: 'pointer', padding: 0,
              }}>&lsaquo;</button>
              <h2 style={{ fontSize: '17px', color: '#111827', margin: 0 }}>Paso 3 — Inspección</h2>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
              {revisados}/{puntos.length} revisados &nbsp;|&nbsp; {defectos} defecto(s)
            </p>

            {Object.entries(CATEGORIAS).map(([catKey, catLabel]) => {
              const items = puntos
                .map((p, idx) => ({ ...p, idx }))
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
                        <input style={{ ...inputStyle, marginTop: '4px', width: '100%', fontSize: '12px' }}
                          placeholder="Comentario del defecto..."
                          value={p.comentario} onChange={e => setPuntoComentario(p.idx, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
            <button onClick={() => {
              const err = validarPaso3()
              if (err) { setError(err); return }
              setError(''); setPaso(4)
            }} style={{
              width: '100%', padding: '14px', background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}>Siguiente</button>
          </>
        )}

        {/* PASO 4 — Estado de seguridad */}
        {paso === 4 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setPaso(3)} style={{
                background: 'none', border: 'none', color: '#2563eb', fontSize: '22px', cursor: 'pointer', padding: 0,
              }}>&lsaquo;</button>
              <h2 style={{ fontSize: '17px', color: '#111827', margin: 0 }}>Paso 4 — Estado de seguridad</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 0 }}>
                <strong>{vehiculoNombre}</strong><br />
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
              background: enviando ? '#93c5fd' : '#2563eb', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600',
              cursor: enviando ? 'wait' : 'pointer',
            }}>{enviando ? 'Enviando...' : 'Enviar inspección'}</button>
          </>
        )}
      </div>
    </div>
  )
}
