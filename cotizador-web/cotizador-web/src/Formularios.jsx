import { useEffect, useState, useCallback } from 'react'
import {
  getFormularios, getFormulario, createFormulario, updateFormulario,
  toggleFormularioActivo, deleteFormulario, getFormularioRespuestas,
} from './api'

const TIPOS = [
  { value: 'si_no_na',       label: 'Sí / No / N/A' },
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'casilla',        label: 'Marcar casilla' },
  { value: 'texto',          label: 'Texto' },
  { value: 'numero',         label: 'Número' },
  { value: 'fecha',          label: 'Fecha y hora' },
  { value: 'media',          label: 'Media (foto)' },
  { value: 'firma',          label: 'Firma' },
]

const TIPO_LABEL = Object.fromEntries(TIPOS.map(t => [t.value, t.label]))

function uid() { return Math.random().toString(36).slice(2) }

function emptySeccion() {
  return { _id: uid(), titulo: 'Sección nueva', preguntas: [] }
}

function emptyPregunta() {
  return { _id: uid(), texto: '', tipoRespuesta: 'si_no_na', requerida: false, opciones: [] }
}

// ── Preview Móvil ─────────────────────────────────────────────────────────────
function MobilePreview({ form }) {
  return (
    <div style={{
      width: 320, flexShrink: 0,
      background: '#f1f5f9', borderRadius: 16, padding: '0 0 24px',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      {/* Status bar */}
      <div style={{ background: '#0F172A', padding: '10px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>9:55</span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>▶ ◼ ▐▐ 🔋</span>
      </div>
      {/* App header */}
      <div style={{ background: '#1E293B', padding: '12px 16px' }}>
        <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>FORMULARIO</div>
        <div style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, marginTop: 2 }}>
          {form.nombre || 'Sin nombre'}
        </div>
        {form.descripcion && (
          <div style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>{form.descripcion}</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px', overflowY: 'auto', maxHeight: 520 }}>
        {(!form.secciones || form.secciones.length === 0) && (
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
            Sin secciones aún
          </div>
        )}
        {(form.secciones || []).map((sec, si) => (
          <div key={sec._id || si} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: 1,
              borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 8,
            }}>
              {sec.titulo || `Sección ${si + 1}`}
            </div>
            {(sec.preguntas || []).map((preg, pi) => (
              <div key={preg._id || pi} style={{
                background: '#fff', borderRadius: 8, padding: '10px 12px',
                marginBottom: 8, border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, marginBottom: 6 }}>
                  {preg.texto || 'Pregunta'}
                  {preg.requerida && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                </div>
                <PreviewRespuesta tipo={preg.tipoRespuesta} opciones={preg.opciones} />
              </div>
            ))}
            {(!sec.preguntas || sec.preguntas.length === 0) && (
              <div style={{ color: '#cbd5e1', fontSize: 11, fontStyle: 'italic' }}>Sin preguntas</div>
            )}
          </div>
        ))}
      </div>

      {/* Submit button */}
      <div style={{ padding: '0 14px' }}>
        <div style={{
          background: '#3B82F6', borderRadius: 8, padding: '10px',
          color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center',
        }}>Enviar formulario</div>
      </div>
    </div>
  )
}

function PreviewRespuesta({ tipo, opciones }) {
  const inputStyle = {
    width: '100%', padding: '5px 8px', borderRadius: 6,
    border: '1px solid #cbd5e1', fontSize: 11, color: '#64748b',
    background: '#f8fafc', boxSizing: 'border-box',
  }
  if (tipo === 'si_no_na') {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {['Sí', 'No', 'N/A'].map(l => (
          <div key={l} style={{
            flex: 1, border: '1px solid #cbd5e1', borderRadius: 6,
            padding: '4px 0', textAlign: 'center', fontSize: 10,
            color: '#475569', background: '#f8fafc',
          }}>{l}</div>
        ))}
      </div>
    )
  }
  if (tipo === 'opcion_multiple') {
    const opts = opciones?.length ? opciones : [{ texto: 'Opción 1' }, { texto: 'Opción 2' }]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {opts.map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
            <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #94a3b8', flexShrink: 0 }} />
            {o.texto || `Opción ${i + 1}`}
          </div>
        ))}
      </div>
    )
  }
  if (tipo === 'casilla') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
        <div style={{ width: 13, height: 13, borderRadius: 3, border: '1.5px solid #94a3b8', flexShrink: 0 }} />
        Marcar si aplica
      </div>
    )
  }
  if (tipo === 'texto') return <div style={inputStyle}>Escribe aquí...</div>
  if (tipo === 'numero') return <div style={inputStyle}>0</div>
  if (tipo === 'fecha') return <div style={inputStyle}>dd/mm/aaaa hh:mm</div>
  if (tipo === 'media') {
    return (
      <div style={{
        border: '1.5px dashed #94a3b8', borderRadius: 6, padding: '8px',
        textAlign: 'center', color: '#94a3b8', fontSize: 10,
      }}>📷 Tomar foto</div>
    )
  }
  if (tipo === 'firma') {
    return (
      <div style={{
        border: '1.5px dashed #94a3b8', borderRadius: 6, padding: '8px',
        textAlign: 'center', color: '#94a3b8', fontSize: 10,
      }}>✍️ Firma</div>
    )
  }
  return null
}

// ── Editor de preguntas ───────────────────────────────────────────────────────
function PreguntaEditor({ preg, onChange, onDelete }) {
  function setField(key, val) { onChange({ ...preg, [key]: val }) }

  function addOpcion() {
    onChange({ ...preg, opciones: [...(preg.opciones || []), { _id: uid(), texto: '' }] })
  }
  function setOpcion(i, texto) {
    const opts = [...(preg.opciones || [])]
    opts[i] = { ...opts[i], texto }
    onChange({ ...preg, opciones: opts })
  }
  function removeOpcion(i) {
    const opts = [...(preg.opciones || [])]
    opts.splice(i, 1)
    onChange({ ...preg, opciones: opts })
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={preg.texto}
          onChange={e => setField('texto', e.target.value)}
          placeholder="Escribe la pregunta..."
          rows={2}
          style={{
            flex: 1, border: '1px solid #e2e8f0', borderRadius: 6,
            padding: '6px 10px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
          }}
        />
        <button type="button" onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1, padding: 2 }}
          title="Eliminar pregunta">×</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={preg.tipoRespuesta} onChange={e => setField('tipoRespuesta', e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 12, background: '#f8fafc' }}>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!preg.requerida} onChange={e => setField('requerida', e.target.checked)} />
          Requerida
        </label>
      </div>

      {preg.tipoRespuesta === 'opcion_multiple' && (
        <div style={{ marginTop: 8, paddingLeft: 4 }}>
          {(preg.opciones || []).map((o, i) => (
            <div key={o._id || i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', flexShrink: 0, marginTop: 6 }} />
              <input value={o.texto} onChange={e => setOpcion(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
                style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 8px', fontSize: 12 }} />
              <button type="button" onClick={() => removeOpcion(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={addOpcion}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12, padding: '2px 0' }}>
            + Añadir opción
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sección editor ────────────────────────────────────────────────────────────
function SeccionEditor({ sec, onChange, onDelete, canDelete }) {
  function setTitulo(t) { onChange({ ...sec, titulo: t }) }
  function addPregunta() { onChange({ ...sec, preguntas: [...sec.preguntas, emptyPregunta()] }) }
  function updatePregunta(i, preg) {
    const ps = [...sec.preguntas]; ps[i] = preg; onChange({ ...sec, preguntas: ps })
  }
  function deletePregunta(i) {
    const ps = [...sec.preguntas]; ps.splice(i, 1); onChange({ ...sec, preguntas: ps })
  }

  return (
    <div style={{ marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: '#f8fafc', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <input value={sec.titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Título de sección"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: 600, color: '#1e293b', outline: 'none',
          }} />
        {canDelete && (
          <button type="button" onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>
            Eliminar sección
          </button>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        {sec.preguntas.map((preg, i) => (
          <PreguntaEditor key={preg._id || i} preg={preg}
            onChange={p => updatePregunta(i, p)}
            onDelete={() => deletePregunta(i)} />
        ))}
        <button type="button" onClick={addPregunta}
          style={{
            width: '100%', border: '1.5px dashed #cbd5e1', borderRadius: 8,
            padding: '8px', background: 'none', color: '#64748b',
            fontSize: 13, cursor: 'pointer', transition: 'border-color 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#3B82F6'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
          + Añadir pregunta
        </button>
      </div>
    </div>
  )
}

// ── Vista de respuestas ───────────────────────────────────────────────────────
function RespuestasView({ formId, onBack }) {
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFormularioRespuestas(formId).then(setRespuestas).catch(console.error).finally(() => setLoading(false))
  }, [formId])

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Cargando respuestas...</div>

  return (
    <div>
      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }}>
        ← Volver al formulario
      </button>
      <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>
        Respuestas recibidas ({respuestas.length})
      </h3>
      {respuestas.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Sin respuestas aún.</div>
      )}
      {respuestas.map(r => (
        <div key={r.RespuestaId} style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{r.OperadorNombre}</span>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              {new Date(r.FechaEnvio).toLocaleString('es-MX')}
            </span>
          </div>
          {(r.valores || []).map((v, vi) => (
            <div key={vi} style={{ marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: '#475569', fontWeight: 500 }}>{v.Texto}: </span>
              <span style={{ color: '#1e293b' }}>{v.Valor ?? '—'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Formularios({ usuario }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // formulario completo en edición
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(true)
  const [viewRespuestas, setViewRespuestas] = useState(false)
  const [isNew, setIsNew] = useState(false)

  const isAdmin = usuario?.rol === 'admin'

  const cargarLista = useCallback(() => {
    setLoading(true)
    getFormularios().then(setLista).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargarLista() }, [cargarLista])

  function nuevoFormulario() {
    setSelected({
      nombre: '',
      descripcion: '',
      activo: false,
      secciones: [emptySeccion()],
    })
    setIsNew(true)
    setViewRespuestas(false)
  }

  async function abrirFormulario(id) {
    try {
      const f = await getFormulario(id)
      // Añadir _id temporal a secciones/preguntas/opciones para el editor
      f.secciones = (f.secciones || []).map(s => ({
        ...s, _id: uid(),
        preguntas: (s.preguntas || []).map(p => ({
          ...p, _id: uid(),
          opciones: (p.opciones || []).map(o => ({ ...o, _id: uid() })),
        })),
      }))
      setSelected(f)
      setIsNew(false)
      setViewRespuestas(false)
    } catch (e) { setError(e.message) }
  }

  async function guardar() {
    if (!selected) return
    if (!selected.nombre.trim()) { setError('El nombre del formulario es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        await createFormulario(selected)
      } else {
        await updateFormulario(selected.FormularioId, selected)
      }
      cargarLista()
      setSelected(null)
      setIsNew(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function toggleActivo(id, activo, e) {
    e.stopPropagation()
    try {
      await toggleFormularioActivo(id, !activo)
      cargarLista()
      if (selected?.FormularioId === id) setSelected(s => ({ ...s, activo: !activo }))
    } catch (e) { setError(e.message) }
  }

  async function eliminar(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Eliminar este formulario y todas sus respuestas?')) return
    try {
      await deleteFormulario(id)
      cargarLista()
      if (selected?.FormularioId === id) setSelected(null)
    } catch (e) { setError(e.message) }
  }

  function addSeccion() {
    setSelected(s => ({ ...s, secciones: [...s.secciones, emptySeccion()] }))
  }
  function updateSeccion(i, sec) {
    setSelected(s => { const ss = [...s.secciones]; ss[i] = sec; return { ...s, secciones: ss } })
  }
  function deleteSeccion(i) {
    setSelected(s => { const ss = [...s.secciones]; ss.splice(i, 1); return { ...s, secciones: ss } })
  }

  const btnStyle = (color = '#3B82F6') => ({
    background: color, color: '#fff', border: 'none', borderRadius: 7,
    padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', height: '100%', gap: 20, minHeight: 0 }}>
      {/* ── Panel izquierdo: lista ── */}
      <div style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {isAdmin && (
          <button type="button" style={{ ...btnStyle(), width: '100%', padding: '9px' }}
            onClick={nuevoFormulario}>
            + Nuevo formulario
          </button>
        )}

        {loading && <div style={{ color: '#64748b', fontSize: 13 }}>Cargando...</div>}
        {error && <div style={{ color: '#ef4444', fontSize: 12, padding: '6px 0' }}>{error}</div>}

        {lista.map(f => (
          <div key={f.FormularioId} onClick={() => abrirFormulario(f.FormularioId)}
            style={{
              background: selected?.FormularioId === f.FormularioId ? '#eff6ff' : '#fff',
              border: `1.5px solid ${selected?.FormularioId === f.FormularioId ? '#3B82F6' : '#e2e8f0'}`,
              borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', flex: 1 }}>{f.Nombre}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                background: f.Activo ? '#dcfce7' : '#f1f5f9',
                color: f.Activo ? '#15803d' : '#64748b',
                flexShrink: 0, marginLeft: 6,
              }}>
                {f.Activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {f.Descripcion && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.Descripcion}
              </div>
            )}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button"
                  onClick={e => toggleActivo(f.FormularioId, f.Activo, e)}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid #cbd5e1',
                    background: '#fff', cursor: 'pointer', color: f.Activo ? '#dc2626' : '#16a34a',
                  }}>
                  {f.Activo ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button"
                  onClick={e => eliminar(f.FormularioId, e)}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer', color: '#dc2626' }}>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}

        {!loading && lista.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
            Sin formularios aún
          </div>
        )}
      </div>

      {/* ── Panel derecho: editor / preview ── */}
      {selected && !viewRespuestas ? (
        <div style={{ flex: 1, display: 'flex', gap: 20, minWidth: 0, overflow: 'auto' }}>
          {/* Editor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {isAdmin && (
                <>
                  <button type="button" style={btnStyle()} onClick={guardar} disabled={saving}>
                    {saving ? 'Guardando...' : (isNew ? 'Crear formulario' : 'Guardar cambios')}
                  </button>
                  <button type="button"
                    style={{ ...btnStyle('#fff'), color: '#64748b', border: '1px solid #e2e8f0' }}
                    onClick={() => { setSelected(null); setIsNew(false) }}>
                    Cancelar
                  </button>
                </>
              )}
              {!isNew && (
                <button type="button"
                  style={{ ...btnStyle('#fff'), color: '#475569', border: '1px solid #e2e8f0' }}
                  onClick={() => setViewRespuestas(true)}>
                  Ver respuestas
                </button>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPreview} onChange={e => setShowPreview(e.target.checked)} />
                  Vista previa móvil
                </label>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            {/* Form header fields */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Nombre del formulario *
                </label>
                <input
                  value={selected.nombre || selected.Nombre || ''}
                  onChange={e => setSelected(s => ({ ...s, nombre: e.target.value, Nombre: e.target.value }))}
                  placeholder="Ej: Inspección de entrega"
                  disabled={!isAdmin}
                  style={{
                    width: '100%', border: '1px solid #e2e8f0', borderRadius: 7,
                    padding: '8px 12px', fontSize: 14, boxSizing: 'border-box',
                    background: isAdmin ? '#fff' : '#f8fafc',
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Descripción
                </label>
                <input
                  value={selected.descripcion || selected.Descripcion || ''}
                  onChange={e => setSelected(s => ({ ...s, descripcion: e.target.value, Descripcion: e.target.value }))}
                  placeholder="Descripción breve del formulario"
                  disabled={!isAdmin}
                  style={{
                    width: '100%', border: '1px solid #e2e8f0', borderRadius: 7,
                    padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
                    background: isAdmin ? '#fff' : '#f8fafc',
                  }}
                />
              </div>
              {isAdmin && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={!!(selected.activo ?? selected.Activo)}
                    onChange={e => setSelected(s => ({ ...s, activo: e.target.checked, Activo: e.target.checked }))} />
                  Visible en la app (activo)
                </label>
              )}
            </div>

            {/* Secciones */}
            {(selected.secciones || []).map((sec, i) => (
              isAdmin ? (
                <SeccionEditor key={sec._id || sec.SeccionId || i} sec={sec}
                  onChange={s => updateSeccion(i, s)}
                  onDelete={() => deleteSeccion(i)}
                  canDelete={(selected.secciones || []).length > 1} />
              ) : (
                <div key={sec._id || sec.SeccionId || i} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, marginBottom: 8, padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {sec.titulo || `Sección ${i + 1}`}
                  </div>
                  {(sec.preguntas || []).map((p, pi) => (
                    <div key={p._id || p.PreguntaId || pi} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                      <div style={{ fontSize: 13, color: '#1e293b' }}>
                        {p.texto || p.Texto}
                        {(p.requerida || p.Requerida) && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                        {TIPO_LABEL[p.tipoRespuesta || p.TipoRespuesta] || p.tipoRespuesta}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ))}

            {isAdmin && (
              <button type="button" onClick={addSeccion}
                style={{
                  width: '100%', border: '2px dashed #cbd5e1', borderRadius: 10,
                  padding: '12px', background: 'none', color: '#64748b',
                  fontSize: 13, cursor: 'pointer',
                }}>
                + Añadir sección
              </button>
            )}
          </div>

          {/* Preview móvil */}
          {showPreview && (
            <MobilePreview form={{
              nombre: selected.nombre || selected.Nombre || '',
              descripcion: selected.descripcion || selected.Descripcion || '',
              secciones: (selected.secciones || []).map(s => ({
                ...s,
                titulo: s.titulo || s.Titulo || '',
                preguntas: (s.preguntas || []).map(p => ({
                  ...p,
                  texto: p.texto || p.Texto || '',
                  tipoRespuesta: p.tipoRespuesta || p.TipoRespuesta || 'si_no_na',
                  requerida: p.requerida || p.Requerida || false,
                  opciones: (p.opciones || []).map(o => ({ ...o, texto: o.texto || o.Texto || '' })),
                })),
              })),
            }} />
          )}
        </div>
      ) : selected && viewRespuestas ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <RespuestasView formId={selected.FormularioId} onBack={() => setViewRespuestas(false)} />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
          {lista.length === 0
            ? (isAdmin ? 'Crea tu primer formulario con el botón de arriba.' : 'No hay formularios disponibles.')
            : 'Selecciona un formulario de la lista o crea uno nuevo.'}
        </div>
      )}
    </div>
  )
}
