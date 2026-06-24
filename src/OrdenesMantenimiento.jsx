import { useEffect, useState } from 'react'
import {
  getOrdenesMantenimiento,
  getOrdenMantenimientoById,
  createOrdenMantenimiento,
  updateOrdenMantenimiento,
  getInventario,
} from './api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtFecha(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime()) || d.getFullYear() < 1980) return '-'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const RAZONES = [
  { key: 'correctivo',  label: 'Mantenimiento Correctivo' },
  { key: 'preventivo',  label: 'Mantenimiento Preventivo' },
  { key: 'predictivo',  label: 'Mantenimiento Predictivo' },
  { key: 'programado',  label: 'Mantenimiento Programado' },
]
const TIPOS_FALLA = ['Plomería', 'Eléctrica', 'Albañilería', 'Otro']

function EstadoBadge({ estado }) {
  const map = {
    Pendiente:    { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    'En proceso': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    Completada:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  }
  const s = map[estado] || map.Pendiente
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
      fontWeight: 600, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
    }}>
      {estado}
    </span>
  )
}

// ── Checkbox grande (móvil) ───────────────────────────────────────────────────
function BigCheck({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
        border: `2px solid ${checked ? '#2563eb' : '#d1d5db'}`,
        borderRadius: '10px', background: checked ? '#eff6ff' : '#fff',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        fontSize: '14px', fontWeight: checked ? 600 : 400,
        color: checked ? '#1d4ed8' : '#374151',
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 20, height: 20, border: `2px solid ${checked ? '#2563eb' : '#9ca3af'}`,
        borderRadius: '4px', background: checked ? '#2563eb' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '12px', color: '#fff',
      }}>
        {checked ? '✓' : ''}
      </span>
      {label}
    </button>
  )
}

// ── Formulario Parte 1 (Solicitante) ──────────────────────────────────────────
function FormParte1({ onSaved, creadoPor }) {
  const [form, setForm] = useState({
    departamento: '', fechaReporte: new Date().toISOString().slice(0, 10),
    nombreSolicita: creadoPor || '', puesto: '', equipo: '', codigo: '',
    razonOrden: '', descripcionFalla: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.departamento.trim()) { setError('Escribe el departamento.'); return }
    if (!form.razonOrden) { setError('Selecciona la razón de la orden.'); return }
    if (!form.descripcionFalla.trim()) { setError('Describe la falla.'); return }
    setError(null)
    setSaving(true)
    try {
      const res = await createOrdenMantenimiento({ ...form, creadoPor })
      onSaved(res.folio)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '680px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Departamento *</label>
          <input style={inputStyle} value={form.departamento} onChange={set('departamento')} placeholder="Ej. Mantenimiento" />
        </div>
        <div>
          <label style={labelStyle}>Fecha de Reporte</label>
          <input style={inputStyle} type="date" value={form.fechaReporte} onChange={set('fechaReporte')} />
        </div>
        <div>
          <label style={labelStyle}>Nombre de quien solicita</label>
          <input style={inputStyle} value={form.nombreSolicita} onChange={set('nombreSolicita')} />
        </div>
        <div>
          <label style={labelStyle}>Puesto</label>
          <input style={inputStyle} value={form.puesto} onChange={set('puesto')} placeholder="Ej. Supervisor" />
        </div>
        <div>
          <label style={labelStyle}>Equipo</label>
          <input style={inputStyle} value={form.equipo} onChange={set('equipo')} placeholder="Ej. Compresor #2" />
        </div>
        <div>
          <label style={labelStyle}>Código</label>
          <input style={inputStyle} value={form.codigo} onChange={set('codigo')} placeholder="Código del equipo" />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Razón de la Orden *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {RAZONES.map(r => (
            <BigCheck key={r.key} label={r.label} checked={form.razonOrden === r.key}
              onChange={() => setForm(f => ({ ...f, razonOrden: r.key }))} />
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Descripción de la Falla *</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
          value={form.descripcionFalla} onChange={set('descripcionFalla')}
          placeholder="Describe detalladamente la falla o problema reportado..." />
      </div>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px' }}>{error}</div>}

      <button type="submit" disabled={saving} style={{
        padding: '13px', background: '#2563eb', color: '#fff', border: 'none',
        borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
        opacity: saving ? 0.7 : 1,
      }}>
        {saving ? 'Enviando solicitud...' : 'Enviar Solicitud'}
      </button>
    </form>
  )
}

// ── Formulario Parte 2 (Técnico — vista móvil) ────────────────────────────────
function FilaMaterial({ mat, idx, inventario, onUpdate, onRemove, showRemove }) {
  const [query, setQuery] = useState(mat.productoId ? '' : mat.material || '')
  const [open, setOpen]   = useState(false)

  const productoSeleccionado = mat.productoId
    ? inventario.find(p => p.ProductoId === Number(mat.productoId))
    : null

  const sugerencias = query.length >= 1
    ? inventario.filter(p => p.Activo && p.NombreProducto.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : inventario.filter(p => p.Activo).slice(0, 8)

  function seleccionar(prod) {
    onUpdate('productoId', prod.ProductoId)
    onUpdate('material', prod.NombreProducto)
    setQuery('')
    setOpen(false)
  }

  function limpiar() {
    onUpdate('productoId', null)
    onUpdate('material', '')
    setQuery('')
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box', background: '#fff' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', position: 'relative' }}>
      {showRemove && (
        <button type="button" onClick={onRemove}
          style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1 }}>×</button>
      )}
      <div style={{ position: 'relative' }}>
        {productoSeleccionado ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#eff6ff', border: '1.5px solid #2563eb', borderRadius: '10px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#1d4ed8' }}>{productoSeleccionado.NombreProducto}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                Disponible: <strong style={{ color: productoSeleccionado.EstadoStock === 'ok' ? '#15803d' : '#b45309' }}>
                  {Number(productoSeleccionado.CantidadReal).toFixed(2)} {productoSeleccionado.UnidadMedida}
                </strong>
              </p>
            </div>
            <button type="button" onClick={limpiar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '18px' }}>×</button>
          </div>
        ) : (
          <>
            <input
              style={inputStyle}
              placeholder="Buscar en inventario o escribir..."
              value={query}
              onChange={e => { setQuery(e.target.value); onUpdate('material', e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            {open && sugerencias.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #d1d5db', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                {sugerencias.map(p => (
                  <button key={p.ProductoId} type="button" onMouseDown={() => seleccionar(p)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{p.NombreProducto}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{p.UnidadMedida}</p>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: p.EstadoStock === 'ok' ? '#15803d' : p.EstadoStock === 'bajo' ? '#b45309' : '#b91c1c', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {Number(p.CantidadReal).toFixed(2)} disp.
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input style={{ ...inputStyle, flex: 1 }} type="number" min="0.01" step="0.01"
          placeholder="Cantidad" value={mat.cantidad}
          onChange={e => onUpdate('cantidad', e.target.value)} />
        {productoSeleccionado && (
          <div style={{ padding: '12px 14px', background: '#f3f4f6', borderRadius: '10px', fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {productoSeleccionado.UnidadMedida}
          </div>
        )}
      </div>
    </div>
  )
}

function FormTecnico({ orden, materiales: initMat, onSaved, tecnico, inventario }) {
  const [form, setForm] = useState({
    tipoFalla: orden.TipoFalla || '',
    fechaTerminacion: orden.FechaTerminacion ? String(orden.FechaTerminacion).slice(0, 10) : new Date().toISOString().slice(0, 10),
    descripcionMantenimiento: orden.DescripcionMantenimiento || '',
    tecnicoResponsable: orden.TecnicoResponsable || tecnico || '',
    usuarioEquipo: orden.UsuarioEquipo || '',
    estado: 'Completada',
  })
  const [materiales, setMateriales] = useState(
    initMat?.length ? initMat.map(m => ({ material: m.Material || '', cantidad: m.Cantidad || '', productoId: m.ProductoId || null })) : [{ material: '', cantidad: '', productoId: null }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  function addMat() { setMateriales(m => [...m, { material: '', cantidad: '', productoId: null }]) }
  function removeMat(i) { setMateriales(m => m.filter((_, idx) => idx !== i)) }
  function updateMat(i, k, v) { setMateriales(m => m.map((r, idx) => idx === i ? { ...r, [k]: v } : r)) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.tipoFalla) { setError('Selecciona el tipo de falla.'); return }
    if (!form.descripcionMantenimiento.trim()) { setError('Describe el trabajo realizado.'); return }
    setError(null)
    setSaving(true)
    try {
      await updateOrdenMantenimiento(orden.OrdenMantenimientoId, {
        ...form,
        materiales: materiales.filter(m => m.material.trim()),
      })
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box', background: '#fff' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Info de la orden */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px' }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#1d4ed8', fontSize: '15px' }}>{orden.Folio}</p>
        <p style={{ margin: '4px 0 0', color: '#374151', fontSize: '13px' }}><strong>Equipo:</strong> {orden.Equipo || '-'} {orden.Codigo ? `(${orden.Codigo})` : ''}</p>
        <p style={{ margin: '2px 0 0', color: '#374151', fontSize: '13px' }}><strong>Solicitante:</strong> {orden.NombreSolicita || '-'} — {orden.Departamento || '-'}</p>
        <p style={{ margin: '8px 0 0', color: '#374151', fontSize: '13px', whiteSpace: 'pre-wrap' }}><strong>Falla:</strong> {orden.DescripcionFalla || '-'}</p>
      </div>

      {/* Tipo de falla */}
      <div>
        <label style={labelStyle}>Tipo de Falla *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {TIPOS_FALLA.map(t => (
            <BigCheck key={t} label={t} checked={form.tipoFalla === t}
              onChange={() => setForm(f => ({ ...f, tipoFalla: t }))} />
          ))}
        </div>
      </div>

      {/* Materiales con selector de inventario */}
      <div>
        <label style={labelStyle}>Refacciones y/o Materiales utilizados</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {materiales.map((m, i) => (
            <FilaMaterial key={i} mat={m} idx={i} inventario={inventario}
              onUpdate={(k, v) => updateMat(i, k, v)}
              onRemove={() => removeMat(i)}
              showRemove={materiales.length > 1} />
          ))}
          <button type="button" onClick={addMat}
            style={{ padding: '10px', border: '1.5px dashed #d1d5db', borderRadius: '10px', background: '#fafafa', color: '#6b7280', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
            + Agregar material
          </button>
        </div>
      </div>

      {/* Fecha terminación */}
      <div>
        <label style={labelStyle}>Fecha de Terminación</label>
        <input style={inputStyle} type="date" value={form.fechaTerminacion} onChange={set('fechaTerminacion')} />
      </div>

      {/* Descripción del trabajo */}
      <div>
        <label style={labelStyle}>Descripción del Mantenimiento Realizado *</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '120px', fontSize: '15px' }}
          value={form.descripcionMantenimiento} onChange={set('descripcionMantenimiento')}
          placeholder="Describe el trabajo realizado, piezas cambiadas, observaciones..." />
      </div>

      {/* Técnico y usuario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Técnico Responsable</label>
          <input style={inputStyle} value={form.tecnicoResponsable} onChange={set('tecnicoResponsable')} />
        </div>
        <div>
          <label style={labelStyle}>Usuario del Equipo</label>
          <input style={inputStyle} value={form.usuarioEquipo} onChange={set('usuarioEquipo')} />
        </div>
      </div>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', color: '#b91c1c', fontSize: '14px' }}>{error}</div>}

      <button type="submit" disabled={saving} style={{
        padding: '16px', background: '#15803d', color: '#fff', border: 'none',
        borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
        opacity: saving ? 0.7 : 1,
      }}>
        {saving ? 'Guardando...' : '✓ Marcar como Completada'}
      </button>
    </form>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function OrdenesMantenimiento({ currentUser, currentUserRol }) {
  const [activeTab, setActiveTab]   = useState('nueva')
  const [ordenes, setOrdenes]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [inventario, setInventario] = useState([])

  // Para completar una orden (técnico)
  const [selectedOrden, setSelectedOrden] = useState(null)   // { orden, materiales }
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pdfLoading, setPdfLoading]       = useState(null)

  async function loadOrdenes() {
    setLoading(true)
    try { setOrdenes(await getOrdenesMantenimiento()) }
    catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    // Cargar inventario activo para el selector de materiales
    getInventario().then(data => setInventario(data.filter(p => p.Activo))).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== 'nueva') loadOrdenes()
  }, [activeTab])

  function showSuccess(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 6000)
  }

  async function handleSelectOrden(id) {
    setLoadingDetail(true)
    try {
      const data = await getOrdenMantenimientoById(id)
      setSelectedOrden(data)
    } catch {} finally { setLoadingDetail(false) }
  }

  const isAdmin = currentUserRol === 'admin'
  const misOrdenes = ordenes.filter(o => o.CreadoPor === currentUser)
  const pendientes = ordenes.filter(o => o.Estado !== 'Completada')

  const TABS = [
    { key: 'nueva',      label: 'Nueva Solicitud' },
    { key: 'mis',        label: `Mis Solicitudes${misOrdenes.length ? ` (${misOrdenes.length})` : ''}` },
    { key: 'completar',  label: `Por Atender${pendientes.length ? ` (${pendientes.length})` : ''}` },
    ...(isAdmin ? [{ key: 'todas', label: 'Todas las Órdenes' }] : []),
  ]

  const tabBtnStyle = (key) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap',
    background: activeTab === key ? '#2563eb' : 'transparent',
    color: activeTab === key ? '#fff' : '#6b7280',
    transition: 'all 0.15s',
  })

  // ── Generación de PDF ─────────────────────────────────────────────────────
  function abrirPDF(orden, materiales) {
    function chk(val, match) { return val === match ? '&#10003;' : '' }
    function fd(v) {
      if (!v) return ''
      const d = new Date(v)
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    const mats = (materiales && materiales.length ? [...materiales] : [])
    while (mats.length < 5) mats.push({ Material: '', Cantidad: '' })

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Orden de Mantenimiento - ${orden.Folio || ''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:15px;background:#fff}
.page{width:100%;max-width:750px;margin:0 auto;border:1.5px solid #333}
.header{display:grid;grid-template-columns:90px 1fr 155px;border-bottom:1.5px solid #333}
.logo-cell{display:flex;align-items:center;justify-content:center;border-right:1px solid #333;padding:8px}
.logo-circle{width:58px;height:58px;border-radius:50%;border:2px solid #333;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;text-align:center;line-height:1.2}
.title-cell{display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:bold;padding:8px}
.meta-cell{border-left:1px solid #333;display:flex;flex-direction:column}
.meta-row{display:flex;border-bottom:1px solid #333}
.meta-row:last-child{border-bottom:none;flex:1;align-items:center}
.meta-label{font-weight:bold;padding:3px 6px;border-right:1px solid #333;min-width:52px;font-size:10px}
.meta-value{padding:3px 6px;font-size:10px}
.fields{padding:6px 10px;border-bottom:1px solid #333}
.fr{display:flex;gap:16px;margin-bottom:5px;align-items:baseline}
.fr:last-child{margin-bottom:0}
.fl{font-weight:bold;white-space:nowrap}
.fv{border-bottom:1px solid #333;flex:1;min-width:50px;padding:0 3px}
.razon-row{display:flex;align-items:flex-start;padding:6px 10px;border-bottom:1px solid #333;gap:10px}
.razon-title{font-weight:bold;white-space:nowrap;padding-top:2px}
.razon-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;flex:1}
.cr{display:flex;align-items:center;gap:5px}
.cb{width:13px;height:13px;border:1.5px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
.sh{background:#4a4a4a;color:#fff;padding:4px 10px;text-align:center;font-weight:bold}
.ca{padding:8px 10px;border-bottom:1px solid #333;min-height:72px;white-space:pre-wrap;line-height:1.5}
.tif{display:flex;align-items:center;gap:14px;padding:5px 10px;border-bottom:1px solid #333;flex-wrap:wrap}
.tl{font-weight:bold}
table.mt{width:100%;border-collapse:collapse;border-bottom:1px solid #333}
table.mt th{padding:4px 8px;text-align:left;font-weight:bold;border-right:1px solid #333}
table.mt th:last-child{border-right:none}
table.mt td{padding:3px 8px;border-top:1px solid #ccc;border-right:1px solid #333;height:22px}
table.mt td:last-child{border-right:none}
.cm{width:78%}.cc{width:22%}
.ft{padding:5px 10px;border-bottom:1px solid #333;min-height:28px}
.dm{padding:6px 10px;min-height:70px;border-bottom:1px solid #333;white-space:pre-wrap;line-height:1.5}
.ba{min-height:55px;border-bottom:1px solid #333}
.fs{display:flex}
.fc{flex:1;padding:38px 16px 8px;text-align:center;border-right:1px solid #333}
.fc:last-child{border-right:none}
.fn{border-top:1px solid #000;margin-bottom:3px;padding-bottom:2px}
.fs2{font-size:10px;font-weight:bold}
@media print{body{padding:0}@page{size:letter;margin:10mm 8mm}}
</style></head><body>
<div class="page">
<div class="header">
  <div class="logo-cell"><div class="logo-circle">UDAT</div></div>
  <div class="title-cell">Orden de Mantenimiento</div>
  <div class="meta-cell">
    <div class="meta-row"><span class="meta-label">No.</span><span class="meta-value">FGA03-02</span></div>
    <div class="meta-row"><span class="meta-label">Rev.</span><span class="meta-value">2</span></div>
    <div class="meta-row"><span class="meta-label">Fecha:</span><span class="meta-value">20-Ago-2025</span></div>
  </div>
</div>
<div class="fields">
  <div class="fr"><span class="fl">Departamento:</span><span class="fv">${orden.Departamento || ''}</span><span class="fl">Fecha de Reporte:</span><span class="fv">${fd(orden.FechaReporte)}</span></div>
  <div class="fr"><span class="fl">Nombre de quien Solicita:</span><span class="fv">${orden.NombreSolicita || ''}</span><span class="fl">Puesto:</span><span class="fv">${orden.Puesto || ''}</span></div>
  <div class="fr"><span class="fl">Equipo:</span><span class="fv">${orden.Equipo || ''}</span><span class="fl">Código:</span><span class="fv">${orden.Codigo || ''}</span></div>
</div>
<div class="razon-row">
  <span class="razon-title">Razón de la Orden:</span>
  <div class="razon-grid">
    <div class="cr"><span class="cb">${chk(orden.RazonOrden,'correctivo')}</span> Mantenimiento Correctivo</div>
    <div class="cr"><span class="cb">${chk(orden.RazonOrden,'preventivo')}</span> Mantenimiento Preventivo</div>
    <div class="cr"><span class="cb">${chk(orden.RazonOrden,'predictivo')}</span> Mantenimiento predictivo</div>
    <div class="cr"><span class="cb">${chk(orden.RazonOrden,'programado')}</span> Mantenimiento programado</div>
  </div>
</div>
<div class="sh">Descripción de la falla: (Dato a llenar por el usuario)</div>
<div class="ca">${(orden.DescripcionFalla || '').replace(/</g,'&lt;')}</div>
<div class="sh">Para llenado exclusivo de Mantenimiento</div>
<div class="tif">
  <span class="tl">Tipo de falla:</span>
  <span class="cr"><span class="cb">${chk(orden.TipoFalla,'Plomería')}</span> Plomería</span>
  <span class="cr"><span class="cb">${chk(orden.TipoFalla,'Eléctrica')}</span> Eléctrica</span>
  <span class="cr"><span class="cb">${chk(orden.TipoFalla,'Albañilería')}</span> Albañilería</span>
  <span class="cr"><span class="cb">${chk(orden.TipoFalla,'Otro')}</span> Otro:</span>
</div>
<div class="sh">Refacciones y/o Materiales utilizados en el mantenimiento:</div>
<table class="mt"><thead><tr><th class="cm">Refacción o Material</th><th class="cc">Cantidad</th></tr></thead>
<tbody>${mats.map(m=>`<tr><td class="cm">${(m.Material||'').replace(/</g,'&lt;')}</td><td class="cc">${m.Cantidad||''}</td></tr>`).join('')}</tbody></table>
<div class="sh">Fecha de terminación</div>
<div class="ft">${fd(orden.FechaTerminacion)}</div>
<div class="dm"><strong>Descripción de mantenimiento realizado:</strong>\n${(orden.DescripcionMantenimiento||'').replace(/</g,'&lt;')}</div>
<div class="ba"></div>
<div class="fs">
  <div class="fc"><div class="fn">${(orden.TecnicoResponsable||'').replace(/</g,'&lt;')}</div><div class="fs2">Nombre y Firma<br>Técnico Responsable</div></div>
  <div class="fc"><div class="fn">${(orden.UsuarioEquipo||'').replace(/</g,'&lt;')}</div><div class="fs2">Nombre y Firma<br>Usuario del Equipo</div></div>
</div>
</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`

    const win = window.open('', '_blank', 'width=860,height=1100')
    if (win) { win.document.write(html); win.document.close() }
  }

  async function generarPDFOrden(id) {
    setPdfLoading(id)
    try {
      const data = await getOrdenMantenimientoById(id)
      abrirPDF(data.orden, data.materiales)
    } catch { alert('Error al generar el PDF') }
    finally { setPdfLoading(null) }
  }

  // ── Tabla de órdenes ──────────────────────────────────────────────────────
  function OrdenTable({ lista }) {
    if (lista.length === 0) return (
      <p style={{ color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>Sin órdenes registradas.</p>
    )
    return (
      <div className="table-wrap">
        <table className="participants-table">
          <thead>
            <tr>
              <th>Folio</th><th>Equipo</th><th>Razón</th>
              <th>Solicitante</th><th>Fecha</th><th>Estado</th><th>Técnico</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(o => (
              <tr key={o.OrdenMantenimientoId}>
                <td><strong style={{ color: '#2563eb' }}>{o.Folio}</strong></td>
                <td>{o.Equipo || '-'}</td>
                <td style={{ textTransform: 'capitalize' }}>{o.RazonOrden || '-'}</td>
                <td>{o.NombreSolicita || '-'}</td>
                <td>{fmtFecha(o.FechaReporte)}</td>
                <td><EstadoBadge estado={o.Estado} /></td>
                <td>{o.TecnicoResponsable || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="ghost-button"
                    style={{ fontSize: '12px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                    onClick={() => generarPDFOrden(o.OrdenMantenimientoId)}
                    disabled={pdfLoading === o.OrdenMantenimientoId}
                  >
                    {pdfLoading === o.OrdenMantenimientoId ? '...' : '📄 PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Vista "Por Atender" (móvil primero) ──────────────────────────────────
  function VistaCompletar() {
    if (selectedOrden) {
      return (
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <button type="button" onClick={() => setSelectedOrden(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', marginBottom: '16px', padding: 0 }}>
            ← Volver a la lista
          </button>
          <FormTecnico
            orden={selectedOrden.orden}
            materiales={selectedOrden.materiales}
            tecnico={currentUser}
            inventario={inventario}
            onSaved={() => {
              setSelectedOrden(null)
              showSuccess('Orden completada correctamente.')
              loadOrdenes()
            }}
          />
        </div>
      )
    }

    if (loadingDetail) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px' }}>Cargando...</p>

    if (pendientes.length === 0) return (
      <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
        <p style={{ fontWeight: 600, fontSize: '16px', margin: 0 }}>Sin órdenes pendientes</p>
        <p style={{ fontSize: '14px', margin: '6px 0 0' }}>Todas las órdenes han sido atendidas.</p>
      </div>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#6b7280' }}>
          Selecciona una orden para completar el reporte de mantenimiento:
        </p>
        {pendientes.map(o => (
          <button key={o.OrdenMantenimientoId} type="button"
            onClick={() => handleSelectOrden(o.OrdenMantenimientoId)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '16px', border: '1.5px solid #e5e7eb', borderRadius: '12px',
              background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>{o.Folio}</span>
              <EstadoBadge estado={o.Estado} />
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#111827' }}>{o.Equipo || 'Sin equipo'} {o.Codigo ? `(${o.Codigo})` : ''}</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{o.Departamento} — {o.NombreSolicita}</p>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#374151', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {o.DescripcionFalla}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9ca3af' }}>Reportada: {fmtFecha(o.FechaReporte)}</p>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="cotizacion-page">
      <section className="panel card">
        <div className="panel-header space-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>Órdenes de Mantenimiento</h2>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
              Solicita y gestiona órdenes de trabajo de mantenimiento
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t.key} type="button" style={tabBtnStyle(t.key)}
                onClick={() => { setActiveTab(t.key); setSelectedOrden(null) }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', color: '#15803d', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            {successMsg}
          </div>
        )}

        {/* ── NUEVA SOLICITUD ── */}
        {activeTab === 'nueva' && (
          <FormParte1
            creadoPor={currentUser}
            onSaved={(folio) => {
              showSuccess(`Solicitud ${folio} creada correctamente. El equipo de mantenimiento será notificado.`)
              setActiveTab('mis')
            }}
          />
        )}

        {/* ── MIS SOLICITUDES ── */}
        {activeTab === 'mis' && (
          loading
            ? <p style={{ color: '#9ca3af', padding: '24px 0' }}>Cargando...</p>
            : <OrdenTable lista={misOrdenes} />
        )}

        {/* ── POR ATENDER (TÉCNICO) ── */}
        {activeTab === 'completar' && (
          loading
            ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px' }}>Cargando...</p>
            : <VistaCompletar />
        )}

        {/* ── TODAS (ADMIN) ── */}
        {activeTab === 'todas' && isAdmin && (
          loading
            ? <p style={{ color: '#9ca3af', padding: '24px 0' }}>Cargando...</p>
            : <OrdenTable lista={ordenes} />
        )}
      </section>
    </div>
  )
}
