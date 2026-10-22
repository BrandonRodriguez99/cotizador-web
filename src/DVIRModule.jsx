import { useState, useEffect, useCallback } from 'react'
import {
  getDVIRVehiculos,
  getDVIRLista, getDVIRDetalle, eliminarDVIR, resolverDefecto,
} from './api'

const CATEGORIAS = {
  exterior_frente:    'Exterior – Frente',
  exterior_trasero:   'Exterior – Trasero',
  exterior_lado:      'Exterior – Lado y por debajo',
  interior_cabina:    'Interior – Cabina del conductor',
  interior_pasajeros: 'Interior – Zona de pasajeros',
  otros:              'Otros',
  remolque_exterior:  'Semirremolque – Exterior',
}

const ANGULOS_VEHICULO = ['conductor', 'delantera', 'pasajero', 'atras']
const ANGULOS_REMOLQUE = ['remolque_trasera', 'remolque_izquierda', 'remolque_derecha']
const ANGULO_LABEL = {
  conductor: 'Lado del conductor', delantera: 'Parte delantera', pasajero: 'Lado del pasajero', atras: 'Atrás',
  remolque_trasera: 'Trasera del remolque', remolque_izquierda: 'Izquierda del remolque', remolque_derecha: 'Derecha del remolque',
}

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

function IconOk({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="10" fill="#16A34A" />
      <path d="M5.5 10.5L8.5 13.5L14.5 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDefecto({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="10" fill="#DC2626" />
      <path d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Badge({ value }) {
  const es = value === 'seguro' || value === 'Seguro para conducir'
  const label = value === 'seguro' ? 'Seguro' : value === 'no_seguro' ? 'No seguro' : value
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
      background: es ? '#dcfce7' : '#fef2f2', color: es ? '#15803d' : '#b91c1c',
      border: `1px solid ${es ? '#86efac' : '#fca5a5'}`,
    }}>{label}</span>
  )
}

// ── Panel lateral de detalle ──────────────────────────────────────────────────
function DVIRDetallePanel({ id, onClose, onResolucionCambiada }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [resolviendo, setResolviendo] = useState(null) // puntoId en proceso

  useEffect(() => {
    setData(null)
    setLoading(true)
    getDVIRDetalle(id).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function handleResolucion(puntoId, resuelto) {
    setResolviendo(puntoId)
    try {
      await resolverDefecto(puntoId, resuelto)
      setData(prev => ({
        ...prev,
        puntos: prev.puntos.map(p => p.DVIRPuntoId === puntoId ? { ...p, Resuelto: resuelto ? 1 : 0 } : p),
      }))
      onResolucionCambiada?.()
    } catch (e) { console.error(e) }
    finally { setResolviendo(null) }
  }

  const porCategoria = {}
  if (data) {
    for (const p of data.puntos || []) {
      if (!porCategoria[p.Categoria]) porCategoria[p.Categoria] = []
      porCategoria[p.Categoria].push(p)
    }
  }

  return (
    <>
      {/* Backdrop semitransparente — click cierra el panel */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 900, backdropFilter: 'blur(1px)',
        }}
      />

      {/* Panel lateral derecho */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(580px, 100vw)',
        background: '#fff',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.14)',
        zIndex: 901,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.22s ease',
      }}>

        {/* Header fijo */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Inspección</div>
              <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 700 }}>
                {loading ? '…' : `DVIR #${data?.DVIRId}`}
              </h2>
              {!loading && data && (
                <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '13px' }}>
                  {fmt(data.FechaCreacion)} · {data.CreadoPor}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              title="Cerrar"
              style={{
                width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {loading && (
            <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '60px' }}>
              Cargando…
            </div>
          )}

          {!loading && data && (
            <>
              {/* Ficha de datos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
                {[
                  ['Vehículo',          data.VehiculoNombre],
                  ['Matrícula',         data.Matricula || '—'],
                  ['Tipo',              data.TipoInspeccion === 'previo' ? 'Previo al viaje' : 'Posterior al viaje'],
                  ['Odómetro',          data.Odometro ? `${Number(data.Odometro).toLocaleString('es-MX')} km` : '—'],
                  ['Ubicación',         data.Ubicacion || '—'],
                  ['VIN',               data.VIN || '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{val}</div>
                  </div>
                ))}
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Estado</div>
                  <Badge value={data.EstadoSeguridad} />
                </div>
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Defectos</div>
                  <div style={{ fontWeight: 700, fontSize: '22px', color: data.Defectos > 0 ? '#b91c1c' : '#15803d' }}>{data.Defectos}</div>
                </div>
              </div>

              {/* Fotos de inspección */}
              {(data.fotos || []).length > 0 && (() => {
                const fotosRemolque = (data.fotos || []).filter(f => f.Angulo && f.Angulo.startsWith('remolque_'))
                const renderFotoGrid = (angulos, cols) => (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px' }}>
                    {angulos.map(ang => {
                      const foto = data.fotos.find(f => f.Angulo === ang)
                      return (
                        <div key={ang} style={{ textAlign: 'center' }}>
                          {foto ? (
                            <img src={foto.FotoUrl} alt={ANGULO_LABEL[ang]}
                              onClick={() => setFotoAmpliada(foto.FotoUrl)}
                              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', cursor: 'zoom-in', border: '1px solid #e5e7eb' }} />
                          ) : (
                            <div style={{ width: '100%', aspectRatio: '1', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db' }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 7c0-1.1.9-2 2-2h2.2l1.4-2h6.8l1.4 2H19c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12.5" r="4" stroke="#FF6D00" strokeWidth="2"/></svg>
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{ANGULO_LABEL[ang]}</div>
                        </div>
                      )
                    })}
                  </div>
                )
                return (
                  <div style={{ marginBottom: '22px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                      Inspección{fotosRemolque.length > 0 ? ' — Vehículo' : ''}
                    </div>
                    {renderFotoGrid(ANGULOS_VEHICULO, 4)}
                    {fotosRemolque.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                          Inspección — Semirremolque
                        </div>
                        {renderFotoGrid(ANGULOS_REMOLQUE, 3)}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Defectos con seguimiento de resolución */}
              {data.Defectos > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Defectos reportados
                    </div>
                    {(() => {
                      const resueltos = (data.puntos || []).filter(p => p.Estado === 'defecto' && p.Resuelto).length
                      const pct = Math.round((resueltos / data.Defectos) * 100)
                      return (
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                          background: pct === 100 ? '#dcfce7' : pct > 0 ? '#fef9c3' : '#fee2e2',
                          color: pct === 100 ? '#15803d' : pct > 0 ? '#a16207' : '#b91c1c',
                        }}>{resueltos}/{data.Defectos} resueltos · {pct}%</span>
                      )
                    })()}
                  </div>
                  {Object.entries(CATEGORIAS).map(([key, label]) => {
                    const items = (porCategoria[key] || []).filter(p => p.Estado === 'defecto')
                    if (!items.length) return null
                    return (
                      <div key={key} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
                        {items.map((p, i) => {
                          const resuelto = !!p.Resuelto
                          return (
                            <div key={i} style={{
                              background: resuelto ? '#f0fdf4' : '#fff5f5',
                              border: `1px solid ${resuelto ? '#86efac' : '#fecaca'}`,
                              borderRadius: '8px', padding: '10px 14px', marginBottom: '6px',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: resuelto ? '#15803d' : '#b91c1c', marginBottom: p.Comentario || p.FotoUrl ? '6px' : 0 }}>
                                    {resuelto ? '✓' : '✗'} {p.Nombre}
                                  </div>
                                  {p.Comentario && <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#6b7280' }}>{p.Comentario}</p>}
                                  {p.FotoUrl && (
                                    <img src={p.FotoUrl} alt="defecto" onClick={() => setFotoAmpliada(p.FotoUrl)}
                                      style={{ height: '72px', borderRadius: '6px', objectFit: 'cover', cursor: 'zoom-in', border: `1px solid ${resuelto ? '#86efac' : '#fecaca'}` }} />
                                  )}
                                </div>
                                {/* Dropdown de resolución */}
                                <select
                                  value={resuelto ? '1' : '0'}
                                  disabled={resolviendo === p.DVIRPuntoId}
                                  onChange={e => handleResolucion(p.DVIRPuntoId, e.target.value === '1')}
                                  style={{
                                    fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                                    border: `1px solid ${resuelto ? '#86efac' : '#fca5a5'}`,
                                    background: resuelto ? '#dcfce7' : '#fef2f2',
                                    color: resuelto ? '#15803d' : '#b91c1c',
                                    flexShrink: 0,
                                  }}>
                                  <option value="0">No resuelto</option>
                                  <option value="1">Resuelto ✓</option>
                                </select>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Todos los puntos de inspección */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                  Todos los puntos ({(data.puntos || []).length})
                </div>
                {(() => {
                  const hasRemolque = (porCategoria['remolque_exterior'] || []).length > 0
                  let addedRemolqueDivider = false
                  return Object.entries(CATEGORIAS).map(([key, label]) => {
                    const items = porCategoria[key] || []
                    if (!items.length) return null
                    const defCount = items.filter(p => p.Estado === 'defecto').length
                    const showRemolqueDivider = hasRemolque && key.startsWith('remolque_') && !addedRemolqueDivider
                    if (showRemolqueDivider) addedRemolqueDivider = true
                    return (
                      <div key={key}>
                        {hasRemolque && key === 'exterior_frente' && (
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', paddingBottom: '4px', borderBottom: '2px solid #2563eb' }}>Vehículo</div>
                        )}
                        {showRemolqueDivider && (
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '18px', marginBottom: '10px', paddingBottom: '4px', borderBottom: '2px solid #2563eb' }}>Semirremolque</div>
                        )}
                        <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#6b7280' }}>{label}</span>
                        {defCount > 0 && <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 600 }}>{defCount} defecto{defCount > 1 ? 's' : ''}</span>}
                      </div>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        {items.map((p, i) => (
                          <div key={i} style={{
                            padding: '7px 12px',
                            borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                            background: p.Estado === 'defecto' ? '#fff5f5' : 'transparent',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {p.Estado === 'ok' ? <IconOk /> : <IconDefecto />}
                              <span style={{ fontSize: '12px', fontWeight: p.Estado === 'defecto' ? 600 : 400, color: p.Estado === 'defecto' ? '#b91c1c' : '#374151' }}>{p.Nombre}</span>
                            </div>
                            {p.Estado === 'defecto' && (p.Comentario || p.FotoUrl) && (
                              <div style={{ marginLeft: '28px', marginTop: '4px' }}>
                                {p.Comentario && <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>{p.Comentario}</p>}
                                {p.FotoUrl && (
                                  <img src={p.FotoUrl} alt="defecto" onClick={() => setFotoAmpliada(p.FotoUrl)}
                                    style={{ height: '60px', borderRadius: '6px', objectFit: 'cover', cursor: 'zoom-in', border: '1px solid #fecaca' }} />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={fotoAmpliada} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ── Modal vehículos ───────────────────────────────────────────────────────────
function VehiculosModal({ onClose }) {
  const [vehiculos, setVehiculos] = useState([])
  useEffect(() => { getDVIRVehiculos().then(setVehiculos).catch(console.error) }, [])
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Vehículos disponibles</h2>
          <button className="ghost-button" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
          Para agregar o editar vehículos ve a <strong>Herramientas → Vehículos</strong>.
        </p>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead><tr><th>Vehículo</th><th>Placa</th><th>Año</th><th>Color</th></tr></thead>
            <tbody>
              {vehiculos.map(v => (
                <tr key={v.VehiculoId}>
                  <td style={{ fontWeight: 600 }}>{v.Marca} {v.Modelo}</td>
                  <td style={{ fontSize: '12px' }}>{v.Placa}</td>
                  <td style={{ fontSize: '12px', color: '#6b7280' }}>{v.Año || '—'}</td>
                  <td style={{ fontSize: '12px', color: '#6b7280' }}>{v.Color || '—'}</td>
                </tr>
              ))}
              {!vehiculos.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Sin vehículos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Módulo principal ──────────────────────────────────────────────────────────
export default function DVIRModule({ usuario }) {
  const isAdmin = usuario?.rol === 'admin'
  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading]     = useState(true)
  const [vehiculos, setVehiculos]  = useState([])
  const [detalleId, setDetalleId]  = useState(null)
  const [hoveredId, setHoveredId]  = useState(null)
  const [verVehiculos, setVerVehiculos] = useState(false)

  const [filtVehiculo, setFiltVehiculo] = useState('')
  const [filtTipo,     setFiltTipo]     = useState('')
  const [filtEstado,   setFiltEstado]   = useState('')
  const [filtDesde,    setFiltDesde]    = useState('')
  const [filtHasta,    setFiltHasta]    = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtVehiculo) params.vehiculoId = filtVehiculo
      if (filtTipo)     params.tipo = filtTipo
      if (filtEstado)   params.estado = filtEstado
      if (filtDesde)    params.desde = filtDesde
      if (filtHasta)    params.hasta = filtHasta
      const data = await getDVIRLista(params)
      setInspecciones(data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [filtVehiculo, filtTipo, filtEstado, filtDesde, filtHasta])

  useEffect(() => { getDVIRVehiculos().then(setVehiculos).catch(console.error) }, [])
  useEffect(() => { cargar() }, [cargar])

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta inspección?')) return
    try { await eliminarDVIR(id); cargar() }
    catch (err) { alert(err.message) }
  }

  const defectCount = inspecciones.filter(i => i.EstadoSeguridad === 'no_seguro').length

  return (
    <section className="panel card">
      {/* Header */}
      <div className="panel-header space-between" style={{ marginBottom: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
            {inspecciones.length} inspección{inspecciones.length !== 1 ? 'es' : ''}
            {defectCount > 0 && <span style={{ marginLeft: '8px', color: '#b91c1c', fontWeight: 600 }}>· {defectCount} no seguro{defectCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button className="ghost-button" onClick={() => setVerVehiculos(true)} style={{ fontSize: '13px' }}>
          Vehículos
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <select className="form-control" style={{ maxWidth: '220px' }} value={filtVehiculo} onChange={e => setFiltVehiculo(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehiculos.map(v => <option key={v.VehiculoId} value={v.VehiculoId}>{v.Nombre}</option>)}
        </select>
        <select className="form-control" style={{ maxWidth: '180px' }} value={filtTipo} onChange={e => setFiltTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="previo">Previo al viaje</option>
          <option value="posterior">Posterior al viaje</option>
        </select>
        <select className="form-control" style={{ maxWidth: '160px' }} value={filtEstado} onChange={e => setFiltEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="seguro">Seguro</option>
          <option value="no_seguro">No seguro</option>
        </select>
        <input type="date" className="form-control" style={{ maxWidth: '150px' }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)} title="Desde" />
        <input type="date" className="form-control" style={{ maxWidth: '150px' }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)} title="Hasta" />
        {(filtVehiculo || filtTipo || filtEstado || filtDesde || filtHasta) && (
          <button className="ghost-button" style={{ fontSize: '13px' }}
            onClick={() => { setFiltVehiculo(''); setFiltTipo(''); setFiltEstado(''); setFiltDesde(''); setFiltHasta('') }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="notification">Cargando inspecciones…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Vehículo</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Defectos</th>
                <th>Resueltos</th>
                <th>Cumplimiento</th>
                <th>Realizado por</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map(i => {
                const isSelected = detalleId === i.DVIRId
                const isHovered  = hoveredId  === i.DVIRId
                return (
                  <tr
                    key={i.DVIRId}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : isHovered ? '#f8fafc' : 'transparent',
                      borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'background 0.12s',
                    }}
                    onClick={() => setDetalleId(isSelected ? null : i.DVIRId)}
                    onMouseEnter={() => setHoveredId(i.DVIRId)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>{i.DVIRId}</td>
                    <td style={{ fontWeight: 600 }}>{i.VehiculoNombre}</td>
                    <td style={{ fontSize: '12px' }}>{i.TipoInspeccion === 'previo' ? 'Previo' : 'Posterior'}</td>
                    <td style={{ fontSize: '12px', color: '#6b7280', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.Ubicacion || '—'}</td>
                    <td><Badge value={i.EstadoSeguridad} /></td>
                    <td style={{ textAlign: 'center', fontWeight: i.Defectos > 0 ? 700 : 400, color: i.Defectos > 0 ? '#b91c1c' : '#9ca3af' }}>{i.Defectos}</td>
                    <td style={{ textAlign: 'center' }}>
                      {i.Defectos > 0
                        ? <span style={{ fontWeight: 700, color: i.Resueltos === i.Defectos ? '#15803d' : i.Resueltos > 0 ? '#a16207' : '#9ca3af' }}>
                            {i.Resueltos ?? 0}/{i.Defectos}
                          </span>
                        : <span style={{ color: '#9ca3af' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {i.Defectos > 0 ? (() => {
                        const pct = Math.round(((i.Resueltos ?? 0) / i.Defectos) * 100)
                        const color = pct === 100 ? '#15803d' : pct > 0 ? '#a16207' : '#b91c1c'
                        const bg    = pct === 100 ? '#dcfce7' : pct > 0 ? '#fef9c3' : '#fee2e2'
                        return (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: bg, color }}>
                            {pct}%
                          </span>
                        )
                      })() : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>{i.CreadoPor || '—'}</td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(i.FechaCreacion)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <button className="ghost-button" style={{ color: '#dc2626', fontSize: '12px', padding: '2px 8px' }}
                          onClick={() => handleEliminar(i.DVIRId)}>Eliminar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!inspecciones.length && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin inspecciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detalleId && (
        <DVIRDetallePanel
          id={detalleId}
          onClose={() => setDetalleId(null)}
          onResolucionCambiada={cargar}
        />
      )}
      {verVehiculos && <VehiculosModal onClose={() => setVerVehiculos(false)} />}
    </section>
  )
}
