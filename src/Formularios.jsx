import { useEffect, useState, useCallback } from 'react'
import {
  getFormularios, getFormulario, createFormulario, updateFormulario,
  toggleFormularioActivo, deleteFormulario, getFormularioRespuestas, deleteRespuesta,
  getPortales, createPortal, updatePortal, deletePortal,
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
  { value: 'lista',           label: 'Lista desplegable' },
  { value: 'escala',          label: 'Escala numérica' },
  { value: 'alumno',         label: 'Alumno (búsqueda)' },
  { value: 'opt',            label: 'OPT (operadores)' },
]

const TIPO_LABEL = Object.fromEntries(TIPOS.map(t => [t.value, t.label]))

function uid() { return Math.random().toString(36).slice(2) }

function emptySeccion() {
  return { _id: uid(), titulo: 'Sección nueva', instrucciones: '', preguntas: [] }
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
            {sec.instrucciones && (
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
                {sec.instrucciones}
              </div>
            )}
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
  if (tipo === 'lista') {
    const opts = opciones?.length ? opciones : [{ texto: 'Opción 1' }, { texto: 'Opción 2' }]
    return (
      <div style={{
        ...inputStyle, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{opts[0]?.texto || 'Seleccionar...'}</span>
        <span style={{ fontSize: 8 }}>▼</span>
      </div>
    )
  }
  if (tipo === 'escala') {
    const vals = opciones?.length ? opciones.map(o => o.texto || o) : ['2', '5', '10']
    return (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {vals.map((v, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{typeof v === 'object' ? v.texto : v}</span>
            <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #94a3b8' }} />
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
  if (tipo === 'alumno') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          width: '100%', padding: '5px 8px', borderRadius: 6,
          border: '1px solid #cbd5e1', fontSize: 10, color: '#94a3b8',
          background: '#f8fafc', boxSizing: 'border-box',
        }}>▼ Seleccionar generación</div>
        <div style={{
          width: '100%', padding: '5px 8px', borderRadius: 6,
          border: '1px solid #cbd5e1', fontSize: 10, color: '#94a3b8',
          background: '#f8fafc', boxSizing: 'border-box',
        }}>🔍 Buscar alumno...</div>
      </div>
    )
  }
  if (tipo === 'opt') {
    const pv = { width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 10, color: '#94a3b8', background: '#f8fafc', boxSizing: 'border-box' }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={pv}>▼ Empresa</div>
        <div style={pv}>▼ Unidad de Negocio</div>
        <div style={pv}>▼ Unidad Operativa</div>
        <div style={pv}>🔍 Buscar operador...</div>
      </div>
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

      {(preg.tipoRespuesta === 'opcion_multiple' || preg.tipoRespuesta === 'lista' || preg.tipoRespuesta === 'escala') && (
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
  function setInstrucciones(v) { onChange({ ...sec, instrucciones: v }) }
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
      <div style={{ padding: '0 14px 6px' }}>
        <textarea
          value={sec.instrucciones || ''}
          onChange={e => setInstrucciones(e.target.value)}
          placeholder="Instrucciones de la sección (opcional)..."
          rows={2}
          style={{
            width: '100%', border: '1px solid #e2e8f0', borderRadius: 6,
            padding: '8px 10px', fontSize: 12, color: '#475569', resize: 'vertical',
            background: '#f8fafc', boxSizing: 'border-box', outline: 'none',
          }}
        />
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

// ── Helpers de respuestas ────────────────────────────────────────────────────
function esImagen(valor) {
  return typeof valor === 'string' && (valor.startsWith('http') && (valor.includes('cloudinary') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(valor)))
}

function notaResumen(valores) {
  const v = (valores || []).find(v => v.TipoRespuesta === 'texto' && v.Valor && !esImagen(v.Valor))
  return v?.Valor ?? ''
}

// ── Panel de detalle de una respuesta ────────────────────────────────────────
function RespuestaDetalle({ r, onClose, onDelete }) {
  if (!r) return null
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
      background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            {r.FormularioNombre}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{r.OperadorNombre}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {new Date(r.FechaEnvio).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onDelete && (
            <button type="button" onClick={() => { if (confirm('¿Eliminar esta respuesta?')) onDelete(r.RespuestaId) }}
              style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontSize: 12, padding: '4px 10px', fontWeight: 600 }}>
              Eliminar
            </button>
          )}
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 22, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        </div>
      </div>

      {/* Cuerpo */}
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
            ) : (() => {
              try {
                const parsed = JSON.parse(v.Valor)
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  const labels = { id: 'ID', matricula: 'Matrícula', nombre: 'Nombre', empresa: 'Empresa', unidadNegocio: 'Unidad de Negocio', unidadOperativa: 'Unidad Operativa', operador: 'Operador' }
                  return (
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                      {Object.entries(parsed).filter(([, val]) => val != null && val !== '').map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
                          <span style={{ color: '#64748b', minWidth: 120 }}>{labels[key] || key}:</span>
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              } catch {}
              return <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{v.Valor ?? '—'}</div>
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componentes SVG para gráficas ────────────────────────────────────────────
const COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1']

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return null
  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.22
  let cumAngle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const angle = (d.count / total) * 2 * Math.PI
    const startAngle = cumAngle
    cumAngle += angle
    const endAngle = cumAngle
    const largeArc = angle > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + inner * Math.cos(endAngle), iy1 = cy + inner * Math.sin(endAngle)
    const ix2 = cx + inner * Math.cos(startAngle), iy2 = cy + inner * Math.sin(startAngle)
    const path = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${largeArc} 0 ${ix2},${iy2} Z`
    return <path key={i} d={path} fill={COLORS[i % COLORS.length]} />
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={size} height={size}>{slices}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 20, fontWeight: 700, fill: '#1e293b' }}>{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
            <span style={{ color: '#475569' }}>{d.label}</span>
            <span style={{ color: '#94a3b8', marginLeft: 'auto', fontWeight: 600 }}>{d.count} ({Math.round(d.count / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, maxWidth = 400 }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#64748b', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 22, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${(d.value / maxVal) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', minWidth: 32 }}>{typeof d.value === 'number' && d.value % 1 !== 0 ? d.value.toFixed(1) : d.value}</span>
        </div>
      ))}
    </div>
  )
}

function HorizBar({ items, maxWidth = 500 }) {
  const maxVal = Math.max(...items.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth }}>
      {items.slice(0, 10).map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#475569', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 18, overflow: 'hidden' }}>
            <div style={{ width: `${(d.count / maxVal) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', minWidth: 24 }}>{d.count}</span>
        </div>
      ))}
    </div>
  )
}

// ── Vista de análisis ────────────────────────────────────────────────────────
function AnalisisView({ formId, onBack }) {
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFormularioRespuestas(formId).then(setRespuestas).catch(console.error).finally(() => setLoading(false))
  }, [formId])

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Cargando análisis...</div>
  if (!respuestas.length) return (
    <div>
      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16 }}>← Volver</button>
      <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>Sin respuestas para analizar.</div>
    </div>
  )

  const tryParse = s => { try { const p = JSON.parse(s); if (p && typeof p === 'object' && !Array.isArray(p)) return p } catch {} return null }

  const allPreguntas = []
  const seenP = new Set()
  respuestas.forEach(r => (r.valores || []).forEach(v => {
    if (!seenP.has(v.Texto)) { seenP.add(v.Texto); allPreguntas.push(v) }
  }))

  const analyses = allPreguntas.map(pregRef => {
    const vals = respuestas.map(r => (r.valores || []).find(v => v.Texto === pregRef.Texto)?.Valor).filter(v => v != null && v !== '')
    if (!vals.length) return null

    const parsed0 = tryParse(vals[0])
    if (parsed0) {
      const subAnalyses = []
      const allParsed = vals.map(tryParse).filter(Boolean)
      const jsonLabels = { id: 'ID', matricula: 'Matrícula', nombre: 'Nombre', empresa: 'Empresa', unidadNegocio: 'Unidad de Negocio', unidadOperativa: 'Unidad Operativa', operador: 'Operador' }
      Object.keys(parsed0).filter(k => k !== 'id').forEach(key => {
        const subVals = allParsed.map(p => p[key]).filter(Boolean)
        const counts = {}
        subVals.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        if (sorted.length > 1) {
          subAnalyses.push({ label: jsonLabels[key] || key, type: 'top', items: sorted.map(([label, count]) => ({ label, count })) })
        }
      })
      return { texto: pregRef.Texto, type: 'json', subAnalyses }
    }

    const numVals = vals.map(Number).filter(n => !isNaN(n))
    if (numVals.length === vals.length && numVals.length > 0) {
      const avg = numVals.reduce((s, n) => s + n, 0) / numVals.length
      const min = Math.min(...numVals)
      const max = Math.max(...numVals)
      return { texto: pregRef.Texto, type: 'numeric', avg, min, max, count: numVals.length, values: numVals }
    }

    const counts = {}
    vals.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return { texto: pregRef.Texto, type: 'categorical', data: sorted.map(([label, count]) => ({ label, count })) }
  }).filter(Boolean)

  const totalResp = respuestas.length
  const fechas = respuestas.map(r => new Date(r.FechaEnvio)).sort((a, b) => a - b)
  const fechaMin = fechas[0]?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  const fechaMax = fechas[fechas.length - 1]?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

  const cardS = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }
  const titleS = { fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 12 }

  return (
    <div style={{ overflow: 'auto', maxHeight: '85vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Volver al formulario</button>
        <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 15 }}>Análisis de respuestas</span>
      </div>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ ...cardS, flex: '1 1 140px', textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{totalResp}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Respuestas totales</div>
        </div>
        <div style={{ ...cardS, flex: '1 1 140px', textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{fechaMin}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Primera respuesta</div>
        </div>
        <div style={{ ...cardS, flex: '1 1 140px', textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{fechaMax}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Última respuesta</div>
        </div>
        <div style={{ ...cardS, flex: '1 1 140px', textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{allPreguntas.length}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Preguntas</div>
        </div>
      </div>

      {/* Análisis por pregunta */}
      {analyses.map((a, i) => (
        <div key={i} style={cardS}>
          <div style={titleS}>{a.texto}</div>

          {a.type === 'numeric' && (
            <div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: 11, color: '#64748b' }}>Promedio</span><div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{a.avg.toFixed(1)}</div></div>
                <div><span style={{ fontSize: 11, color: '#64748b' }}>Mínimo</span><div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{a.min}</div></div>
                <div><span style={{ fontSize: 11, color: '#64748b' }}>Máximo</span><div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{a.max}</div></div>
                <div><span style={{ fontSize: 11, color: '#64748b' }}>Respuestas</span><div style={{ fontSize: 20, fontWeight: 700, color: '#475569' }}>{a.count}</div></div>
              </div>
              {(() => {
                const dist = {}
                a.values.forEach(v => { dist[v] = (dist[v] || 0) + 1 })
                const sorted = Object.entries(dist).sort((x, y) => Number(x[0]) - Number(y[0]))
                return <BarChart data={sorted.map(([label, value]) => ({ label, value }))} />
              })()}
            </div>
          )}

          {a.type === 'categorical' && <DonutChart data={a.data} />}

          {a.type === 'json' && a.subAnalyses.map((sub, si) => (
            <div key={si} style={{ marginBottom: si < a.subAnalyses.length - 1 ? 16 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>{sub.label}</div>
              <HorizBar items={sub.items} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Vista de respuestas ───────────────────────────────────────────────────────
function RespuestasView({ formId, onBack }) {
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [hoverId, setHoverId] = useState(null)

  function cargar() {
    setLoading(true)
    getFormularioRespuestas(formId).then(setRespuestas).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(cargar, [formId])

  async function handleDelete(rid) {
    try {
      await deleteRespuesta(rid)
      setRespuestas(prev => prev.filter(r => r.RespuestaId !== rid))
      setDetalle(null)
    } catch (e) { alert('Error al eliminar: ' + e.message) }
  }

  function exportarExcel() {
    if (!respuestas.length) return

    const jsonLabels = { id: 'ID', matricula: 'Matrícula', nombre: 'Nombre', empresa: 'Empresa', unidadNegocio: 'Unidad de Negocio', unidadOperativa: 'Unidad Operativa', operador: 'Operador' }

    const tryParse = s => { try { const p = JSON.parse(s); if (p && typeof p === 'object' && !Array.isArray(p)) return p } catch {} return null }

    const colDefs = []
    const seenKey = new Set()
    respuestas.forEach(r => (r.valores || []).forEach(v => {
      if (seenKey.has(v.Texto)) return
      seenKey.add(v.Texto)
      const parsed = tryParse(v.Valor)
      if (parsed) {
        const subKeys = Object.keys(parsed).filter(k => k !== 'id')
        subKeys.forEach(sk => colDefs.push({ key: v.Texto, sub: sk, header: `${v.Texto} - ${jsonLabels[sk] || sk}` }))
      } else {
        colDefs.push({ key: v.Texto, sub: null, header: v.Texto })
      }
    }))

    const escape = s => {
      if (s == null) return ''
      const str = String(s)
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
    }

    const headers = ['Enviado por', 'Fecha', ...colDefs.map(c => c.header)]
    const rows = respuestas.map(r => {
      const valMap = {}
      ;(r.valores || []).forEach(v => { valMap[v.Texto] = v.Valor })
      const cells = colDefs.map(c => {
        const raw = valMap[c.key]
        if (c.sub) {
          const parsed = tryParse(raw)
          return escape(parsed ? parsed[c.sub] : '')
        }
        return escape(raw)
      })
      return [escape(r.OperadorNombre), escape(new Date(r.FechaEnvio).toLocaleString('es-MX')), ...cells]
    })

    const bom = '﻿'
    const csv = bom + [headers.map(escape).join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `respuestas_${formId}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const cols = { enviado: '28%', recibido: '22%', tipo: '22%', notas: '28%' }

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Cargando respuestas...</div>

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13, padding: 0 }}>
          ← Volver al formulario
        </button>
        <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 15 }}>
          Respuestas recibidas ({respuestas.length})
        </span>
        {respuestas.length > 0 && (
          <button type="button" onClick={exportarExcel}
            style={{ marginLeft: 'auto', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ⬇ Exportar CSV
          </button>
        )}
      </div>

      {respuestas.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>Sin respuestas aún.</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {/* Encabezado tabla */}
          <div style={{
            display: 'grid', gridTemplateColumns: `${cols.enviado} ${cols.recibido} ${cols.tipo} ${cols.notas}`,
            padding: '10px 16px', background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0', gap: 8,
          }}>
            {['Enviado por', 'Recibido el', 'Tipo de formulario', 'Notas'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {h}
              </div>
            ))}
          </div>

          {/* Filas */}
          {respuestas.map(r => (
            <div key={r.RespuestaId}
              onClick={() => setDetalle(d => d?.RespuestaId === r.RespuestaId ? null : r)}
              onMouseEnter={() => setHoverId(r.RespuestaId)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: `${cols.enviado} ${cols.recibido} ${cols.tipo} ${cols.notas}`,
                padding: '12px 16px', gap: 8,
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                background: detalle?.RespuestaId === r.RespuestaId
                  ? '#eff6ff'
                  : hoverId === r.RespuestaId
                    ? '#f8fafc'
                    : '#fff',
                transition: 'background 0.12s',
              }}>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.OperadorNombre}
              </div>
              <div style={{ fontSize: 13, color: '#475569' }}>
                {new Date(r.FechaEnvio).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: '#3B82F6' }}>
                {r.FormularioNombre}
              </div>
              <div style={{ fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notaResumen(r.valores)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel de detalle (slide-in) */}
      {detalle && <RespuestaDetalle r={detalle} onClose={() => setDetalle(null)} onDelete={handleDelete} />}
      {/* Overlay para cerrar */}
      {detalle && (
        <div onClick={() => setDetalle(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.2)' }} />
      )}
    </>
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
  const [viewAnalisis, setViewAnalisis] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [portales, setPortales] = useState([])
  const [showPortales, setShowPortales] = useState(false)
  const [editPortal, setEditPortal] = useState(null)
  const [perfilesOpt, setPerfilesOpt] = useState([])

  const isAdmin = usuario?.rol === 'admin'

  const cargarLista = useCallback(() => {
    setLoading(true)
    getFormularios().then(setLista).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const cargarPortales = useCallback(() => {
    getPortales().then(setPortales).catch(() => {})
  }, [])

  useEffect(() => {
    cargarLista(); cargarPortales()
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/public/perfiles-opt`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setPerfilesOpt(d) }).catch(() => {})
  }, [cargarLista, cargarPortales])

  function nuevoFormulario() {
    setSelected({
      nombre: '',
      descripcion: '',
      activo: false,
      secciones: [emptySeccion()],
    })
    setIsNew(true)
    setViewRespuestas(false)
    setViewAnalisis(false)
  }

  async function abrirFormulario(id) {
    try {
      const f = await getFormulario(id)
      // Normalizar PascalCase (servidor) → camelCase (editor)
      f.nombre = f.Nombre || f.nombre || ''
      f.descripcion = f.Descripcion || f.descripcion || ''
      f.activo = f.Activo ?? f.activo ?? false
      f.secciones = (f.secciones || []).map(s => ({
        ...s, _id: uid(),
        titulo: s.Titulo || s.titulo || '',
        instrucciones: s.Instrucciones || s.instrucciones || '',
        preguntas: (s.preguntas || []).map(p => ({
          ...p, _id: uid(),
          texto: p.Texto || p.texto || '',
          tipoRespuesta: p.TipoRespuesta || p.tipoRespuesta || 'si_no_na',
          requerida: !!(p.Requerida ?? p.requerida),
          opciones: (p.opciones || []).map(o => ({
            ...o, _id: uid(),
            texto: o.Texto || o.texto || '',
          })),
        })),
      }))
      setSelected(f)
      setIsNew(false)
      setViewRespuestas(false)
      setViewAnalisis(false)
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

  async function guardarPortal() {
    if (!editPortal) return
    if (!editPortal.nombre?.trim() || !editPortal.slug?.trim()) { setError('Nombre y slug son requeridos'); return }
    try {
      if (editPortal.PortalId) {
        await updatePortal(editPortal.PortalId, editPortal)
      } else {
        await createPortal(editPortal)
      }
      cargarPortales()
      setEditPortal(null)
    } catch (e) { setError(e.message) }
  }

  async function eliminarPortal(id, e) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este portal?')) return
    try { await deletePortal(id); cargarPortales() } catch (e) { setError(e.message) }
  }

  async function togglePortalActivo(p, e) {
    e.stopPropagation()
    try { await updatePortal(p.PortalId, { activo: !p.Activo }); cargarPortales() } catch (e) { setError(e.message) }
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
                {f.Slug && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); const url = `${window.location.origin}/formulario/${f.Slug}`; navigator.clipboard.writeText(url).then(() => alert('Enlace copiado: ' + url)).catch(() => prompt('Copia este enlace:', url)) }}
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid #93c5fd', background: '#eff6ff', cursor: 'pointer', color: '#1d4ed8' }}>
                    Compartir enlace
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {!loading && lista.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
            Sin formularios aún
          </div>
        )}

        {/* ── Portales ── */}
        {isAdmin && (
          <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div
              onClick={() => setShowPortales(p => !p)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 8 }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Portales
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{showPortales ? '▲' : '▼'}</span>
            </div>

            {showPortales && (
              <>
                <button type="button" style={{ ...btnStyle('#8b5cf6'), width: '100%', padding: '7px', fontSize: 12, marginBottom: 8 }}
                  onClick={() => setEditPortal({ nombre: '', slug: '', descripcion: '', formularioIds: [], calendario: [] })}>
                  + Nuevo portal
                </button>

                {portales.map(p => (
                  <div key={p.PortalId}
                    onClick={() => setEditPortal({ ...p, nombre: p.Nombre, slug: p.Slug, descripcion: p.Descripcion || '', formularioIds: p.formularioIds || [], calendario: p.calendario || [] })}
                    style={{
                      background: editPortal?.PortalId === p.PortalId ? '#f5f3ff' : '#fff',
                      border: `1.5px solid ${editPortal?.PortalId === p.PortalId ? '#8b5cf6' : '#e2e8f0'}`,
                      borderRadius: 8, padding: '8px 10px', cursor: 'pointer', marginBottom: 6,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#1e293b' }}>{p.Nombre}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 8,
                        background: p.Activo ? '#dcfce7' : '#f1f5f9',
                        color: p.Activo ? '#15803d' : '#64748b',
                      }}>{p.Activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#8b5cf6', marginTop: 2 }}>/p/{p.Slug}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button type="button" onClick={e => togglePortalActivo(p, e)}
                        style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: p.Activo ? '#dc2626' : '#16a34a' }}>
                        {p.Activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); const url = `${window.location.origin}/p/${p.Slug}`; navigator.clipboard.writeText(url).then(() => alert('Enlace copiado: ' + url)).catch(() => prompt('Copia:', url)) }}
                        style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #c4b5fd', background: '#f5f3ff', cursor: 'pointer', color: '#7c3aed' }}>
                        Copiar enlace
                      </button>
                      <button type="button" onClick={e => eliminarPortal(p.PortalId, e)}
                        style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer', color: '#dc2626' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Panel derecho: editor / preview ── */}
      {selected && !viewRespuestas && !viewAnalisis ? (
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
                <>
                  <button type="button"
                    style={{ ...btnStyle('#fff'), color: '#475569', border: '1px solid #e2e8f0' }}
                    onClick={() => { setViewRespuestas(true); setViewAnalisis(false) }}>
                    Ver respuestas
                  </button>
                  <button type="button"
                    style={{ ...btnStyle('#fff'), color: '#8b5cf6', border: '1px solid #c4b5fd' }}
                    onClick={() => { setViewAnalisis(true); setViewRespuestas(false) }}>
                    Análisis
                  </button>
                </>
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
      ) : selected && viewAnalisis ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnalisisView formId={selected.FormularioId} onBack={() => setViewAnalisis(false)} />
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

      {/* ── Modal editor de portal ── */}
      {editPortal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setEditPortal(null)}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>
              {editPortal.PortalId ? 'Editar portal' : 'Nuevo portal'}
            </h3>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nombre *</label>
            <input value={editPortal.nombre || ''} onChange={e => setEditPortal(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Mi portal" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Slug (URL) *</label>
            <input value={editPortal.slug || ''} onChange={e => setEditPortal(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="mi-portal" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', marginBottom: 4 }} />
            <div style={{ fontSize: 11, color: '#8b5cf6', marginBottom: 12 }}>
              URL: {window.location.origin}/p/{editPortal.slug || '...'}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Descripción</label>
            <textarea value={editPortal.descripcion || ''} onChange={e => setEditPortal(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción del portal (opcional)" rows={2}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', marginBottom: 16, resize: 'vertical' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Formularios asignados</label>
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 7, padding: 8, marginBottom: 16 }}>
              {lista.filter(f => f.Activo).map(f => (
                <label key={f.FormularioId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={(editPortal.formularioIds || []).includes(f.FormularioId)}
                    onChange={e => {
                      const ids = editPortal.formularioIds || []
                      setEditPortal(p => ({
                        ...p,
                        formularioIds: e.target.checked ? [...ids, f.FormularioId] : ids.filter(id => id !== f.FormularioId),
                      }))
                    }} />
                  {f.Nombre}
                </label>
              ))}
              {lista.filter(f => f.Activo).length === 0 && (
                <div style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>No hay formularios activos</div>
              )}
            </div>

            {/* Calendarización */}
            {(editPortal.formularioIds || []).length > 0 && (
              <>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Calendarización (opcional)
                </label>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Define en qué semana (desde egreso) aparece cada encuesta y por cuántos días estará activa. Si no configuras reglas, todas las encuestas se muestran siempre.
                </div>
                {(editPortal.calendario || []).map((c, ci) => {
                  const formName = lista.find(f => f.FormularioId === (c.formularioId || c.FormularioId))?.Nombre || '?'
                  return (
                    <div key={ci} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <select value={c.formularioId || c.FormularioId || ''} onChange={e => {
                        const cal = [...(editPortal.calendario || [])]
                        cal[ci] = { ...cal[ci], formularioId: Number(e.target.value) }
                        setEditPortal(p => ({ ...p, calendario: cal }))
                      }} style={{ flex: '1 1 120px', border: '1px solid #e2e8f0', borderRadius: 5, padding: '5px 8px', fontSize: 12 }}>
                        <option value="">Formulario</option>
                        {(editPortal.formularioIds || []).map(fid => {
                          const fn = lista.find(f => f.FormularioId === fid)
                          return fn ? <option key={fid} value={fid}>{fn.Nombre}</option> : null
                        })}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Sem.</span>
                        <input type="number" min="1" value={c.semanaInicio || c.SemanaInicio || ''} onChange={e => {
                          const cal = [...(editPortal.calendario || [])]
                          cal[ci] = { ...cal[ci], semanaInicio: Number(e.target.value) }
                          setEditPortal(p => ({ ...p, calendario: cal }))
                        }} style={{ width: 50, border: '1px solid #e2e8f0', borderRadius: 5, padding: '5px 6px', fontSize: 12, textAlign: 'center' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Días</span>
                        <input type="number" min="1" value={c.diasActiva || c.DiasActiva || 7} onChange={e => {
                          const cal = [...(editPortal.calendario || [])]
                          cal[ci] = { ...cal[ci], diasActiva: Number(e.target.value) }
                          setEditPortal(p => ({ ...p, calendario: cal }))
                        }} style={{ width: 50, border: '1px solid #e2e8f0', borderRadius: 5, padding: '5px 6px', fontSize: 12, textAlign: 'center' }} />
                      </div>
                      <select value={c.perfil || c.Perfil || ''} onChange={e => {
                        const cal = [...(editPortal.calendario || [])]
                        cal[ci] = { ...cal[ci], perfil: e.target.value || null }
                        setEditPortal(p => ({ ...p, calendario: cal }))
                      }} style={{ flex: '0 1 130px', border: '1px solid #e2e8f0', borderRadius: 5, padding: '5px 8px', fontSize: 12 }}>
                        <option value="">Todos los perfiles</option>
                        {perfilesOpt.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button type="button" onClick={() => {
                        const cal = (editPortal.calendario || []).filter((_, i) => i !== ci)
                        setEditPortal(p => ({ ...p, calendario: cal }))
                      }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
                    </div>
                  )
                })}
                <button type="button" onClick={() => {
                  const cal = [...(editPortal.calendario || []), { formularioId: '', semanaInicio: 1, diasActiva: 7, perfil: null }]
                  setEditPortal(p => ({ ...p, calendario: cal }))
                }} style={{ fontSize: 11, color: '#8b5cf6', background: 'none', border: '1px dashed #c4b5fd', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', marginBottom: 16 }}>
                  + Agregar regla
                </button>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={{ ...btnStyle('#8b5cf6'), flex: 1, padding: '9px' }} onClick={guardarPortal} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar portal'}
              </button>
              <button type="button" style={{ ...btnStyle('#fff'), color: '#64748b', border: '1px solid #e2e8f0', padding: '9px 16px' }}
                onClick={() => setEditPortal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
