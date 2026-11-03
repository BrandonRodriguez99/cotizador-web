import { useState, useEffect, useRef } from 'react'
import {
  getCincoSProyectos, getCincoSProyecto, createCincoSProyecto,
  getCincoSAreas, getCincoSElementos, createCincoSElemento, updateCincoSElemento, deleteCincoSElemento,
  getCincoSAcciones, updateCincoSAccion, getCincoSDashboard, uploadFoto5S
} from './api'

const CLASIFICACIONES = [
  { value: 'necesario', label: 'Necesario', color: '#16a34a', bg: '#dcfce7' },
  { value: 'innecesario', label: 'Innecesario', color: '#dc2626', bg: '#fee2e2' },
  { value: 'dudoso', label: 'Dudoso', color: '#d97706', bg: '#fef3c7' },
]
const FRECUENCIAS = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'ocasional', label: 'Ocasional' },
]
const ESTADOS = [
  { value: 'funciona', label: 'Funciona', color: '#16a34a' },
  { value: 'no_funciona', label: 'No funciona', color: '#dc2626' },
  { value: 'necesita_reparacion', label: 'Necesita reparación', color: '#d97706' },
  { value: 'evaluar', label: 'Evaluar', color: '#6366f1' },
]

const ACCIONES_MAP = {
  eliminar: { label: 'Eliminar', icon: '🗑️', color: '#dc2626', bg: '#fee2e2' },
  reparar: { label: 'Reparar', icon: '🔧', color: '#d97706', bg: '#fef3c7' },
  red_tag: { label: 'Red Tag', icon: '🏷️', color: '#2563eb', bg: '#dbeafe' },
  reubicar: { label: 'Reubicar', icon: '📦', color: '#7c3aed', bg: '#ede9fe' },
  mantener: { label: 'Mantener', icon: '✅', color: '#16a34a', bg: '#dcfce7' },
}

function calcularAccionRecomendada(clasificacion, frecuencia, estado) {
  if (clasificacion === 'innecesario') return 'eliminar'
  if (clasificacion === 'dudoso') return 'red_tag'
  if (estado === 'no_funciona') return 'eliminar'
  if (estado === 'necesita_reparacion') return 'reparar'
  if (estado === 'evaluar') return 'red_tag'
  if (frecuencia === 'ocasional') return 'reubicar'
  return 'mantener'
}

function getInstruccion(clasificacion, frecuencia, estado) {
  const accion = calcularAccionRecomendada(clasificacion, frecuencia, estado)
  const instrucciones = {
    eliminar: 'Este elemento debe ser eliminado del área. No es necesario o no funciona.',
    reparar: 'Este elemento necesita reparación antes de poder seguir en uso.',
    red_tag: 'Este elemento requiere evaluación. Se le asignará una etiqueta roja para revisión.',
    reubicar: 'Este elemento es necesario pero de uso ocasional. Considere reubicarlo a un almacén o zona secundaria.',
    mantener: 'Este elemento está en buen estado y se usa frecuentemente. Mantener en su lugar.',
  }
  return instrucciones[accion]
}

// ─── Setup Component ────────────────────────────────────────────────────────
function SetupProyecto({ onCreated }) {
  const [empresa, setEmpresa] = useState('')
  const [gerente, setGerente] = useState('')
  const [encargado, setEncargado] = useState('')
  const [terminales, setTerminales] = useState([{ nombre: '', areas: [{ nombre: '', champion: '' }] }])
  const [saving, setSaving] = useState(false)

  const addTerminal = () => setTerminales([...terminales, { nombre: '', areas: [{ nombre: '', champion: '' }] }])
  const addArea = (ti) => {
    const t = [...terminales]
    t[ti].areas.push({ nombre: '', champion: '' })
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
      const r = await createCincoSProyecto({ empresa, gerente, encargado, terminales })
      onCreated(r.ProyectoId)
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Datos Generales del Proyecto 5S</h2>
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
              <input style={inputStyle} value={a.champion} placeholder="Champion (opcional)"
                onChange={e => { const ts = [...terminales]; ts[ti].areas[ai].champion = e.target.value; setTerminales(ts) }} />
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
          {saving ? 'Guardando...' : 'Crear Proyecto 5S'}
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
  const [form, setForm] = useState({ nombre: '', foto: '', cantidad: 1, clasificacion: '', frecuenciaUso: '', estado: '', areaId: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
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
    if (!form.areaId || !form.nombre || !form.clasificacion || !form.frecuenciaUso || !form.estado) {
      return alert('Complete todos los campos requeridos')
    }
    setSaving(true)
    try {
      if (editId) {
        await updateCincoSElemento(editId, form)
      } else {
        await createCincoSElemento(form)
      }
      setShowForm(false)
      setForm({ nombre: '', foto: '', cantidad: 1, clasificacion: '', frecuenciaUso: '', estado: '', areaId: form.areaId })
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
      clasificacion: el.Clasificacion, frecuenciaUso: el.FrecuenciaUso,
      estado: el.Estado, areaId: el.AreaId
    })
    setEditId(el.ElementoId)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try { await deleteCincoSElemento(id); loadElementos() } catch (e) { alert(e.message) }
  }

  const filtered = areaFiltro ? elementos.filter(e => String(e.AreaId) === areaFiltro) : elementos
  const accion = form.clasificacion && form.frecuenciaUso && form.estado
    ? calcularAccionRecomendada(form.clasificacion, form.frecuenciaUso, form.estado) : null
  const instruccion = form.clasificacion && form.frecuenciaUso && form.estado
    ? getInstruccion(form.clasificacion, form.frecuenciaUso, form.estado) : null

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
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(f => ({ ...f, nombre: '', foto: '', cantidad: 1, clasificacion: '', frecuenciaUso: '', estado: '' })) }}
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
                        onClick={() => setForm(f => ({ ...f, clasificacion: c.value }))}
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

                {/* Frecuencia */}
                <div>
                  <label style={labelStyle}>Frecuencia de uso *</label>
                  <select style={inputStyle} value={form.frecuenciaUso} onChange={e => setForm(f => ({ ...f, frecuenciaUso: e.target.value }))} required>
                    <option value="">Seleccionar</option>
                    {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select style={inputStyle} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} required>
                    <option value="">Seleccionar</option>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>

                {/* Acción recomendada */}
                {accion && (
                  <div style={{ background: ACCIONES_MAP[accion]?.bg || '#f1f5f9', border: `1px solid ${ACCIONES_MAP[accion]?.color || '#94a3b8'}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 600, color: ACCIONES_MAP[accion]?.color, marginBottom: 4, fontSize: 14 }}>
                      {ACCIONES_MAP[accion]?.icon} Acción recomendada: {ACCIONES_MAP[accion]?.label}
                    </div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{instruccion}</div>
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
                    <th style={thStyle}>Frecuencia</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Acción</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(el => {
                    const acc = ACCIONES_MAP[el.AccionRecomendada] || {}
                    const clas = CLASIFICACIONES.find(c => c.value === el.Clasificacion) || {}
                    const est = ESTADOS.find(e => e.value === el.Estado) || {}
                    return (
                      <tr key={el.ElementoId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle}>
                          {el.Foto ? <img src={el.Foto} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{el.Nombre}</td>
                        <td style={tdStyle}><span style={{ fontSize: 12, color: '#6b7280' }}>{el.Terminal}</span><br />{el.Area}</td>
                        <td style={tdStyle}>{el.Cantidad}</td>
                        <td style={tdStyle}>
                          <span style={{ background: clas.bg, color: clas.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{clas.label}</span>
                        </td>
                        <td style={tdStyle}>{FRECUENCIAS.find(f => f.value === el.FrecuenciaUso)?.label}</td>
                        <td style={tdStyle}><span style={{ color: est.color, fontWeight: 500, fontSize: 13 }}>{est.label}</span></td>
                        <td style={tdStyle}>
                          <span style={{ background: acc.bg, color: acc.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {acc.icon} {acc.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => startEdit(el)} style={{ ...btnSmall, background: '#f1f5f9', fontSize: 12 }}>✏️</button>
                            <button onClick={() => handleDelete(el.ElementoId)} style={{ ...btnSmall, background: '#fee2e2', color: '#dc2626', fontSize: 12 }}>🗑️</button>
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
              {['eliminar', 'reparar', 'red_tag', 'reubicar', 'mantener'].map(tipo => {
                const count = filtered.filter(e => e.AccionRecomendada === tipo).length
                if (!count) return null
                const m = ACCIONES_MAP[tipo]
                return (
                  <div key={tipo} style={{ background: m.bg, color: m.color, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    {m.icon} {m.label}: {count}
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
    </div>
  )
}

// ─── Vista Acciones del Champion ────────────────────────────────────────────
function AccionesChampion({ proyectoId, areas, onBack }) {
  const [tab, setTab] = useState('eliminar')
  const [acciones, setAcciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [areaFiltro, setAreaFiltro] = useState('')
  const [dashboard, setDashboard] = useState(null)

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

  const handleStatusChange = async (accionId, estatus) => {
    try {
      await updateCincoSAccion(accionId, { estatus })
      loadAcciones()
    } catch (e) { alert(e.message) }
  }

  const filtered = areaFiltro ? acciones.filter(a => String(a.AreaId) === areaFiltro) : acciones
  const pendientes = filtered.filter(a => a.Estatus !== 'completado')
  const completados = filtered.filter(a => a.Estatus === 'completado')
  const pctTab = acciones.length ? Math.round(completados.length / acciones.length * 100) : 0

  const tabs = [
    { key: 'eliminar', label: 'Eliminar', icon: '🗑️', color: '#dc2626' },
    { key: 'reparar', label: 'Reparar', icon: '🔧', color: '#d97706' },
    { key: 'red_tag', label: 'Red Tags', icon: '🏷️', color: '#2563eb' },
  ]

  // Dashboard KPIs
  const r = dashboard?.resumen || {}
  const totalAcciones = (r.totalEliminar || 0) + (r.totalReparar || 0) + (r.totalRedTag || 0)
  const totalCompletados = (r.completadosEliminar || 0) + (r.completadosReparar || 0) + (r.completadosRedTag || 0)
  const pctGeneral = totalAcciones ? Math.round(totalCompletados / totalAcciones * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={{ ...btnSmall, background: '#f1f5f9' }}>← Atrás</button>
        <h3 style={{ margin: 0, fontSize: 16 }}>1S — Ejecución de Acciones</h3>
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <KPICard label="Elementos por eliminar" total={r.totalEliminar} done={r.completadosEliminar} color="#dc2626" />
          <KPICard label="Elementos por reparar" total={r.totalReparar} done={r.completadosReparar} color="#d97706" />
          <KPICard label="Red Tags atendidas" total={r.totalRedTag} done={r.completadosRedTag} color="#2563eb" />
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
            {t.icon} {t.label} ({acciones.length > 0 || tab === t.key ? filtered.length : '...'})
          </button>
        ))}
      </div>

      {/* Filtro área + progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <select style={inputStyle} value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.AreaId} value={a.AreaId}>{a.Terminal} — {a.Area}</option>)}
        </select>
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
                <AccionCard key={a.AccionId} accion={a} onStatusChange={handleStatusChange} />
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
                <AccionCard key={a.AccionId} accion={a} onStatusChange={handleStatusChange} />
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
                      <th style={thStyle}>Eliminar</th>
                      <th style={thStyle}>Reparar</th>
                      <th style={thStyle}>Red Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.porArea.map(a => (
                      <tr key={a.AreaId}>
                        <td style={tdStyle}><span style={{ fontSize: 11, color: '#9ca3af' }}>{a.Terminal}</span><br /><strong>{a.Area}</strong></td>
                        <td style={tdStyle}><ProgressMini done={a.eliminarOk} total={a.eliminar} color="#dc2626" /></td>
                        <td style={tdStyle}><ProgressMini done={a.repararOk} total={a.reparar} color="#d97706" /></td>
                        <td style={tdStyle}><ProgressMini done={a.redTagOk} total={a.redTag} color="#2563eb" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AccionCard({ accion: a, onStatusChange }) {
  const isCompleted = a.Estatus === 'completado'
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center', padding: 12,
      background: isCompleted ? '#f0fdf4' : '#fff', border: '1px solid #e2e8f0',
      borderRadius: 8, marginBottom: 8, opacity: isCompleted ? 0.7 : 1,
    }}>
      <button
        onClick={() => onStatusChange(a.AccionId, isCompleted ? 'pendiente' : 'completado')}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isCompleted ? '#16a34a' : '#cbd5e1'}`,
          background: isCompleted ? '#16a34a' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, flexShrink: 0,
        }}>
        {isCompleted && '✓'}
      </button>
      {a.Foto && <img src={a.Foto} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, textDecoration: isCompleted ? 'line-through' : 'none' }}>{a.Descripcion || a.Elemento}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{a.Terminal} — {a.Area} · Cant: {a.Cantidad}</div>
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CincoS({ usuario }) {
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [proyectoActivo, setProyectoActivo] = useState(null)
  const [areas, setAreas] = useState([])
  const [vista, setVista] = useState('inicio') // inicio | setup | registro | acciones

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

  // Vista: Setup
  if (vista === 'setup') {
    return (
      <div>
        <button onClick={() => setVista('inicio')} style={{ ...btnSmall, background: '#f1f5f9', marginBottom: 16 }}>← Atrás</button>
        <SetupProyecto onCreated={handleCreated} />
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
        <button onClick={() => { setProyectoActivo(null); setVista('inicio') }}
          style={{ ...btnSmall, background: '#f1f5f9', marginBottom: 16 }}>← Proyectos</button>
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
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Implementar 1S</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Inventario, clasificación y ejecución de acciones</div>
          </div>

          <div
            onClick={() => setVista('acciones')}
            style={{
              background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', borderRadius: 12, padding: 28, cursor: 'pointer',
              color: '#fff', transition: 'transform .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
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
        <button onClick={() => setVista('setup')} style={btnPrimary}>+ Nuevo Proyecto</button>
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
