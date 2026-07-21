import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#374151', marginBottom: '6px',
}
const inputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#111827',
  background: '#fff',
}

export default function RegistroVisitaPublica() {
  const [form, setForm] = useState({
    NombreVisitante: '', Empresa: '', Documento: '',
    AQuienVisita: '', Motivo: '', TipoVisita: 'general',
  })
  const [enviando, setEnviando] = useState(false)
  const [folio, setFolio] = useState(null)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.NombreVisitante.trim()) {
      setError('El nombre del visitante es obligatorio.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/public/registrar-visita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NombreVisitante: form.NombreVisitante.trim(),
          Empresa:         form.Empresa.trim()         || null,
          Documento:       form.Documento.trim()       || null,
          AQuienVisita:    form.AQuienVisita.trim()    || null,
          Motivo:          form.Motivo.trim()           || null,
          TipoVisita:      form.TipoVisita,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al registrar la visita')
      setFolio(data.folio)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function resetForm() {
    setFolio(null)
    setForm({ NombreVisitante: '', Empresa: '', Documento: '', AQuienVisita: '', Motivo: '', TipoVisita: 'general' })
  }

  if (folio) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#166534', margin: '0 0 8px', fontSize: '22px' }}>¡Entrada registrada!</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
            Tu visita fue registrada correctamente. El personal de seguridad registrará tu salida.
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: '#15803d', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Número de folio</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#14532d', margin: 0 }}>{folio}</p>
          </div>
          <button
            onClick={resetForm}
            style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 28px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            Registrar otra visita
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '28px 16px 40px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ background: '#1e3a5f', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '10px', padding: '10px 20px', marginBottom: '14px' }}>
            <span style={{ color: '#fff', fontWeight: '700', fontSize: '18px', letterSpacing: '2px' }}>UDAT</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Registro de Visita</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Completa el formulario para registrar tu entrada</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '12px', padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', color: '#991b1b', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: '14px' }}>

            <div>
              <label style={labelStyle}>Nombre del visitante *</label>
              <input
                name="NombreVisitante" value={form.NombreVisitante} onChange={handleChange}
                required style={inputStyle} placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label style={labelStyle}>Empresa / Organización</label>
              <input
                name="Empresa" value={form.Empresa} onChange={handleChange}
                style={inputStyle} placeholder="Empresa u organización (opcional)"
              />
            </div>

            <div>
              <label style={labelStyle}>Documento / ID</label>
              <input
                name="Documento" value={form.Documento} onChange={handleChange}
                style={inputStyle} placeholder="INE, pasaporte, credencial..."
              />
            </div>

            <div>
              <label style={labelStyle}>A quién visita</label>
              <input
                name="AQuienVisita" value={form.AQuienVisita} onChange={handleChange}
                style={inputStyle} placeholder="Persona o área que visita"
              />
            </div>

            <div>
              <label style={labelStyle}>Motivo de la visita</label>
              <textarea
                name="Motivo" value={form.Motivo} onChange={handleChange}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Describe brevemente el motivo de tu visita..."
              />
            </div>

            <div>
              <label style={labelStyle}>Tipo de visita</label>
              <select name="TipoVisita" value={form.TipoVisita} onChange={handleChange} style={inputStyle}>
                <option value="general">General</option>
                <option value="proveedor">Proveedor</option>
                <option value="contratista">Contratista</option>
                <option value="entrega">Entrega / Mensajería</option>
                <option value="institucional">Institucional</option>
              </select>
            </div>

          </div>

          <button
            type="submit" disabled={enviando}
            style={{
              width: '100%', marginTop: '22px',
              background: enviando ? '#94a3b8' : '#1e3a5f',
              color: '#fff', border: 'none', borderRadius: '8px',
              padding: '14px', fontSize: '15px', fontWeight: '600',
              cursor: enviando ? 'not-allowed' : 'pointer', transition: 'background .2s',
            }}
          >
            {enviando ? 'Registrando...' : 'Registrar entrada'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '14px', marginBottom: 0 }}>
            El personal de seguridad registrará tu salida al momento de retirarte.
          </p>
        </form>
      </div>
    </div>
  )
}
