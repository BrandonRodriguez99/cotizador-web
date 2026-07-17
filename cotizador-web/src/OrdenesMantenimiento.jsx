import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import {
  getOrdenesMantenimiento,
  getOrdenMantenimientoById,
  createOrdenMantenimiento,
  updateOrdenMantenimiento,
  getInventario,
  getAreasConsumo,
  getConsumos,
  registrarConsumo,
  getOCsPendientesRecepcion,
  registrarRecepcionOC,
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
  const [selectedOrden, setSelectedOrden] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pdfLoading, setPdfLoading]       = useState(null)

  // Consumos de limpieza
  const [areasConsumo, setAreasConsumo] = useState([])
  const [consumos, setConsumos]         = useState([])
  const [loadingConsumos, setLoadingConsumos] = useState(false)
  const [consumoForm, setConsumoForm]   = useState({ productoId: '', areaConsumoId: '', cantidad: '', observaciones: '' })
  const [consumoSearch, setConsumoSearch] = useState('')
  const [savingConsumo, setSavingConsumo] = useState(false)
  const [consumoError, setConsumoError] = useState(null)

  // Recepción de OC
  const [ocsPendientes, setOcsPendientes]       = useState([])
  const [loadingOCs, setLoadingOCs]             = useState(false)
  const [ocActiva, setOcActiva]                 = useState(null)   // OC seleccionada para checklist
  const [recepcionCants, setRecepcionCants]     = useState({})     // { lineaId: cantidadRecibida }
  const [savingRecepcion, setSavingRecepcion]   = useState(false)
  const [recepcionError, setRecepcionError]     = useState(null)

  async function loadOrdenes() {
    setLoading(true)
    try { setOrdenes(await getOrdenesMantenimiento()) }
    catch {} finally { setLoading(false) }
  }

  async function loadConsumos() {
    setLoadingConsumos(true)
    try { setConsumos(await getConsumos()) }
    catch {} finally { setLoadingConsumos(false) }
  }

  async function loadOCsPendientes() {
    setLoadingOCs(true)
    try { setOcsPendientes(await getOCsPendientesRecepcion()) }
    catch {} finally { setLoadingOCs(false) }
  }

  function seleccionarOC(oc) {
    setOcActiva(oc)
    setRecepcionError(null)
    const cants = {}
    for (const l of oc.Lineas) cants[l.OrdenCompraLineaId] = String(l.Cantidad ?? '')
    setRecepcionCants(cants)
  }

  async function handleConfirmarRecepcion(e) {
    e.preventDefault()
    setRecepcionError(null)
    setSavingRecepcion(true)
    try {
      const lineas = ocActiva.Lineas.map(l => ({
        lineaId:          l.OrdenCompraLineaId,
        productoId:       l.ProductoId || null,
        cantidadRecibida: Number(recepcionCants[l.OrdenCompraLineaId]) || 0,
      }))
      await registrarRecepcionOC(ocActiva.OrdenCompraId, lineas, currentUser)
      setOcActiva(null)
      showSuccess(`Recepción de ${ocActiva.Folio} confirmada. Stock actualizado.`)
      await loadOCsPendientes()
    } catch (err) {
      setRecepcionError(err?.message || 'Error al registrar recepción')
    } finally {
      setSavingRecepcion(false)
    }
  }

  useEffect(() => {
    getInventario().then(data => setInventario(data.filter(p => p.Activo))).catch(() => {})
    getAreasConsumo().then(setAreasConsumo).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== 'nueva') loadOrdenes()
    if (activeTab === 'consumos' || activeTab === 'historial_consumos') loadConsumos()
    if (activeTab === 'recepcion_oc') loadOCsPendientes()
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

  async function handleRegistrarConsumo(e) {
    e.preventDefault()
    setConsumoError(null)
    if (!consumoForm.productoId) { setConsumoError('Selecciona un material'); return }
    if (!consumoForm.cantidad || Number(consumoForm.cantidad) <= 0) { setConsumoError('Ingresa una cantidad válida'); return }
    setSavingConsumo(true)
    try {
      const r = await registrarConsumo({
        productoId:    Number(consumoForm.productoId),
        areaConsumoId: consumoForm.areaConsumoId ? Number(consumoForm.areaConsumoId) : null,
        cantidad:      Number(consumoForm.cantidad),
        observaciones: consumoForm.observaciones || null,
      })
      setConsumoForm({ productoId: '', areaConsumoId: '', cantidad: '', observaciones: '' })
      await loadConsumos()
      // Refrescar inventario para mostrar stock actualizado
      getInventario().then(data => setInventario(data.filter(p => p.Activo))).catch(() => {})
      showSuccess(`Consumo registrado correctamente. Stock nuevo: ${r.stockNuevo}`)
    } catch (err) {
      setConsumoError(err?.message || 'Error al registrar consumo')
    } finally {
      setSavingConsumo(false)
    }
  }

  const isAdmin = currentUserRol === 'admin'
  const misOrdenes = ordenes.filter(o => o.CreadoPor === currentUser)
  const pendientes = ordenes.filter(o => o.Estado !== 'Completada')

  const puedeVerConsumos = ['mantenimiento', 'jefe_mantenimiento', 'admin'].includes(currentUserRol)

  const TABS = [
    { key: 'nueva',     label: 'Nueva Solicitud' },
    { key: 'mis',       label: `Mis Solicitudes${misOrdenes.length ? ` (${misOrdenes.length})` : ''}` },
    { key: 'completar', label: `Por Atender${pendientes.length ? ` (${pendientes.length})` : ''}` },
    ...(isAdmin ? [{ key: 'todas', label: 'Todas las Órdenes' }] : []),
    ...(puedeVerConsumos ? [
      { key: 'consumos',           label: 'Consumos' },
      { key: 'historial_consumos', label: 'Historial' },
      { key: 'recepcion_oc',       label: 'Recepción OC' },
    ] : []),
  ]

  const tabBtnStyle = (key) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap',
    background: activeTab === key ? '#2563eb' : 'transparent',
    color: activeTab === key ? '#fff' : '#6b7280',
    transition: 'all 0.15s',
  })

  // ── Generación de PDF ─────────────────────────────────────────────────────
  function descargarPDF(orden, materiales) {
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
    const ML = 12, CW = 192

    // Colores
    const AZUL   = [26, 58, 105]
    const AZUL2  = [41, 98, 173]
    const GR     = [200, 200, 200]
    const BLK    = [0, 0, 0]
    const WHT    = [255, 255, 255]
    const LGRAY  = [248, 248, 248]

    let y = ML

    function t(str, x, yy, { sz = 9, bold = false, col = BLK, align = 'left', maxW = null } = {}) {
      doc.setFontSize(sz)
      doc.setTextColor(...col)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const opts = { align }
      if (maxW) opts.maxWidth = maxW
      doc.text(String(str ?? ''), x, yy, opts)
    }

    function box(x, yy, w, h, fill, stroke) {
      doc.setLineWidth(0.3)
      if (fill) doc.setFillColor(...fill)
      if (stroke) doc.setDrawColor(...stroke)
      doc.rect(x, yy, w, h, fill && stroke ? 'FD' : fill ? 'F' : 'D')
    }

    function ln(x1, y1, x2, y2, col = GR) {
      doc.setDrawColor(...col); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2)
    }

    function fd(v) {
      if (!v) return ''
      const d = new Date(v)
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    function chkbox(x, yy, checked) {
      box(x, yy, 3.5, 3.5, null, BLK)
      if (checked) {
        doc.setDrawColor(...AZUL2); doc.setLineWidth(0.6)
        doc.line(x + 0.4, yy + 2.2, x + 1.4, yy + 3.3)
        doc.line(x + 1.4, yy + 3.3, x + 3.2, yy + 0.7)
      }
    }

    function secHeader(title) {
      box(ML, y, CW, 6.5, AZUL, AZUL)
      t(title, ML + CW / 2, y + 4.5, { sz: 9, bold: true, col: WHT, align: 'center' })
      y += 6.5
    }

    // ── CABECERA ──────────────────────────────────────────────────────────────
    const HDR_H = 22, LOGO_W = 30, META_W = 52, TITLE_W = CW - LOGO_W - META_W
    box(ML, y, CW, HDR_H, WHT, GR)
    ln(ML + LOGO_W, y, ML + LOGO_W, y + HDR_H)
    ln(ML + LOGO_W + TITLE_W, y, ML + LOGO_W + TITLE_W, y + HDR_H)
    // Logo UDAT
    doc.setDrawColor(...AZUL2); doc.setLineWidth(0.8); doc.rect(ML + 4, y + 3, 22, 16)
    t('UDAT', ML + 15, y + 12, { sz: 12, bold: true, col: AZUL2, align: 'center' })
    // Título
    t('Orden de Mantenimiento', ML + LOGO_W + TITLE_W / 2, y + 13, { sz: 15, bold: true, align: 'center' })
    // Meta (No./Rev./Fecha)
    const metaX = ML + LOGO_W + TITLE_W
    ;[['No.', 'FGA03-02'], ['Rev.', '2'], ['Fecha', '20-Ago-2025']].forEach(([lbl, val], i) => {
      const ry = y + i * (HDR_H / 3)
      if (i > 0) ln(metaX, ry, metaX + META_W, ry)
      ln(metaX + 17, ry, metaX + 17, ry + HDR_H / 3)
      t(lbl, metaX + 2, ry + (HDR_H / 3) * 0.7, { sz: 8, bold: true })
      t(val, metaX + 19, ry + (HDR_H / 3) * 0.7, { sz: 8, bold: true })
    })
    y += HDR_H + 4

    // ── CAMPOS INFO ───────────────────────────────────────────────────────────
    function infoRow(lLabel, lVal, rLabel, rVal) {
      const mid = ML + CW / 2
      t(lLabel + ':', ML, y + 5, { sz: 8, bold: true })
      t(lVal || '', ML + doc.getTextWidth(lLabel + ':') + 2, y + 5, { sz: 8, col: [50,50,50] })
      ln(ML, y + 7, mid - 3, y + 7)
      if (rLabel) {
        t(rLabel + ':', mid, y + 5, { sz: 8, bold: true })
        t(rVal || '', mid + doc.getTextWidth(rLabel + ':') + 2, y + 5, { sz: 8, col: [50,50,50] })
        ln(mid, y + 7, ML + CW, y + 7)
      }
      y += 8
    }
    infoRow('Departamento', orden.Departamento, 'Fecha de Reporte', fd(orden.FechaReporte))
    infoRow('Nombre de quien Solicita', orden.NombreSolicita, 'Puesto', orden.Puesto)
    infoRow('Equipo', orden.Equipo, 'Código', orden.Codigo)
    y += 2

    // ── RAZÓN DE LA ORDEN ─────────────────────────────────────────────────────
    const RAZONES_PDF = [
      { key: 'correctivo', label: 'Mantenimiento Correctivo' },
      { key: 'preventivo', label: 'Mantenimiento Preventivo' },
      { key: 'predictivo', label: 'Mantenimiento Predictivo' },
      { key: 'programado', label: 'Mantenimiento Programado' },
    ]
    t('Razón de la Orden:', ML, y + 5, { sz: 8, bold: true })
    const rzLW = 38, rzCW = (CW - rzLW) / 2
    RAZONES_PDF.forEach((rz, i) => {
      const cx = ML + rzLW + (i % 2) * rzCW
      const cy = y + Math.floor(i / 2) * 6.5
      chkbox(cx, cy + 0.5, orden.RazonOrden === rz.key)
      t(rz.label, cx + 5.5, cy + 4, { sz: 8 })
    })
    y += 16

    // ── DESCRIPCIÓN DE LA FALLA ───────────────────────────────────────────────
    secHeader('Descripción de la falla: (Dato a llenar por el usuario)')
    const descLines = doc.splitTextToSize(String(orden.DescripcionFalla || ''), CW - 4)
    const descH = Math.max(22, descLines.length * 5 + 6)
    box(ML, y, CW, descH, WHT, GR)
    if (descLines.length) { doc.setFontSize(9); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.text(descLines, ML + 2, y + 5) }
    y += descH + 2

    // ── PARA LLENADO EXCLUSIVO ────────────────────────────────────────────────
    secHeader('Para llenado exclusivo de Mantenimiento')

    // Tipo de falla
    box(ML, y, CW, 8, WHT, GR)
    t('Tipo de falla:', ML + 2, y + 5.5, { sz: 8, bold: true })
    let tx = ML + 33
    ;['Plomería', 'Eléctrica', 'Albañilería', 'Otro'].forEach(tipo => {
      chkbox(tx, y + 2, orden.TipoFalla === tipo)
      const label = tipo + (tipo === 'Otro' ? ':' : '')
      t(label, tx + 5.5, y + 5.5, { sz: 8 })
      tx += doc.getTextWidth(label) + 12
    })
    y += 8

    // ── TABLA MATERIALES ──────────────────────────────────────────────────────
    const mats = (materiales || []).map(m => ({
      mat: String(m.Material ?? m.material ?? ''),
      qty: String(m.Cantidad ?? m.cantidad ?? ''),
    }))
    const MAT_W = CW * 0.78, QTY_W = CW - MAT_W

    secHeader('Refacciones y/o Materiales utilizados en el mantenimiento:')
    // Encabezados de columna
    box(ML, y, MAT_W, 6.5, AZUL2, AZUL2)
    box(ML + MAT_W, y, QTY_W, 6.5, AZUL2, AZUL2)
    t('Refacción o Material', ML + 2, y + 4.5, { sz: 8, bold: true, col: WHT })
    t('Cantidad', ML + MAT_W + QTY_W / 2, y + 4.5, { sz: 8, bold: true, col: WHT, align: 'center' })
    y += 6.5

    if (mats.length === 0) {
      box(ML, y, CW, 7, LGRAY, GR); y += 7
    } else {
      mats.forEach((m, i) => {
        const bg = i % 2 === 0 ? WHT : LGRAY
        box(ML, y, MAT_W, 7, bg, GR)
        box(ML + MAT_W, y, QTY_W, 7, bg, GR)
        t(m.mat, ML + 2, y + 4.8, { sz: 8, maxW: MAT_W - 4 })
        t(m.qty, ML + MAT_W + QTY_W / 2, y + 4.8, { sz: 8, align: 'center' })
        y += 7
      })
    }
    y += 3

    // ── FECHA DE TERMINACIÓN ──────────────────────────────────────────────────
    secHeader('Fecha de terminación')
    box(ML, y, CW, 8, WHT, GR)
    t(fd(orden.FechaTerminacion), ML + 2, y + 5.5, { sz: 9 })
    y += 8 + 2

    // ── DESCRIPCIÓN DE MANTENIMIENTO ──────────────────────────────────────────
    secHeader('Descripción de mantenimiento realizado')
    const mantLines = doc.splitTextToSize(String(orden.DescripcionMantenimiento || ''), CW - 4)
    const mantH = Math.max(22, mantLines.length * 5 + 6)
    box(ML, y, CW, mantH, WHT, GR)
    if (mantLines.length) { doc.setFontSize(9); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.text(mantLines, ML + 2, y + 5) }
    y += mantH + 3

    // Espacio en blanco
    box(ML, y, CW, 14, WHT, GR); y += 14 + 5

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    const half = CW / 2
    box(ML, y, half, 22, WHT, GR)
    box(ML + half, y, half, 22, WHT, GR)
    const sigY = y + 13
    ln(ML + 6, sigY, ML + half - 6, sigY, BLK)
    ln(ML + half + 6, sigY, ML + CW - 6, sigY, BLK)
    if (orden.TecnicoResponsable) t(orden.TecnicoResponsable, ML + half / 2, sigY - 2, { sz: 7.5, align: 'center', col: [50,50,50] })
    if (orden.UsuarioEquipo)      t(orden.UsuarioEquipo, ML + half + half / 2, sigY - 2, { sz: 7.5, align: 'center', col: [50,50,50] })
    t('Nombre y Firma',      ML + half / 2,        sigY + 4, { sz: 7, bold: true, align: 'center' })
    t('Técnico Responsable', ML + half / 2,        sigY + 8, { sz: 7, bold: true, align: 'center' })
    t('Nombre y Firma',      ML + half + half / 2, sigY + 4, { sz: 7, bold: true, align: 'center' })
    t('Usuario del Equipo',  ML + half + half / 2, sigY + 8, { sz: 7, bold: true, align: 'center' })

    doc.save(`OM-${orden.Folio || 'orden'}.pdf`)
  }

  async function generarPDFOrden(id) {
    setPdfLoading(id)
    try {
      const data = await getOrdenMantenimientoById(id)
      descargarPDF(data.orden, data.materiales)
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

        {/* ── CONSUMOS DE LIMPIEZA ── */}
        {activeTab === 'consumos' && puedeVerConsumos && (() => {
          const inventarioFiltrado = consumoSearch.trim()
            ? inventario.filter(p => p.NombreProducto.toLowerCase().includes(consumoSearch.toLowerCase()))
            : inventario

          return (
            <div style={{ maxWidth: '480px' }}>
              <form onSubmit={handleRegistrarConsumo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Material</label>
                  <input
                    placeholder="Buscar material..."
                    value={consumoSearch}
                    onChange={e => { setConsumoSearch(e.target.value); setConsumoForm(f => ({ ...f, productoId: '' })) }}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  {consumoSearch && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {inventarioFiltrado.length === 0
                        ? <p style={{ padding: '12px', margin: 0, fontSize: '13px', color: '#9ca3af' }}>Sin resultados</p>
                        : inventarioFiltrado.map(p => (
                          <button key={p.ProductoId} type="button"
                            onClick={() => { setConsumoForm(f => ({ ...f, productoId: String(p.ProductoId) })); setConsumoSearch(p.NombreProducto) }}
                            style={{ display: 'block', width: '100%', padding: '10px 14px', background: consumoForm.productoId === String(p.ProductoId) ? '#eff6ff' : 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                            <span style={{ fontWeight: 600 }}>{p.NombreProducto}</span>
                            <span style={{ color: '#6b7280', marginLeft: '8px' }}>Stock: {p.CantidadReal} {p.UnidadMedida}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                  {consumoForm.productoId && (
                    <p style={{ fontSize: '12px', color: '#2563eb', margin: '4px 0 0', fontWeight: 500 }}>
                      ✓ {inventario.find(p => String(p.ProductoId) === consumoForm.productoId)?.NombreProducto}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Área de destino</label>
                  <select
                    value={consumoForm.areaConsumoId}
                    onChange={e => setConsumoForm(f => ({ ...f, areaConsumoId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}>
                    <option value="">Seleccionar área</option>
                    {areasConsumo.map(a => <option key={a.AreaConsumoId} value={a.AreaConsumoId}>{a.Nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Cantidad</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={consumoForm.cantidad}
                    onChange={e => setConsumoForm(f => ({ ...f, cantidad: e.target.value }))}
                    placeholder="0"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Observaciones (opcional)</label>
                  <textarea
                    value={consumoForm.observaciones}
                    onChange={e => setConsumoForm(f => ({ ...f, observaciones: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                {consumoError && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px' }}>{consumoError}</div>
                )}

                <button type="submit" disabled={savingConsumo} style={{ padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: savingConsumo ? 0.7 : 1 }}>
                  {savingConsumo ? 'Registrando...' : '✓ Registrar consumo'}
                </button>
              </form>
            </div>
          )
        })()}

        {/* ── HISTORIAL DE CONSUMOS ── */}
        {activeTab === 'historial_consumos' && puedeVerConsumos && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Historial de movimientos</h3>
              {loadingConsumos && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Cargando...</span>}
            </div>
            {consumos.length === 0 && !loadingConsumos
              ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>Sin movimientos registrados.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {consumos.map(c => (
                    <div key={c.ConsumoId} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 16px', background: '#fafafa', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: '8px' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>{c.NombreProducto}</p>
                        <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280' }}>
                          {c.Usuario} · {c.Area || 'Sin área'}{c.Observaciones ? ` · ${c.Observaciones}` : ''}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                          {new Date(c.Fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>
                        -{c.Cantidad} {c.UnidadMedida}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── RECEPCIÓN DE ÓRDENES DE COMPRA ── */}
        {activeTab === 'recepcion_oc' && puedeVerConsumos && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Órdenes pendientes de recepción</h3>
              {loadingOCs && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Cargando...</span>}
            </div>

            {!ocActiva ? (
              ocsPendientes.length === 0 && !loadingOCs
                ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>No hay órdenes aprobadas pendientes de recepción.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ocsPendientes.map(oc => (
                      <div key={oc.OrdenCompraId} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px', color: '#111827' }}>{oc.Folio}</p>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#6b7280' }}>{oc.Proveedor}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                            {String(oc.Fecha || '').slice(0,10)} · {oc.Lineas?.length || 0} artículo{oc.Lineas?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button type="button"
                          onClick={() => seleccionarOC(oc)}
                          style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Verificar llegada
                        </button>
                      </div>
                    ))}
                  </div>
                )
            ) : (
              <div style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <button type="button" onClick={() => { setOcActiva(null); setRecepcionError(null) }}
                    style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    ← Volver
                  </button>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#111827' }}>{ocActiva.Folio} — {ocActiva.Proveedor}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Confirma las cantidades que llegaron</p>
                  </div>
                </div>

                <form onSubmit={handleConfirmarRecepcion}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Artículo</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Pedido</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Recibido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocActiva.Lineas.map((l, i) => (
                          <tr key={l.OrdenCompraLineaId} style={{ borderBottom: i < ocActiva.Lineas.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <td style={{ padding: '10px 14px', color: '#111827' }}>
                              {l.NombreProducto || l.Descripcion || `Línea ${i+1}`}
                              {l.UnidadMedida && <span style={{ color: '#9ca3af', marginLeft: '4px', fontSize: '11px' }}>{l.UnidadMedida}</span>}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>{l.Cantidad}</td>
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                              <input type="number" min="0" step="0.01"
                                value={recepcionCants[l.OrdenCompraLineaId] ?? ''}
                                onChange={e => setRecepcionCants(c => ({ ...c, [l.OrdenCompraLineaId]: e.target.value }))}
                                style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {recepcionError && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>{recepcionError}</div>
                  )}

                  <button type="submit" disabled={savingRecepcion}
                    style={{ width: '100%', padding: '14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: savingRecepcion ? 0.7 : 1 }}>
                    {savingRecepcion ? 'Confirmando...' : '✓ Confirmar recepción y actualizar inventario'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
