import { useEffect, useState } from 'react'
import { getDashboard } from './api'

function fmt(value) {
  return `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ROL_LABEL = {
  admin:        'Administrador del sistema',
  autorizador1: 'Autorizador — Administración',
  autorizador2: 'Autorizador — Secretaría Académica',
}

const KPI_COLORS = {
  blue:   { bg: '#eff6ff', border: '#2563eb', val: '#1d4ed8', icon_bg: '#dbeafe' },
  green:  { bg: '#f0fdf4', border: '#16a34a', val: '#15803d', icon_bg: '#dcfce7' },
  orange: { bg: '#fff7ed', border: '#ea580c', val: '#c2410c', icon_bg: '#ffedd5' },
  yellow: { bg: '#fefce8', border: '#ca8a04', val: '#a16207', icon_bg: '#fef9c3' },
  red:    { bg: '#fef2f2', border: '#dc2626', val: '#b91c1c', icon_bg: '#fee2e2' },
}

function KpiCard({ label, value, sublabel, color, icon }) {
  const c = KPI_COLORS[color] || KPI_COLORS.blue
  return (
    <div style={{
      background: '#fff', borderRadius: '18px', padding: '20px 22px',
      borderTop: `4px solid ${c.border}`,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: '10px', background: c.icon_bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <span style={{ fontSize: '36px', fontWeight: 800, color: c.val, lineHeight: 1 }}>{value}</span>
      {sublabel && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{sublabel}</span>}
    </div>
  )
}

function HBarChart({ data, labelKey, valueKey, colorFn, formatVal = String }) {
  if (!data?.length) return <p style={{ color: '#9ca3af', fontSize: '13px' }}>Sin datos</p>
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((d, i) => {
        const pct = (Number(d[valueKey]) / max) * 100
        const color = colorFn ? colorFn(i) : '#2563eb'
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d[labelKey]}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>{formatVal(d[valueKey])}</span>
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '9px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: '999px',
                background: color, transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PALETTE_GREEN  = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0']
const PALETTE_PURPLE = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

function DonutChart({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <p style={{ color: '#9ca3af', fontSize: '13px' }}>Sin datos</p>

  const R = 58, CX = 76, CY = 76, SW = 22
  let cum = 0
  const TWO_PI = 2 * Math.PI

  function arc(pct, start) {
    if (pct >= 1) pct = 0.9999
    const a0 = start * TWO_PI - Math.PI / 2
    const a1 = (start + pct) * TWO_PI - Math.PI / 2
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0)
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1)
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
      <svg width={152} height={152} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f3f4f6" strokeWidth={SW} />
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const pct = seg.value / total
          const start = cum
          cum += pct
          return (
            <path key={i} d={arc(pct, start)} fill="none"
              stroke={seg.color} strokeWidth={SW} strokeLinecap="butt" />
          )
        })}
        <text x={CX} y={CY - 8} textAnchor="middle" style={{ fontSize: '26px', fontWeight: 800, fill: '#111827' }}>{total}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: '11px', fill: '#9ca3af' }}>órdenes</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 160 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
              {seg.value}
              <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 4 }}>
                ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendBars({ data }) {
  if (!data?.length) return <p style={{ color: '#9ca3af', fontSize: '13px' }}>Sin datos del período</p>
  const max = Math.max(...data.map(d => Number(d.Total) || 0), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: 110 }}>
      {data.map((d, i) => {
        const h = Math.max((Number(d.Total) / max) * 90, 4)
        const mes = d.Mes ? d.Mes.slice(5) + '/' + d.Mes.slice(2, 4) : ''
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>{d.Total}</span>
            <div style={{
              width: '100%', height: h, borderRadius: '6px 6px 0 0',
              background: 'linear-gradient(to top, #1d4ed8, #3b82f6)',
              transition: 'height 0.7s cubic-bezier(.4,0,.2,1)',
            }} />
            <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{mes}</span>
          </div>
        )
      })}
    </div>
  )
}

function StoryInsights({ data }) {
  const total = data.total || 0
  if (total === 0) return <p style={{ color: '#9ca3af', fontSize: '13px' }}>Registra órdenes de compra para ver el análisis.</p>

  const pctAprobadas  = Math.round((data.aprobadas / total) * 100)
  const pctPendiente  = Math.round(((data.pendientePaso1 + data.pendientePaso2) / total) * 100)
  const pctRechazadas = Math.round((data.rechazadas / total) * 100)

  const items = []

  if (pctAprobadas >= 60)
    items.push({ icon: '✅', color: '#15803d', bg: '#f0fdf4', text: `El ${pctAprobadas}% de las órdenes han sido autorizadas — el flujo de aprobación está operando con alta eficiencia.` })
  else if (pctAprobadas > 0)
    items.push({ icon: '⚠️', color: '#92400e', bg: '#fffbeb', text: `Solo el ${pctAprobadas}% de las órdenes están autorizadas. Hay oportunidad de agilizar tiempos de respuesta.` })

  if (pctPendiente >= 40)
    items.push({ icon: '🕐', color: '#c2410c', bg: '#fff7ed', text: `Un ${pctPendiente}% de órdenes están pendientes de autorización — se recomienda revisar la carga de trabajo de los autorizadores.` })

  if (data.pendientePaso1 > 0 && data.pendientePaso2 > 0)
    items.push({ icon: '📋', color: '#1d4ed8', bg: '#eff6ff', text: `Actualmente ${data.pendientePaso1} orden(es) esperan a Administración y ${data.pendientePaso2} a Secretaría Académica para continuar el proceso.` })
  else if (data.pendientePaso1 > 0)
    items.push({ icon: '📋', color: '#1d4ed8', bg: '#eff6ff', text: `${data.pendientePaso1} orden(es) están en espera de la firma de Administración para avanzar.` })
  else if (data.pendientePaso2 > 0)
    items.push({ icon: '📋', color: '#7c3aed', bg: '#f5f3ff', text: `${data.pendientePaso2} orden(es) pendientes de aprobación por parte de Secretaría Académica.` })

  if (pctRechazadas > 20)
    items.push({ icon: '❌', color: '#b91c1c', bg: '#fef2f2', text: `El ${pctRechazadas}% de órdenes fueron rechazadas — se recomienda analizar los motivos y retroalimentar a los solicitantes.` })

  if (data.topProveedores?.length > 0) {
    const top = data.topProveedores[0]
    const pctTop = data.montoTotal > 0 ? Math.round((Number(top.Monto) / data.montoTotal) * 100) : 0
    if (pctTop >= 25)
      items.push({ icon: '🏢', color: '#374151', bg: '#f9fafb', text: `"${top.Nombre}" concentra el ${pctTop}% del gasto total — conviene evaluar la diversificación de proveedores.` })
    else if (pctTop > 0)
      items.push({ icon: '🏢', color: '#374151', bg: '#f9fafb', text: `El gasto está distribuido entre varios proveedores; "${top.Nombre}" lidera con el ${pctTop}% del total.` })
  }

  if (data.porMes?.length >= 2) {
    const last = data.porMes[data.porMes.length - 1]
    const prev = data.porMes[data.porMes.length - 2]
    const diff = Number(last.Total) - Number(prev.Total)
    if (diff > 0)
      items.push({ icon: '📈', color: '#15803d', bg: '#f0fdf4', text: `Tendencia al alza: el último mes registró ${diff} orden(es) más que el mes anterior — la demanda de compras está creciendo.` })
    else if (diff < 0)
      items.push({ icon: '📉', color: '#c2410c', bg: '#fff7ed', text: `El volumen del último mes bajó ${Math.abs(diff)} orden(es) respecto al mes anterior.` })
    else
      items.push({ icon: '➡️', color: '#374151', bg: '#f9fafb', text: `El volumen de órdenes se mantuvo estable respecto al mes anterior.` })
  }

  if (items.length === 0)
    items.push({ icon: '📊', color: '#374151', bg: '#f9fafb', text: 'Continúa registrando órdenes de compra para ver análisis detallados.' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((ins, i) => (
        <div key={i} style={{ background: ins.bg, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>{ins.icon}</span>
          <p style={{ margin: 0, fontSize: '13px', color: ins.color, lineHeight: 1.65, fontWeight: 500 }}>{ins.text}</p>
        </div>
      ))}
    </div>
  )
}

function PipelineBar({ data }) {
  const stages = [
    { label: 'Total órdenes',    value: data.total,           color: '#2563eb' },
    { label: 'Pend. Admón.',     value: data.pendientePaso1,  color: '#ea580c' },
    { label: 'Pend. Sec. Acad.', value: data.pendientePaso2,  color: '#ca8a04' },
    { label: 'Autorizadas',      value: data.aprobadas,       color: '#16a34a' },
    { label: 'Rechazadas',       value: data.rechazadas,      color: '#dc2626' },
  ]
  const max = Math.max(...stages.map(s => s.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', minWidth: 130, textAlign: 'right', flexShrink: 0 }}>{s.label}</span>
            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '999px', height: '24px', overflow: 'visible', position: 'relative' }}>
              <div style={{
                width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: '999px',
                background: s.color, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: pct > 15 ? '10px' : 0,
              }}>
                {pct > 15 && <span style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>{s.value}</span>}
              </div>
              {pct <= 15 && (
                <span style={{
                  position: 'absolute', left: `${Math.max(pct, 2)}%`, paddingLeft: '8px',
                  top: '50%', transform: 'translateY(-50%)',
                  fontSize: '12px', fontWeight: 800, color: s.color,
                }}>{s.value}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecentTable({ data }) {
  if (!data?.length) return <p style={{ color: '#9ca3af', fontSize: '13px' }}>Sin órdenes recientes</p>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
          {['Folio', 'Proveedor', 'Creado por', 'Total', 'Estado'].map(h => (
            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => {
          const estado = r.Rechazado ? 'Rechazada' : 'Pendiente'
          const badge = {
            Rechazada: { bg: '#fee2e2', color: '#b91c1c' },
            Pendiente: { bg: '#fffbeb', color: '#92400e' },
          }[estado]
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
              <td style={{ padding: '10px 10px', fontWeight: 700, color: '#1d4ed8' }}>{r.Folio}</td>
              <td style={{ padding: '10px 10px', color: '#374151' }}>{r.Proveedor}</td>
              <td style={{ padding: '10px 10px', color: '#6b7280' }}>{r.Creador}</td>
              <td style={{ padding: '10px 10px', fontWeight: 600, color: '#111827' }}>{fmt(r.Total)}</td>
              <td style={{ padding: '10px 10px' }}>
                <span style={{ ...badge, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{estado}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function Dashboard({ usuario }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      <p style={{ margin: 0 }}>Cargando dashboard...</p>
    </div>
  )
  if (error) return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '14px',
      padding: '28px 32px', color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <strong style={{ fontSize: '15px' }}>No se pudo cargar el dashboard</strong>
      <span style={{ fontSize: '13px', color: '#7f1d1d' }}>
        {error.includes('Cannot GET') || error.includes('404') || error.includes('DOCTYPE')
          ? 'El servidor necesita reiniciarse para aplicar los últimos cambios. Ejecuta: node server.js en la carpeta cotizador-api.'
          : error}
      </span>
    </div>
  )
  if (!data)  return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const donutSegments = [
    { label: 'Aprobadas',         value: data.aprobadas,       color: '#16a34a' },
    { label: 'Pend. Admón.',      value: data.pendientePaso1,  color: '#ea580c' },
    { label: 'Pend. Sec. Acad.',  value: data.pendientePaso2,  color: '#ca8a04' },
    { label: 'Rechazadas',        value: data.rechazadas,      color: '#dc2626' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>

      {/* ── Bienvenida ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: '20px', padding: '28px 32px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <p style={{ margin: 0, opacity: 0.75, fontSize: '14px' }}>{greeting},</p>
          <h2 style={{ margin: '4px 0 10px', fontSize: '26px', fontWeight: 800, color: 'white' }}>{usuario?.nombre || 'Usuario'}</h2>
          <span style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px', padding: '4px 16px', fontSize: '12px', fontWeight: 600,
          }}>
            {ROL_LABEL[usuario?.rol] || usuario?.rol}
          </span>
        </div>
        <div style={{ textAlign: 'right', opacity: 0.8 }}>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700 }}>
            {fmt(data.montoTotal)}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.7 }}>monto total en órdenes</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total órdenes"  value={data.total}           color="blue"   />
        <KpiCard label="Pend. Admón."   value={data.pendientePaso1}  color="orange" sublabel="Esperando autorización" />
        <KpiCard label="Pend. Sec. Ac." value={data.pendientePaso2}  color="yellow" sublabel="Esperando autorización" />
        <KpiCard label="Autorizadas"    value={data.aprobadas}       color="green"  />
        <KpiCard label="Rechazadas"     value={data.rechazadas}      color="red"    />
      </div>

      {/* ── Storytelling: Análisis ejecutivo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Análisis ejecutivo
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Insights generados a partir del estado actual</p>
          </div>
          <StoryInsights data={data} />
        </div>

        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Flujo de aprobación
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Distribución comparativa de estados</p>
          </div>
          <PipelineBar data={data} />
        </div>

      </div>

      {/* ── Charts row 1: Donut + Tendencia ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Distribución por estado
          </h3>
          <DonutChart segments={donutSegments} />
        </div>

        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Órdenes — últimos 6 meses
          </h3>
          <TrendBars data={data.porMes} />
        </div>

      </div>

      {/* ── Charts row 2: Proveedores + Unidades ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Top proveedores por monto
          </h3>
          <HBarChart
            data={data.topProveedores}
            labelKey="Nombre"
            valueKey="Monto"
            colorFn={i => PALETTE_GREEN[i] || PALETTE_GREEN[4]}
            formatVal={fmt}
          />
        </div>

        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Monto por unidad de negocio
          </h3>
          <HBarChart
            data={data.porUnidad}
            labelKey="Nombre"
            valueKey="Monto"
            colorFn={i => PALETTE_PURPLE[i] || PALETTE_PURPLE[4]}
            formatVal={fmt}
          />
        </div>

      </div>

      {/* ── Órdenes recientes ── */}
      <div style={{ background: '#fff', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Órdenes recientes
        </h3>
        <RecentTable data={data.recientes} />
      </div>

    </div>
  )
}
