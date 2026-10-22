export default function PortalPublico() {
  const cards = [
    {
      title: 'Inspección de Vehículo',
      subtitle: 'DVIR',
      desc: 'Realiza la inspección diaria de tu vehículo antes de operar.',
      href: '/dvir',
      icon: '🚛',
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      title: 'Formularios',
      subtitle: 'Encuestas y checklists',
      desc: 'Completa formularios asignados por tu supervisor.',
      href: '/formularios-publico',
      icon: '📋',
      color: '#8b5cf6',
      bg: '#f5f3ff',
    },
    {
      title: 'Carga de Diésel',
      subtitle: 'Control de combustible',
      desc: 'Registra la carga de combustible de tu unidad.',
      href: '/carga-diesel',
      icon: '⛽',
      color: '#f59e0b',
      bg: '#fffbeb',
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
          color: '#3b82f6', textTransform: 'uppercase', marginBottom: 8,
        }}>
          UDAT — Portal de Servicios
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: 0,
          lineHeight: 1.2,
        }}>
          ¿Qué necesitas hacer?
        </h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>
          Selecciona una opción para continuar
        </p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        width: '100%', maxWidth: 420,
      }}>
        {cards.map(c => (
          <a key={c.href} href={c.href} style={{
            textDecoration: 'none', color: 'inherit',
            background: '#1e293b', borderRadius: 16,
            border: '1px solid #334155',
            padding: '24px 20px',
            display: 'flex', alignItems: 'center', gap: 18,
            transition: 'transform 0.15s, border-color 0.15s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = c.color; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#334155'; }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: c.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28, flexShrink: 0,
            }}>
              {c.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: c.color, textTransform: 'uppercase', marginBottom: 3,
              }}>
                {c.subtitle}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                {c.title}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                {c.desc}
              </div>
            </div>
            <div style={{ color: '#475569', fontSize: 22, flexShrink: 0 }}>›</div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: '#475569' }}>
        © {new Date().getFullYear()} UDAT
      </div>
    </div>
  )
}
