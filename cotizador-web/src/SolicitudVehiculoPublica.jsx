import { useEffect, useState, useRef } from 'react'

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

// Dropdown con buscador
function SearchDropdown({ options, value, onChange, placeholder, labelKey = 'Nombre', valueKey = 'id' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const selected = options.find(o => o[valueKey] === value)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o[labelKey]?.toLowerCase().includes(q.toLowerCase()))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(p => !p); setQ('') }}
        style={{
          ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
          color: selected ? '#111827' : '#9ca3af',
        }}
      >
        <span>{selected ? selected[labelKey] : placeholder}</span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,.1)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar..."
              style={{ ...inputStyle, padding: '7px 10px', fontSize: '13px' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length === 0
              ? <p style={{ padding: '10px 14px', color: '#9ca3af', fontSize: '13px', margin: 0 }}>Sin resultados</p>
              : filtered.map(o => (
                <div
                  key={o[valueKey]}
                  onClick={() => { onChange(o[valueKey]); setOpen(false) }}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: '14px',
                    background: o[valueKey] === value ? '#f0f9ff' : '#fff',
                    color: o[valueKey] === value ? '#0369a1' : '#111827',
                    fontWeight: o[valueKey] === value ? 600 : 400,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = o[valueKey] === value ? '#f0f9ff' : '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = o[valueKey] === value ? '#f0f9ff' : '#fff'}
                >
                  {o[labelKey]}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// Multi-select de alumnos
function AlumnosPicker({ generaciones, alumnos, loadingAlumnos, genId, onGenChange, seleccionados, onToggle }) {
  const [q, setQ] = useState('')
  const filtrados = alumnos.filter(a => a.Nombre?.toLowerCase().includes(q.toLowerCase()) || a.Matricula?.includes(q))

  return (
    <div>
      <label style={labelStyle}>Generación</label>
      <SearchDropdown
        options={generaciones}
        value={genId}
        onChange={onGenChange}
        placeholder="Selecciona una generación..."
        labelKey="Nombre"
        valueKey="GeneracionId"
      />

      {genId && (
        <div style={{ marginTop: '12px' }}>
          <label style={labelStyle}>Alumnos que van</label>
          {loadingAlumnos ? (
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>Cargando alumnos…</p>
          ) : (
            <>
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar alumno..."
                style={{ ...inputStyle, marginBottom: '8px' }}
              />
              <div style={{
                border: '1px solid #d1d5db', borderRadius: '8px', maxHeight: '180px',
                overflowY: 'auto', background: '#fff',
              }}>
                {filtrados.length === 0
                  ? <p style={{ padding: '12px', color: '#9ca3af', fontSize: '13px', margin: 0 }}>Sin resultados</p>
                  : filtrados.map(a => {
                    const sel = seleccionados.some(s => s.OperadorId === a.OperadorId)
                    return (
                      <label key={a.OperadorId} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', cursor: 'pointer',
                        background: sel ? '#f0fdf4' : '#fff',
                        borderBottom: '1px solid #f3f4f6',
                      }}>
                        <input type="checkbox" checked={sel} onChange={() => onToggle(a)} style={{ accentColor: '#16a34a' }} />
                        <span style={{ fontSize: '13px', color: '#111827' }}>{a.Nombre}</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto', fontFamily: 'monospace' }}>{a.Matricula}</span>
                      </label>
                    )
                  })
                }
              </div>
            </>
          )}
        </div>
      )}

      {seleccionados.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {seleccionados.map(a => (
            <span key={a.OperadorId} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: '#dcfce7', color: '#15803d', borderRadius: '999px',
              padding: '3px 10px', fontSize: '12px', fontWeight: 600,
            }}>
              {a.Nombre}
              <button
                type="button"
                onClick={() => onToggle(a)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 800, padding: '0 2px', lineHeight: 1 }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const ANGULOS = [
  { key: 'Frontal', label: 'Frontal' },
  { key: 'Trasero', label: 'Trasero' },
  { key: 'LateralIzq', label: 'Lateral Izq.' },
  { key: 'LateralDer', label: 'Lateral Der.' },
]

async function uploadFotoPublica(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const fd = new FormData()
        fd.append('file', ev.target.result)
        fd.append('upload_preset', 'douxyql6')
        fd.append('folder', 'vehiculos')
        const r = await fetch('https://api.cloudinary.com/v1_1/kcj1hrdy/image/upload', { method: 'POST', body: fd })
        const data = await r.json()
        if (data.error) throw new Error(data.error.message)
        resolve(data.secure_url)
      } catch (e) { reject(e) }
    }
    reader.readAsDataURL(file)
  })
}

export default function SolicitudVehiculoPublica() {
  const [vehiculos, setVehiculos]       = useState([])
  const [usuarios, setUsuarios]         = useState([])
  const [generaciones, setGeneraciones] = useState([])
  const [alumnos, setAlumnos]           = useState([])
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [genId, setGenId]               = useState(null)
  const [seleccionados, setSeleccionados] = useState([])

  const fotoVacía = { Frontal: null, Trasero: null, LateralIzq: null, LateralDer: null }
  const [fotos, setFotos]               = useState(fotoVacía)
  const [uploadingFoto, setUploadingFoto] = useState({})

  const [form, setForm] = useState({
    SolicitanteId: null, VehiculoId: '', Destino: '',
    Motivo: '', FechaSalidaEstimada: '', HoraSalidaEstimada: '', Observaciones: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [folio, setFolio]       = useState(null)
  const [error, setError]       = useState(null)

  async function handleFotoChange(angulo, file) {
    if (!file) return
    setUploadingFoto(p => ({ ...p, [angulo]: true }))
    try {
      const url = await uploadFotoPublica(file)
      setFotos(p => ({ ...p, [angulo]: url }))
    } catch (e) { alert('Error subiendo foto: ' + e.message) }
    finally { setUploadingFoto(p => ({ ...p, [angulo]: false })) }
  }

  useEffect(() => {
    fetch(`${API_BASE}/public/vehiculos`).then(r => r.json()).then(d => { if (Array.isArray(d)) setVehiculos(d) }).catch(() => {})
    fetch(`${API_BASE}/public/usuarios`).then(r => r.json()).then(d => { if (Array.isArray(d)) setUsuarios(d) }).catch(() => {})
    fetch(`${API_BASE}/public/generaciones`).then(r => r.json()).then(d => { if (Array.isArray(d)) setGeneraciones(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!genId) { setAlumnos([]); return }
    setLoadingAlumnos(true)
    fetch(`${API_BASE}/public/alumnos-por-generacion?genId=${genId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAlumnos(d) })
      .catch(() => {})
      .finally(() => setLoadingAlumnos(false))
  }, [genId])

  function toggleAlumno(a) {
    setSeleccionados(prev =>
      prev.some(s => s.OperadorId === a.OperadorId)
        ? prev.filter(s => s.OperadorId !== a.OperadorId)
        : [...prev, a]
    )
  }

  const solicitanteNombre = usuarios.find(u => u.UsuarioId === form.SolicitanteId)?.Nombre || ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.SolicitanteId) { setError('Selecciona tu nombre en la lista.'); return }
    if (!form.Destino.trim()) { setError('El destino es obligatorio.'); return }
    if (!form.FechaSalidaEstimada) { setError('La fecha de salida es obligatoria.'); return }
    setEnviando(true); setError(null)
    try {
      const body = {
        VehiculoId: form.VehiculoId ? Number(form.VehiculoId) : null,
        Solicitante: solicitanteNombre,
        Destino: form.Destino.trim(),
        Motivo: form.Motivo.trim() || null,
        FechaSalidaEstimada: form.FechaSalidaEstimada,
        HoraSalidaEstimada: form.HoraSalidaEstimada || null,
        Pasajeros: seleccionados.length || null,
        Observaciones: form.Observaciones.trim() || null,
        Alumnos: seleccionados.map(a => ({ OperadorId: a.OperadorId, Matricula: a.Matricula, Nombre: a.Nombre })),
        FotoSalidaFrontal:    fotos.Frontal    || null,
        FotoSalidaTrasero:    fotos.Trasero    || null,
        FotoSalidaLateralIzq: fotos.LateralIzq || null,
        FotoSalidaLateralDer: fotos.LateralDer || null,
      }
      const r = await fetch(`${API_BASE}/public/solicitud-vehiculo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al enviar')
      setFolio(data.folio)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function resetForm() {
    setFolio(null); setSeleccionados([]); setGenId(null); setFotos(fotoVacía)
    setForm({ SolicitanteId: null, VehiculoId: '', Destino: '', Motivo: '', FechaSalidaEstimada: '', HoraSalidaEstimada: '', Observaciones: '' })
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
          <button onClick={resetForm} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 28px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
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

          <div style={{ display: 'grid', gap: '16px' }}>

            <div>
              <label style={labelStyle}>Solicitante *</label>
              <SearchDropdown
                options={usuarios}
                value={form.SolicitanteId}
                onChange={v => setForm(p => ({ ...p, SolicitanteId: v }))}
                placeholder="Busca tu nombre..."
                labelKey="Nombre"
                valueKey="UsuarioId"
              />
            </div>

            <div>
              <label style={labelStyle}>Vehículo preferido</label>
              <select value={form.VehiculoId} onChange={e => setForm(p => ({ ...p, VehiculoId: e.target.value }))} style={inputStyle}>
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
                value={form.Destino} onChange={e => setForm(p => ({ ...p, Destino: e.target.value }))}
                required style={inputStyle} placeholder="¿A dónde se dirige?"
              />
            </div>

            <div>
              <label style={labelStyle}>Motivo del viaje</label>
              <textarea
                value={form.Motivo} onChange={e => setForm(p => ({ ...p, Motivo: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Describe brevemente el motivo del traslado..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Fecha de salida *</label>
                <input
                  type="date" value={form.FechaSalidaEstimada}
                  onChange={e => setForm(p => ({ ...p, FechaSalidaEstimada: e.target.value }))}
                  required style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Hora estimada</label>
                <input
                  type="time" value={form.HoraSalidaEstimada}
                  onChange={e => setForm(p => ({ ...p, HoraSalidaEstimada: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Selector de alumnos */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Alumnos que acompañan <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span>
              </p>
              <AlumnosPicker
                generaciones={generaciones}
                alumnos={alumnos}
                loadingAlumnos={loadingAlumnos}
                genId={genId}
                onGenChange={id => setGenId(id)}
                seleccionados={seleccionados}
                onToggle={toggleAlumno}
              />
            </div>

            <div>
              <label style={labelStyle}>Observaciones adicionales</label>
              <textarea
                value={form.Observaciones} onChange={e => setForm(p => ({ ...p, Observaciones: e.target.value }))}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Cualquier detalle extra que deba conocer el encargado..."
              />
            </div>

            {/* Fotos del vehículo */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Fotos del vehículo <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span>
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>
                Toma una foto de cada ángulo del vehículo antes de salir.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {ANGULOS.map(({ key, label }) => {
                  const url = fotos[key]
                  const uploading = uploadingFoto[key]
                  return (
                    <label key={key} style={{
                      cursor: 'pointer',
                      border: `2px dashed ${url ? '#16a34a' : '#d1d5db'}`,
                      borderRadius: '8px', overflow: 'hidden',
                      background: url ? '#f0fdf4' : '#f9fafb',
                      minHeight: '90px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}>
                      <input
                        type="file" accept="image/*" capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => handleFotoChange(key, e.target.files[0])}
                      />
                      {uploading ? (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Subiendo...</span>
                      ) : url ? (
                        <>
                          <img src={url} alt={label} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, padding: '3px' }}>✓ {label}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '22px', marginBottom: '4px' }}>📷</span>
                          <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', padding: '0 4px' }}>{label}</span>
                        </>
                      )}
                    </label>
                  )
                })}
              </div>
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
