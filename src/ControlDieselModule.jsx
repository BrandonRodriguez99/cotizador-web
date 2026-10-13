import { useEffect, useState, useMemo } from 'react'
import { getDieselCargas, eliminarCargaDiesel, editarCargaDiesel, getDieselPrecio, setDieselPrecio } from './api'

const TIPO_LABEL = { diesel: 'Diésel', gasolina: 'Gasolina', urea: 'UREA' }

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
  const styles = {
    diesel:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    gasolina: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    urea:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  }
  const s = styles[tipo] || styles.urea
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
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

function EditModal({ carga, onClose, onSave }) {
  const [form, setForm] = useState({
    vehiculoNombre: carga.VehiculoNombre || '',
    fecha:          fmtFecha(carga.Fecha),
    tipo:           carga.Tipo || 'diesel',
    litros:         carga.Litros ?? '',
    kmActual:       carga.KmActual ?? '',
    valorPesos:     carga.ValorPesos ?? '',
    folioTicket:    carga.FolioTicket || '',
    operadorNombre: carga.OperadorNombre || '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(carga.CargaId, {
        ...form,
        litros:     parseFloat(form.litros),
        kmActual:   parseInt(form.kmActual),
        valorPesos: form.valorPesos !== '' ? parseFloat(form.valorPesos) : null,
        folioTicket:    form.folioTicket || null,
        operadorNombre: form.operadorNombre || null,
      })
      onClose()
    } catch (e) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb',
    borderRadius: '6px', fontSize: '13px', background: '#f9fafb', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px', display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '480px',
        maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Editar registro #{carga.CargaId}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Vehículo</label>
            <input style={inputStyle} value={form.vehiculoNombre} onChange={set('vehiculoNombre')} />
          </div>
          <div>
            <label style={labelStyle}>Fecha</label>
            <input type="date" style={inputStyle} value={form.fecha} onChange={set('fecha')} />
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select style={inputStyle} value={form.tipo} onChange={set('tipo')}>
              <option value="diesel">Diésel</option>
              <option value="gasolina">Gasolina</option>
              <option value="urea">UREA</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Litros</label>
            <input type="number" step="0.1" style={inputStyle} value={form.litros} onChange={set('litros')} />
          </div>
          <div>
            <label style={labelStyle}>KM Actual</label>
            <input type="number" style={inputStyle} value={form.kmActual} onChange={set('kmActual')} />
          </div>
          <div>
            <label style={labelStyle}>Valor $ / L</label>
            <input type="number" step="0.01" style={inputStyle} value={form.valorPesos} onChange={set('valorPesos')} />
          </div>
          <div>
            <label style={labelStyle}>Folio Ticket</label>
            <input style={inputStyle} value={form.folioTicket} onChange={set('folioTicket')} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Operador</label>
            <input style={inputStyle} value={form.operadorNombre} onChange={set('operadorNombre')} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="ghost-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" disabled={saving} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PrecioConfig({ onClose, onUpdated }) {
  const [precio, setPrecio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getDieselPrecio().then(d => { setPrecio(d.precio ?? ''); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (precio === '' || isNaN(Number(precio))) return
    setSaving(true)
    try {
      await setDieselPrecio(Number(precio))
      onUpdated(Number(precio))
      onClose()
    } catch (e) {
      alert(e.message || 'Error al guardar precio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '340px',
        maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Precio del Diésel</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 0, marginBottom: '16px' }}>
          Este precio aparece por defecto en la app al registrar nuevas cargas. Los registros existentes no se modifican.
        </p>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', display: 'block' }}>
          PRECIO POR LITRO ($)
        </label>
        {loading ? (
          <div style={{ color: '#9ca3af', fontSize: '13px' }}>Cargando...</div>
        ) : (
          <input
            type="number" step="0.01" min="0"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
              borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            value={precio}
            onChange={e => setPrecio(e.target.value)}
          />
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="ghost-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" disabled={saving || loading} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ControlDieselModule({ usuario }) {
  const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'encargado_vehiculos'

  const [cargas, setCargas]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [fotoUrl, setFotoUrl]       = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [editando, setEditando]     = useState(null)
  const [precioActual, setPrecioActual] = useState(null)
  const [showPrecio, setShowPrecio] = useState(false)

  const [filtros, setFiltros] = useState({ vehiculo: '', tipo: '', desde: '', hasta: '' })
  const setF = k => e => setFiltros(f => ({ ...f, [k]: e.target.value }))

  async function cargar() {
    setLoading(true)
    try {
      const [data, precioData] = await Promise.all([getDieselCargas(), getDieselPrecio()])
      setCargas(data)
      setPrecioActual(precioData.precio)
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

  async function handleEditar(id, body) {
    await editarCargaDiesel(id, body)
    setCargas(prev => prev.map(c => c.CargaId === id
      ? { ...c, VehiculoNombre: body.vehiculoNombre, Fecha: body.fecha, Tipo: body.tipo,
          Litros: body.litros, KmActual: body.kmActual, ValorPesos: body.valorPesos,
          FolioTicket: body.folioTicket, OperadorNombre: body.operadorNombre }
      : c))
  }

  // Filtrar y mostrar en orden ascendente (más antiguo primero)
  const filtradas = useMemo(() => {
    return cargas
      .filter(c => {
        const fecha = String(c.Fecha || '').slice(0, 10)
        if (filtros.vehiculo && !c.VehiculoNombre.toLowerCase().includes(filtros.vehiculo.toLowerCase())) return false
        if (filtros.tipo  && c.Tipo !== filtros.tipo) return false
        if (filtros.desde && fecha < filtros.desde) return false
        if (filtros.hasta && fecha > filtros.hasta) return false
        return true
      })
      .slice()
      .reverse() // orden ascendente: más antiguo arriba, nuevos al final
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
              Registro de cargas de diésel y UREA · rendimiento por unidad
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {precioActual != null && (
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  Precio actual: <strong style={{ color: '#374151' }}>${fmt(precioActual)}/L</strong>
                </span>
              )}
              {isAdmin && (
                <button className="ghost-button" style={{ fontSize: '12px', padding: '5px 12px' }}
                  onClick={() => setShowPrecio(true)}>
                  ⚙ Actualizar precio
                </button>
              )}
            </div>
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
              <option value="gasolina">Gasolina</option>
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
                  <th>$/L</th>
                  <th>Folio</th>
                  <th>Operador</th>
                  <th>Ticket</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c, i) => (
                  <tr key={c.CargaId}>
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>{i + 1}</td>
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="ghost-button"
                            style={{ fontSize: '11px', padding: '3px 8px', color: '#374151', borderColor: '#e5e7eb' }}
                            onClick={() => setEditando(c)}>
                            Editar
                          </button>
                          <button className="ghost-button"
                            style={{ fontSize: '11px', padding: '3px 8px', color: '#b91c1c', borderColor: '#fca5a5' }}
                            disabled={eliminando === c.CargaId}
                            onClick={() => handleEliminar(c.CargaId)}>
                            {eliminando === c.CargaId ? '...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fotoUrl   && <FotoModal url={fotoUrl} onClose={() => setFotoUrl(null)} />}
      {editando  && <EditModal carga={editando} onClose={() => setEditando(null)} onSave={handleEditar} />}
      {showPrecio && <PrecioConfig onClose={() => setShowPrecio(false)} onUpdated={p => setPrecioActual(p)} />}
    </div>
  )
}
