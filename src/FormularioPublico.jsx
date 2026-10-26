import { useEffect, useState, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const CLOUD_NAME = 'kcj1hrdy'
const UPLOAD_PRESET = 'douxyql6'

async function uploadImage(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', UPLOAD_PRESET)
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
  const data = await r.json()
  return data.secure_url
}

export default function FormularioPublico() {
  const slug = window.location.pathname.split('/formulario/')[1]
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [valores, setValores] = useState({})
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [uploadingKeys, setUploadingKeys] = useState(new Set())

  useEffect(() => {
    if (!slug) { setError('URL inválida'); setLoading(false); return }
    fetch(`${API}/formularios/publico/${slug}`)
      .then(r => { if (!r.ok) throw new Error('No encontrado'); return r.json() })
      .then(d => {
        // Normalizar PascalCase (SQL Server) → camelCase (componente)
        d.secciones = (d.secciones || []).map(s => ({
          ...s,
          titulo: s.Titulo || s.titulo || '',
          preguntas: (s.preguntas || []).map(p => ({
            ...p,
            texto: p.Texto || p.texto || '',
            tipoRespuesta: p.TipoRespuesta || p.tipoRespuesta || 'texto',
            requerida: !!(p.Requerida ?? p.requerida),
            opciones: (p.opciones || []).map(o => (typeof o === 'string' ? o : o.Texto || o.texto || '')),
          })),
        }))
        setForm(d)
        setLoading(false)
      })
      .catch(() => { setError('Formulario no encontrado o inactivo'); setLoading(false) })
  }, [slug])

  function setVal(preguntaId, value) {
    setValores(v => ({ ...v, [preguntaId]: value }))
  }

  async function handleMediaUpload(preguntaId, file) {
    const key = String(preguntaId)
    setUploadingKeys(s => new Set(s).add(key))
    try {
      const url = await uploadImage(file)
      setVal(preguntaId, url)
    } catch { alert('Error al subir imagen') }
    finally { setUploadingKeys(s => { const n = new Set(s); n.delete(key); return n }) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form) return

    const allPreguntas = (form.secciones || []).flatMap(s => s.preguntas || [])
    const missing = allPreguntas.filter(p => p.requerida && !valores[p.PreguntaId]?.toString().trim())
    if (missing.length) { alert(`Faltan ${missing.length} respuestas obligatorias`); return }

    setEnviando(true)
    try {
      const body = {
        nombreUsuario: nombre || 'Anónimo',
        valores: Object.entries(valores).map(([pid, val]) => ({
          preguntaId: parseInt(pid),
          valor: val,
        })),
      }
      const r = await fetch(`${API}/formularios/publico/${slug}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error('Error al enviar')
      setEnviado(true)
    } catch (err) {
      alert(err.message || 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  const wrap = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex', justifyContent: 'center',
    padding: '32px 16px',
  }
  const card = {
    width: '100%', maxWidth: 560, background: '#fff',
    borderRadius: 16, overflow: 'hidden',
  }
  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
    background: '#f9fafb',
  }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }

  if (loading) return <div style={wrap}><div style={{ color: '#94a3b8' }}>Cargando formulario...</div></div>
  if (error) return (
    <div style={wrap}>
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{error}</div>
        <a href="/portal" style={{ color: '#f59e0b', fontSize: 14 }}>← Volver al portal</a>
      </div>
    </div>
  )
  if (enviado) return (
    <div style={wrap}>
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>¡Respuesta enviada!</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Tu respuesta ha sido registrada exitosamente.</p>
        <a href="/portal" style={{ color: '#f59e0b', fontSize: 14 }}>← Volver al portal</a>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={card}>
        {/* Header */}
        <div style={{ background: '#1e293b', padding: '24px 24px 20px' }}>
          <a href="/portal" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>← Portal</a>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', textTransform: 'uppercase', marginBottom: 4 }}>
            Formulario
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
            {form.Nombre}
          </h1>
          {form.Descripcion && <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94a3b8' }}>{form.Descripcion}</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Nombre del usuario */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Tu nombre</label>
            <input style={inp} placeholder="Nombre (opcional)" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>

          {(form.secciones || []).map((sec, si) => (
            <div key={si} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                borderBottom: '2px solid #e5e7eb', paddingBottom: 6, marginBottom: 16,
              }}>
                {sec.titulo}
              </div>

              {(sec.preguntas || []).map((preg) => (
                <div key={preg.PreguntaId} style={{ marginBottom: 18 }}>
                  <label style={{ ...lbl, fontSize: 14, fontWeight: 500 }}>
                    {preg.texto}
                    {preg.requerida && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                  </label>
                  <RespuestaInput
                    tipo={preg.tipoRespuesta}
                    opciones={preg.opciones || []}
                    value={valores[preg.PreguntaId] || ''}
                    onChange={v => setVal(preg.PreguntaId, v)}
                    onFileSelect={f => handleMediaUpload(preg.PreguntaId, f)}
                    uploading={uploadingKeys.has(String(preg.PreguntaId))}
                    inp={inp}
                  />
                </div>
              ))}
            </div>
          ))}

          <button type="submit" disabled={enviando || uploadingKeys.size > 0} style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: enviando ? '#fbbf24' : '#f59e0b', color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: enviando ? 'not-allowed' : 'pointer',
            opacity: enviando ? 0.8 : 1,
          }}>
            {enviando ? 'Enviando...' : 'Enviar respuesta'}
          </button>
        </form>
      </div>
    </div>
  )
}

function RespuestaInput({ tipo, opciones, value, onChange, onFileSelect, uploading, inp }) {
  const fileRef = useRef(null)

  if (tipo === 'si_no_na') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {['Sí', 'No', 'N/A'].map(opt => (
          <button type="button" key={opt} onClick={() => onChange(opt)} style={{
            flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
            border: value === opt ? '2px solid #f59e0b' : '1px solid #d1d5db',
            background: value === opt ? '#fffbeb' : '#f9fafb',
            color: value === opt ? '#92400e' : '#374151',
          }}>
            {opt}
          </button>
        ))}
      </div>
    )
  }

  if (tipo === 'opcion_multiple') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {opciones.map((opt, i) => (
          <label key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
            border: value === opt ? '2px solid #f59e0b' : '1px solid #d1d5db',
            background: value === opt ? '#fffbeb' : '#f9fafb',
          }}>
            <input type="radio" name={`opt_${Math.random()}`} checked={value === opt}
              onChange={() => onChange(opt)} style={{ accentColor: '#f59e0b' }} />
            <span style={{ fontSize: 14, color: '#1e293b' }}>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (tipo === 'casilla') {
    return (
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '10px 12px', borderRadius: 8,
        border: value ? '2px solid #f59e0b' : '1px solid #d1d5db',
        background: value ? '#fffbeb' : '#f9fafb',
      }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#f59e0b' }} />
        <span style={{ fontSize: 14, color: '#1e293b' }}>Marcar</span>
      </label>
    )
  }

  if (tipo === 'numero') {
    return <input type="number" style={inp} value={value} onChange={e => onChange(e.target.value)} placeholder="0" />
  }

  if (tipo === 'fecha') {
    return <input type="datetime-local" style={inp} value={value} onChange={e => onChange(e.target.value)} />
  }

  if (tipo === 'media') {
    return (
      <div>
        {value && <img src={value} alt="Foto" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) onFileSelect(e.target.files[0]) }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db',
          background: '#f9fafb', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
        }}>
          {uploading ? 'Subiendo...' : value ? 'Cambiar foto' : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><path d="M3 7c0-1.1.9-2 2-2h2.2l1.4-2h6.8l1.4 2H19c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z"/><circle cx="12" cy="12.5" r="4"/></svg>Tomar foto</>)}
        </button>
      </div>
    )
  }

  if (tipo === 'firma') {
    return <SignaturePad value={value} onChange={onChange} />
  }

  // texto (default)
  return <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={value} onChange={e => onChange(e.target.value)} placeholder="Escribe tu respuesta..." />
}

function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: t.clientX - rect.left, y: t.clientY - rect.top }
  }

  function startDraw(e) {
    e.preventDefault()
    setDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function draw(e) {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function endDraw() {
    setDrawing(false)
    if (canvasRef.current) onChange(canvasRef.current.toDataURL())
  }

  function clear() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    onChange('')
  }

  return (
    <div>
      <canvas ref={canvasRef} width={320} height={120}
        style={{ border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', touchAction: 'none', width: '100%', maxWidth: 320 }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
      <button type="button" onClick={clear} style={{
        marginTop: 6, padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db',
        background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280',
      }}>
        Limpiar firma
      </button>
    </div>
  )
}
