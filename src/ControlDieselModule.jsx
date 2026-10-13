import { useEffect, useState, useMemo } from 'react'
import { getDieselCargas, eliminarCargaDiesel } from './api'

const TIPO_LABEL = { diesel: 'Diésel', urea: 'UREA' }

function fmt(n, dec = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtKm(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-MX') + ' km'
}
function fmtFecha(s) {
  if (!s) return '—'
  return String(s).slice(0, 10)
}

function RendBadge({ value }) {
  if (value == null) return <span style={{ color: '#6b7280', fontSize: '12px' }}>—</span>
  const v = Number(value)
  const color = v >= 4 ? '#16a34a' : v >= 2.5 ? '#d97706' : '#dc2626'
  const bg    = v >= 4 ? '#f0fdf4' : v >= 2.5 ? '#fffbeb' : '#fef2f2'
  const border= v >= 4 ? '#bbf7d0' : v >= 2.5 ? '#fde68a' : '#fecaca'
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: '999px',
      padding: '2px 10px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {fmt(v)} km/L
    </span>
  )
}

function TipoBadge({ tipo }) {
  const isDiesel = tipo === 'diesel'
  return (
    <span style={{
      background: isDiesel ? '#eff6ff' : '#f0fdf4',
      color:      isDiesel ? '#1d4ed8' : '#16a34a',
      border:     `1px solid ${isDiesel ? '#bfdbfe' : '#bbf7d0'}`,
      borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
    }}>
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  )
}

function FotoModal({ url, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <img src={url} alt="Ticket" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' }} />
    </div>
  )
}

export default function ControlDieselModule({ usuario }) {
  const isAdmin = usuario?.rol === 'admin'

  const [cargas, setCargas]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [fotoUrl, setFotoUrl]       = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const [filtros, setFiltros] = useState({ vehiculo: '', tipo: '', desde: '', hasta: '' })
  const setF = k => e => setFiltros(f => ({ ...f, [k]: e.target.value }))

  async function cargar() {
    setLoading(true)
    try {
      const data = await getDieselCargas()
      setCargas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este registro?')) return
    setEliminando(id)
    try {
      await eliminarCargaDiesel(id)
      setCargas(c => c.filter(x => x.CargaId !== id))
    } catch (e) {
      alert(e.message || 'Error al eliminar')
    } finally {
      setEliminando(null)
    }
  }

  const filtradas = useMemo(() => {
    return cargas.filter(c => {
      const fecha = String(c.Fecha || '').slice(0, 10)
      if (filtros.vehiculo && !c.VehiculoNombre.toLowerCase().includes(filtros.vehiculo.toLowerCase())) return false
      if (filtros.tipo  && c.Tipo !== filtros.tipo) return false
      if (filtros.desde && fecha < filtros.desde) return false
      if (filtros.hasta && fecha > filtros.hasta) return false
      return true
    })
  }, [cargas, filtros])

  // Resumen por vehículo (solo diesel)
  const resumen = useMemo(() => {
    const mapa = {}
    cargas.filter(c => c.Tipo === 'diesel' && c.Rendimiento != null).forEach(c => {
      if (!mapa[c.VehiculoNombre]) mapa[c.VehiculoNombre] = { litros: 0, rendimientos: [], km: 0 }
      mapa[c.VehiculoNombre].litros += Number(c.Litros || 0)
      mapa[c.VehiculoNombre].rendimientos.push(Number(c.Rendimiento))
      mapa[c.VehiculoNombre].km += Number(c.KmRecorridos || 0)
    })
    return Object.entries(mapa).map(([nombre, d]) => ({
      nombre,
      litros: d.litros,
      km: d.km,
      rendPromedio: d.rendimientos.reduce((a, b) => a + b, 0) / d.rendimientos.length,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [cargas])

  const inputStyle = {
    background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px',
    padding: '7px 12px', fontSize: '13px', color: '#374151', outline: 'none',
  }

  return (
    <div className="cotizacion-page">
      <div className="panel card">
        <div className="panel-header">
          <div>
            <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
              Registro de cargas de diésel y UREA · rendimiento por unidad
            </p>
          </div>
        </div>

        {/* ── Resumen por vehículo ── */}
        {resumen.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Rendimiento promedio por unidad (diésel)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {resumen.map(r => (
                <div key={r.nombre} style={{
                  background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px',
                  padding: '12px 16px', minWidth: '180px',
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                    {r.nombre}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      Promedio: <RendBadge value={r.rendPromedio} />
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      Total litros: <strong>{fmt(r.litros, 0)} L</strong>
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      Total km: <strong>{fmtKm(r.km)}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filtros ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Vehículo</div>
            <input style={{ ...inputStyle, width: '160px' }}
              placeholder="Buscar..." value={filtros.vehiculo} onChange={setF('vehiculo')} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Tipo</div>
            <select style={{ ...inputStyle }} value={filtros.tipo} onChange={setF('tipo')}>
              <option value="">Todos</option>
              <option value="diesel">Diésel</option>
              <option value="urea">UREA</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Desde</div>
            <input type="date" style={inputStyle} value={filtros.desde} onChange={setF('desde')} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Hasta</div>
            <input type="date" style={inputStyle} value={filtros.hasta} onChange={setF('hasta')} />
          </div>
          {Object.values(filtros).some(Boolean) && (
            <button className="ghost-button" style={{ fontSize: '12px' }}
              onClick={() => setFiltros({ vehiculo: '', tipo: '', desde: '', hasta: '' })}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Tabla ── */}
        {loading ? (
          <div className="notification" style={{ textAlign: 'center' }}>Cargando registros...</div>
        ) : filtradas.length === 0 ? (
          <div className="notification" style={{ textAlign: 'center' }}>
            No hay registros de carga.
            {cargas.length === 0 && ' Registra la primera carga desde la app Android.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vehículo</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Litros</th>
                  <th>KM Actual</th>
                  <th>KM Recorridos</th>
                  <th>Rendimiento</th>
                  <th>Valor</th>
                  <th>Folio</th>
                  <th>Operador</th>
                  <th>Ticket</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c, i) => (
                  <tr key={c.CargaId}>
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>{filtradas.length - i}</td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{c.VehiculoNombre}</td>
                    <td><TipoBadge tipo={c.Tipo} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFecha(c.Fecha)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(c.Litros, 1)} L</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtKm(c.KmActual)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: c.KmRecorridos != null ? '#374151' : '#d1d5db' }}>
                      {c.KmRecorridos != null ? fmtKm(c.KmRecorridos) : '—'}
                    </td>
                    <td><RendBadge value={c.Rendimiento} /></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: c.ValorPesos ? '#374151' : '#d1d5db' }}>
                      {c.ValorPesos ? `$${fmt(c.ValorPesos)}` : '—'}
                    </td>
                    <td style={{ color: c.FolioTicket ? '#374151' : '#d1d5db' }}>{c.FolioTicket || '—'}</td>
                    <td style={{ color: c.OperadorNombre ? '#374151' : '#d1d5db' }}>{c.OperadorNombre || '—'}</td>
                    <td>
                      {c.UrlFotoTicket ? (
                        <button className="ghost-button"
                          style={{ fontSize: '11px', padding: '3px 8px', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                          onClick={() => setFotoUrl(c.UrlFotoTicket)}>
                          Ver
                        </button>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="ghost-button"
                          style={{ fontSize: '11px', padding: '3px 8px', color: '#b91c1c', borderColor: '#fca5a5' }}
                          disabled={eliminando === c.CargaId}
                          onClick={() => handleEliminar(c.CargaId)}>
                          {eliminando === c.CargaId ? '...' : 'Eliminar'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fotoUrl && <FotoModal url={fotoUrl} onClose={() => setFotoUrl(null)} />}
    </div>
  )
}
