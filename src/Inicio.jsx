export default function Inicio({ usuario, onNavigate }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const accesos = [
    {
      title: 'Nueva Cotización',
      desc: 'Crea una nueva cotización de servicios de capacitación.',
      icon: '📋',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      view: 'cotizacion',
    },
    {
      title: 'Historial de Cotizaciones',
      desc: 'Consulta y descarga las cotizaciones que has generado.',
      icon: '📁',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      view: 'historial',
    },
    {
      title: 'Órdenes de Compra',
      desc: 'Registra y da seguimiento a las órdenes de compra.',
      icon: '🛒',
      color: '#0891b2',
      bg: '#ecfeff',
      border: '#a5f3fc',
      view: 'ordenesCompra',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>

      {/* Banner de bienvenida */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: '20px', padding: '32px 36px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <p style={{ margin: 0, opacity: 0.75, fontSize: '14px' }}>{greeting},</p>
          <h2 style={{ margin: '4px 0 12px', fontSize: '28px', fontWeight: 800, color: 'white' }}>
            {usuario?.nombre || 'Usuario'}
          </h2>
          <span style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px', padding: '4px 16px',
            fontSize: '12px', fontWeight: 600,
          }}>
            {usuario?.rol === 'empleado' ? 'Colaborador' : usuario?.rol || 'Usuario'}
          </span>
        </div>
        <div style={{ textAlign: 'right', opacity: 0.8 }}>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.7 }}>
            Sistema de Cotización de Servicios — UDAT
          </p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Accesos rápidos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {accesos.map(a => (
            <button
              key={a.view}
              type="button"
              onClick={() => onNavigate(a.view)}
              style={{
                background: '#fff',
                border: `1px solid ${a.border}`,
                borderRadius: '16px',
                padding: '24px 26px',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s, transform 0.15s',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '14px',
                background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
              }}>
                {a.icon}
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px', color: a.color }}>{a.title}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
