const ICONS = {
  dvir: <><path d="M9 11l3 3L22 4"/><rect x="3" y="3" width="18" height="18" rx="2"/></>,
  formularios: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></>,
  diesel: <><path d="M3 22V8l9-6 9 6v14"/><path d="M12 2v20"/><path d="M3 12h18"/></>,
}

function Icon({ name, color, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  )
}

export default function PortalPublico() {
  const cards = [
    {
      title: 'Inspección de Vehículo',
      subtitle: 'DVIR',
      desc: 'Realiza la inspección diaria de tu vehículo antes de operar.',
      href: '/dvir',
      iconName: 'dvir',
      color: '#3b82f6',
    },
    {
      title: 'Formularios',
      subtitle: 'Encuestas y checklists',
      desc: 'Completa formularios asignados por tu supervisor.',
      href: '/formularios-publico',
      iconName: 'formularios',
      color: '#8b5cf6',
    },
    {
      title: 'Carga de Diésel',
      subtitle: 'Control de combustible',
      desc: 'Registra la carga de combustible de tu unidad.',
      href: '/carga-diesel',
      iconName: 'diesel',
      color: '#f59e0b',
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
              background: '#0f172a', border: '1px solid #334155',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={c.iconName} color={c.color} />
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
