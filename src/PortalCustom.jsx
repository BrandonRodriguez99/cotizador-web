import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function PortalCustom() {
  const slug = window.location.pathname.split('/p/')[1]
  const [portal, setPortal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) { setError('URL inválida'); setLoading(false); return }
    fetch(`${API}/public/portal/${slug}`)
      .then(r => { if (!r.ok) throw new Error('Portal no encontrado'); return r.json() })
      .then(d => { setPortal(d); setLoading(false) })
      .catch(() => { setError('Portal no encontrado o inactivo'); setLoading(false) })
  }, [slug])

  const wrap = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 16px',
  }

  if (loading) return <div style={wrap}><div style={{ color: '#94a3b8' }}>Cargando portal...</div></div>
  if (error) return (
    <div style={wrap}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center',
        maxWidth: 420, width: '100%',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{error}</div>
        <a href="/portal" style={{ color: '#3b82f6', fontSize: 14 }}>← Ir al portal principal</a>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
            color: '#3b82f6', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {portal.Nombre}
          </div>
          {portal.Descripcion && (
            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>{portal.Descripcion}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(portal.formularios || []).length === 0 && (
            <div style={{
              background: '#1e293b', borderRadius: 12, padding: 32,
              textAlign: 'center', color: '#64748b', fontSize: 14,
              border: '1px solid #334155',
            }}>
              No hay formularios disponibles en este portal.
            </div>
          )}

          {(portal.formularios || []).map(f => (
            <a key={f.FormularioId} href={`/formulario/${f.Slug || f.FormularioId}`} style={{
              textDecoration: 'none', color: 'inherit',
              background: '#1e293b', borderRadius: 12,
              border: '1px solid #334155', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: '#0f172a', border: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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

        <div style={{ marginTop: 40, fontSize: 12, color: '#475569', textAlign: 'center' }}>
          © {new Date().getFullYear()} UDAT
        </div>
      </div>
    </div>
  )
}
