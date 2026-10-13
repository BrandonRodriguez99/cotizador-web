import { useState, useEffect, useCallback } from 'react'
import {
  getDVIRVehiculos,
  getDVIRLista, getDVIRDetalle, eliminarDVIR,
} from './api'

const CATEGORIAS = {
  exterior_frente:    'Exterior – Frente',
  exterior_trasero:   'Exterior – Trasero',
  exterior_lado:      'Exterior – Lado y por debajo',
  interior_cabina:    'Interior – Cabina del conductor',
  interior_pasajeros: 'Interior – Zona de pasajeros',
  otros:              'Otros',
}

const ANGULOS = ['conductor', 'delantera', 'pasajero', 'atras']
const ANGULO_LABEL = { conductor: 'Lado del conductor', delantera: 'Parte delantera', pasajero: 'Lado del pasajero', atras: 'Atrás' }

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Badge ─────────────────────────────────────────────────────────────────────
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

// ── Modal detalle DVIR ────────────────────────────────────────────────────────
function DVIRDetalleModal({ id, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)

  useEffect(() => {
    getDVIRDetalle(id).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (!data && loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Cargando…</div>
      </div>
    </div>
  )
  if (!data) return null

  const porCategoria = {}
  for (const p of data.puntos || []) {
    if (!porCategoria[p.Categoria]) porCategoria[p.Categoria] = []
    porCategoria[p.Categoria].push(p)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>DVIR #{data.DVIRId}</h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>{fmt(data.FechaCreacion)} · {data.CreadoPor}</p>
          </div>
          <button className="ghost-button" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>

        {/* Info general */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            ['Vehículo', data.VehiculoNombre],
            ['VIN', data.VIN || '—'],
            ['Ubicación', data.Ubicacion || '—'],
            ['Matrícula', data.Matricula || '—'],
            ['Odómetro', data.Odometro ? `${Number(data.Odometro).toLocaleString('es-MX')} km` : '—'],
            ['Tipo de inspección', data.TipoInspeccion === 'previo' ? 'Previo al viaje' : 'Posterior al viaje'],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#f9fafb', borderRadius: '6px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{val}</div>
            </div>
          ))}
          <div style={{ background: '#f9fafb', borderRadius: '6px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado de seguridad</div>
            <Badge value={data.EstadoSeguridad} />
          </div>
          <div style={{ background: '#f9fafb', borderRadius: '6px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Defectos reportados</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: data.Defectos > 0 ? '#b91c1c' : '#15803d' }}>{data.Defectos}</div>
          </div>
        </div>

        {/* Fotos recorrida */}
        {(data.fotos || []).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#374151' }}>Fotos de la recorrida</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ANGULOS.map(ang => {
                const foto = data.fotos.find(f => f.Angulo === ang)
                return (
                  <div key={ang} style={{ textAlign: 'center' }}>
                    {foto ? (
                      <img src={foto.FotoUrl} alt={ANGULO_LABEL[ang]}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e5e7eb' }}
                        onClick={() => setFotoAmpliada(foto.FotoUrl)} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '1', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{ANGULO_LABEL[ang]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Puntos de inspección */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#374151' }}>
          Puntos de inspección ({(data.puntos || []).length})
        </h3>
        {Object.entries(CATEGORIAS).map(([key, label]) => {
          const items = porCategoria[key] || []
          if (!items.length) return null
          const defCount = items.filter(p => p.Estado === 'defecto').length
          return (
            <div key={key} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{label}</span>
                {defCount > 0 && <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 600 }}>{defCount} defecto{defCount > 1 ? 's' : ''}</span>}
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                {items.map((p, i) => (
                  <div key={i} style={{ padding: '8px 14px', borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none', background: p.Estado === 'defecto' ? '#fff5f5' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{p.Estado === 'ok' ? '✅' : '❌'}</span>
                      <span style={{ fontSize: '13px', fontWeight: p.Estado === 'defecto' ? 600 : 400 }}>{p.Nombre}</span>
                    </div>
                    {p.Estado === 'defecto' && (
                      <div style={{ marginTop: '6px', marginLeft: '28px' }}>
                        {p.Comentario && <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>{p.Comentario}</p>}
                        {p.FotoUrl && (
                          <img src={p.FotoUrl} alt="defecto"
                            style={{ height: '60px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => setFotoAmpliada(p.FotoUrl)} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {fotoAmpliada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setFotoAmpliada(null)}>
          <img src={fotoAmpliada} alt="foto" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

// ── Modal vehículos (solo lectura — se administran en módulo Vehículos) ───────
function VehiculosModal({ onClose }) {
  const [vehiculos, setVehiculos] = useState([])

  useEffect(() => {
    getDVIRVehiculos().then(setVehiculos).catch(console.error)
  }, [])

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
              {!vehiculos.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Sin vehículos en el catálogo</td></tr>}
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
  const [verVehiculos, setVerVehiculos] = useState(false)

  // Filtros
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

  useEffect(() => {
    getDVIRVehiculos().then(setVehiculos).catch(console.error)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta inspección?')) return
    try {
      await eliminarDVIR(id)
      cargar()
    } catch (err) { alert(err.message) }
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
                <th>Realizado por</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map(i => (
                <tr key={i.DVIRId} style={{ cursor: 'pointer' }} onClick={() => setDetalleId(i.DVIRId)}>
                  <td style={{ color: '#6b7280', fontSize: '12px' }}>{i.DVIRId}</td>
                  <td style={{ fontWeight: 600 }}>{i.VehiculoNombre}</td>
                  <td style={{ fontSize: '12px' }}>{i.TipoInspeccion === 'previo' ? 'Previo' : 'Posterior'}</td>
                  <td style={{ fontSize: '12px', color: '#6b7280', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.Ubicacion || '—'}</td>
                  <td><Badge value={i.EstadoSeguridad} /></td>
                  <td style={{ textAlign: 'center', fontWeight: i.Defectos > 0 ? 700 : 400, color: i.Defectos > 0 ? '#b91c1c' : '#6b7280' }}>{i.Defectos}</td>
                  <td style={{ fontSize: '12px', color: '#6b7280' }}>{i.CreadoPor || '—'}</td>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(i.FechaCreacion)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <button className="ghost-button" style={{ color: '#dc2626', fontSize: '12px', padding: '2px 8px' }}
                        onClick={() => handleEliminar(i.DVIRId)}>Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
              {!inspecciones.length && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin inspecciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detalleId && <DVIRDetalleModal id={detalleId} onClose={() => setDetalleId(null)} />}
      {verVehiculos && <VehiculosModal onClose={() => setVerVehiculos(false)} />}
    </section>
  )
}
