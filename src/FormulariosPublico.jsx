import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function FormulariosPublico() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/formularios/publico/lista`)
      .then(r => r.json())
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const wrap = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 16px',
  }

  return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <a href="/portal" style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none' }}>← Volver al portal</a>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: '12px 0 0' }}>Formularios</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>Selecciona un formulario para contestar</p>
      </div>

      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: '#94a3b8', textAlign: 'center' }}>Cargando...</div>}

        {!loading && forms.length === 0 && (
          <div style={{
            background: '#1e293b', borderRadius: 12, padding: 32,
            textAlign: 'center', color: '#64748b', fontSize: 14,
            border: '1px solid #334155',
          }}>
            No hay formularios disponibles por el momento.
          </div>
        )}

        {forms.map(f => (
          <a key={f.FormularioId} href={`/formulario/${f.Slug}`} style={{
            textDecoration: 'none', color: 'inherit',
            background: '#1e293b', borderRadius: 12,
            border: '1px solid #334155', padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#8b5cf6'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: '#0f172a', border: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="#8b5cf6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="12" y2="17"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{f.Nombre}</div>
              {f.Descripcion && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{f.Descripcion}</div>}
            </div>
            <div style={{ color: '#475569', fontSize: 20 }}>›</div>
          </a>
        ))}
      </div>
    </div>
  )
}
