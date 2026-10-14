import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  getFormularios, getFormulario, createFormulario, updateFormulario,
  toggleFormularioActivo, deleteFormulario, getTodasRespuestas,
} from './api'

const TIPOS = [
  { value: 'si_no_na',        label: 'Sí / No / N/A' },
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'casilla',         label: 'Marcar casilla' },
  { value: 'texto',           label: 'Texto' },
  { value: 'numero',          label: 'Número' },
  { value: 'fecha',           label: 'Fecha y hora' },
  { value: 'media',           label: 'Media (foto)' },
  { value: 'firma',           label: 'Firma' },
]
const TIPO_LABEL = Object.fromEntries(TIPOS.map(t => [t.value, t.label]))

function uid() { return Math.random().toString(36).slice(2) }
function emptySeccion() { return { _id: uid(), titulo: 'Sección nueva', preguntas: [] } }
function emptyPregunta() { return { _id: uid(), texto: '', tipoRespuesta: 'si_no_na', requerida: false, opciones: [] } }

// ── Helpers ───────────────────────────────────────────────────────────────────
function esImagen(valor) {
  return typeof valor === 'string' &&
    valor.startsWith('http') &&
    (valor.includes('cloudinary') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(valor))
}
function notaResumen(valores) {
  const v = (valores || []).find(v => v.TipoRespuesta === 'texto' && v.Valor && !esImagen(v.Valor))
  return v?.Valor ?? ''
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function startOfDay(date) {
  const d = new Date(date); d.setHours(0,0,0,0); return d
}
function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

// ── Preview móvil ─────────────────────────────────────────────────────────────
function PreviewRespuesta({ tipo, opciones }) {
  const inp = (ph) => (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#94a3b8', background: '#f8fafc' }}>{ph}</div>
  )
  if (tipo === 'si_no_na') return (
    <div style={{ display: 'flex', gap: 6 }}>
      {['Sí','No','N/A'].map(l => (
        <div key={l} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 0', fontSize: 11, textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>{l}</div>
      ))}
    </div>
  )
  if (tipo === 'opcion_multiple') return (
    <div>{(opciones||[]).map((o,i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, color: '#475569' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #94a3b8', flexShrink: 0 }} />
        {o.texto || `Opción ${i+1}`}
      </div>
    ))}</div>
  )
  if (tipo === 'casilla') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
      <div style={{ width: 14, height: 14, border: '1.5px solid #94a3b8', borderRadius: 3, flexShrink: 0 }} />
      Marcar si aplica
    </div>
  )
  if (tipo === 'numero') return inp('0')
  if (tipo === 'fecha') return inp('dd/mm/aaaa hh:mm')
  if (tipo === 'media') return (
    <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>📷 Foto</div>
  )
  if (tipo === 'firma') return (
    <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: 10 }}>✍️ Firma</div>
  )
  return inp('Escribe aquí...')
}

function MobilePreview({ form }) {
  return (
    <div style={{ width: 300, flexShrink: 0, background: '#f1f5f9', borderRadius: 16, padding: '0 0 24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ background: '#0F172A', padding: '10px 16px 6px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>9:55</span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>▶ ◼ ▐▐ 🔋</span>
      </div>
      <div style={{ background: '#1E293B', padding: '12px 16px' }}>
        <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>FORMULARIO</div>
        <div style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, marginTop: 2 }}>{form.nombre || 'Sin nombre'}</div>
        {form.descripcion && <div style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>{form.descripcion}</div>}
      </div>
      <div style={{ padding: '12px 14px', overflowY: 'auto', maxHeight: 480 }}>
        {(!form.secciones || form.secciones.length === 0) && (
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 24 }}>Sin secciones aún</div>
        )}
        {(form.secciones || []).map((sec, si) => (
          <div key={sec._id || si} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 8 }}>
              {sec.titulo || `Sección ${si + 1}`}
            </div>
            {(sec.preguntas || []).map((preg, pi) => (
              <div key={preg._id || pi} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, marginBottom: 6 }}>
                  {preg.texto || 'Pregunta'}
                  {preg.requerida && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                </div>
                <PreviewRespuesta tipo={preg.tipoRespuesta} opciones={preg.opciones} />
              </div>
            ))}
          </div>
        ))}
        <div style={{ background: '#3B82F6', borderRadius: 8, padding: '10px', textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
          Enviar formulario
        </div>
      </div>
    </div>
  )
}

// ── Editor de preguntas ───────────────────────────────────────────────────────
function PreguntaEditor({ preg, onChange, onDelete }) {
  function setField(key, val) { onChange({ ...preg, [key]: val }) }
  function addOpcion() { onChange({ ...preg, opciones: [...(preg.opciones||[]), { _id: uid(), texto: '' }] }) }
  function setOpcion(i, texto) { const opts = [...(preg.opciones||[])]; opts[i] = { ...opts[i], texto }; onChange({ ...preg, opciones: opts }) }
  function removeOpcion(i) { const opts = [...(preg.opciones||[])]; opts.splice(i, 1); onChange({ ...preg, opciones: opts }) }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea value={preg.texto} onChange={e => setField('texto', e.target.value)}
          placeholder="Escribe la pregunta..." rows={2}
          style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
        <button type="button" onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
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
              <input value={o.texto} onChange={e => setOpcion(i, e.target.value)} placeholder={`Opción ${i+1}`}
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

function SeccionEditor({ sec, onChange, onDelete, canDelete }) {
  function setTitulo(t) { onChange({ ...sec, titulo: t }) }
  function addPregunta() { onChange({ ...sec, preguntas: [...sec.preguntas, emptyPregunta()] }) }
  function updatePregunta(i, preg) { const ps = [...sec.preguntas]; ps[i] = preg; onChange({ ...sec, preguntas: ps }) }
  function deletePregunta(i) { const ps = [...sec.preguntas]; ps.splice(i, 1); onChange({ ...sec, preguntas: ps }) }

  return (
    <div style={{ marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: '#f8fafc', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <input value={sec.titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título de sección"
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#1e293b', outline: 'none' }} />
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
            onChange={p => updatePregunta(i, p)} onDelete={() => deletePregunta(i)} />
        ))}
        <button type="button" onClick={addPregunta}
          style={{ width: '100%', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '8px', background: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#3B82F6'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
          + Añadir pregunta
        </button>
      </div>
    </div>
  )
}

// ── Panel de detalle de respuesta ─────────────────────────────────────────────
function RespuestaDetalle({ r, onClose }) {
  if (!r) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{r.FormularioNombre}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{r.OperadorNombre}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{fmtDate(r.FechaEnvio)}</div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Detalles del formulario
          </div>
          {(r.valores || []).map((v, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{v.Texto}</div>
              {esImagen(v.Valor) ? (
                <img src={v.Valor} alt={v.Texto}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', objectFit: 'cover', maxHeight: 200, cursor: 'pointer' }}
                  onClick={() => window.open(v.Valor, '_blank')} />
              ) : (
                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{v.Valor ?? '—'}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Tab 1: Documentos enviados ────────────────────────────────────────────────
function TabDocumentos({ formularios }) {
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [hoverId, setHoverId] = useState(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroForm, setFiltroForm] = useState('')
  const [rangoPreset, setRangoPreset] = useState('30d')
  const [fechaDesde, setFechaDesde] = useState(isoDate(new Date(Date.now() - 30 * 86400000)))
  const [fechaHasta, setFechaHasta] = useState(isoDate(new Date()))
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    getTodasRespuestas().then(setRespuestas).catch(console.error).finally(() => setLoading(false))
  }, [])

  function aplicarPreset(preset) {
    setRangoPreset(preset)
    const hoy = new Date()
    const desde = new Date()
    if (preset === '1h') desde.setHours(desde.getHours() - 1)
    else if (preset === 'hoy') startOfDay(desde)
    else if (preset === '7d') desde.setDate(desde.getDate() - 7)
    else if (preset === '30d') desde.setDate(desde.getDate() - 30)
    setFechaDesde(isoDate(desde))
    setFechaHasta(isoDate(hoy))
    setShowDatePicker(false)
  }

  const filtered = useMemo(() => {
    const desde = new Date(fechaDesde + 'T00:00:00')
    const hasta = new Date(fechaHasta + 'T23:59:59')
    return respuestas.filter(r => {
      const fecha = new Date(r.FechaEnvio)
      if (fecha < desde || fecha > hasta) return false
      if (filtroForm && r.FormularioNombre !== filtroForm) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!r.OperadorNombre?.toLowerCase().includes(q) &&
            !r.FormularioNombre?.toLowerCase().includes(q) &&
            !(notaResumen(r.valores) || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [respuestas, busqueda, filtroForm, fechaDesde, fechaHasta])

  const nombresFormularios = useMemo(() => [...new Set(respuestas.map(r => r.FormularioNombre))].sort(), [respuestas])

  const presetLabel = { '1h': 'Última hora', 'hoy': 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', 'custom': 'Personalizado' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Barra de filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Rango de fechas */}
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowDatePicker(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 12px', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475569' }}>
            📅 {presetLabel[rangoPreset] || `${fechaDesde} → ${fechaHasta}`}
          </button>
          {showDatePicker && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 16, minWidth: 280 }}>
              <div style={{ marginBottom: 12 }}>
                {['1h','hoy','7d','30d'].map(p => (
                  <button key={p} type="button" onClick={() => aplicarPreset(p)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', background: rangoPreset === p ? '#eff6ff' : 'none', color: rangoPreset === p ? '#3B82F6' : '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: rangoPreset === p ? 600 : 400, marginBottom: 2 }}>
                    {presetLabel[p]}
                  </button>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#475569' }}>
                  <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setRangoPreset('custom') }}
                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
                  <span>→</span>
                  <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setRangoPreset('custom') }}
                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
                </div>
                <button type="button" onClick={() => setShowDatePicker(false)}
                  style={{ marginTop: 10, width: '100%', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '7px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filtro por formulario */}
        <select value={filtroForm} onChange={e => setFiltroForm(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 10px', fontSize: 13, background: '#fff', color: '#475569', cursor: 'pointer' }}>
          <option value="">Tipo de formulario</option>
          {nombresFormularios.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Buscador */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar documentos..."
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 12px 6px 30px', fontSize: 13, boxSizing: 'border-box', background: '#fff' }} />
        </div>

        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>
          {filtered.length} de {respuestas.length}
        </span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ color: '#64748b', padding: 24 }}>Cargando...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {/* Cabecera */}
          <div style={{ display: 'grid', gridTemplateColumns: '30% 22% 22% 26%', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', gap: 8 }}>
            {['Enviado por','Recibido el ▼','Tipo de formulario','Notas'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Sin resultados para los filtros aplicados.</div>
          )}

          {filtered.map(r => (
            <div key={r.RespuestaId}
              onClick={() => setDetalle(d => d?.RespuestaId === r.RespuestaId ? null : r)}
              onMouseEnter={() => setHoverId(r.RespuestaId)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                display: 'grid', gridTemplateColumns: '30% 22% 22% 26%', padding: '12px 16px', gap: 8,
                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                background: detalle?.RespuestaId === r.RespuestaId ? '#eff6ff' : hoverId === r.RespuestaId ? '#f8fafc' : '#fff',
                transition: 'background 0.1s',
              }}>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.OperadorNombre}</div>
              <div style={{ fontSize: 13, color: '#475569' }}>{fmtDate(r.FechaEnvio)}</div>
              <div style={{ fontSize: 13, color: '#3B82F6' }}>{r.FormularioNombre}</div>
              <div style={{ fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notaResumen(r.valores)}</div>
            </div>
          ))}
        </div>
      )}

      {detalle && <RespuestaDetalle r={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}

// ── Tab 2: Tipos de formularios (editor) ──────────────────────────────────────
function TabFormularios({ usuario }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [hoverId, setHoverId] = useState(null)

  const isAdmin = usuario?.rol === 'admin'

  const cargarLista = useCallback(() => {
    setLoading(true)
    getFormularios().then(setLista).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargarLista() }, [cargarLista])

  function nuevoFormulario() {
    setSelected({ nombre: '', descripcion: '', activo: false, secciones: [emptySeccion()] })
    setIsNew(true)
  }

  async function abrirFormulario(id) {
    try {
      const f = await getFormulario(id)
      f.nombre = f.Nombre || f.nombre || ''
      f.descripcion = f.Descripcion || f.descripcion || ''
      f.activo = f.Activo ?? f.activo ?? false
      f.secciones = (f.secciones || []).map(s => ({
        ...s, _id: uid(), titulo: s.Titulo || s.titulo || '',
        preguntas: (s.preguntas || []).map(p => ({
          ...p, _id: uid(),
          texto: p.Texto || p.texto || '',
          tipoRespuesta: p.TipoRespuesta || p.tipoRespuesta || 'si_no_na',
          requerida: !!(p.Requerida ?? p.requerida),
          opciones: (p.opciones || []).map(o => ({ ...o, _id: uid(), texto: o.Texto || o.texto || '' })),
        })),
      }))
      setSelected(f)
      setIsNew(false)
    } catch (e) { setError(e.message) }
  }

  async function guardar() {
    if (!selected) return
    if (!selected.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError(null)
    try {
      if (isNew) await createFormulario(selected)
      else await updateFormulario(selected.FormularioId, selected)
      cargarLista(); setSelected(null); setIsNew(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function toggleActivo(id, activo, e) {
    e.stopPropagation()
    try {
      await toggleFormularioActivo(id, !activo)
      cargarLista()
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

  const addSeccion = () => setSelected(s => ({ ...s, secciones: [...s.secciones, emptySeccion()] }))
  const updateSeccion = (i, sec) => setSelected(s => { const ss = [...s.secciones]; ss[i] = sec; return { ...s, secciones: ss } })
  const deleteSeccion = (i) => setSelected(s => { const ss = [...s.secciones]; ss.splice(i, 1); return { ...s, secciones: ss } })

  const btn = (color = '#3B82F6') => ({ background: color, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' })

  // ── Vista lista (sin formulario seleccionado) ──────────────────────────────
  if (!selected) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" style={btn()} onClick={nuevoFormulario}>+ Crear tipo de formulario</button>
        </div>
      )}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '8px 12px', fontSize: 13 }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nombre del tipo de formulario ▲</div>
        </div>

        {loading && <div style={{ padding: '24px 16px', color: '#94a3b8', fontSize: 13 }}>Cargando...</div>}
        {!loading && lista.length === 0 && (
          <div style={{ padding: '32px 16px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
            {isAdmin ? 'No hay formularios. Crea el primero.' : 'No hay formularios disponibles.'}
          </div>
        )}

        {lista.map(f => (
          <div key={f.FormularioId}
            onMouseEnter={() => setHoverId(f.FormularioId)}
            onMouseLeave={() => setHoverId(null)}
            style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '13px 16px', borderBottom: '1px solid #f1f5f9', background: hoverId === f.FormularioId ? '#f8fafc' : '#fff', transition: 'background 0.1s', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{f.Nombre}</div>
              {f.Descripcion && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{f.Descripcion}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: f.Activo ? '#dcfce7' : '#f1f5f9', color: f.Activo ? '#16a34a' : '#64748b' }}>
                {f.Activo ? 'Activo' : 'Inactivo'}
              </span>
              {isAdmin && (
                <>
                  <button type="button" onClick={() => abrirFormulario(f.FormularioId)}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 12px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#475569' }}>
                    Editar
                  </button>
                  <button type="button" onClick={e => toggleActivo(f.FormularioId, f.Activo, e)}
                    style={{ border: `1px solid ${f.Activo ? '#fca5a5' : '#bbf7d0'}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, background: '#fff', cursor: 'pointer', color: f.Activo ? '#dc2626' : '#16a34a' }}>
                    {f.Activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" onClick={e => eliminar(f.FormularioId, e)}
                    style={{ border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 12px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#dc2626' }}>
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Editor de formulario ───────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 20, minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={btn('#64748b')} onClick={() => { setSelected(null); setIsNew(false) }}>← Volver</button>
          {isAdmin && (
            <button type="button" style={btn()} onClick={guardar} disabled={saving}>
              {saving ? 'Guardando...' : isNew ? 'Crear formulario' : 'Guardar cambios'}
            </button>
          )}
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPreview} onChange={e => setShowPreview(e.target.checked)} />
            Vista previa
          </label>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {/* Header del formulario */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nombre del formulario *</label>
            <input value={selected.nombre || ''} onChange={e => setSelected(s => ({ ...s, nombre: e.target.value }))}
              placeholder="Ej: Inspección de entrega" disabled={!isAdmin}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Descripción</label>
            <input value={selected.descripcion || ''} onChange={e => setSelected(s => ({ ...s, descripcion: e.target.value }))}
              placeholder="Descripción breve" disabled={!isAdmin}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!(selected.activo ?? selected.Activo)}
                onChange={e => setSelected(s => ({ ...s, activo: e.target.checked }))} />
              Visible en la app (activo)
            </label>
          )}
        </div>

        {/* Secciones */}
        {(selected.secciones || []).map((sec, i) => (
          <SeccionEditor key={sec._id || i} sec={sec}
            onChange={s => updateSeccion(i, s)}
            onDelete={() => deleteSeccion(i)}
            canDelete={(selected.secciones || []).length > 1} />
        ))}
        {isAdmin && (
          <button type="button" onClick={addSeccion}
            style={{ width: '100%', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '10px', background: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#3B82F6'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
            + Añadir sección
          </button>
        )}
      </div>

      {/* Preview */}
      {showPreview && (
        <MobilePreview form={{
          nombre: selected.nombre || '',
          descripcion: selected.descripcion || '',
          secciones: (selected.secciones || []).map(s => ({
            ...s, titulo: s.titulo || '',
            preguntas: (s.preguntas || []).map(p => ({
              ...p, texto: p.texto || '', tipoRespuesta: p.tipoRespuesta || 'si_no_na',
              requerida: p.requerida || false,
              opciones: (p.opciones || []).map(o => ({ ...o, texto: o.texto || '' })),
            })),
          })),
        }} />
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Formularios({ usuario }) {
  const [tab, setTab] = useState('documentos')
  const [formularios, setFormularios] = useState([])

  useEffect(() => {
    getFormularios().then(setFormularios).catch(console.error)
  }, [])

  const tabStyle = (active) => ({
    padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 400,
    color: active ? '#0f172a' : '#64748b',
    borderBottom: active ? '2px solid #0f172a' : '2px solid transparent',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button type="button" style={tabStyle(tab === 'documentos')} onClick={() => setTab('documentos')}>
          Documentos enviados
        </button>
        <button type="button" style={tabStyle(tab === 'formularios')} onClick={() => setTab('formularios')}>
          Tipos de formularios
        </button>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {tab === 'documentos'
          ? <TabDocumentos formularios={formularios} />
          : <TabFormularios usuario={usuario} />
        }
      </div>
    </div>
  )
}
