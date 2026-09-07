import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  getOrdenesMantenimiento,
  getOrdenMantenimientoById,
  createOrdenMantenimiento,
  updateOrdenMantenimiento,
  editOrdenMantenimiento,
  deleteOrdenMantenimiento,
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

  // Tab "todas" — búsqueda, filtros, paginación, editar, eliminar
  const [todasSearch, setTodasSearch]         = useState('')
  const [todasEstado, setTodasEstado]         = useState('')
  const [todasPage, setTodasPage]             = useState(1)
  const [editOrden, setEditOrden]             = useState(null)
  const [editForm, setEditForm]               = useState({})
  const [savingEdit, setSavingEdit]           = useState(false)
  const [editError, setEditError]             = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId]           = useState(null)

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
  const isJefe  = currentUserRol === 'jefe_mantenimiento'
  const misOrdenes = ordenes.filter(o => o.CreadoPor === currentUser)
  const pendientes = ordenes.filter(o => o.Estado !== 'Completada')

  const puedeVerConsumos = ['mantenimiento', 'jefe_mantenimiento', 'admin'].includes(currentUserRol)

  const TABS = [
    { key: 'nueva',     label: 'Nueva Solicitud' },
    { key: 'mis',       label: `Mis Solicitudes${misOrdenes.length ? ` (${misOrdenes.length})` : ''}` },
    { key: 'completar', label: `Por Atender${pendientes.length ? ` (${pendientes.length})` : ''}` },
    ...((isAdmin || isJefe) ? [{ key: 'todas', label: 'Todas las Órdenes' }] : []),
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
  async function descargarPDF(orden, materiales) {
    const fd = (v) => {
      if (!v) return ‘’
      const d = new Date(v)
      return isNaN(d.getTime()) ? ‘’ : d.toLocaleDateString(‘es-MX’, { day: ‘2-digit’, month: ‘short’, year: ‘numeric’ })
    }
    const s = (v) => String(v ?? ‘’)
    const esc = (v) => s(v).replace(/&/g,’&amp;’).replace(/</g,’&lt;’).replace(/>/g,’&gt;’).replace(/"/g,’&quot;’)
    const chk = (checked) =>
      `<span style="display:inline-block;width:11px;height:11px;border:1px solid #000;text-align:center;line-height:11px;font-size:9px;margin-right:4px;">${checked ? ‘✓’ : ‘’}</span>`

    const RAZONES_PDF = [
      { key: ‘correctivo’, label: ‘Mantenimiento Correctivo’ },
      { key: ‘preventivo’, label: ‘Mantenimiento Preventivo’ },
      { key: ‘predictivo’, label: ‘Mantenimiento Predictivo’ },
      { key: ‘programado’, label: ‘Mantenimiento Programado’ },
    ]
    const TIPOS_FALLA = [‘Plomería’, ‘Eléctrica’, ‘Albañilería’, ‘Otro’]
    const mats = (materiales || [])

    const wrap = document.createElement(‘div’)
    wrap.style.cssText = ‘position:absolute;top:-9999px;left:-9999px;width:800px;background:#fff;’
    document.body.appendChild(wrap)
    wrap.innerHTML = `
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#000;padding:24px 28px;box-sizing:border-box;width:800px;">
        <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:8px;">
          <tr>
            <td style="width:90px;border-right:1px solid #ccc;padding:8px;text-align:center;vertical-align:middle;">
              <div style="border:2px solid #2962ad;padding:4px 10px;display:inline-block;color:#2962ad;font-weight:bold;font-size:14px;">UDAT</div>
            </td>
            <td style="text-align:center;font-size:17px;font-weight:bold;border-right:1px solid #ccc;padding:8px;">Orden de Mantenimiento</td>
            <td style="width:150px;padding:0;vertical-align:top;">
              <table style="width:100%;border-collapse:collapse;font-size:10px;">
                <tr><td style="border-bottom:1px solid #ccc;border-right:1px solid #ccc;padding:3px 6px;font-weight:bold;">No.</td><td style="border-bottom:1px solid #ccc;padding:3px 6px;">FGA03-02</td></tr>
                <tr><td style="border-bottom:1px solid #ccc;border-right:1px solid #ccc;padding:3px 6px;font-weight:bold;">Rev.</td><td style="border-bottom:1px solid #ccc;padding:3px 6px;">2</td></tr>
                <tr><td style="border-right:1px solid #ccc;padding:3px 6px;font-weight:bold;">Fecha</td><td style="padding:3px 6px;">20-Ago-2025</td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:11px;">
          <tr>
            <td style="border-bottom:1px solid #ddd;padding:3px 0;width:50%;"><b>Departamento:</b> ${esc(orden.Departamento)}</td>
            <td style="border-bottom:1px solid #ddd;padding:3px 0;"><b>Fecha de Reporte:</b> ${esc(fd(orden.FechaReporte))}</td>
          </tr>
          <tr>
            <td style="border-bottom:1px solid #ddd;padding:3px 0;"><b>Nombre de quien Solicita:</b> ${esc(orden.NombreSolicita)}</td>
            <td style="border-bottom:1px solid #ddd;padding:3px 0;"><b>Puesto:</b> ${esc(orden.Puesto)}</td>
          </tr>
          <tr>
            <td style="padding:3px 0;"><b>Equipo:</b> ${esc(orden.Equipo)}</td>
            <td style="padding:3px 0;"><b>Código:</b> ${esc(orden.Codigo)}</td>
          </tr>
        </table>
        <div style="margin-bottom:6px;font-size:11px;">
          <b>Razón de la Orden:</b>
          <div style="display:flex;flex-wrap:wrap;gap:6px 24px;margin-top:4px;padding-left:8px;">
            ${RAZONES_PDF.map(r => `<div>${chk(orden.RazonOrden === r.key)}${r.label}</div>`).join(‘’)}
          </div>
        </div>
        <div style="background:#1a3a69;color:#fff;text-align:center;font-weight:bold;padding:4px;font-size:11px;">Descripción de la falla: (Dato a llenar por el usuario)</div>
        <div style="border:1px solid #ccc;border-top:none;min-height:60px;padding:6px;margin-bottom:6px;font-size:11px;white-space:pre-wrap;">${esc(orden.DescripcionFalla)}</div>
        <div style="background:#1a3a69;color:#fff;text-align:center;font-weight:bold;padding:4px;font-size:11px;">Para llenado exclusivo de Mantenimiento</div>
        <div style="border:1px solid #ccc;border-top:none;padding:4px 8px;margin-bottom:6px;font-size:11px;display:flex;gap:16px;align-items:center;">
          <b>Tipo de falla:</b>
          ${TIPOS_FALLA.map(t => `<div>${chk(orden.TipoFalla === t)}${t}</div>`).join(‘’)}
        </div>
        <div style="background:#1a3a69;color:#fff;text-align:center;font-weight:bold;padding:4px;font-size:11px;">Refacciones y/o Materiales utilizados en el mantenimiento:</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:11px;">
          <thead><tr>
            <th style="background:#2962ad;color:#fff;padding:4px 8px;text-align:left;border:1px solid #2962ad;">Refacción o Material</th>
            <th style="background:#2962ad;color:#fff;padding:4px 8px;text-align:center;border:1px solid #2962ad;width:80px;">Cantidad</th>
          </tr></thead>
          <tbody>
            ${mats.length === 0
              ? ‘<tr><td colspan="2" style="border:1px solid #ccc;padding:4px 8px;">&nbsp;</td></tr>’
              : mats.map((m, i) => `<tr style="background:${i%2===0?’#fff’:’#f8f8f8’}"><td style="border:1px solid #ccc;padding:4px 8px;">${esc(m.Material ?? m.material ?? ‘’)}</td><td style="border:1px solid #ccc;padding:4px 8px;text-align:center;">${esc(m.Cantidad ?? m.cantidad ?? ‘’)}</td></tr>`).join(‘’)}
          </tbody>
        </table>
        <div style="background:#1a3a69;color:#fff;text-align:center;font-weight:bold;padding:4px;font-size:11px;">Fecha de terminación</div>
        <div style="border:1px solid #ccc;border-top:none;min-height:28px;padding:6px;margin-bottom:6px;font-size:11px;">${esc(fd(orden.FechaTerminacion))}</div>
        <div style="background:#1a3a69;color:#fff;text-align:center;font-weight:bold;padding:4px;font-size:11px;">Descripción de mantenimiento realizado</div>
        <div style="border:1px solid #ccc;border-top:none;min-height:60px;padding:6px;margin-bottom:6px;font-size:11px;white-space:pre-wrap;">${esc(orden.DescripcionMantenimiento)}</div>
        <div style="border:1px solid #ccc;min-height:40px;margin-bottom:8px;"></div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <tr>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;width:50%;">
              <div style="min-height:20px;color:#444;font-size:10px;">${esc(orden.TecnicoResponsable)}</div>
              <div style="border-top:1px solid #000;margin:24px 20px 4px;"></div>
              <div style="font-weight:bold;">Nombre y Firma</div>
              <div style="font-weight:bold;">Técnico Responsable</div>
            </td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;width:50%;">
              <div style="min-height:20px;color:#444;font-size:10px;">${esc(orden.UsuarioEquipo)}</div>
              <div style="border-top:1px solid #000;margin:24px 20px 4px;"></div>
              <div style="font-weight:bold;">Nombre y Firma</div>
              <div style="font-weight:bold;">Usuario del Equipo</div>
            </td>
          </tr>
        </table>
      </div>
    `

    try {
      const canvas = await html2canvas(wrap, { scale: 2, useCORS: true, backgroundColor: ‘#ffffff’, logging: false })
      const imgData = canvas.toDataURL(‘image/png’)
      const doc = new jsPDF({ unit: ‘mm’, format: ‘letter’, orientation: ‘portrait’ })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 8
      const imgW = pageW - margin * 2
      const imgH = (canvas.height * imgW) / canvas.width
      if (imgH <= pageH - margin * 2) {
        doc.addImage(imgData, ‘PNG’, margin, margin, imgW, imgH)
      } else {
        const ratio = canvas.width / imgW
        const pageHpx = (pageH - margin * 2) * ratio
        let srcY = 0
        while (srcY < canvas.height) {
          const slicePx = Math.min(pageHpx, canvas.height - srcY)
          const tmp = document.createElement(‘canvas’)
          tmp.width = canvas.width
          tmp.height = slicePx
          tmp.getContext(‘2d’).drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
          doc.addImage(tmp.toDataURL(‘image/png’), ‘PNG’, margin, margin, imgW, slicePx / ratio)
          srcY += pageHpx
          if (srcY < canvas.height) doc.addPage()
        }
      }
      doc.save(`OM-${orden.Folio || ‘orden’}.pdf`)
    } finally {
      document.body.removeChild(wrap)
    }
  }

  async function generarPDFOrden(id) {
    setPdfLoading(id)
    try {
      const data = await getOrdenMantenimientoById(id)
      await descargarPDF(data.orden, data.materiales)
    } catch { alert('Error al generar el PDF') }
    finally { setPdfLoading(null) }
  }

  function abrirEditarOrden(o) {
    setEditOrden(o)
    setEditForm({
      Departamento:     o.Departamento     || '',
      FechaReporte:     o.FechaReporte     ? String(o.FechaReporte).slice(0, 10) : '',
      NombreSolicita:   o.NombreSolicita   || '',
      Puesto:           o.Puesto           || '',
      Equipo:           o.Equipo           || '',
      Codigo:           o.Codigo           || '',
      RazonOrden:       o.RazonOrden       || '',
      DescripcionFalla: o.DescripcionFalla || '',
      Estado:           o.Estado           || 'Pendiente',
      TecnicoResponsable: o.TecnicoResponsable || '',
    })
    setEditError(null)
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault()
    setSavingEdit(true)
    setEditError(null)
    try {
      await editOrdenMantenimiento(editOrden.OrdenMantenimientoId, editForm)
      setOrdenes(prev => prev.map(o =>
        o.OrdenMantenimientoId === editOrden.OrdenMantenimientoId ? { ...o, ...editForm } : o
      ))
      setEditOrden(null)
      showSuccess(`Orden ${editOrden.Folio} actualizada.`)
    } catch (err) { setEditError(err.message) }
    finally { setSavingEdit(false) }
  }

  async function handleDeleteOrden(id) {
    setDeletingId(id)
    try {
      await deleteOrdenMantenimiento(id)
      setOrdenes(prev => prev.filter(o => o.OrdenMantenimientoId !== id))
      setConfirmDeleteId(null)
      showSuccess('Orden eliminada correctamente.')
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    } finally { setDeletingId(null) }
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
        {activeTab === 'todas' && (isAdmin || isJefe) && (() => {
          if (loading) return <p style={{ color: '#9ca3af', padding: '24px 0' }}>Cargando...</p>

          const PAGE_SIZE = 10
          const filtradas = ordenes.filter(o => {
            const q = todasSearch.toLowerCase()
            const matchSearch = !q ||
              (o.Folio || '').toLowerCase().includes(q) ||
              (o.Equipo || '').toLowerCase().includes(q) ||
              (o.NombreSolicita || '').toLowerCase().includes(q) ||
              (o.Departamento || '').toLowerCase().includes(q)
            const matchEstado = !todasEstado || o.Estado === todasEstado
            return matchSearch && matchEstado
          })
          const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE))
          const pagina = Math.min(todasPage, totalPages)
          const paginadas = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)
          const mInp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }
          const mLbl = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }

          return (
            <div>
              {/* Modal editar */}
              {editOrden && (
                <div
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
                  onClick={e => { if (e.target === e.currentTarget) setEditOrden(null) }}
                >
                  <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>Editar Orden</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#2563eb', fontWeight: 600 }}>{editOrden.Folio}</p>
                      </div>
                      <button type="button" onClick={() => setEditOrden(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#9ca3af', lineHeight: 1, padding: '4px' }}>×</button>
                    </div>
                    <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={mLbl}>Departamento</label>
                          <input style={mInp} value={editForm.Departamento} onChange={e => setEditForm(f => ({ ...f, Departamento: e.target.value }))} />
                        </div>
                        <div>
                          <label style={mLbl}>Fecha de Reporte</label>
                          <input type="date" style={mInp} value={editForm.FechaReporte} onChange={e => setEditForm(f => ({ ...f, FechaReporte: e.target.value }))} />
                        </div>
                        <div>
                          <label style={mLbl}>Quien solicita</label>
                          <input style={mInp} value={editForm.NombreSolicita} onChange={e => setEditForm(f => ({ ...f, NombreSolicita: e.target.value }))} />
                        </div>
                        <div>
                          <label style={mLbl}>Puesto</label>
                          <input style={mInp} value={editForm.Puesto} onChange={e => setEditForm(f => ({ ...f, Puesto: e.target.value }))} />
                        </div>
                        <div>
                          <label style={mLbl}>Equipo</label>
                          <input style={mInp} value={editForm.Equipo} onChange={e => setEditForm(f => ({ ...f, Equipo: e.target.value }))} />
                        </div>
                        <div>
                          <label style={mLbl}>Código</label>
                          <input style={mInp} value={editForm.Codigo} onChange={e => setEditForm(f => ({ ...f, Codigo: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={mLbl}>Estado</label>
                          <select style={mInp} value={editForm.Estado} onChange={e => setEditForm(f => ({ ...f, Estado: e.target.value }))}>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En proceso">En proceso</option>
                            <option value="Completada">Completada</option>
                          </select>
                        </div>
                        <div>
                          <label style={mLbl}>Razón de la Orden</label>
                          <select style={mInp} value={editForm.RazonOrden} onChange={e => setEditForm(f => ({ ...f, RazonOrden: e.target.value }))}>
                            <option value="">Seleccionar...</option>
                            {RAZONES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={mLbl}>Descripción de la Falla</label>
                        <textarea style={{ ...mInp, resize: 'vertical', minHeight: '80px' }} value={editForm.DescripcionFalla} onChange={e => setEditForm(f => ({ ...f, DescripcionFalla: e.target.value }))} />
                      </div>
                      <div>
                        <label style={mLbl}>Técnico Responsable</label>
                        <input style={mInp} value={editForm.TecnicoResponsable} onChange={e => setEditForm(f => ({ ...f, TecnicoResponsable: e.target.value }))} />
                      </div>
                      {editError && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px' }}>{editError}</div>}
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                        <button type="button" onClick={() => setEditOrden(null)} style={{ padding: '10px 20px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
                        <button type="submit" disabled={savingEdit} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, opacity: savingEdit ? 0.7 : 1 }}>
                          {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Filtros */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  placeholder="Buscar por folio, equipo, solicitante, departamento..."
                  value={todasSearch}
                  onChange={e => { setTodasSearch(e.target.value); setTodasPage(1) }}
                  style={{ flex: '1', minWidth: '200px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                />
                <select
                  value={todasEstado}
                  onChange={e => { setTodasEstado(e.target.value); setTodasPage(1) }}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Completada">Completada</option>
                </select>
                <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Tabla */}
              {filtradas.length === 0 ? (
                <p style={{ color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>Sin órdenes que coincidan.</p>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="participants-table">
                      <thead>
                        <tr>
                          <th>Folio</th><th>Equipo</th><th>Razón</th>
                          <th>Solicitante</th><th>Fecha</th><th>Estado</th><th>Técnico</th><th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginadas.map(o => (
                          <tr key={o.OrdenMantenimientoId}>
                            <td><strong style={{ color: '#2563eb' }}>{o.Folio}</strong></td>
                            <td>{o.Equipo || '-'}</td>
                            <td style={{ textTransform: 'capitalize' }}>{o.RazonOrden || '-'}</td>
                            <td>{o.NombreSolicita || '-'}</td>
                            <td>{fmtFecha(o.FechaReporte)}</td>
                            <td><EstadoBadge estado={o.Estado} /></td>
                            <td>{o.TecnicoResponsable || '-'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap' }}>
                                <button type="button" className="ghost-button"
                                  style={{ fontSize: '12px', padding: '4px 8px' }}
                                  onClick={() => generarPDFOrden(o.OrdenMantenimientoId)}
                                  disabled={pdfLoading === o.OrdenMantenimientoId}>
                                  {pdfLoading === o.OrdenMantenimientoId ? '...' : '📄'}
                                </button>
                                <button type="button" className="ghost-button"
                                  style={{ fontSize: '12px', padding: '4px 8px', color: '#2563eb', borderColor: '#bfdbfe' }}
                                  onClick={() => abrirEditarOrden(o)}>
                                  ✏️
                                </button>
                                {isAdmin && (confirmDeleteId === o.OrdenMantenimientoId ? (
                                  <>
                                    <button type="button"
                                      style={{ fontSize: '11px', padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                      onClick={() => handleDeleteOrden(o.OrdenMantenimientoId)}
                                      disabled={deletingId === o.OrdenMantenimientoId}>
                                      {deletingId === o.OrdenMantenimientoId ? '...' : '¿Sí?'}
                                    </button>
                                    <button type="button" className="ghost-button"
                                      style={{ fontSize: '12px', padding: '4px 8px' }}
                                      onClick={() => setConfirmDeleteId(null)}>
                                      ✕
                                    </button>
                                  </>
                                ) : (
                                  <button type="button" className="ghost-button"
                                    style={{ fontSize: '12px', padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                                    onClick={() => setConfirmDeleteId(o.OrdenMantenimientoId)}>
                                    🗑
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setTodasPage(1)} disabled={pagina === 1}
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: pagina === 1 ? 'default' : 'pointer', color: pagina === 1 ? '#9ca3af' : '#374151', fontSize: '12px' }}>
                        «
                      </button>
                      <button type="button" onClick={() => setTodasPage(p => Math.max(1, p - 1))} disabled={pagina === 1}
                        style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: pagina === 1 ? 'default' : 'pointer', color: pagina === 1 ? '#9ca3af' : '#374151', fontSize: '13px' }}>
                        ← Anterior
                      </button>
                      <span style={{ fontSize: '13px', color: '#374151' }}>
                        Pág. {pagina} / {totalPages}
                      </span>
                      <button type="button" onClick={() => setTodasPage(p => Math.min(totalPages, p + 1))} disabled={pagina === totalPages}
                        style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: pagina === totalPages ? 'default' : 'pointer', color: pagina === totalPages ? '#9ca3af' : '#374151', fontSize: '13px' }}>
                        Siguiente →
                      </button>
                      <button type="button" onClick={() => setTodasPage(totalPages)} disabled={pagina === totalPages}
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: pagina === totalPages ? 'default' : 'pointer', color: pagina === totalPages ? '#9ca3af' : '#374151', fontSize: '12px' }}>
                        »
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

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
