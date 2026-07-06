import { useEffect, useState } from 'react'

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

export default function SolicitudVehiculoPublica() {
  const [vehiculos, setVehiculos] = useState([])
  const [form, setForm] = useState({
    Solicitante: '', Area: '', VehiculoId: '', Destino: '',
    Motivo: '', FechaSalidaEstimada: '', HoraSalidaEstimada: '',
    Pasajeros: '', Observaciones: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [folio, setFolio] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/public/vehiculos`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVehiculos(data) })
      .catch(() => {})
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.Solicitante.trim() || !form.Destino.trim() || !form.FechaSalidaEstimada) {
      setError('Por favor llena los campos obligatorios (*).')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const obs = [
        form.Area ? `Área/Dpto: ${form.Area}` : '',
        form.Observaciones,
      ].filter(Boolean).join('. ')
      const body = {
        VehiculoId: form.VehiculoId ? Number(form.VehiculoId) : null,
        Solicitante: form.Solicitante.trim(),
        Destino: form.Destino.trim(),
        Motivo: form.Motivo.trim() || null,
        FechaSalidaEstimada: form.FechaSalidaEstimada,
        HoraSalidaEstimada: form.HoraSalidaEstimada || null,
        Pasajeros: form.Pasajeros ? Number(form.Pasajeros) : null,
        Observaciones: obs || null,
      }
      const r = await fetch(`${API_BASE}/public/solicitud-vehiculo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al enviar la solicitud')
      setFolio(data.folio)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function resetForm() {
    setFolio(null)
    setForm({ Solicitante:'', Area:'', VehiculoId:'', Destino:'', Motivo:'', FechaSalidaEstimada:'', HoraSalidaEstimada:'', Pasajeros:'', Observaciones:'' })
  }

  if (folio) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#166534', margin: '0 0 8px', fontSize: '22px' }}>¡Solicitud enviada!</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
            Tu solicitud fue registrada. El encargado de vehículos recibirá la notificación.
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: '#15803d', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Número de folio</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#14532d', margin: 0 }}>{folio}</p>
          </div>
          <button
            onClick={resetForm}
            style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 28px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            Nueva solicitud
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '28px 16px 40px' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ background: '#1e3a5f', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '10px', padding: '10px 20px', marginBottom: '14px' }}>
            <span style={{ color: '#fff', fontWeight: '700', fontSize: '18px', letterSpacing: '2px' }}>UDAT</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Solicitud de Vehículo</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Completa el formulario para solicitar el uso de un vehículo</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '12px', padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', color: '#991b1b', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: '14px' }}>

            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input
                name="Solicitante" value={form.Solicitante} onChange={handleChange}
                required style={inputStyle} placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label style={labelStyle}>Área / Departamento</label>
              <input
                name="Area" value={form.Area} onChange={handleChange}
                style={inputStyle} placeholder="Ej: Recursos Humanos, Contabilidad..."
              />
            </div>

            <div>
              <label style={labelStyle}>Vehículo preferido</label>
              <select name="VehiculoId" value={form.VehiculoId} onChange={handleChange} style={inputStyle}>
                <option value="">— Sin preferencia —</option>
                {vehiculos.map(v => (
                  <option key={v.VehiculoId} value={v.VehiculoId}>
                    {v.Marca} {v.Modelo} ({v.Placa}){v.Capacidad ? ` · ${v.Capacidad} pax` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Destino *</label>
              <input
                name="Destino" value={form.Destino} onChange={handleChange}
                required style={inputStyle} placeholder="¿A dónde se dirige?"
              />
            </div>

            <div>
              <label style={labelStyle}>Motivo del viaje</label>
              <textarea
                name="Motivo" value={form.Motivo} onChange={handleChange}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Describe brevemente el motivo del traslado..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Fecha de salida *</label>
                <input
                  type="date" name="FechaSalidaEstimada" value={form.FechaSalidaEstimada}
                  onChange={handleChange} required style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Hora estimada</label>
                <input
                  type="time" name="HoraSalidaEstimada" value={form.HoraSalidaEstimada}
                  onChange={handleChange} style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Número de pasajeros</label>
              <input
                type="number" name="Pasajeros" value={form.Pasajeros} onChange={handleChange}
                style={inputStyle} min="1" max="99" placeholder="1"
              />
            </div>

            <div>
              <label style={labelStyle}>Observaciones adicionales</label>
              <textarea
                name="Observaciones" value={form.Observaciones} onChange={handleChange}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Cualquier detalle extra que deba conocer el encargado..."
              />
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
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '14px', marginBottom: 0 }}>
            Al enviar, el encargado de vehículos recibirá una notificación por email.
          </p>
        </form>
      </div>
    </div>
  )
}
