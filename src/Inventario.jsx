import { useEffect, useState } from 'react'
import {
  getInventario,
  getInventarioDashboard,
  createProducto,
  updateProducto,
  ajustarStock,
} from './api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }
function fmtFecha(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? '-' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StockBadge({ estado }) {
  const map = {
    ok:      { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'OK' },
    bajo:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Stock bajo' },
    agotado: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Agotado' },
  }
  const s = map[estado] || map.ok
  return (
    <span style={{
      padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
      padding: '18px 20px', flex: 1, minWidth: '140px',
    }}>
      <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '28px', fontWeight: 800, color: color || '#111827' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{sub}</p>}
    </div>
  )
}

// ── Modal producto ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { nombreProducto: '', descripcion: '', unidadMedida: 'pza', cantidadMinima: '', cantidadReal: '', precio: '', activo: true }

function ProductoModal({ open, producto, onClose, onSaved }) {
  const isEdit = Boolean(producto)
  const [form, setForm]   = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setForm(producto ? {
        nombreProducto: producto.NombreProducto || '',
        descripcion:    producto.Descripcion    || '',
        unidadMedida:   producto.UnidadMedida   || 'pza',
        cantidadMinima: producto.CantidadMinima != null ? String(producto.CantidadMinima) : '',
        cantidadReal:   producto.CantidadReal   != null ? String(producto.CantidadReal)   : '',
        precio:         producto.Precio         != null ? String(producto.Precio)          : '',
        activo:         producto.Activo !== false && producto.Activo !== 0,
      } : EMPTY_FORM)
    }
  }, [open, producto])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombreProducto.trim()) { setError('El nombre del producto es requerido.'); return }
    setError(null); setSaving(true)
    try {
      if (isEdit) {
        await updateProducto(producto.ProductoId, form)
      } else {
        await createProducto(form)
      }
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (!open) return null

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Nombre del producto *</label>
            <input style={inp} value={form.nombreProducto} onChange={set('nombreProducto')} placeholder="Ej. Tuerca hexagonal M8" />
          </div>
          <div>
            <label style={lbl}>Descripción</label>
            <input style={inp} value={form.descripcion} onChange={set('descripcion')} placeholder="Descripción opcional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Unidad de medida</label>
              <select style={inp} value={form.unidadMedida} onChange={set('unidadMedida')}>
                {['pza', 'kg', 'lt', 'm', 'm²', 'caja', 'rollo', 'par', 'juego', 'hr'].map(u =>
                  <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Precio unitario</label>
              <input style={inp} type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')} placeholder="0.00" />
            </div>
            <div>
              <label style={lbl}>Cantidad mínima</label>
              <input style={inp} type="number" min="0" step="0.01" value={form.cantidadMinima} onChange={set('cantidadMinima')} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>{isEdit ? 'Stock actual (usar ajuste)' : 'Stock inicial'}</label>
              <input style={{ ...inp, background: isEdit ? '#f3f4f6' : '#fff' }} type="number" min="0" step="0.01"
                value={form.cantidadReal} onChange={isEdit ? undefined : set('cantidadReal')}
                readOnly={isEdit} placeholder="0" />
            </div>
          </div>
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="activoCheck" checked={form.activo}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
              <label htmlFor="activoCheck" style={{ fontSize: '14px', cursor: 'pointer' }}>Producto activo</label>
            </div>
          )}
          {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal ajuste de stock ──────────────────────────────────────────────────────
function AjusteModal({ open, producto, onClose, onSaved }) {
  const [tipo, setTipo]       = useState('ingreso')
  const [cantidad, setCantidad] = useState('')
  const [referencia, setRef]  = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => { if (open) { setTipo('ingreso'); setCantidad(''); setRef(''); setError(null) } }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cantidad || Number(cantidad) <= 0) { setError('Ingresa una cantidad válida.'); return }
    setError(null); setSaving(true)
    try {
      await ajustarStock(producto.ProductoId, { cantidad: Number(cantidad), tipo, referencia })
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (!open || !producto) return null
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Ajuste de stock</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#9ca3af' }}>×</button>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#1d4ed8' }}>{producto.NombreProducto}</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#374151' }}>
            Stock actual: <strong>{Number(producto.CantidadReal).toFixed(2)} {producto.UnidadMedida}</strong>
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Tipo de movimiento</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ v: 'ingreso', l: 'Ingreso (+)' }, { v: 'ajuste', l: 'Ajuste (=)' }].map(t => (
                <button key={t.v} type="button" onClick={() => setTipo(t.v)}
                  style={{ flex: 1, padding: '9px', border: `2px solid ${tipo === t.v ? '#2563eb' : '#d1d5db'}`,
                    borderRadius: '8px', background: tipo === t.v ? '#eff6ff' : '#fff',
                    color: tipo === t.v ? '#1d4ed8' : '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  {t.l}
                </button>
              ))}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
              {tipo === 'ingreso' ? 'Suma la cantidad al stock actual.' : 'Establece el stock exacto al valor ingresado.'}
            </p>
          </div>
          <div>
            <label style={lbl}>Cantidad</label>
            <input style={inp} type="number" min="0.01" step="0.01" value={cantidad}
              onChange={e => setCantidad(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={lbl}>Referencia / Motivo</label>
            <input style={inp} value={referencia} onChange={e => setRef(e.target.value)} placeholder="Ej. Compra OC-2026-000012" />
          </div>
          {error && <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '10px', color: '#b91c1c', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Inventario({ isAdmin }) {
  const [vista, setVista]       = useState('tabla')   // 'tabla' | 'dashboard'
  const [productos, setProductos] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen]     = useState(false)
  const [editando, setEditando]       = useState(null)
  const [ajusteOpen, setAjusteOpen]   = useState(false)
  const [ajusteProd, setAjusteProd]   = useState(null)

  async function reload() {
    setLoading(true)
    try {
      const [prods, dash] = await Promise.all([getInventario(), getInventarioDashboard()])
      setProductos(prods)
      setDashboard(dash)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  function openNuevo() { setEditando(null); setModalOpen(true) }
  function openEditar(p) { setEditando(p); setModalOpen(true) }
  function openAjuste(p) { setAjusteProd(p); setAjusteOpen(true) }

  const productosFiltrados = productos.filter(p =>
    !busqueda || p.NombreProducto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.UnidadMedida?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const stats = dashboard?.stats
  const movimientos = dashboard?.movimientos || []

  const tipoMovLabel = { consumo: 'Consumo', ingreso: 'Ingreso', ajuste: 'Ajuste' }
  const tipoMovColor = { consumo: '#b91c1c', ingreso: '#15803d', ajuste: '#1d4ed8' }

  const tabBtn = (v, label) => (
    <button type="button" onClick={() => setVista(v)} style={{
      padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
      background: vista === v ? '#2563eb' : 'transparent', color: vista === v ? '#fff' : '#6b7280',
    }}>{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabBtn('tabla', 'Productos')}
          {tabBtn('dashboard', 'Dashboard')}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {vista === 'tabla' && (
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto..." style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', width: '200px' }} />
          )}
          {isAdmin && (
            <button type="button" onClick={openNuevo} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      {loading && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px' }}>Cargando...</p>}

      {/* ── VISTA TABLA ── */}
      {!loading && vista === 'tabla' && (
        <div className="table-wrap">
          <table className="participants-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del producto</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Stock mín.</th>
                <th style={{ textAlign: 'right' }}>Stock actual</th>
                <th style={{ textAlign: 'right' }}>Precio unit.</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  {busqueda ? 'Sin resultados para la búsqueda.' : 'Sin productos en inventario.'}
                </td></tr>
              ) : productosFiltrados.map(p => (
                <tr key={p.ProductoId} style={{ opacity: p.Activo ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600, color: '#6b7280', fontSize: '12px' }}>#{p.ProductoId}</td>
                  <td>
                    <p style={{ margin: 0, fontWeight: 600 }}>{p.NombreProducto}</p>
                    {p.Descripcion && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{p.Descripcion}</p>}
                  </td>
                  <td>{p.UnidadMedida || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{Number(p.CantidadMinima).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: p.EstadoStock === 'ok' ? '#15803d' : p.EstadoStock === 'bajo' ? '#b45309' : '#b91c1c' }}>
                    {Number(p.CantidadReal).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right' }}>${fmt(p.Precio)}</td>
                  <td><StockBadge estado={p.EstadoStock} /></td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openEditar(p)}>Editar</button>
                        <button type="button" className="ghost-button" style={{ padding: '4px 10px', fontSize: '12px', color: '#15803d', borderColor: '#bbf7d0' }} onClick={() => openAjuste(p)}>Ajustar</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            Total: {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
            {stats && <span style={{ marginLeft: '16px', color: '#9ca3af' }}>Valor estimado total: <strong>${fmt(stats.ValorTotal)}</strong></span>}
          </div>
        </div>
      )}

      {/* ── VISTA DASHBOARD ── */}
      {!loading && vista === 'dashboard' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cards */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <StatCard label="Total productos" value={stats.TotalProductos} />
            <StatCard label="Activos" value={stats.ProductosActivos} color="#15803d" />
            <StatCard label="Stock bajo" value={stats.StockBajo} color="#b45309" sub="≤ cantidad mínima" />
            <StatCard label="Agotados" value={stats.Agotados} color="#b91c1c" sub="stock = 0" />
            <StatCard label="Valor estimado" value={`$${fmt(stats.ValorTotal)}`} color="#2563eb" />
          </div>

          {/* Alertas de stock bajo */}
          {productos.filter(p => p.EstadoStock !== 'ok' && p.Activo).length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 18px' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#92400e', fontSize: '14px' }}>⚠ Productos con stock bajo o agotado</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {productos.filter(p => p.EstadoStock !== 'ok' && p.Activo).map(p => (
                  <div key={p.ProductoId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span><strong>{p.NombreProducto}</strong></span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ color: '#6b7280' }}>Actual: {Number(p.CantidadReal).toFixed(2)} / Mín: {Number(p.CantidadMinima).toFixed(2)} {p.UnidadMedida}</span>
                      <StockBadge estado={p.EstadoStock} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos movimientos */}
          <div>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px', color: '#374151' }}>Últimos movimientos</p>
            <div className="table-wrap">
              <table className="participants-table">
                <thead>
                  <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Unidad</th><th>Usuario</th><th>Referencia</th></tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Sin movimientos registrados.</td></tr>
                  ) : movimientos.map(m => (
                    <tr key={m.MovimientoId}>
                      <td style={{ fontSize: '12px', color: '#6b7280' }}>{fmtFecha(m.Fecha)}</td>
                      <td style={{ fontWeight: 600 }}>{m.NombreProducto}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: tipoMovColor[m.TipoMovimiento] || '#374151', fontSize: '13px' }}>
                          {tipoMovLabel[m.TipoMovimiento] || m.TipoMovimiento}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(m.Cantidad).toFixed(2)}</td>
                      <td>{m.UnidadMedida}</td>
                      <td style={{ fontSize: '12px' }}>{m.Usuario || '-'}</td>
                      <td style={{ fontSize: '12px', color: '#6b7280' }}>{m.Referencia || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ProductoModal
        open={modalOpen}
        producto={editando}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); reload() }}
      />
      <AjusteModal
        open={ajusteOpen}
        producto={ajusteProd}
        onClose={() => setAjusteOpen(false)}
        onSaved={() => { setAjusteOpen(false); reload() }}
      />
    </div>
  )
}
