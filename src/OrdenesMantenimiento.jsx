import { useEffect, useState } from 'react'
import {
  getOrdenesMantenimiento,
  getOrdenMantenimientoById,
  createOrdenMantenimiento,
  updateOrdenMantenimiento,
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
function FormTecnico({ orden, materiales: initMat, onSaved, tecnico }) {
  const [form, setForm] = useState({
    tipoFalla: orden.TipoFalla || '',
    fechaTerminacion: orden.FechaTerminacion ? String(orden.FechaTerminacion).slice(0, 10) : new Date().toISOString().slice(0, 10),
    descripcionMantenimiento: orden.DescripcionMantenimiento || '',
    tecnicoResponsable: orden.TecnicoResponsable || tecnico || '',
    usuarioEquipo: orden.UsuarioEquipo || '',
    estado: 'Completada',
  })
  const [materiales, setMateriales] = useState(
    initMat?.length ? initMat : [{ material: '', cantidad: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  function addMat() { setMateriales(m => [...m, { material: '', cantidad: '' }]) }
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

      {/* Materiales */}
      <div>
        <label style={labelStyle}>Refacciones y/o Materiales utilizados</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {materiales.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input style={{ ...inputStyle, flex: 2 }} placeholder="Refacción o material"
                value={m.material} onChange={e => updateMat(i, 'material', e.target.value)} />
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Cantidad"
                value={m.cantidad} onChange={e => updateMat(i, 'cantidad', e.target.value)} />
              {materiales.length > 1 && (
                <button type="button" onClick={() => removeMat(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '20px', padding: '4px', flexShrink: 0 }}>
                  ×
                </button>
              )}
            </div>
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

  // Para completar una orden (técnico)
  const [selectedOrden, setSelectedOrden] = useState(null)   // { orden, materiales }
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function loadOrdenes() {
    setLoading(true)
    try { setOrdenes(await getOrdenesMantenimiento()) }
    catch {} finally { setLoading(false) }
  }

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
              <th>Solicitante</th><th>Fecha</th><th>Estado</th><th>Técnico</th>
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
