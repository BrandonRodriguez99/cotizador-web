import { useEffect, useState, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
const CLOUD_NAME = 'kcj1hrdy'
const UPLOAD_PRESET = 'douxyql6'

const TIPO_LABEL = { diesel: 'Diésel', gasolina: 'Gasolina', urea: 'UREA' }

export default function CargaDieselPublica() {
  const hoy = new Date().toISOString().slice(0, 10)
  const [vehiculos, setVehiculos] = useState([])
  const [precios, setPrecios] = useState({})
  const [form, setForm] = useState({
    vehiculoIdx: 0, tipo: 'diesel', fecha: hoy,
    litros: '', kmActual: '', valorPesos: '',
    folioTicket: '', operadorNombre: '',
  })
  const [fotoUrl, setFotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    fetch(`${API}/diesel/publico/vehiculos`).then(r => r.json()).then(setVehiculos).catch(() => {})
    fetch(`${API}/diesel/publico/precios`).then(r => r.json()).then(setPrecios).catch(() => {})
  }, [])

  useEffect(() => {
    const p = precios[form.tipo]
    if (p != null && p > 0) setForm(f => ({ ...f, valorPesos: String(p) }))
  }, [form.tipo, precios])

  async function handleFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', UPLOAD_PRESET)
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
      const data = await r.json()
      setFotoUrl(data.secure_url)
    } catch { setError('Error al subir foto') }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.litros || !form.kmActual) { setError('Litros y KM son obligatorios'); return }
    if (!form.operadorNombre.trim()) { setError('El nombre del operador es obligatorio'); return }

    const vehiculo = vehiculos[form.vehiculoIdx]
    setSaving(true)
    try {
      const r = await fetch(`${API}/diesel/publico/cargas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId: vehiculo?.VehiculoId ?? null,
          vehiculoNombre: vehiculo?.Nombre ?? '',
          fecha: form.fecha,
          tipo: form.tipo,
          litros: parseFloat(form.litros),
          kmActual: parseInt(form.kmActual),
          valorPesos: form.valorPesos !== '' ? parseFloat(form.valorPesos) : null,
          folioTicket: form.folioTicket || null,
          operadorNombre: form.operadorNombre,
          urlFotoTicket: fotoUrl,
        }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Error al enviar') }
      setEnviado(true)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const wrap = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex', justifyContent: 'center', padding: '32px 16px',
  }
  const card = { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 16, overflow: 'hidden' }
  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#f9fafb',
  }
  const lbl = { fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', marginBottom: 6, display: 'block', textTransform: 'uppercase' }

  if (enviado) return (
    <div style={wrap}>
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>¡Carga registrada!</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>La carga de combustible se registró exitosamente.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <a href="/portal" style={{ color: '#3b82f6', fontSize: 14, textDecoration: 'none' }}>← Portal</a>
          <button onClick={() => { setEnviado(false); setFotoUrl(null); setForm(f => ({ ...f, litros: '', kmActual: '', folioTicket: '' })) }}
            style={{ color: '#3b82f6', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Registrar otra
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ background: '#1e293b', padding: '24px 24px 20px' }}>
          <a href="/portal" style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'none' }}>← Portal</a>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
            Control de Combustible
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Nueva carga</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Operador</label>
            <input style={inp} placeholder="Tu nombre" value={form.operadorNombre} onChange={set('operadorNombre')} />
          </div>

          <div>
            <label style={lbl}>Vehículo</label>
            <select style={inp} value={form.vehiculoIdx} onChange={e => setForm(f => ({ ...f, vehiculoIdx: Number(e.target.value) }))}>
              {vehiculos.length === 0
                ? <option>Cargando vehículos...</option>
                : vehiculos.map((v, i) => <option key={v.VehiculoId} value={i}>{v.Nombre}</option>)
              }
            </select>
          </div>

          <div>
            <label style={lbl}>Tipo de combustible</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['diesel', 'gasolina', 'urea'].map(t => (
                <button type="button" key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  border: form.tipo === t ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  background: form.tipo === t ? '#eff6ff' : '#f9fafb',
                  color: form.tipo === t ? '#1d4ed8' : '#374151',
                }}>
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>Fecha</label>
            <input type="date" style={inp} value={form.fecha} onChange={set('fecha')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Litros *</label>
              <input type="number" step="0.1" placeholder="0.0" style={inp} value={form.litros} onChange={set('litros')} />
            </div>
            <div>
              <label style={lbl}>KM actual *</label>
              <input type="number" placeholder="Odómetro" style={inp} value={form.kmActual} onChange={set('kmActual')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Folio ticket</label>
              <input style={inp} placeholder="89267" value={form.folioTicket} onChange={set('folioTicket')} />
            </div>
            <div>
              <label style={lbl}>Valor ($/L)</label>
              <input type="number" step="0.01" style={{ ...inp, background: '#f3f4f6', color: '#6b7280' }}
                value={form.valorPesos} onChange={set('valorPesos')} readOnly />
            </div>
          </div>

          <div>
            <label style={lbl}>Foto del ticket</label>
            {fotoUrl && <img src={fotoUrl} alt="Ticket" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFoto} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
              padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db',
              background: '#f9fafb', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
            }}>
              {uploading ? 'Subiendo...' : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><path d="M3 7c0-1.1.9-2 2-2h2.2l1.4-2h6.8l1.4 2H19c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z"/><circle cx="12" cy="12.5" r="4"/></svg>{fotoUrl ? 'Cambiar foto' : 'Tomar foto'}</>)}
            </button>
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>{error}</div>}

          <button type="submit" disabled={saving || uploading} style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: '#f59e0b', color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Registrando...' : 'Registrar carga'}
          </button>
        </form>
      </div>
    </div>
  )
}
