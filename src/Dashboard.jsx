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

// ─── KPI strip ────────────────────────────────────────────────────────────────
const KPI_DEFS = [
  { key: 'total',          label: 'Total órdenes',       color: '#2563eb' },
  { key: 'pendientePaso1', label: 'Pend. Administración', color: '#ea580c' },
  { key: 'pendientePaso2', label: 'Pend. Sec. Académica', color: '#d97706' },
  { key: 'aprobadas',      label: 'Autorizadas',          color: '#16a34a' },
  { key: 'rechazadas',     label: 'Rechazadas',           color: '#dc2626' },
]

function KpiStrip({ data }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#fff',
    }}>
      {KPI_DEFS.map((k, i) => (
        <div key={k.key} style={{
          padding: '20px 20px 18px',
          borderLeft: i > 0 ? '1px solid #f3f4f6' : 'none',
          borderBottom: `3px solid ${k.color}`,
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '8px' }}>
            {k.label}
          </div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {data[k.key] ?? 0}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Insights ─────────────────────────────────────────────────────────────────
const INSIGHT_COLORS = {
  ok:      '#16a34a',
  warn:    '#d97706',
  info:    '#2563eb',
  alert:   '#dc2626',
  neutral: '#64748b',
}

function buildInsights(data) {
  const total = data.total || 0
  if (!total) return []
  const items = []

  const pctAprobadas  = Math.round((data.aprobadas / total) * 100)
  const pctPendiente  = Math.round(((data.pendientePaso1 + data.pendientePaso2) / total) * 100)
  const pctRechazadas = Math.round((data.rechazadas / total) * 100)

  if (pctAprobadas >= 60)
    items.push({ type: 'ok', text: `${pctAprobadas}% de órdenes autorizadas — el flujo de aprobación opera con alta eficiencia.` })
  else if (pctAprobadas > 0)
    items.push({ type: 'warn', text: `Solo el ${pctAprobadas}% de las órdenes están autorizadas. Hay oportunidad de agilizar tiempos de respuesta.` })

  if (pctPendiente >= 40)
    items.push({ type: 'warn', text: `${pctPendiente}% de órdenes pendientes de autorización — se recomienda revisar la carga de los autorizadores.` })

  if (data.pendientePaso1 > 0 && data.pendientePaso2 > 0)
    items.push({ type: 'info', text: `${data.pendientePaso1} orden(es) esperan a Administración y ${data.pendientePaso2} a Secretaría Académica.` })
  else if (data.pendientePaso1 > 0)
    items.push({ type: 'info', text: `${data.pendientePaso1} orden(es) en espera de la firma de Administración.` })
  else if (data.pendientePaso2 > 0)
    items.push({ type: 'info', text: `${data.pendientePaso2} orden(es) pendientes de Secretaría Académica.` })

  if (pctRechazadas > 20)
    items.push({ type: 'alert', text: `${pctRechazadas}% de órdenes rechazadas — conviene analizar los motivos y retroalimentar a los solicitantes.` })

  if (data.topProveedores?.length > 0) {
    const top = data.topProveedores[0]
    const pct = data.montoTotal > 0 ? Math.round((Number(top.Monto) / data.montoTotal) * 100) : 0
    if (pct >= 25)
      items.push({ type: 'neutral', text: `"${top.Nombre}" concentra el ${pct}% del gasto total — conviene evaluar la diversificación de proveedores.` })
    else if (pct > 0)
      items.push({ type: 'neutral', text: `Gasto distribuido entre varios proveedores; "${top.Nombre}" lidera con el ${pct}%.` })
  }

  if (data.porMes?.length >= 2) {
    const last = data.porMes[data.porMes.length - 1]
    const prev = data.porMes[data.porMes.length - 2]
    const diff = Number(last.Total) - Number(prev.Total)
    if (diff > 0)
      items.push({ type: 'ok', text: `Tendencia al alza: el último mes registró ${diff} orden(es) más que el anterior.` })
    else if (diff < 0)
      items.push({ type: 'warn', text: `El volumen bajó ${Math.abs(diff)} orden(es) respecto al mes anterior.` })
    else
      items.push({ type: 'neutral', text: `Volumen de órdenes estable respecto al mes anterior.` })
  }

  return items
}

function Insights({ data }) {
  const items = buildInsights(data)
  if (!items.length) return <p style={{ fontSize: '13px', color: '#94a3b8' }}>Registra órdenes para ver el análisis.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((ins, i) => (
        <div key={i} style={{
          display: 'flex', gap: '14px', alignItems: 'flex-start',
          padding: '12px 14px',
          borderLeft: `3px solid ${INSIGHT_COLORS[ins.type]}`,
          background: '#fafafa',
          borderRadius: '0 8px 8px 0',
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.65 }}>{ins.text}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function Pipeline({ data }) {
  const stages = [
    { label: 'Total',            value: data.total,           color: '#2563eb' },
    { label: 'Pend. Admón.',     value: data.pendientePaso1,  color: '#ea580c' },
    { label: 'Pend. Sec. Acad.', value: data.pendientePaso2,  color: '#d97706' },
    { label: 'Autorizadas',      value: data.aprobadas,       color: '#16a34a' },
    { label: 'Rechazadas',       value: data.rechazadas,      color: '#dc2626' },
  ]
  const max = Math.max(...stages.map(s => s.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{s.value}</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(pct, 1)}%`, height: '100%',
                background: s.color,
                borderRadius: '3px',
                transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function Donut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) return <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sin datos</p>
  const R = 52, CX = 68, CY = 68, SW = 16
  let cum = 0
  function arc(pct, start) {
    if (pct >= 1) pct = 0.9999
    const a0 = start * 2 * Math.PI - Math.PI / 2
    const a1 = (start + pct) * 2 * Math.PI - Math.PI / 2
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0)
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1)
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <svg width={136} height={136} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const pct = seg.value / total; const start = cum; cum += pct
          return <path key={i} d={arc(pct, start)} fill="none" stroke={seg.color} strokeWidth={SW} strokeLinecap="butt" />
        })}
        <text x={CX} y={CY - 6} textAnchor="middle" style={{ fontSize: '28px', fontWeight: 800, fill: '#0f172a' }}>{total}</text>
        <text x={CX} y={CY + 13} textAnchor="middle" style={{ fontSize: '10px', fill: '#94a3b8' }}>órdenes</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 140 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '2px', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#64748b', flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {seg.value}
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 4 }}>
                {Math.round((seg.value / total) * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Trend bars ───────────────────────────────────────────────────────────────
function TrendBars({ data }) {
  if (!data?.length) return <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sin datos del período</p>
  const max = Math.max(...data.map(d => Number(d.Total) || 0), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
      {data.map((d, i) => {
        const h = Math.max((Number(d.Total) / max) * 80, 4)
        const mes = d.Mes ? d.Mes.slice(5) + '/' + d.Mes.slice(2, 4) : ''
        const isLast = i === data.length - 1
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: isLast ? '#2563eb' : '#94a3b8' }}>{d.Total}</span>
            <div style={{ width: '100%', position: 'relative', height: '70px', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: h,
                borderRadius: '4px 4px 0 0',
                background: isLast ? '#2563eb' : '#e2e8f0',
                transition: 'height 0.7s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{mes}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── HBar ─────────────────────────────────────────────────────────────────────
function HBar({ data, labelKey, valueKey, color, formatVal = String }) {
  if (!data?.length) return <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sin datos</p>
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.map((d, i) => {
        const pct = (Number(d[valueKey]) / max) * 100
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d[labelKey]}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{formatVal(d[valueKey])}</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: '3px',
                background: typeof color === 'function' ? color(i) : color,
                transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '22px 24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, sub }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#374151' }}>{children}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

// ─── Recent table ─────────────────────────────────────────────────────────────
function RecentTable({ data }) {
  if (!data?.length) return <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sin órdenes recientes</p>
  const STATUS = {
    Rechazada: { bg: '#fef2f2', color: '#b91c1c', label: 'Rechazada' },
    Pendiente: { bg: '#fafaf5', color: '#92400e', label: 'Pendiente' },
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr>
          {['Folio', 'Proveedor', 'Solicitante', 'Total', 'Estado'].map(h => (
            <th key={h} style={{ padding: '0 10px 10px', textAlign: 'left', fontWeight: 500, color: '#94a3b8', fontSize: '11px', borderBottom: '1px solid #f1f5f9' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => {
          const estado = r.Rechazado ? 'Rechazada' : 'Pendiente'
          const s = STATUS[estado]
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
              <td style={{ padding: '11px 10px', fontWeight: 700, color: '#2563eb' }}>{r.Folio}</td>
              <td style={{ padding: '11px 10px', color: '#374151' }}>{r.Proveedor}</td>
              <td style={{ padding: '11px 10px', color: '#64748b' }}>{r.Creador}</td>
              <td style={{ padding: '11px 10px', fontWeight: 600, color: '#0f172a' }}>{fmt(r.Total)}</td>
              <td style={{ padding: '11px 10px' }}>
                <span style={{ ...s, padding: '2px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                  {s.label}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ usuario }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getDashboard().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
      Cargando dashboard…
    </div>
  )
  if (error) return (
    <Card style={{ borderColor: '#fca5a5' }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#b91c1c' }}>No se pudo cargar el dashboard</p>
      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#7f1d1d' }}>
        {error.includes('Cannot GET') || error.includes('404') || error.includes('DOCTYPE')
          ? 'El servidor necesita reiniciarse para aplicar los últimos cambios.'
          : error}
      </p>
    </Card>
  )
  if (!data) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const donutSegments = [
    { label: 'Autorizadas',        value: data.aprobadas,      color: '#16a34a' },
    { label: 'Pend. Administración', value: data.pendientePaso1, color: '#ea580c' },
    { label: 'Pend. Sec. Acad.',   value: data.pendientePaso2, color: '#d97706' },
    { label: 'Rechazadas',         value: data.rechazadas,     color: '#dc2626' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>

      {/* ── Hero ── */}
      <div style={{
        background: '#0f172a',
        borderRadius: '14px',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            {greeting}
          </p>
          <h2 style={{ margin: '0 0 14px', fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>
            {usuario?.nombre || 'Usuario'}
          </h2>
          <span style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {ROL_LABEL[usuario?.rol] || usuario?.rol}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#475569' }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style={{ margin: '0 0 2px', fontSize: '36px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {fmt(data.montoTotal)}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>monto total en órdenes</p>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <KpiStrip data={data} />

      {/* ── Análisis + Pipeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
        <Card>
          <SectionLabel sub="Basado en el estado actual de las órdenes">Análisis ejecutivo</SectionLabel>
          <Insights data={data} />
        </Card>
        <Card>
          <SectionLabel sub="Distribución comparativa">Flujo de aprobación</SectionLabel>
          <Pipeline data={data} />
        </Card>
      </div>

      {/* ── Donut + Tendencia ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <SectionLabel>Distribución por estado</SectionLabel>
          <Donut segments={donutSegments} />
        </Card>
        <Card>
          <SectionLabel sub="Últimos 6 meses">Volumen de órdenes</SectionLabel>
          <TrendBars data={data.porMes} />
        </Card>
      </div>

      {/* ── Proveedores + Unidades ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <SectionLabel sub="Por monto acumulado">Top proveedores</SectionLabel>
          <HBar
            data={data.topProveedores}
            labelKey="Nombre"
            valueKey="Monto"
            color={i => ['#1e40af','#2563eb','#3b82f6','#60a5fa','#93c5fd'][i] || '#bfdbfe'}
            formatVal={fmt}
          />
        </Card>
        <Card>
          <SectionLabel sub="Distribución del gasto">Por unidad de negocio</SectionLabel>
          <HBar
            data={data.porUnidad}
            labelKey="Nombre"
            valueKey="Monto"
            color={i => ['#6d28d9','#7c3aed','#8b5cf6','#a78bfa','#c4b5fd'][i] || '#ddd6fe'}
            formatVal={fmt}
          />
        </Card>
      </div>

      {/* ── Recientes ── */}
      <Card>
        <SectionLabel sub="Últimas 5 órdenes registradas">Órdenes recientes</SectionLabel>
        <RecentTable data={data.recientes} />
      </Card>

    </div>
  )
}
