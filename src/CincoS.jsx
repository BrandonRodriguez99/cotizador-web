import { useState, useEffect, useRef } from 'react'
import {
  getCincoSProyectos, getCincoSProyecto, createCincoSProyecto, updateCincoSProyecto,
  getCincoSAreas, getCincoSElementos, createCincoSElemento, updateCincoSElemento, deleteCincoSElemento,
  getCincoSAcciones, updateCincoSAccion, getCincoSDashboard, uploadFoto5S, getCincoSUsuarios,
  getCincoSNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas
} from './api'

const CLASIFICACIONES = [
  { value: 'necesario', label: 'Necesario', color: '#16a34a', bg: '#dcfce7' },
  { value: 'innecesario', label: 'Innecesario', color: '#dc2626', bg: '#fee2e2' },
  { value: 'dudoso', label: 'Dudoso', color: '#d97706', bg: '#fef3c7' },
]
const ESTADOS = [
  { value: 'funciona', label: 'Funciona', color: '#16a34a' },
  { value: 'no_funciona', label: 'No funciona', color: '#dc2626' },
  { value: 'necesita_reparacion', label: 'Necesita reparación', color: '#d97706' },
]

const SvgIcon = ({ d, color = 'currentColor', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

const ICON_PATHS = {
  eliminar: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>,
  reparar: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
  red_tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  mantener: <><polyline points="20 6 9 17 4 12"/></>,
}

const ACCIONES_MAP = {
  eliminar: { label: 'Eliminar', icon: ICON_PATHS.eliminar, color: '#16a34a', bg: '#dcfce7' },
  reparar: { label: 'Reparar', icon: ICON_PATHS.reparar, color: '#d97706', bg: '#fef3c7' },
  red_tag: { label: 'Red Tag', icon: ICON_PATHS.red_tag, color: '#dc2626', bg: '#fee2e2' },
  mantener: { label: 'Mantener', icon: ICON_PATHS.mantener, color: '#059669', bg: '#d1fae5' },
}

function calcularAccionRecomendada(clasificacion, estado) {
  if (clasificacion === 'innecesario') return 'eliminar'
  if (clasificacion === 'dudoso') return 'red_tag'
  if (estado === 'funciona') return 'mantener'
  if (estado === 'no_funciona') return 'eliminar'
  if (estado === 'necesita_reparacion') return 'reparar'
  return 'mantener'
}

function getInstruccion(clasificacion, estado) {
  const accion = calcularAccionRecomendada(clasificacion, estado)
  const instrucciones = {
    eliminar: clasificacion === 'innecesario'
      ? 'Innecesario → Eliminar del área.'
      : 'Necesario pero no funciona → Eliminar del área.',
    reparar: 'Necesario pero requiere reparación → Reparar antes de continuar uso.',
    red_tag: 'Dudoso → Evaluar (Red Tag). Se asignará etiqueta roja para revisión.',
    mantener: 'Necesario y funciona → Mantener en su lugar.',
  }
  return instrucciones[accion]
}

// ─── Setup Component (create + edit) ────────────────────────────────────────
function SetupProyecto({ onCreated, editProyectoId }) {
  const [empresa, setEmpresa] = useState('')
  const [gerente, setGerente] = useState('')
  const [encargado, setEncargado] = useState('')
  const [terminales, setTerminales] = useState([{ nombre: '', areas: [{ nombre: '', champion: '', championId: null }] }])
  const [usuarios, setUsuarios] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)

  useEffect(() => {
    getCincoSUsuarios().then(setUsuarios).catch(() => {})
    if (editProyectoId) {
      setLoadingEdit(true)
      getCincoSProyecto(editProyectoId).then(p => {
        setEmpresa(p.Empresa || '')
        setGerente(p.Gerente || '')
        setEncargado(p.Encargado || '')
        if (p.terminales?.length) {
          setTerminales(p.terminales.map(t => ({
            terminalId: t.TerminalId,
            nombre: t.Nombre,
            areas: (t.areas || []).map(a => ({
              areaId: a.AreaId,
              nombre: a.Nombre,
              champion: a.Champion || '',
              championId: a.ChampionId || null,
            }))
          })))
        }
      }).catch(e => alert('Error cargando proyecto: ' + e.message))
        .finally(() => setLoadingEdit(false))
    }
  }, [editProyectoId])

  const addTerminal = () => setTerminales([...terminales, { nombre: '', areas: [{ nombre: '', champion: '', championId: null }] }])
  const addArea = (ti) => {
    const t = [...terminales]
    t[ti].areas.push({ nombre: '', champion: '', championId: null })
    setTerminales(t)
  }
  const removeTerminal = (ti) => setTerminales(terminales.filter((_, i) => i !== ti))
  const removeArea = (ti, ai) => {
    const t = [...terminales]
    t[ti].areas = t[ti].areas.filter((_, i) => i !== ai)
    setTerminales(t)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!empresa.trim()) return alert('El nombre de la empresa es requerido')
    for (const t of terminales) {
      if (!t.nombre.trim()) return alert('Todas las terminales deben tener nombre')
      for (const a of t.areas) {
        if (!a.nombre.trim()) return alert('Todas las áreas deben tener nombre')
      }
    }
    setSaving(true)
    try {
      if (editProyectoId) {
        await updateCincoSProyecto(editProyectoId, { empresa, gerente, encargado, terminales })
        onCreated(editProyectoId)
      } else {
        const r = await createCincoSProyecto({ empresa, gerente, encargado, terminales })
        onCreated(r.ProyectoId)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  if (loadingEdit) return <div style={{ padding: 20 }}>Cargando proyecto...</div>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>
        {editProyectoId ? 'Editar Proyecto 5S' : 'Datos Generales del Proyecto 5S'}
      </h2>
      <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 13 }}>
        Configure la empresa, terminales y áreas. Este proyecto podrá ser replicado para otras empresas.
      </p>

      <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Empresa *</label>
          <input style={inputStyle} value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nombre de la empresa" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Gerente</label>
            <input style={inputStyle} value={gerente} onChange={e => setGerente(e.target.value)} placeholder="Nombre del gerente" />
          </div>
          <div>
            <label style={labelStyle}>Encargado / Facilitador</label>
            <input style={inputStyle} value={encargado} onChange={e => setEncargado(e.target.value)} placeholder="Nombre del encargado" />
          </div>
        </div>
      </div>

      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Terminales y Áreas</h3>
      {terminales.map((t, ti) => (
        <div key={ti} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input style={{ ...inputStyle, flex: 1, fontWeight: 600 }} value={t.nombre} placeholder={`Terminal ${ti + 1}`}
              onChange={e => { const ts = [...terminales]; ts[ti].nombre = e.target.value; setTerminales(ts) }} />
            {terminales.length > 1 && (
              <button type="button" onClick={() => removeTerminal(ti)}
                style={{ ...btnSmall, background: '#fee2e2', color: '#dc2626' }}>✕</button>
            )}
          </div>
          {t.areas.map((a, ai) => (
            <div key={ai} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, paddingLeft: 16 }}>
              <input style={inputStyle} value={a.nombre} placeholder={`Área ${ai + 1}`}
                onChange={e => { const ts = [...terminales]; ts[ti].areas[ai].nombre = e.target.value; setTerminales(ts) }} />
              <select style={inputStyle} value={a.championId || ''}
                onChange={e => {
                  const ts = [...terminales]
                  const uid = e.target.value ? parseInt(e.target.value) : null
                  const user = usuarios.find(u => u.UsuarioId === uid)
                  ts[ti].areas[ai].championId = uid
                  ts[ti].areas[ai].champion = user ? user.Nombre : ''
                  setTerminales(ts)
                }}>
                <option value="">Sin Champion</option>
                {usuarios.map(u => (
                  <option key={u.UsuarioId} value={u.UsuarioId}>{u.Nombre}</option>
                ))}
              </select>
              {t.areas.length > 1 && (
                <button type="button" onClick={() => removeArea(ti, ai)}
                  style={{ ...btnSmall, background: '#fee2e2', color: '#dc2626' }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addArea(ti)}
            style={{ ...btnSmall, background: '#dbeafe', color: '#2563eb' }}>+ Área</button>
        </div>
      ))}
      <button type="button" onClick={addTerminal}
        style={{ ...btnSmall, background: '#f0fdf4', color: '#16a34a', marginBottom: 20 }}>+ Terminal</button>

      <div>
        <button type="submit" disabled={saving}
          style={{ ...btnPrimary, width: '100%' }}>
          {saving ? 'Guardando...' : editProyectoId ? 'Guardar Cambios' : 'Crear Proyecto 5S'}
        </button>
      </div>
    </form>
  )
}

// ─── Registro de Elementos ──────────────────────────────────────────────────
function RegistroElementos({ proyectoId, areas, onBack, onDone }) {
  const [elementos, setElementos] = useState([])
  const [loading, setLoading] = useState(true)
  const [areaFiltro, setAreaFiltro] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', foto: '', cantidad: 1, clasificacion: '', estado: '', areaId: '', accionManual: '', fechaCompromiso: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [detalleElemento, setDetalleElemento] = useState(null)
  const fileRef = useRef(null)

  const loadElementos = async () => {
    setLoading(true)
    try {
      const data = await getCincoSElementos({ proyectoId })
      setElementos(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadElementos() }, [proyectoId])

  const handleFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const { url } = await uploadFoto5S(reader.result)
        setForm(f => ({ ...f, foto: url }))
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      alert('Error subiendo foto: ' + err.message)
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.areaId || !form.nombre || !form.clasificacion || !form.accionManual || (form.clasificacion === 'necesario' && !form.estado)) {
      return alert('Complete todos los campos requeridos (incluyendo la acción)')
    }
    if (form.accionManual === 'red_tag' && !form.fechaCompromiso) {
      return alert('Para Red Tag debe seleccionar una fecha compromiso')
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.accionManual !== 'red_tag') payload.fechaCompromiso = ''
      if (editId) {
        await updateCincoSElemento(editId, payload)
      } else {
        await createCincoSElemento(payload)
      }
      setShowForm(false)
      setForm({ nombre: '', foto: '', cantidad: 1, clasificacion: '', estado: '', areaId: form.areaId, accionManual: '', fechaCompromiso: '' })
      setEditId(null)
      loadElementos()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  const startEdit = (el) => {
    setForm({
      nombre: el.Nombre, foto: el.Foto || '', cantidad: el.Cantidad,
      clasificacion: el.Clasificacion,
      estado: el.Estado, areaId: el.AreaId,
      accionManual: el.AccionManual || el.AccionRecomendada || '',
      fechaCompromiso: el.FechaCompromiso ? el.FechaCompromiso.split('T')[0] : ''
    })
    setEditId(el.ElementoId)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try { await deleteCincoSElemento(id); loadElementos() } catch (e) { alert(e.message) }
  }

  const filtered = areaFiltro ? elementos.filter(e => String(e.AreaId) === areaFiltro) : elementos
  const needsEstado = form.clasificacion === 'necesario'
  const canRecommend = form.clasificacion && (!needsEstado || form.estado)
  const accion = canRecommend ? calcularAccionRecomendada(form.clasificacion, form.estado) : null
  const instruccion = canRecommend ? getInstruccion(form.clasificacion, form.estado) : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onBack} style={{ ...btnSmall, background: '#f1f5f9' }}>← Atrás</button>
          <h3 style={{ margin: 0, fontSize: 16 }}>1S — Inventario y Clasificación</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select style={inputStyle} value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a.AreaId} value={a.AreaId}>{a.Terminal} — {a.Area}</option>)}
          </select>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(f => ({ ...f, nombre: '', foto: '', cantidad: 1, clasificacion: '', estado: '', accionManual: '', fechaCompromiso: '' })) }}
            style={btnPrimary}>+ Registrar Elemento</button>
        </div>
      </div>

      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
        Registre todos los elementos, equipos y herramientas de cada área. Clasifique cada uno para determinar la acción recomendada.
      </p>

      {/* Form modal */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>{editId ? 'Editar' : 'Nuevo'} Elemento</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Área *</label>
                  <select style={inputStyle} value={form.areaId} onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))} required>
                    <option value="">Seleccionar área</option>
                    {areas.map(a => <option key={a.AreaId} value={a.AreaId}>{a.Terminal} — {a.Area}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Nombre del equipo / herramienta *</label>
                    <input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Caja de herramientas, Compresor..." required />
                  </div>
                  <div>
                    <label style={labelStyle}>Cantidad</label>
                    <input type="number" min="1" style={{ ...inputStyle, width: 80 }} value={form.cantidad}
                      onChange={e => setForm(f => ({ ...f, cantidad: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>

                {/* Foto */}
                <div>
                  <label style={labelStyle}>Foto</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {form.foto && <img src={form.foto} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />}
                    <button type="button" onClick={() => fileRef.current?.click()}
                      style={{ ...btnSmall, background: '#f1f5f9' }} disabled={uploading}>
                      {uploading ? 'Subiendo...' : form.foto ? 'Cambiar foto' : '📷 Tomar / Subir foto'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFoto} />
                  </div>
                </div>

                {/* Clasificación */}
                <div>
                  <label style={labelStyle}>Clasificación *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {CLASIFICACIONES.map(c => (
                      <button key={c.value} type="button"
                        onClick={() => setForm(f => ({ ...f, clasificacion: c.value, estado: c.value === 'necesario' ? f.estado : '', accionManual: '', fechaCompromiso: '' }))}
                        style={{
                          flex: 1, padding: '10px 8px', borderRadius: 8, border: `2px solid ${form.clasificacion === c.value ? c.color : '#e2e8f0'}`,
                          background: form.clasificacion === c.value ? c.bg : '#fff', color: c.color,
                          fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'all .15s'
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estado (solo si necesario) */}
                {form.clasificacion === 'necesario' && (
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select style={inputStyle} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} required>
                    <option value="">Seleccionar</option>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                )}

                {/* Acción recomendada (informativa) */}
                {accion && (
                  <div style={{ background: ACCIONES_MAP[accion]?.bg || '#f1f5f9', border: `1px solid ${ACCIONES_MAP[accion]?.color || '#94a3b8'}20`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 600, color: ACCIONES_MAP[accion]?.color, marginBottom: 4, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <SvgIcon d={ACCIONES_MAP[accion]?.icon} color={ACCIONES_MAP[accion]?.color} size={14} />
                      Recomendación: {ACCIONES_MAP[accion]?.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{instruccion}</div>
                  </div>
                )}

                {/* Acción del Champion (obligatoria) */}
                {canRecommend && (
                  <div>
                    <label style={labelStyle}>Acción del Champion *</label>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Seleccione a dónde destinar este elemento:</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { key: 'eliminar', label: 'Eliminar', color: '#16a34a', bg: '#dcfce7', icon: ICON_PATHS.eliminar },
                        { key: 'reparar', label: 'Reparar', color: '#d97706', bg: '#fef3c7', icon: ICON_PATHS.reparar },
                        { key: 'red_tag', label: 'Red Tag', color: '#dc2626', bg: '#fee2e2', icon: ICON_PATHS.red_tag },
                      ].map(opt => (
                        <button key={opt.key} type="button"
                          onClick={() => setForm(f => ({ ...f, accionManual: opt.key, fechaCompromiso: opt.key !== 'red_tag' ? '' : f.fechaCompromiso }))}
                          style={{
                            flex: 1, padding: '12px 8px', borderRadius: 8,
                            border: `2px solid ${form.accionManual === opt.key ? opt.color : '#e2e8f0'}`,
                            background: form.accionManual === opt.key ? opt.bg : '#fff',
                            color: opt.color, fontWeight: 600, cursor: 'pointer', fontSize: 13,
                            transition: 'all .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          }}>
                          <SvgIcon d={opt.icon} color={opt.color} size={20} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fecha compromiso para Red Tag */}
                {form.accionManual === 'red_tag' && (
                  <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, padding: 12 }}>
                    <label style={{ ...labelStyle, color: '#1d4ed8' }}>Fecha Compromiso *</label>
                    <div style={{ fontSize: 12, color: '#3b82f6', marginBottom: 8 }}>Se generarán recordatorios conforme se acerque esta fecha.</div>
                    <input type="date" style={{ ...inputStyle, borderColor: '#93c5fd' }} value={form.fechaCompromiso}
                      onChange={e => setForm(f => ({ ...f, fechaCompromiso: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      required />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} style={{ ...btnSmall, background: '#f1f5f9' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={btnPrimary}>
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <p>Cargando...</p> : (
        <>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{filtered.length} elementos registrados</div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              No hay elementos registrados. Presione "+ Registrar Elemento" para comenzar.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Foto</th>
                    <th style={thStyle}>Elemento</th>
                    <th style={thStyle}>Área</th>
                    <th style={thStyle}>Cant.</th>
                    <th style={thStyle}>Clasificación</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Acción</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(el => {
                    const acc = ACCIONES_MAP[el.AccionManual || el.AccionRecomendada] || {}
                    const clas = CLASIFICACIONES.find(c => c.value === el.Clasificacion) || {}
                    const est = ESTADOS.find(e => e.value === el.Estado) || {}
                    return (
                      <tr key={el.ElementoId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle}>
                          {el.Foto ? <img src={el.Foto} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }} onClick={() => setDetalleElemento(el)} /> : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500, cursor: 'pointer', color: '#2563eb' }} onClick={() => setDetalleElemento(el)}>{el.Nombre}</td>
                        <td style={tdStyle}><span style={{ fontSize: 12, color: '#6b7280' }}>{el.Terminal}</span><br />{el.Area}</td>
                        <td style={tdStyle}>{el.Cantidad}</td>
                        <td style={tdStyle}>
                          <span style={{ background: clas.bg, color: clas.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{clas.label}</span>
                        </td>
                        <td style={tdStyle}><span style={{ color: est.color, fontWeight: 500, fontSize: 13 }}>{est.label}</span></td>
                        <td style={tdStyle}>
                          <span style={{ background: acc.bg, color: acc.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <SvgIcon d={acc.icon} color={acc.color} size={14} /> {acc.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => startEdit(el)} style={{ ...btnSmall, background: '#f1f5f9', fontSize: 12, display: 'inline-flex', alignItems: 'center' }} title="Editar">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(el.ElementoId)} style={{ ...btnSmall, background: '#fee2e2', color: '#dc2626', fontSize: 12, display: 'inline-flex', alignItems: 'center' }} title="Eliminar">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumen rápido */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              {['eliminar', 'reparar', 'red_tag', 'mantener'].map(tipo => {
                const count = filtered.filter(e => (e.AccionManual || e.AccionRecomendada) === tipo).length
                if (!count) return null
                const m = ACCIONES_MAP[tipo]
                return (
                  <div key={tipo} style={{ background: m.bg, color: m.color, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <SvgIcon d={m.icon} color={m.color} size={14} /> {m.label}: {count}
                  </div>
                )
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button onClick={onDone} style={{ ...btnPrimary, background: '#16a34a' }}>
                Continuar a Acciones del Champion →
              </button>
            </div>
          )}
        </>
      )}
      <DetalleElementoModal elemento={detalleElemento} areas={areas} onClose={() => setDetalleElemento(null)} />
    </div>
  )
}

// ─── Vista Acciones del Champion ────────────────────────────────────────────
function AccionesChampion({ proyectoId, areas, onBack }) {
  const [tab, setTab] = useState('eliminar')
  const [acciones, setAcciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [areaFiltro, setAreaFiltro] = useState('')
  const [terminalFiltro, setTerminalFiltro] = useState('')
  const [championFiltro, setChampionFiltro] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const loadAcciones = async () => {
    setLoading(true)
    try {
      const [data, dash] = await Promise.all([
        getCincoSAcciones({ proyectoId, tipo: tab }),
        getCincoSDashboard(proyectoId)
      ])
      setAcciones(data)
      setDashboard(dash)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadAcciones() }, [proyectoId, tab])

  const handleStatusChange = async (accionId, estatus, extra = {}) => {
    try {
      await updateCincoSAccion(accionId, { estatus, ...extra })
      loadAcciones()
    } catch (e) { alert(e.message) }
  }

  const filtered = acciones.filter(a => {
    if (areaFiltro && String(a.AreaId) !== areaFiltro) return false
    if (terminalFiltro && a.Terminal !== terminalFiltro) return false
    if (championFiltro && a.Champion !== championFiltro) return false
    return true
  })
  const pendientes = filtered.filter(a => a.Estatus !== 'completado')
  const completados = filtered.filter(a => a.Estatus === 'completado')
  const pctTab = acciones.length ? Math.round(completados.length / acciones.length * 100) : 0

  const r = dashboard?.resumen || {}
  const tabCounts = {
    eliminar: r.totalEliminar || 0,
    reparar: r.totalReparar || 0,
    red_tag: r.totalRedTag || 0,
  }

  const tabs = [
    { key: 'eliminar', label: 'Eliminar', icon: ICON_PATHS.eliminar, color: '#16a34a' },
    { key: 'reparar', label: 'Reparar', icon: ICON_PATHS.reparar, color: '#d97706' },
    { key: 'red_tag', label: 'Red Tags', icon: ICON_PATHS.red_tag, color: '#dc2626' },
  ]

  // Dashboard KPIs
  const totalAcciones = (r.totalEliminar || 0) + (r.totalReparar || 0) + (r.totalRedTag || 0)
  const totalCompletados = (r.completadosEliminar || 0) + (r.completadosReparar || 0) + (r.completadosRedTag || 0)
  const pctGeneral = totalAcciones ? Math.round(totalCompletados / totalAcciones * 100) : 0

  // Unique terminals and champions for filters
  const terminales = [...new Set((dashboard?.porArea || []).map(a => a.Terminal))].filter(Boolean)
  const champions = [...new Set((dashboard?.porArea || []).map(a => a.Champion))].filter(Boolean)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={{ ...btnSmall, background: '#f1f5f9' }}>← Atrás</button>
        <h3 style={{ margin: 0, fontSize: 16 }}>1S — Ejecución de Acciones</h3>
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <KPICard label="Elementos por eliminar" total={r.totalEliminar} done={r.completadosEliminar} color="#16a34a" />
          <KPICard label="Elementos por reparar" total={r.totalReparar} done={r.completadosReparar} color="#d97706" />
          <KPICard label="Red Tags atendidas" total={r.totalRedTag} done={r.completadosRedTag} color="#dc2626" />
          <KPICard label="Avance general 1S" total={totalAcciones} done={totalCompletados} color="#16a34a" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400, fontSize: 14,
              color: tab === t.key ? t.color : '#6b7280',
              borderBottom: tab === t.key ? `3px solid ${t.color}` : '3px solid transparent',
              marginBottom: -2,
            }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <SvgIcon d={t.icon} color={tab === t.key ? t.color : '#6b7280'} size={16} />
              {t.label} ({dashboard ? tabCounts[t.key] : '...'})
            </span>
          </button>
        ))}
      </div>

      {/* Filtros + progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <select style={{ ...inputStyle, maxWidth: 200 }} value={terminalFiltro} onChange={e => { setTerminalFiltro(e.target.value); setAreaFiltro('') }}>
            <option value="">Todas las terminales</option>
            {terminales.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={{ ...inputStyle, maxWidth: 200 }} value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.filter(a => !terminalFiltro || a.Terminal === terminalFiltro).map(a => <option key={a.AreaId} value={a.AreaId}>{a.Terminal} — {a.Area}</option>)}
          </select>
          <select style={{ ...inputStyle, maxWidth: 200 }} value={championFiltro} onChange={e => setChampionFiltro(e.target.value)}>
            <option value="">Todos los Champions</option>
            {champions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 120, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pctTab}%`, height: '100%', background: tabs.find(t => t.key === tab)?.color, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{pctTab}%</span>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <>
          {/* Pendientes */}
          {pendientes.length === 0 && completados.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              No hay acciones de tipo "{tabs.find(t => t.key === tab)?.label}" registradas.
            </div>
          )}
          {pendientes.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Pendientes ({pendientes.length})</div>
              {pendientes.map(a => (
                <AccionCard key={a.AccionId} accion={a} onStatusChange={handleStatusChange} onFotoClick={setLightboxSrc} />
              ))}
            </>
          )}
          {/* Completados */}
          {completados.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginTop: 16, marginBottom: 8 }}>
                Completados ({completados.length})
              </div>
              {completados.map(a => (
                <AccionCard key={a.AccionId} accion={a} onStatusChange={handleStatusChange} onFotoClick={setLightboxSrc} />
              ))}
            </>
          )}

          {/* Avance por área */}
          {dashboard?.porArea?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Avance por Área</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Área</th>
                      <th style={thStyle}>Champion</th>
                      <th style={thStyle}>Eliminar</th>
                      <th style={thStyle}>Reparar</th>
                      <th style={thStyle}>Red Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.porArea
                      .filter(a => !terminalFiltro || a.Terminal === terminalFiltro)
                      .filter(a => !championFiltro || a.Champion === championFiltro)
                      .map(a => (
                      <tr key={a.AreaId}>
                        <td style={tdStyle}><span style={{ fontSize: 11, color: '#9ca3af' }}>{a.Terminal}</span><br /><strong>{a.Area}</strong></td>
                        <td style={tdStyle}><span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 500 }}>{a.Champion || '—'}</span></td>
                        <td style={tdStyle}><ProgressMini done={a.eliminarOk} total={a.eliminar} color="#16a34a" /></td>
                        <td style={tdStyle}><ProgressMini done={a.repararOk} total={a.reparar} color="#d97706" /></td>
                        <td style={tdStyle}><ProgressMini done={a.redTagOk} total={a.redTag} color="#dc2626" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      <FotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}

function FotoLightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div onClick={onClose} style={overlayStyle}>
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <img src={src} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: -12, right: -12, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#1e293b', color: '#f1f5f9', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    </div>
  )
}

function DetalleElementoModal({ elemento: el, areas, onClose }) {
  const [lightboxSrc, setLightboxSrc] = useState(null)
  if (!el) return null
  const acc = ACCIONES_MAP[el.AccionManual || el.AccionRecomendada] || {}
  const clas = CLASIFICACIONES.find(c => c.value === el.Clasificacion) || {}
  const est = ESTADOS.find(e => e.value === el.Estado) || {}
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        {el.Foto && (
          <img src={el.Foto} alt="" onClick={() => setLightboxSrc(el.Foto)}
            style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '12px 12px 0 0', marginTop: -24, marginLeft: -24, marginRight: -24, width: 'calc(100% + 48px)', cursor: 'pointer' }} />
        )}
        <h3 style={{ margin: el.Foto ? '16px 0 4px' : '0 0 4px', fontSize: 20 }}>{el.Nombre}</h3>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{el.Terminal} — {el.Area}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>CLASIFICACIÓN</div>
            <span style={{ background: clas.bg, color: clas.color, padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>{clas.label}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>CANTIDAD</div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{el.Cantidad}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>ESTADO</div>
            <span style={{ color: est.color, fontWeight: 500, fontSize: 14 }}>{est.label}</span>
          </div>
        </div>

        {acc.label && (
          <div style={{ background: acc.bg, border: `1px solid ${acc.color}20`, borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SvgIcon d={acc.icon} color={acc.color} size={18} />
            <span style={{ fontWeight: 600, color: acc.color, fontSize: 14 }}>Acción: {acc.label}</span>
          </div>
        )}

        {el.FechaCompromiso && (
          <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, padding: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>Fecha compromiso: {new Date(el.FechaCompromiso).toLocaleDateString('es-MX')}</span>
          </div>
        )}

        {el.FechaRegistro && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Registrado: {new Date(el.FechaRegistro).toLocaleDateString('es-MX')}</div>
        )}

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button onClick={onClose} style={{ ...btnSmall, background: '#f1f5f9' }}>Cerrar</button>
        </div>
        <FotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      </div>
    </div>
  )
}

function AccionCard({ accion: a, onStatusChange, onFotoClick }) {
  const isCompleted = a.Estatus === 'completado'
  const isRedTag = a.Tipo === 'red_tag'
  const [accionRealizada, setAccionRealizada] = useState(a.AccionRealizada || '')
  const [saving, setSaving] = useState(false)
  const needsAccion = isRedTag && !isCompleted && !accionRealizada.trim()

  const handleCheck = async () => {
    if (isCompleted) {
      onStatusChange(a.AccionId, 'pendiente')
      return
    }
    if (isRedTag && !accionRealizada.trim()) {
      alert('Debe indicar la acción realizada antes de completar un Red Tag')
      return
    }
    const extra = isRedTag ? { accionRealizada: accionRealizada.trim() } : {}
    onStatusChange(a.AccionId, 'completado', extra)
  }

  const handleSaveAccion = async () => {
    if (!accionRealizada.trim()) return
    setSaving(true)
    try {
      await updateCincoSAccion(a.AccionId, { estatus: a.Estatus, accionRealizada: accionRealizada.trim() })
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12,
      background: isCompleted ? '#f0fdf4' : '#fff', border: '1px solid #e2e8f0',
      borderRadius: 8, marginBottom: 8, opacity: isCompleted ? 0.7 : 1,
    }}>
      <button
        onClick={handleCheck}
        title={needsAccion ? 'Escriba la acción realizada primero' : ''}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isCompleted ? '#16a34a' : needsAccion ? '#fca5a5' : '#cbd5e1'}`,
          background: isCompleted ? '#16a34a' : '#fff', cursor: needsAccion ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, flexShrink: 0, marginTop: 2,
        }}>
        {isCompleted && '✓'}
      </button>
      {a.Foto && <img src={a.Foto} alt="" onClick={() => onFotoClick?.(a.Foto)} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0, cursor: 'pointer' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, textDecoration: isCompleted ? 'line-through' : 'none' }}>{a.Descripcion || a.Elemento}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{a.Terminal} — {a.Area} · Cant: {a.Cantidad}</div>
        {isRedTag && !isCompleted && (
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: 4 }}>Accion realizada *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={accionRealizada}
                onChange={e => setAccionRealizada(e.target.value)}
                placeholder="Describa que se hizo con este Red Tag..."
                style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1px solid #fca5a5', borderRadius: 6, background: '#fff7f7' }}
              />
              {accionRealizada.trim() && !a.AccionRealizada && (
                <button onClick={handleSaveAccion} disabled={saving} style={{
                  padding: '6px 12px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
                }}>
                  {saving ? '...' : 'Guardar'}
                </button>
              )}
            </div>
          </div>
        )}
        {isRedTag && isCompleted && a.AccionRealizada && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#16a34a', fontStyle: 'italic' }}>Accion realizada: {a.AccionRealizada}</div>
        )}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
        background: a.Estatus === 'completado' ? '#dcfce7' : a.Estatus === 'en_proceso' ? '#fef3c7' : '#f1f5f9',
        color: a.Estatus === 'completado' ? '#16a34a' : a.Estatus === 'en_proceso' ? '#d97706' : '#6b7280',
      }}>
        {a.Estatus === 'completado' ? 'Completado' : a.Estatus === 'en_proceso' ? 'En proceso' : 'Pendiente'}
      </span>
    </div>
  )
}

function KPICard({ label, total, done, color }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{pct}%</div>
      <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{done || 0} de {total || 0} · {(total || 0) - (done || 0)} pendientes</div>
    </div>
  )
}

function ProgressMini({ done, total, color }) {
  if (!total) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
  const pct = Math.round((done / total) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{done}/{total}</span>
    </div>
  )
}

// ─── Notificaciones Bell ────────────────────────────────────────────────────
function NotificacionesBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadNotifs = async () => {
    try {
      const data = await getCincoSNotificaciones()
      setNotifs(data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    loadNotifs()
    const interval = setInterval(loadNotifs, 60000)
    return () => clearInterval(interval)
  }, [])

  const unread = notifs.filter(n => !n.Leida).length

  const handleMarkRead = async (id) => {
    try {
      await marcarNotificacionLeida(id)
      setNotifs(prev => prev.map(n => n.NotificacionId === id ? { ...n, Leida: true } : n))
    } catch (e) { console.error(e) }
  }

  const handleMarkAllRead = async () => {
    setLoading(true)
    try {
      await marcarTodasNotificacionesLeidas()
      setNotifs(prev => prev.map(n => ({ ...n, Leida: true })))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'relative',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
            background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 340, maxHeight: 400, overflowY: 'auto',
          background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,.15)',
          border: '1px solid #e2e8f0', zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} disabled={loading}
                style={{ ...btnSmall, fontSize: 11, color: '#2563eb', background: '#dbeafe' }}>
                Marcar todas leídas
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin notificaciones</div>
          ) : notifs.map(n => (
            <div key={n.NotificacionId}
              onClick={() => !n.Leida && handleMarkRead(n.NotificacionId)}
              style={{
                padding: '10px 16px', borderBottom: '1px solid #f8fafc', cursor: n.Leida ? 'default' : 'pointer',
                background: n.Leida ? '#fff' : '#eff6ff',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: n.Leida ? 400 : 600, fontSize: 13, color: '#1e293b' }}>{n.Titulo}</div>
                {n.UsuarioNombre && <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>{n.UsuarioNombre}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{n.Mensaje}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{new Date(n.FechaCreacion).toLocaleString('es-MX')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CincoS({ usuario }) {
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [proyectoActivo, setProyectoActivo] = useState(null)
  const [areas, setAreas] = useState([])
  const [vista, setVista] = useState('inicio') // inicio | setup | edit | registro | acciones

  const loadProyectos = async () => {
    setLoading(true)
    try {
      const data = await getCincoSProyectos()
      setProyectos(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadProyectos() }, [])

  const selectProyecto = async (id) => {
    try {
      const [proy, areasData] = await Promise.all([
        getCincoSProyecto(id),
        getCincoSAreas(id),
      ])
      setProyectoActivo(proy)
      setAreas(areasData)
      setVista('menu')
    } catch (e) { alert(e.message) }
  }

  const handleCreated = async (id) => {
    await selectProyecto(id)
  }

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>

  // Vista: Setup (crear)
  if (vista === 'setup') {
    return (
      <div>
        <button onClick={() => setVista('inicio')} style={{ ...btnSmall, background: '#f1f5f9', marginBottom: 16 }}>← Atrás</button>
        <SetupProyecto onCreated={handleCreated} />
      </div>
    )
  }

  // Vista: Edit (editar proyecto existente)
  if (vista === 'edit' && proyectoActivo) {
    return (
      <div>
        <button onClick={() => setVista('menu')} style={{ ...btnSmall, background: '#f1f5f9', marginBottom: 16 }}>← Atrás</button>
        <SetupProyecto editProyectoId={proyectoActivo.ProyectoId} onCreated={handleCreated} />
      </div>
    )
  }

  // Vista: Registro de elementos
  if (vista === 'registro' && proyectoActivo) {
    return (
      <RegistroElementos
        proyectoId={proyectoActivo.ProyectoId}
        areas={areas}
        onBack={() => setVista('menu')}
        onDone={() => setVista('acciones')}
      />
    )
  }

  // Vista: Acciones del Champion
  if (vista === 'acciones' && proyectoActivo) {
    return (
      <AccionesChampion
        proyectoId={proyectoActivo.ProyectoId}
        areas={areas}
        onBack={() => setVista('menu')}
      />
    )
  }

  // Vista: Menú del proyecto
  if (vista === 'menu' && proyectoActivo) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <button onClick={() => { setProyectoActivo(null); setVista('inicio') }}
            style={{ ...btnSmall, background: '#f1f5f9' }}>← Proyectos</button>
          <button onClick={() => setVista('edit')}
            style={{ ...btnSmall, background: '#dbeafe', color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Proyecto
          </button>
          <div style={{ marginLeft: 'auto' }}><NotificacionesBell /></div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Proyecto 5S — {proyectoActivo.Empresa}</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
            Gerente: {proyectoActivo.Gerente || '—'} · Encargado: {proyectoActivo.Encargado || '—'}
            {' · '}{areas.length} área{areas.length !== 1 ? 's' : ''} configurada{areas.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div
            onClick={() => setVista('registro')}
            style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', borderRadius: 12, padding: 28, cursor: 'pointer',
              color: '#fff', transition: 'transform .15s', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ marginBottom: 8 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12l2 2 4-4"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Implementar 1S</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Inventario, clasificación y ejecución de acciones</div>
          </div>

          <div
            onClick={() => setVista('acciones')}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: 12, padding: 28, cursor: 'pointer',
              color: '#fff', transition: 'transform .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ marginBottom: 8 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="17" x2="8" y2="11"/><line x1="12" y1="17" x2="12" y2="7"/><line x1="16" y1="17" x2="16" y2="13"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Seguimiento / Dashboard</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Progreso del Champion y tablero de indicadores</div>
          </div>
        </div>

        {/* Áreas del proyecto */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Áreas configuradas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {areas.map(a => (
              <div key={a.AreaId} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.Area}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{a.Terminal}</div>
                {a.Champion && <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>Champion: {a.Champion}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Vista: Lista de proyectos (inicio)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Programa 5S en Talleres</h2>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Seleccione un proyecto existente o cree uno nuevo</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <NotificacionesBell />
          <button onClick={() => setVista('setup')} style={btnPrimary}>+ Nuevo Proyecto</button>
        </div>
      </div>

      {proyectos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No hay proyectos 5S configurados</div>
          <div style={{ fontSize: 13 }}>Presione "Nuevo Proyecto" para comenzar</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {proyectos.map(p => (
            <div key={p.ProyectoId} onClick={() => selectProyecto(p.ProyectoId)}
              style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, cursor: 'pointer',
                transition: 'box-shadow .15s, transform .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.Empresa}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                {p.Gerente && <>Gerente: {p.Gerente}<br /></>}
                {p.Encargado && <>Encargado: {p.Encargado}</>}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                Creado: {new Date(p.FechaCreacion).toLocaleDateString('es-MX')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }
const btnSmall = { padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500 }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thStyle = { padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }
const tdStyle = { padding: '8px 10px', verticalAlign: 'middle' }
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }
const modalStyle = { background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }
