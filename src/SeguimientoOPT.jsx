import { useEffect, useState, useMemo, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const toggle = val => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} seleccionados`
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 13,
        background: '#fff', color: selected.length ? '#0f172a' : '#94a3b8', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'space-between',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{label}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff',
          border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 50, maxHeight: 220, overflowY: 'auto', minWidth: 200,
        }}>
          {selected.length > 0 && (
            <div onClick={() => onChange([])} style={{
              padding: '6px 12px', fontSize: 12, color: '#3b82f6', cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9', fontWeight: 600,
            }}>Limpiar selección</div>
          )}
          {options.map(opt => (
            <label key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, color: '#334155', background: selected.includes(opt) ? '#f0f9ff' : 'transparent',
            }} onClick={() => toggle(opt)}>
              <span style={{
                width: 16, height: 16, borderRadius: 4, border: '2px solid ' + (selected.includes(opt) ? '#3b82f6' : '#cbd5e1'),
                background: selected.includes(opt) ? '#3b82f6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{selected.includes(opt) ? '✓' : ''}</span>
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function fetchSeguimiento(token, portalId) {
  const url = `${API}/seguimiento-opt${portalId ? `?portalId=${portalId}` : ''}`
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => {
    if (!r.ok) throw new Error('Error al cargar seguimiento')
    return r.json()
  })
}

function semaforoColor(pct) {
  if (pct >= 100) return '#22c55e'
  if (pct >= 75) return '#84cc16'
  if (pct >= 50) return '#eab308'
  if (pct >= 25) return '#f97316'
  return '#ef4444'
}

const ESTADO_CONFIG = {
  completada: { bg: '#dcfce7', color: '#166534', label: 'Completada', icon: '✓' },
  activa:     { bg: '#fef3c7', color: '#92400e', label: 'Pendiente',  icon: '●' },
  vencida:    { bg: '#fecaca', color: '#991b1b', label: 'Vencida',    icon: '!' },
  futura:     { bg: '#f1f5f9', color: '#64748b', label: 'Futura',     icon: '○' },
  pendiente:  { bg: '#f1f5f9', color: '#64748b', label: 'Pendiente',  icon: '○' },
}

function Badge({ estado }) {
  const c = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 10 }}>{c.icon}</span> {c.label}
    </span>
  )
}

function ProgressBar({ porcentaje }) {
  const color = porcentaje >= 80 ? '#22c55e' : porcentaje >= 50 ? '#f59e0b' : porcentaje >= 1 ? '#ef4444' : '#e2e8f0'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${porcentaje}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', minWidth: 36, textAlign: 'right' }}>{porcentaje}%</span>
    </div>
  )
}

function SummaryCards({ alumnos }) {
  const total = alumnos.length
  const alDia = alumnos.filter(a => a.vencidas === 0 && a.completadas > 0).length
  const conVencidas = alumnos.filter(a => a.vencidas > 0).length
  const sinIniciar = alumnos.filter(a => a.completadas === 0).length

  const totalKm = alumnos.reduce((s, a) => s + (a.totalKm || 0), 0)
  const totalMetaKm = alumnos.reduce((s, a) => s + (a.metaKm || 0), 0)
  const promPctKm = totalMetaKm > 0 ? Math.round(totalKm / totalMetaKm * 100) : null

  const totalHrs = Math.round(alumnos.reduce((s, a) => s + (a.totalHrs || 0), 0) * 10) / 10
  const totalMetaHrs = alumnos.reduce((s, a) => s + (a.metaHrs || 0), 0)
  const promPctHrs = totalMetaHrs > 0 ? Math.round(totalHrs / totalMetaHrs * 100) : null

  const promedioEncuestas = total ? Math.round(alumnos.reduce((s, a) => s + a.porcentaje, 0) / total) : 0

  const conEvals = alumnos.filter(a => a.promedioEvals != null)
  const promedioEvals = conEvals.length ? Math.round(conEvals.reduce((s, a) => s + a.promedioEvals, 0) / conEvals.length) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alumnos</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', marginTop: 4 }}>{total}</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Eval. Semanales</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: promedioEvals != null ? (promedioEvals >= 80 ? '#16a34a' : promedioEvals >= 60 ? '#d97706' : '#dc2626') : '#94a3b8', marginTop: 4 }}>
          {promedioEvals != null ? promedioEvals : '—'}
        </div>
        {promedioEvals != null && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Promedio de {conEvals.length} alumno{conEvals.length !== 1 ? 's' : ''}</div>}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kilómetros</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: promPctKm != null ? semaforoColor(promPctKm) : '#94a3b8', marginTop: 4 }}>
          {totalKm > 0 ? totalKm.toLocaleString('es-MX') : '—'}
        </div>
        {totalMetaKm > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Meta: {totalMetaKm.toLocaleString('es-MX')} km · Prom: {promPctKm}%</div>}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: promPctHrs != null ? semaforoColor(promPctHrs) : '#94a3b8', marginTop: 4 }}>
          {totalHrs > 0 ? totalHrs.toLocaleString('es-MX') : '—'}
        </div>
        {totalMetaHrs > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Meta: {totalMetaHrs.toLocaleString('es-MX')} hrs · Prom: {promPctHrs}%</div>}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avance Encuestas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: semaforoColor(promedioEncuestas), marginTop: 4 }}>{promedioEncuestas}%</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          <span style={{ color: '#22c55e' }}>{alDia} al día</span> · <span style={{ color: '#ef4444' }}>{conVencidas} vencidas</span> · <span style={{ color: '#f59e0b' }}>{sinIniciar} sin iniciar</span>
        </div>
      </div>
    </div>
  )
}

const SEVERITY_STYLES = {
  alto:  { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  medio: { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
}

function ValorDisplay({ valor, tipo, severity }) {
  if (!valor) return <span style={{ color: '#94a3b8' }}>—</span>
  if (tipo === 'alumno' || tipo === 'operador_tutor') {
    try {
      const parsed = JSON.parse(valor)
      return <span>{parsed.nombre || parsed.matricula || valor}</span>
    } catch { return <span>{valor}</span> }
  }
  if (tipo === 'escala' && severity) {
    const sev = SEVERITY_STYLES[severity]
    if (sev) {
      return <span style={{ padding: '2px 8px', borderRadius: 6, background: sev.bg, color: sev.color, fontWeight: 600 }}>{valor}</span>
    }
  }
  return <span>{valor}</span>
}

function EvaluacionCard({ ev, defaultOpen, fechaEgreso }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const isEncargado = ev.tipo === 'encargado'
  const borderColor = isEncargado ? '#0b2341' : '#86efac'
  const iconBg = isEncargado ? '#e8edf3' : '#dcfce7'
  const iconColor = isEncargado ? '#0b2341' : '#166534'

  let semanaEval = null
  if (fechaEgreso && ev.fecha) {
    const egreso = new Date(fechaEgreso)
    const evalDate = new Date(ev.fecha)
    const diffMs = evalDate - egreso
    if (diffMs >= 0) semanaEval = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  }

  const valoresVisibles = ev.valores.filter(v => v.tipo !== 'alumno' && v.tipo !== 'operador_tutor' && v.tipo !== 'opt')
  const seccionesGrupo = []
  let currentSec = null
  for (const v of valoresVisibles) {
    const secKey = v.seccionOrden != null ? v.seccionOrden : -1
    if (!currentSec || currentSec.orden !== secKey) {
      currentSec = { orden: secKey, titulo: v.seccionTitulo || '', items: [] }
      seccionesGrupo.push(currentSec)
    }
    currentSec.items.push(v)
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: `1px solid ${borderColor}`,
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: iconColor,
        }}>
          {isEncargado ? 'E' : '✓'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{ev.formularioNombre}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {new Date(ev.fecha).toLocaleDateString('es-MX')}
            {semanaEval && <span style={{ color: '#3b82f6', fontWeight: 600 }}> · Semana {semanaEval}</span>}
            {ev.operadorTutor && <span> · Tutor: {ev.operadorTutor}</span>}
            {!ev.operadorTutor && ev.operador && <span> · {ev.operador}</span>}
            {ev.portal && <span style={{ color: '#94a3b8' }}> · {ev.portal}</span>}
          </div>
        </div>
        {isEncargado && ev.calificacion != null ? (
          <span style={{
            padding: '4px 12px', borderRadius: 12, fontSize: 16, fontWeight: 800,
            background: ev.calificacion >= 80 ? '#dcfce7' : ev.calificacion >= 60 ? '#fef3c7' : '#fef2f2',
            color: ev.calificacion >= 80 ? '#16a34a' : ev.calificacion >= 60 ? '#d97706' : '#dc2626',
          }}>
            {ev.calificacion}
          </span>
        ) : (
          <span style={{
            padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: isEncargado ? '#e8edf3' : '#dcfce7',
            color: isEncargado ? '#0b2341' : '#166534',
          }}>
            {isEncargado ? 'Evaluación semanal OPT' : 'Respuesta alumno'}
          </span>
        )}
        <span style={{ fontSize: 16, color: '#94a3b8', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
          {isEncargado && ev.secciones && ev.secciones.length > 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 0 8px', flexWrap: 'wrap' }}>
              {ev.secciones.map((s, i) => (
                <div key={i} style={{
                  flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{s.titulo.length > 25 ? s.titulo.substring(0, 25) + '...' : s.titulo}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.puntos >= 80 ? '#16a34a' : s.puntos >= 60 ? '#d97706' : '#dc2626' }}>{s.puntos}<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>/100</span></div>
                </div>
              ))}
            </div>
          )}
          {seccionesGrupo.map((sec, si) => (
            <div key={si} style={{ marginTop: si === 0 ? 12 : 16 }}>
              {sec.titulo && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, paddingBottom: 4, borderBottom: '2px solid #e2e8f0' }}>
                  {sec.titulo}
                </div>
              )}
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  {sec.items.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 8px 8px 0', color: '#64748b', fontWeight: 500, verticalAlign: 'top', width: '40%' }}>{v.pregunta}</td>
                      <td style={{ padding: '8px 0', color: '#0f172a' }}><ValorDisplay valor={v.valor} tipo={v.tipo} severity={v.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineCard({ enc, cfg, evalData }) {
  const [open, setOpen] = useState(false)
  const hasData = !!evalData
  const canExpand = enc.estado === 'completada' && hasData

  return (
    <div style={{
      background: '#fff', borderRadius: 10,
      border: `1px solid ${enc.estado === 'vencida' ? '#fca5a5' : enc.estado === 'completada' ? '#86efac' : '#e2e8f0'}`,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => canExpand && setOpen(o => !o)}
        style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
          cursor: canExpand ? 'pointer' : 'default',
        }}
        onMouseEnter={e => canExpand && (e.currentTarget.style.background = '#f8fffe')}
        onMouseLeave={e => canExpand && (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: cfg.color, border: `2px solid ${cfg.color}20`,
        }}>
          {enc.estado === 'completada' ? '✓' : enc.estado === 'vencida' ? '!' : enc.semanaInicio}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{enc.formularioNombre}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Semana {enc.semanaInicio} · {enc.diasActiva} días activa
            {enc.perfil && <span> · Perfil: {enc.perfil}</span>}
          </div>
          {enc.fechaRespuesta && (
            <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>
              Respondida el {new Date(enc.fechaRespuesta).toLocaleDateString('es-MX')}
            </div>
          )}
        </div>
        <Badge estado={enc.estado} />
        {canExpand && <span style={{ fontSize: 16, color: '#94a3b8', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s', marginLeft: 4 }}>▾</span>}
      </div>
      {open && evalData && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#64748b', padding: '10px 0 6px' }}>
            Respondido por: <strong>{evalData.operador}</strong> · {new Date(evalData.fecha).toLocaleDateString('es-MX')}
          </div>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {evalData.valores.filter(v => v.tipo !== 'alumno' && v.tipo !== 'operador_tutor' && v.tipo !== 'opt').map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '8px 8px 8px 0', color: '#64748b', fontWeight: 500, verticalAlign: 'top', width: '40%' }}>{v.pregunta}</td>
                  <td style={{ padding: '8px 0', color: '#0f172a' }}><ValorDisplay valor={v.valor} tipo={v.tipo} severity={v.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AlumnoDetalle({ alumno, onBack }) {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [loadingEvals, setLoadingEvals] = useState(true)
  const [practicas, setPracticas] = useState(null)
  const [loadingPracticas, setLoadingPracticas] = useState(true)
  const [tabDetalle, setTabDetalle] = useState('timeline')
  const token = typeof window !== 'undefined' ? localStorage.getItem('cotizador-token') : null

  useEffect(() => {
    setLoadingEvals(true)
    fetch(`${API}/seguimiento-opt/${encodeURIComponent(alumno.matricula)}/evaluaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setEvaluaciones(Array.isArray(d) ? d : []); setLoadingEvals(false) })
      .catch(() => setLoadingEvals(false))

    setLoadingPracticas(true)
    fetch(`${API}/seguimiento-opt/${encodeURIComponent(alumno.matricula)}/practicas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setPracticas(d); setLoadingPracticas(false) })
      .catch(() => setLoadingPracticas(false))
  }, [alumno.matricula])

  const evalsAlumno = evaluaciones.filter(e => e.tipo === 'alumno')
  const evalsEncargado = evaluaciones.filter(e => e.tipo === 'encargado')
  const evalsConCalif = evalsEncargado.filter(e => e.calificacion != null)
  const promedioEvalsDetalle = evalsConCalif.length > 0
    ? Math.round(evalsConCalif.reduce((s, e) => s + e.calificacion, 0) / evalsConCalif.length)
    : null

  const dtab = (active) => ({
    padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
    background: 'none', color: active ? '#3b82f6' : '#64748b',
  })

  async function imprimirKardexOPT() {
    async function toDataURL(url) {
      try { const r = await fetch(url); const b = await r.blob(); return new Promise(res => { const rd = new FileReader(); rd.onloadend = () => res(rd.result); rd.readAsDataURL(b) }) } catch { return '' }
    }
    const origin = window.location.origin
    const [selloHdSrc, udatDarkSrc] = await Promise.all([
      toDataURL(`${origin}/logo-udat-sello-hd.png`),
      toDataURL(`${origin}/logo-udat-dark.png`),
    ])
    const selloWM = await new Promise(resolve => {
      if (!selloHdSrc) return resolve('')
      const img = new Image()
      img.onload = () => { const sz = 500; const cv = document.createElement('canvas'); cv.width = sz; cv.height = sz; const ctx = cv.getContext('2d'); ctx.globalAlpha = 0.07; ctx.drawImage(img, 0, 0, sz, sz); resolve(cv.toDataURL()) }
      img.onerror = () => resolve('')
      img.src = selloHdSrc
    })

    const semColor = pct => pct >= 100 ? '#22c55e' : pct >= 75 ? '#84cc16' : pct >= 50 ? '#eab308' : pct >= 25 ? '#f97316' : '#ef4444'

    const encuestasHtml = alumno.encuestas.map(enc => {
      const estadoColors = { completada: '#16a34a', vencida: '#dc2626', activa: '#d97706', pendiente: '#6b7280', futura: '#94a3b8' }
      const estadoLabels = { completada: 'Completada', vencida: 'Vencida', activa: 'Pendiente', pendiente: 'Pendiente', futura: 'Futura' }
      const c = estadoColors[enc.estado] || '#6b7280'
      return `<tr>
        <td style="font-weight:600">${enc.formularioNombre}</td>
        <td>Semana ${enc.semanaInicio}</td>
        <td><span style="background:${c}22;color:${c};padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px">${estadoLabels[enc.estado]}</span></td>
        <td>${enc.fechaRespuesta ? new Date(enc.fechaRespuesta).toLocaleDateString('es-MX') : '—'}</td>
      </tr>`
    }).join('')

    const promedioEvals = evalsEncargado.filter(e => e.calificacion != null).length > 0
      ? Math.round(evalsEncargado.filter(e => e.calificacion != null).reduce((s, e) => s + e.calificacion, 0) / evalsEncargado.filter(e => e.calificacion != null).length)
      : null

    const secNames = ['Rev. Inicial', 'Maniobras', 'M. Defensivo', 'M. Técnico']
    const evalsOPTHtml = evalsEncargado.length === 0 ? '' : evalsEncargado.map(ev => {
      const calColor = ev.calificacion >= 80 ? '#16a34a' : ev.calificacion >= 60 ? '#d97706' : ev.calificacion != null ? '#dc2626' : '#6b7280'
      const secCells = ev.secciones ? ev.secciones.map(s => {
        const c = s.puntos >= 80 ? '#16a34a' : s.puntos >= 60 ? '#d97706' : '#dc2626'
        return `<td style="text-align:center;font-weight:700;color:${c}">${s.puntos}</td>`
      }).join('') : secNames.map(() => '<td style="text-align:center;color:#94a3b8">—</td>').join('')
      let semanaEval = ''
      if (alumno.fechaEgreso && ev.fecha) {
        const diffMs = new Date(ev.fecha) - new Date(alumno.fechaEgreso)
        if (diffMs >= 0) semanaEval = `Sem. ${Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1}`
      }
      return `<tr>
        <td>${new Date(ev.fecha).toLocaleDateString('es-MX')}${semanaEval ? `<br><span style="font-size:10px;color:#3b82f6;font-weight:600">${semanaEval}</span>` : ''}</td>
        <td>${ev.operadorTutor || ev.operador || '—'}</td>
        ${secCells}
        <td style="font-weight:800;color:${calColor};font-size:14px;text-align:center">${ev.calificacion != null ? ev.calificacion : '—'}</td>
      </tr>`
    }).join('')

    const maxKm = practicas && practicas.semanas.length > 0 ? Math.max(...practicas.semanas.map(s => s.km)) : 0
    const maxHrs = practicas && practicas.semanas.length > 0 ? Math.max(...practicas.semanas.map(s => s.horas)) : 0

    const kmHrsHtml = !practicas || practicas.registros === 0 ? '<p style="color:#94a3b8;font-size:12px">Sin registros de prácticas</p>' : `
      <div style="display:flex;gap:12px;margin-bottom:16px">
        ${[{ label: 'Kilómetros', actual: practicas.totalKm.toLocaleString('es-MX'), meta: practicas.meta?.km, pct: practicas.pctKm, unit: 'km' },
           { label: 'Horas', actual: practicas.totalHrs, meta: practicas.meta?.hrs, pct: practicas.pctHrs, unit: 'hrs' }].map(item => `
          <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
            <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">${item.label}</div>
            <div style="font-size:24px;font-weight:800;color:${item.pct != null ? semColor(item.pct) : '#334155'};margin-top:4px">${item.actual}${item.meta ? ` <span style="font-size:13px;color:#94a3b8;font-weight:600">/ ${item.meta.toLocaleString('es-MX')} ${item.unit}</span>` : ''}</div>
            ${item.pct != null ? `<div style="margin-top:6px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="width:${Math.min(100, item.pct)}%;height:100%;border-radius:4px;background:${semColor(item.pct)}"></div></div><div style="text-align:right;font-size:11px;color:${semColor(item.pct)};font-weight:700;margin-top:2px">${item.pct}%</div>` : '<div style="font-size:11px;color:#f59e0b;font-weight:600;margin-top:4px">Sin meta configurada</div>'}
          </div>`).join('')}
      </div>
      ${practicas.semanas.length > 0 ? `
      <div style="display:flex;gap:20px;margin-top:8px">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">Kilómetros por Semana</div>
          ${practicas.semanas.map(s => {
            const pctBar = maxKm > 0 ? Math.round(s.km / maxKm * 100) : 0
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:11px;color:#64748b;width:52px;text-align:right;flex-shrink:0">S${s.semana}</span>
              <div style="flex:1;height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden;position:relative">
                <div style="width:${pctBar}%;height:100%;background:#f97316;border-radius:4px"></div>
                <span style="position:absolute;right:6px;top:2px;font-size:10px;font-weight:700;color:#334155">${s.km.toLocaleString('es-MX')}</span>
              </div>
            </div>`}).join('')}
        </div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">Horas por Semana</div>
          ${practicas.semanas.map(s => {
            const pctBar = maxHrs > 0 ? Math.round(s.horas / maxHrs * 100) : 0
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:11px;color:#64748b;width:52px;text-align:right;flex-shrink:0">S${s.semana}</span>
              <div style="flex:1;height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden;position:relative">
                <div style="width:${pctBar}%;height:100%;background:#3b82f6;border-radius:4px"></div>
                <span style="position:absolute;right:6px;top:2px;font-size:10px;font-weight:700;color:#334155">${s.horas}</span>
              </div>
            </div>`}).join('')}
        </div>
      </div>
      <div style="display:flex;gap:20px;margin-top:10px;font-size:11px;color:#64748b;border-top:1px solid #e5e7eb;padding-top:8px">
        <span><strong>Total:</strong> ${practicas.registros} viajes</span>
        <span><strong>Km:</strong> <span style="color:${semColor(practicas.pctKm || 0)};font-weight:700">${practicas.totalKm.toLocaleString('es-MX')}</span></span>
        <span><strong>Hrs:</strong> <span style="color:${semColor(practicas.pctHrs || 0)};font-weight:700">${practicas.totalHrs}</span></span>
      </div>` : ''}`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Kardex OPT — ${alumno.nombre}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{margin:0;padding:0;width:100%}
        body{font-family:Arial,sans-serif;font-size:12px;color:#111}
        .cintilla{background:#1e293b;padding:16px 28px;display:flex;align-items:center;gap:16px;margin-bottom:20px;width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .cintilla img{height:44px;width:auto;display:block;flex-shrink:0;mix-blend-mode:screen}
        .content{padding:0 24px 24px;background-image:url(${selloWM});background-repeat:no-repeat;background-position:center 200px;background-size:500px 500px}
        .emp-header{background:#1e293b;color:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .emp-header h1{font-size:18px;margin-bottom:4px}
        .emp-header .sub{font-size:11px;color:#94a3b8;display:flex;flex-wrap:wrap;gap:12px;margin-top:4px}
        .stats{display:flex;gap:10px;margin-bottom:16px}
        .stat{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}
        .stat .val{font-size:20px;font-weight:800}
        .stat .lbl{font-size:10px;color:#6b7280;margin-top:2px}
        h2{font-size:14px;font-weight:700;color:#0b2341;margin:18px 0 8px}
        table{width:100%;border-collapse:collapse}
        th{background:#f1f5f9;text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#374151;border-bottom:2px solid #e5e7eb}
        td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
        tr{page-break-inside:avoid}
        .footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:right}
        @media print{@page{margin:0;size:A4}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style>
    </head><body>
      <div class="cintilla">
        ${udatDarkSrc ? `<img src="${udatDarkSrc}" alt="UDAT"/>` : ''}
        <span style="margin-left:auto;color:#94a3b8;font-size:12px;font-weight:600">Kardex Seguimiento OPT</span>
      </div>
      <div class="content">
        <div class="emp-header">
          <h1>${alumno.nombre}</h1>
          <div class="sub">
            <span>${alumno.matricula}</span>
            <span>Generación: ${alumno.generacion || '—'}</span>
            <span>Perfil: ${alumno.perfil || '—'}</span>
            <span>Empresa: ${alumno.empresa || '—'}</span>
            <span>Semana actual: ${alumno.semanaActual}</span>
            <span>Egreso: ${new Date(alumno.fechaEgreso).toLocaleDateString('es-MX')}</span>
          </div>
        </div>

        <div class="stats">
          <div class="stat"><div class="val" style="color:${promedioEvals != null ? (promedioEvals >= 80 ? '#16a34a' : promedioEvals >= 60 ? '#d97706' : '#dc2626') : '#6b7280'}">${promedioEvals != null ? promedioEvals : '—'}</div><div class="lbl">Eval. Semanales</div>${promedioEvals != null ? `<div style="font-size:9px;color:#94a3b8;margin-top:2px">Promedio ${evalsEncargado.length} eval.</div>` : ''}</div>
          <div class="stat"><div class="val" style="color:#1e293b">${practicas ? practicas.registros : 0}</div><div class="lbl">Total Viajes</div></div>
          ${practicas && practicas.pctKm != null ? `<div class="stat"><div class="val" style="color:${semColor(practicas.pctKm)}">${practicas.pctKm}%</div><div class="lbl">Avance Km</div></div>` : `<div class="stat"><div class="val" style="color:#94a3b8">—</div><div class="lbl">Avance Km</div></div>`}
          ${practicas && practicas.pctHrs != null ? `<div class="stat"><div class="val" style="color:${semColor(practicas.pctHrs)}">${practicas.pctHrs}%</div><div class="lbl">Avance Hrs</div></div>` : `<div class="stat"><div class="val" style="color:#94a3b8">—</div><div class="lbl">Avance Hrs</div></div>`}
          <div class="stat"><div class="val" style="color:${alumno.porcentaje >= 80 ? '#16a34a' : alumno.porcentaje >= 50 ? '#d97706' : '#dc2626'}">${alumno.porcentaje}%</div><div class="lbl">Avance Encuestas</div><div style="font-size:9px;color:#94a3b8;margin-top:2px">${alumno.completadas}/${alumno.totalEncuestas}</div></div>
        </div>

        <h2>Evaluaciones Semanales OPT (${evalsEncargado.length})</h2>
        ${evalsOPTHtml ? `<table>
          <thead><tr><th>Fecha</th><th>Evaluador</th><th style="text-align:center">Rev. Inicial</th><th style="text-align:center">Maniobras</th><th style="text-align:center">M. Defensivo</th><th style="text-align:center">M. Técnico</th><th style="text-align:center">Calif.</th></tr></thead>
          <tbody>${evalsOPTHtml}</tbody>
        </table>` : '<p style="color:#94a3b8;font-size:12px;margin:8px 0">Sin evaluaciones semanales registradas</p>'}

        <h2>Encuestas del Alumno</h2>
        <table>
          <thead><tr><th>Encuesta</th><th>Semana</th><th>Estado</th><th>Respondida</th></tr></thead>
          <tbody>${encuestasHtml}</tbody>
        </table>

        <h2>Kilómetros / Horas</h2>
        ${kmHrsHtml}

        <div class="footer">Generado el ${new Date().toLocaleDateString('es-MX', {day:'2-digit',month:'long',year:'numeric'})} · UDAT Seguimiento OPT</div>
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
      <script>
        window.onload = function() {
          html2pdf().set({
            margin: 0,
            filename: 'KardexOPT_${(alumno.nombre || '').replace(/[^a-zA-Z0-9_áéíóúÁÉÍÓÚüÜñÑ ]/g,'').trim().replace(/ +/g,'_')}.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }).from(document.body).save().then(function(){ window.close(); });
        };
      <\/script>
    </body></html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer',
          fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ← Volver al listado
        </button>
        <button onClick={imprimirKardexOPT} disabled={loadingEvals || loadingPracticas} style={{
          background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          opacity: loadingEvals || loadingPracticas ? 0.5 : 1,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ↓ Descargar Kardex OPT
        </button>
      </div>

      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{alumno.nombre}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{alumno.matricula}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Generación: <strong>{alumno.generacion || '—'}</strong></span>
              <span style={{ fontSize: 12, color: '#64748b' }}>Perfil: <strong>{alumno.perfil || '—'}</strong></span>
              <span style={{ fontSize: 12, color: '#64748b' }}>Empresa: <strong>{alumno.empresa || '—'}</strong></span>
              <span style={{ fontSize: 12, color: '#64748b' }}>Semana actual: <strong>{alumno.semanaActual}</strong></span>
              <span style={{ fontSize: 12, color: '#64748b' }}>Egreso: <strong>{new Date(alumno.fechaEgreso).toLocaleDateString('es-MX')}</strong></span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: promedioEvalsDetalle != null ? (promedioEvalsDetalle >= 80 ? '#22c55e' : promedioEvalsDetalle >= 60 ? '#f59e0b' : '#ef4444') : '#94a3b8' }}>
              {promedioEvalsDetalle != null ? promedioEvalsDetalle : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>eval. semanales</div>
            {promedioEvalsDetalle != null && <div style={{ fontSize: 10, color: '#94a3b8' }}>Promedio de {evalsConCalif.length} eval.</div>}
          </div>
        </div>

        {/* Barra Evaluaciones Semanales OPT */}
        {!loadingEvals && evalsConCalif.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Evaluaciones Semanales OPT</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: promedioEvalsDetalle >= 80 ? '#16a34a' : promedioEvalsDetalle >= 60 ? '#d97706' : '#dc2626' }}>
                {promedioEvalsDetalle} / 100 ({evalsConCalif.length} eval.)
              </span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, promedioEvalsDetalle)}%`, height: '100%', borderRadius: 4,
                background: promedioEvalsDetalle >= 80 ? '#16a34a' : promedioEvalsDetalle >= 60 ? '#d97706' : '#dc2626',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {/* Barras Km / Hrs */}
        {!loadingPracticas && practicas && practicas.registros > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {[
              { label: 'Kilómetros', actual: practicas.totalKm.toLocaleString('es-MX'), meta: practicas.meta?.km, pct: practicas.pctKm, unit: 'km' },
              { label: 'Horas', actual: practicas.totalHrs, meta: practicas.meta?.hrs, pct: practicas.pctHrs, unit: 'hrs' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.pct != null ? semaforoColor(item.pct) : '#334155' }}>
                    {item.actual}{item.meta ? ` / ${item.meta.toLocaleString('es-MX')} ${item.unit}` : ''}{item.pct != null ? ` (${item.pct}%)` : ''}
                  </span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, item.pct || 0)}%`, height: '100%', borderRadius: 4,
                    background: item.pct != null ? semaforoColor(item.pct) : '#94a3b8',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Barra avance encuestas */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Encuestas</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: alumno.porcentaje >= 80 ? '#16a34a' : alumno.porcentaje >= 50 ? '#d97706' : '#dc2626' }}>
              {alumno.completadas}/{alumno.totalEncuestas} ({alumno.porcentaje}%)
            </span>
          </div>
          <ProgressBar porcentaje={alumno.porcentaje} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        <button style={dtab(tabDetalle === 'timeline')} onClick={() => setTabDetalle('timeline')}>
          Encuestas Alumno <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: 10, fontSize: 11, marginLeft: 4 }}>{alumno.completadas}/{alumno.totalEncuestas}</span>
        </button>
        <button style={dtab(tabDetalle === 'encargado')} onClick={() => setTabDetalle('encargado')}>
          Evaluaciones semanales OPT <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: 10, fontSize: 11, marginLeft: 4 }}>{evalsEncargado.length}</span>
        </button>
        <button style={dtab(tabDetalle === 'todas')} onClick={() => setTabDetalle('todas')}>
          Todas <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: 10, fontSize: 11, marginLeft: 4 }}>{evaluaciones.length}</span>
        </button>
        <button style={dtab(tabDetalle === 'kmhrs')} onClick={() => setTabDetalle('kmhrs')}>
          Km / Horas {practicas && practicas.registros > 0 && <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: 10, fontSize: 11, marginLeft: 4 }}>{practicas.registros}</span>}
        </button>
      </div>

      {tabDetalle === 'timeline' && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Timeline de Encuestas ({alumno.completadas}/{alumno.totalEncuestas} completadas)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alumno.encuestas.map((enc, i) => {
              const cfg = ESTADO_CONFIG[enc.estado] || ESTADO_CONFIG.pendiente
              const matchEval = evalsAlumno.find(ev => ev.formularioId === enc.formularioId)
              return <TimelineCard key={i} enc={enc} cfg={cfg} evalData={matchEval} />
            })}
          </div>
          {loadingEvals && <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Cargando respuestas...</div>}
        </>
      )}

      {tabDetalle === 'encargado' && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Evaluaciones semanales OPT ({evalsEncargado.length})
          </div>
          {loadingEvals ? (
            <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Cargando evaluaciones...</div>
          ) : evalsEncargado.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              No hay evaluaciones semanales OPT para este alumno
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evalsEncargado.map(ev => <EvaluacionCard key={ev.respuestaId} ev={ev} defaultOpen fechaEgreso={alumno.fechaEgreso} />)}
            </div>
          )}
        </>
      )}

      {tabDetalle === 'todas' && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Todas las Evaluaciones ({evaluaciones.length})
          </div>
          {loadingEvals ? (
            <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Cargando...</div>
          ) : evaluaciones.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              No hay evaluaciones para este alumno
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evaluaciones.map(ev => <EvaluacionCard key={ev.respuestaId} ev={ev} fechaEgreso={alumno.fechaEgreso} />)}
            </div>
          )}
        </>
      )}

      {tabDetalle === 'kmhrs' && (
        <>
          {loadingPracticas ? (
            <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Cargando datos de prácticas...</div>
          ) : !practicas || practicas.registros === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              No hay registros de prácticas para este alumno
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info de asignación */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
                <span>Empresa: <strong style={{ color: '#0f172a' }}>{practicas.empresa}</strong></span>
                <span>Unidad de Negocio: <strong style={{ color: '#0f172a' }}>{practicas.unidadNegocio || '—'}</strong></span>
                <span>Unidad Operativa: <strong style={{ color: '#0f172a' }}>{practicas.unidadOperativa || '—'}</strong></span>
                <span>Viajes registrados: <strong style={{ color: '#0f172a' }}>{practicas.registros}</strong></span>
              </div>

              {/* Tarjetas de progreso Km y Hrs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Kilómetros', actual: practicas.totalKm.toLocaleString('es-MX'), meta: practicas.meta?.km, pct: practicas.pctKm, unit: 'km' },
                  { label: 'Horas', actual: practicas.totalHrs, meta: practicas.meta?.hrs, pct: practicas.pctHrs, unit: 'hrs' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20,
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: item.pct != null ? semaforoColor(item.pct) : '#334155' }}>{item.actual}</span>
                      {item.meta && (
                        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>/ {item.meta.toLocaleString('es-MX')} {item.unit}</span>
                      )}
                    </div>
                    {item.meta && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                          <span>Avance</span>
                          <span style={{ fontWeight: 700, color: semaforoColor(item.pct) }}>{item.pct}%</span>
                        </div>
                        <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, item.pct)}%`, height: '100%', borderRadius: 5,
                            background: semaforoColor(item.pct),
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    )}
                    {!item.meta && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Sin meta configurada para esta unidad</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desglose semanal */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Desglose por Semana
                </div>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Semana</th>
                      <th style={{ padding: '10px 18px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Viajes</th>
                      <th style={{ padding: '10px 18px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Kilómetros</th>
                      <th style={{ padding: '10px 18px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practicas.semanas.map(s => (
                      <tr key={s.semana} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 18px', fontWeight: 600, color: '#0f172a' }}>Semana {s.semana}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'right', color: '#64748b' }}>{s.viajes}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{s.km.toLocaleString('es-MX')}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{s.horas}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td style={{ padding: '10px 18px', color: '#0f172a' }}>Total</td>
                      <td style={{ padding: '10px 18px', textAlign: 'right', color: '#64748b' }}>{practicas.semanas.reduce((s, r) => s + r.viajes, 0)}</td>
                      <td style={{ padding: '10px 18px', textAlign: 'right', color: semaforoColor(practicas.pctKm || 0) }}>{practicas.totalKm.toLocaleString('es-MX')}</td>
                      <td style={{ padding: '10px 18px', textAlign: 'right', color: semaforoColor(practicas.pctHrs || 0) }}>{practicas.totalHrs}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReportePanel({ alumnos, portales }) {
  const [filtroGen, setFiltroGen] = useState([])
  const [filtroPerfil, setFiltroPerfil] = useState([])
  const [filtroEmpresa, setFiltroEmpresa] = useState([])
  const [filtroUN, setFiltroUN] = useState([])
  const [filtroUO, setFiltroUO] = useState([])

  const generaciones = useMemo(() => [...new Set(alumnos.map(a => a.generacion).filter(Boolean))].sort(), [alumnos])
  const perfiles = useMemo(() => [...new Set(alumnos.map(a => a.perfil).filter(Boolean))].sort(), [alumnos])
  const empresas = useMemo(() => [...new Set(alumnos.map(a => a.empresa).filter(Boolean))].sort(), [alumnos])
  const unidades = useMemo(() => {
    let arr = alumnos
    if (filtroEmpresa.length) arr = arr.filter(a => filtroEmpresa.includes(a.empresa))
    return [...new Set(arr.map(a => a.unidadNegocio).filter(Boolean))].sort()
  }, [alumnos, filtroEmpresa])
  const uOperativas = useMemo(() => {
    let arr = alumnos
    if (filtroEmpresa.length) arr = arr.filter(a => filtroEmpresa.includes(a.empresa))
    if (filtroUN.length) arr = arr.filter(a => filtroUN.includes(a.unidadNegocio))
    return [...new Set(arr.map(a => a.unidadOperativa).filter(Boolean))].sort()
  }, [alumnos, filtroEmpresa, filtroUN])

  useEffect(() => { setFiltroUN(prev => prev.filter(u => unidades.includes(u))) }, [unidades])
  useEffect(() => { setFiltroUO(prev => prev.filter(u => uOperativas.includes(u))) }, [uOperativas])

  const filtered = useMemo(() => {
    let arr = alumnos.filter(a => (a.etapa || '').toUpperCase().includes('OPT'))
    if (filtroGen.length) arr = arr.filter(a => filtroGen.includes(a.generacion))
    if (filtroPerfil.length) arr = arr.filter(a => filtroPerfil.includes(a.perfil))
    if (filtroEmpresa.length) arr = arr.filter(a => filtroEmpresa.includes(a.empresa))
    if (filtroUN.length) arr = arr.filter(a => filtroUN.includes(a.unidadNegocio))
    if (filtroUO.length) arr = arr.filter(a => filtroUO.includes(a.unidadOperativa))
    return arr.sort((a, b) => (a.generacion || '').localeCompare(b.generacion || '') || (a.nombre || '').localeCompare(b.nombre || ''))
  }, [alumnos, filtroGen, filtroPerfil, filtroEmpresa, filtroUN, filtroUO])

  const grouped = useMemo(() => {
    const map = {}
    for (const a of filtered) {
      const g = a.generacion || 'Sin generación'
      if (!map[g]) map[g] = []
      map[g].push(a)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const semColor = pct => pct >= 100 ? '#22c55e' : pct >= 75 ? '#84cc16' : pct >= 50 ? '#eab308' : pct >= 25 ? '#f97316' : '#ef4444'
  const evalColor = v => v >= 80 ? '#16a34a' : v >= 60 ? '#d97706' : '#dc2626'

  function generarPDF() {
    const filtroTexto = [
      filtroGen.length ? `Generación: ${filtroGen.join(', ')}` : '',
      filtroPerfil.length ? `Perfil: ${filtroPerfil.join(', ')}` : '',
      filtroEmpresa.length ? `Empresa: ${filtroEmpresa.join(', ')}` : '',
      filtroUN.length ? `U. Negocio: ${filtroUN.join(', ')}` : '',
      filtroUO.length ? `U. Operativa: ${filtroUO.join(', ')}` : '',
    ].filter(Boolean).join(' · ') || 'Todos los alumnos OPT'

    const rows = filtered.map(a => {
      const evalProm = a.promedioEvals != null ? a.promedioEvals : '—'
      const evalColor = a.promedioEvals != null ? (a.promedioEvals >= 80 ? '#16a34a' : a.promedioEvals >= 60 ? '#d97706' : '#dc2626') : '#6b7280'
      const kmTxt = a.totalKm > 0 ? `${a.totalKm.toLocaleString('es-MX')}${a.metaKm ? ' / ' + a.metaKm.toLocaleString('es-MX') : ''}` : '—'
      const kmPct = a.pctKm != null ? `${a.pctKm}%` : ''
      const hrsTxt = a.totalHrs > 0 ? `${a.totalHrs}${a.metaHrs ? ' / ' + a.metaHrs : ''}` : '—'
      const hrsPct = a.pctHrs != null ? `${a.pctHrs}%` : ''
      return { ...a, evalProm, evalColor, kmTxt, kmPct, hrsTxt, hrsPct }
    })

    let tablaHtml = ''
    let currentGen = ''
    for (const a of rows) {
      const gen = a.generacion || 'Sin generación'
      if (gen !== currentGen) {
        currentGen = gen
        const genAlumnos = rows.filter(r => (r.generacion || 'Sin generación') === gen)
        const genEvalProm = genAlumnos.filter(r => r.promedioEvals != null)
        const genEval = genEvalProm.length ? Math.round(genEvalProm.reduce((s, r) => s + r.promedioEvals, 0) / genEvalProm.length) : null
        tablaHtml += `<tr style="background:#e8edf3"><td colspan="12" style="padding:10px 12px;font-weight:800;font-size:13px;color:#0b2341;border-bottom:2px solid #0b2341">
          Generación ${gen} — ${genAlumnos.length} alumno${genAlumnos.length !== 1 ? 's' : ''}${genEval != null ? ` · Eval. promedio: ${genEval}` : ''}
        </td></tr>`
      }
      const pctColor = a.porcentaje >= 80 ? '#16a34a' : a.porcentaje >= 50 ? '#d97706' : '#dc2626'
      tablaHtml += `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:7px 10px;font-weight:600">${a.nombre}</td>
        <td style="padding:7px 10px;font-size:11px;color:#64748b">${a.matricula}</td>
        <td style="padding:7px 10px;text-align:center">${a.perfil || '—'}</td>
        <td style="padding:7px 10px;text-align:center">${a.empresa || '—'}</td>
        <td style="padding:7px 10px;text-align:center;font-size:10px">${a.unidadNegocio || '—'}</td>
        <td style="padding:7px 10px;text-align:center;font-size:10px">${a.unidadOperativa || '—'}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:#3b82f6">${a.semanaActual}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:${a.evalColor}">${a.evalProm}</td>
        <td style="padding:7px 10px;text-align:right;font-size:11px">${a.kmTxt}${a.kmPct ? '<br><span style="color:' + (a.pctKm >= 75 ? '#16a34a' : a.pctKm >= 50 ? '#d97706' : '#dc2626') + ';font-weight:700">' + a.kmPct + '</span>' : ''}</td>
        <td style="padding:7px 10px;text-align:right;font-size:11px">${a.hrsTxt}${a.hrsPct ? '<br><span style="color:' + (a.pctHrs >= 75 ? '#16a34a' : a.pctHrs >= 50 ? '#d97706' : '#dc2626') + ';font-weight:700">' + a.hrsPct + '</span>' : ''}</td>
        <td style="padding:7px 10px;text-align:center"><span style="color:${pctColor};font-weight:700">${a.completadas}/${a.totalEncuestas}</span></td>
        <td style="padding:7px 10px;text-align:center">${a.vencidas > 0 ? '<span style="color:#dc2626;font-weight:700">' + a.vencidas + '</span>' : '<span style="color:#94a3b8">0</span>'}</td>
      </tr>`
    }

    const totalAlumnos = filtered.length
    const totalConEval = filtered.filter(a => a.promedioEvals != null)
    const promEvalGlobal = totalConEval.length ? Math.round(totalConEval.reduce((s, a) => s + a.promedioEvals, 0) / totalConEval.length) : null
    const promEncuestas = totalAlumnos ? Math.round(filtered.reduce((s, a) => s + a.porcentaje, 0) / totalAlumnos) : 0
    const totalVencidas = filtered.reduce((s, a) => s + a.vencidas, 0)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: #1e293b; padding: 30px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 3px solid #0b2341; }
      .title { font-size: 22px; font-weight: 800; color: #0b2341; }
      .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
      .stats { display: flex; gap: 16px; margin-bottom: 18px; }
      .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; text-align: center; }
      .stat-val { font-size: 22px; font-weight: 800; }
      .stat-lbl { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
      th { background: #0b2341; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
      td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    </style></head><body>
      <div class="header">
        <div>
          <div class="title">Reporte Seguimiento OPT</div>
          <div class="subtitle">${filtroTexto}</div>
          <div class="subtitle">Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#64748b">UDAT · Seguimiento OPT</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat-card"><div class="stat-val" style="color:#0b2341">${totalAlumnos}</div><div class="stat-lbl">Alumnos</div></div>
        <div class="stat-card"><div class="stat-val" style="color:${promEvalGlobal != null ? (promEvalGlobal >= 80 ? '#16a34a' : promEvalGlobal >= 60 ? '#d97706' : '#dc2626') : '#94a3b8'}">${promEvalGlobal != null ? promEvalGlobal : '—'}</div><div class="stat-lbl">Eval. Promedio</div></div>
        <div class="stat-card"><div class="stat-val" style="color:${promEncuestas >= 80 ? '#16a34a' : promEncuestas >= 50 ? '#d97706' : '#dc2626'}">${promEncuestas}%</div><div class="stat-lbl">Avance Encuestas</div></div>
        <div class="stat-card"><div class="stat-val" style="color:${totalVencidas > 0 ? '#dc2626' : '#16a34a'}">${totalVencidas}</div><div class="stat-lbl">Encuestas Vencidas</div></div>
      </div>
      <table>
        <colgroup>
          <col style="width:15%"><col style="width:10%"><col style="width:7%"><col style="width:8%">
          <col style="width:10%"><col style="width:10%">
          <col style="width:5%"><col style="width:5%">
          <col style="width:10%"><col style="width:8%">
          <col style="width:7%"><col style="width:5%">
        </colgroup>
        <thead><tr>
          <th>Alumno</th><th>Matrícula</th><th style="text-align:center">Perfil</th><th style="text-align:center">Empresa</th>
          <th style="text-align:center">U. Negocio</th><th style="text-align:center">U. Operativa</th>
          <th style="text-align:center">Sem.</th><th style="text-align:center">Eval.</th>
          <th style="text-align:right">Kilómetros</th><th style="text-align:right">Horas</th>
          <th style="text-align:center">Encuestas</th><th style="text-align:center">Vencidas</th>
        </tr></thead>
        <tbody>${tablaHtml}</tbody>
      </table>
      <div class="footer">Reporte generado automáticamente · UDAT Seguimiento OPT · ${new Date().toLocaleDateString('es-MX')}</div>
    </body></html>`

    const w = window.open('', '_blank', 'width=1100,height=800')
    w.document.write(html)
    w.document.close()
    const script = w.document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.onload = () => {
      w.html2pdf().set({
        margin: [10, 8, 10, 8],
        filename: `Reporte_OPT_${filtroGen.length ? filtroGen.join('-') : 'Todas'}${filtroEmpresa.length ? '_' + filtroEmpresa.join('-') : ''}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      }).from(w.document.body).save().then(() => w.close())
    }
    w.document.head.appendChild(script)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={generaciones} selected={filtroGen} onChange={setFiltroGen} placeholder="Generación" />
        <MultiSelect options={perfiles} selected={filtroPerfil} onChange={setFiltroPerfil} placeholder="Perfil" />
        <MultiSelect options={empresas} selected={filtroEmpresa} onChange={setFiltroEmpresa} placeholder="Empresa" />
        <MultiSelect options={unidades} selected={filtroUN} onChange={setFiltroUN} placeholder="U. Negocio" />
        <MultiSelect options={uOperativas} selected={filtroUO} onChange={setFiltroUO} placeholder="U. Operativa" />
        <button onClick={generarPDF} disabled={filtered.length === 0} style={{
          background: '#0b2341', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: filtered.length === 0 ? 0.5 : 1,
        }}>
          ↓ Descargar PDF
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtered.length} alumno{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {grouped.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          No hay alumnos con los filtros seleccionados
        </div>
      ) : grouped.map(([gen, als]) => {
        const genEvalArr = als.filter(a => a.promedioEvals != null)
        const genEval = genEvalArr.length ? Math.round(genEvalArr.reduce((s, a) => s + a.promedioEvals, 0) / genEvalArr.length) : null
        const genPctEnc = als.length ? Math.round(als.reduce((s, a) => s + a.porcentaje, 0) / als.length) : 0
        return (
          <div key={gen} style={{ marginBottom: 20 }}>
            <div style={{
              background: '#e8edf3', padding: '10px 16px', borderRadius: '8px 8px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '2px solid #0b2341',
            }}>
              <span style={{ fontWeight: 800, color: '#0b2341', fontSize: 14 }}>Generación {gen} — {als.length} alumno{als.length !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                {genEval != null && <span>Eval: <strong style={{ color: genEval >= 80 ? '#16a34a' : genEval >= 60 ? '#d97706' : '#dc2626' }}>{genEval}</strong></span>}
                <span>Encuestas: <strong style={{ color: genPctEnc >= 80 ? '#16a34a' : genPctEnc >= 50 ? '#d97706' : '#dc2626' }}>{genPctEnc}%</strong></span>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '6%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Alumno</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Perfil</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Empresa</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>U. Negocio</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>U. Operativa</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sem.</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Eval.</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Km</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hrs</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Encuestas</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vencidas</th>
                  </tr>
                </thead>
                <tbody>
                  {als.map(a => (
                    <tr key={a.matricula} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.matricula}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.perfil || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.empresa || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.unidadNegocio || ''}>{a.unidadNegocio || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.unidadOperativa || ''}>{a.unidadOperativa || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#3b82f6' }}>{a.semanaActual}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: a.promedioEvals != null ? (a.promedioEvals >= 80 ? '#16a34a' : a.promedioEvals >= 60 ? '#d97706' : '#dc2626') : '#94a3b8' }}>
                        {a.promedioEvals != null ? a.promedioEvals : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11 }}>
                        {a.totalKm > 0 ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{a.totalKm.toLocaleString('es-MX')}</span>
                            {a.metaKm && <span style={{ color: '#94a3b8' }}> / {a.metaKm.toLocaleString('es-MX')}</span>}
                            {a.pctKm != null && <div style={{ fontWeight: 700, color: semColor(a.pctKm), fontSize: 10 }}>{a.pctKm}%</div>}
                          </div>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11 }}>
                        {a.totalHrs > 0 ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{a.totalHrs}</span>
                            {a.metaHrs && <span style={{ color: '#94a3b8' }}> / {a.metaHrs}</span>}
                            {a.pctHrs != null && <div style={{ fontWeight: 700, color: semColor(a.pctHrs), fontSize: 10 }}>{a.pctHrs}%</div>}
                          </div>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: a.porcentaje >= 80 ? '#16a34a' : a.porcentaje >= 50 ? '#d97706' : '#dc2626' }}>{a.completadas}/{a.totalEncuestas}</span>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{a.porcentaje}%</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {a.vencidas > 0 ? <span style={{ fontWeight: 700, color: '#dc2626' }}>{a.vencidas}</span> : <span style={{ color: '#94a3b8' }}>0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const RIESGO_CONFIG = {
  alto:  { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', icon: '🔴', label: 'Alto' },
  medio: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d', icon: '🟡', label: 'Medio' },
  bajo:  { bg: '#f0fdf4', color: '#16a34a', border: '#86efac', icon: '🟢', label: 'Bajo' },
}

function AlertasPanel({ token, onSelectAlumno, alumnos }) {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroNivel, setFiltroNivel] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/seguimiento-opt-alertas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setAlertas(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { setPagina(1) }, [filtroNivel])

  const filtered = filtroNivel ? alertas.filter(a => a.nivelRiesgo === filtroNivel) : alertas
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const alertasPagina = filtered.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)
  const altos = alertas.filter(a => a.nivelRiesgo === 'alto').length
  const medios = alertas.filter(a => a.nivelRiesgo === 'medio').length
  const bajos = alertas.filter(a => a.nivelRiesgo === 'bajo').length

  if (loading) return <div style={{ padding: 20, color: '#64748b' }}>Analizando respuestas de alumnos...</div>

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Requieren atención', value: altos, color: '#dc2626', bg: '#fef2f2', nivel: 'alto' },
          { label: 'Precaución', value: medios, color: '#d97706', bg: '#fffbeb', nivel: 'medio' },
          { label: 'Bajo riesgo', value: bajos, color: '#16a34a', bg: '#f0fdf4', nivel: 'bajo' },
          { label: 'Sin alertas', value: (alumnos?.length || 0) - alertas.length, color: '#64748b', bg: '#f8fafc', nivel: '' },
        ].map(c => (
          <div key={c.label}
            onClick={() => setFiltroNivel(f => f === c.nivel ? '' : c.nivel)}
            style={{
              background: c.bg, borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer',
              border: `2px solid ${filtroNivel === c.nivel ? c.color : 'transparent'}`,
              transition: 'border-color 0.2s',
            }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: c.color, fontWeight: 600, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {alertas.length === 0 ? 'No se detectaron alertas en ningún alumno' : 'No hay alertas con el filtro seleccionado'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alertasPagina.map(al => {
            const cfg = RIESGO_CONFIG[al.nivelRiesgo] || RIESGO_CONFIG.bajo
            const alumnoData = alumnos?.find(a => a.matricula === al.matricula)
            return (
              <div key={al.matricula} style={{
                background: '#fff', borderRadius: 12, border: `1px solid ${cfg.border}`,
                borderLeft: `4px solid ${cfg.color}`, overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{al.nombre}</span>
                      <span style={{
                        padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: cfg.bg, color: cfg.color,
                      }}>Riesgo {cfg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                      {al.matricula} · Gen. {al.generacion || '—'} · {al.perfil || '—'} · {al.empresa || '—'} · Semana {al.semanaActual}
                    </div>
                    {(() => {
                      const encFlag = al.flags.find(f => f.tipo === 'encuestas')
                      const respAltas = al.flags.filter(f => f.tipo === 'respuesta' && f.nivel === 'alto').length
                      const respMedias = al.flags.filter(f => f.tipo === 'respuesta' && f.nivel === 'medio').length
                      const sinDatos = al.flags.find(f => f.tipo === 'sin_datos')
                      const partes = []
                      if (encFlag) partes.push(encFlag.mensaje)
                      if (sinDatos) partes.push(sinDatos.mensaje)
                      if (respAltas > 0) partes.push(`${respAltas} respuesta${respAltas > 1 ? 's' : ''} crítica${respAltas > 1 ? 's' : ''}`)
                      if (respMedias > 0) partes.push(`${respMedias} respuesta${respMedias > 1 ? 's' : ''} de atención`)
                      return partes.length > 0 ? (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                          {partes.join(' · ')}
                        </div>
                      ) : null
                    })()}
                  </div>
                  {alumnoData && (
                    <button onClick={() => onSelectAlumno(alumnoData)}
                      style={{
                        background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
                        padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#3b82f6',
                        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                      Ver detalle →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <span>Mostrar</span>
            <select value={porPagina} onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1) }}
              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13, background: '#fff' }}>
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>por página</span>
            <span style={{ color: '#94a3b8', marginLeft: 8 }}>{filtered.length} alerta{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { label: '«', go: 1, disabled: paginaActual <= 1 },
              { label: '‹', go: Math.max(1, paginaActual - 1), disabled: paginaActual <= 1 },
            ].map(b => (
              <button key={b.label} onClick={() => setPagina(b.go)} disabled={b.disabled}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 14, color: '#334155', fontWeight: 600, opacity: b.disabled ? 0.4 : 1 }}>{b.label}</button>
            ))}
            <span style={{ padding: '0 10px', fontSize: 13, color: '#334155', fontWeight: 600 }}>{paginaActual} / {totalPaginas}</span>
            {[
              { label: '›', go: Math.min(totalPaginas, paginaActual + 1), disabled: paginaActual >= totalPaginas },
              { label: '»', go: totalPaginas, disabled: paginaActual >= totalPaginas },
            ].map(b => (
              <button key={b.label} onClick={() => setPagina(b.go)} disabled={b.disabled}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 14, color: '#334155', fontWeight: 600, opacity: b.disabled ? 0.4 : 1 }}>{b.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function normalizarTelefono(tel) {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  if (digits.length === 10) return '52' + digits
  if (digits.length === 12 && digits.startsWith('52')) return digits
  if (digits.length === 13 && digits.startsWith('521')) return '52' + digits.slice(3)
  return digits.length >= 10 ? digits : null
}

function WhatsAppModal({ alumnos, onClose }) {
  const [filtroEmp, setFiltroEmp] = useState('')
  const [filtroGen, setFiltroGen] = useState('')
  const [busq, setBusq] = useState('')
  const [enviados, setEnviados] = useState(new Set())

  const optAlumnos = alumnos.filter(a => (a.etapa || '').toUpperCase().includes('OPT'))

  const empresasDisp = [...new Set(optAlumnos.map(a => a.empresa).filter(Boolean))].sort()
  const generacionesDisp = useMemo(() => {
    let arr = optAlumnos
    if (filtroEmp) arr = arr.filter(a => a.empresa === filtroEmp)
    return [...new Set(arr.map(a => a.generacion).filter(Boolean))].sort()
  }, [optAlumnos, filtroEmp])

  const filtrados = useMemo(() => {
    let arr = optAlumnos
    if (filtroEmp) arr = arr.filter(a => a.empresa === filtroEmp)
    if (filtroGen) arr = arr.filter(a => a.generacion === filtroGen)
    if (busq) {
      const q = busq.toLowerCase()
      arr = arr.filter(a => (a.nombre || '').toLowerCase().includes(q) || (a.matricula || '').toLowerCase().includes(q))
    }
    return arr
  }, [optAlumnos, filtroEmp, filtroGen, busq])

  const conTelefono = filtrados.filter(a => normalizarTelefono(a.telefono))
  const sinTelefono = filtrados.filter(a => !normalizarTelefono(a.telefono))

  const SURVEY_URL = 'https://cotizador-web-coral.vercel.app/p/seguimientopt'
  const buildMsg = (nombre) => {
    return `Hola ${nombre.split(' ')[0]}, te compartimos el link para contestar tu encuesta de seguimiento OPT:\n${SURVEY_URL}`
  }

  const abrirWhatsApp = (alumno) => {
    const tel = normalizarTelefono(alumno.telefono)
    if (!tel) return
    const msg = encodeURIComponent(buildMsg(alumno.nombre))
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
    setEnviados(prev => new Set([...prev, alumno.matricula]))
  }

  const inp = {
    border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 13,
    background: '#fff', color: '#334155',
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 36, height: 36, borderRadius: '50%', background: '#25d366',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Enviar encuesta por WhatsApp</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Envía el link de la encuesta de seguimiento a los alumnos OPT</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, transition: 'background 0.15s',
          }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
             onMouseLeave={e => e.currentTarget.style.background = 'none'}>×</button>
        </div>

        {/* Filtros */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filtroEmp} onChange={e => { setFiltroEmp(e.target.value); setFiltroGen('') }} style={inp}>
            <option value="">Todas las empresas</option>
            {empresasDisp.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtroGen} onChange={e => setFiltroGen(e.target.value)} style={inp}>
            <option value="">Todas las generaciones</option>
            {generacionesDisp.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar alumno..." style={{ ...inp, minWidth: 160 }} />
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
            <span style={{ fontWeight: 600, color: '#25d366' }}>{conTelefono.length}</span> con teléfono
            {sinTelefono.length > 0 && <> · <span style={{ fontWeight: 600, color: '#ef4444' }}>{sinTelefono.length}</span> sin teléfono</>}
            {enviados.size > 0 && <> · <span style={{ fontWeight: 600, color: '#3b82f6' }}>{enviados.size}</span> enviados</>}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
          {conTelefono.length === 0 && sinTelefono.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No se encontraron alumnos OPT con los filtros seleccionados</div>
          )}
          {conTelefono.map(al => {
            const tel = normalizarTelefono(al.telefono)
            const yaEnviado = enviados.has(al.matricula)
            return (
              <div key={al.matricula} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{al.nombre}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {al.matricula} · {al.empresa || '—'} · {al.generacion || '—'}
                    {al.telefono && <> · <span style={{ color: '#64748b' }}>{al.telefono}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {yaEnviado && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Enviado</span>}
                  <button onClick={() => abrirWhatsApp(al)} style={{
                    background: yaEnviado ? '#86efac' : '#25d366', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'background 0.15s',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar
                  </button>
                </div>
              </div>
            )
          })}
          {sinTelefono.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', padding: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sin teléfono registrado ({sinTelefono.length})
              </div>
              {sinTelefono.map(al => (
                <div key={al.matricula} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                  borderBottom: '1px solid #f8fafc', opacity: 0.6,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{al.nombre}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {al.matricula} · {al.empresa || '—'} · {al.generacion || '—'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>Sin teléfono</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SeguimientoOPT({ usuario }) {
  const [data, setData] = useState({ portales: [], alumnos: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [portalId, setPortalId] = useState('')
  const [filtroGeneracion, setFiltroGeneracion] = useState([])
  const [filtroPerfil, setFiltroPerfil] = useState([])
  const [filtroEstado, setFiltroEstado] = useState([])
  const [filtroEmpresa, setFiltroEmpresa] = useState([])
  const [filtroUN, setFiltroUN] = useState([])
  const [filtroUO, setFiltroUO] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [selectedAlumno, setSelectedAlumno] = useState(null)
  const [sortField, setSortField] = useState('nombre')
  const [sortDir, setSortDir] = useState('asc')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const [tabEtapa, setTabEtapa] = useState('opt')
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('cotizador-token') : null

  function cargar(pid) {
    setLoading(true)
    setError('')
    fetchSeguimiento(token, pid || undefined)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { cargar(portalId) }, [portalId])

  const generaciones = useMemo(() => [...new Set(data.alumnos.map(a => a.generacion).filter(Boolean))].sort(), [data.alumnos])
  const perfiles = useMemo(() => [...new Set(data.alumnos.map(a => a.perfil).filter(Boolean))].sort(), [data.alumnos])
  const empresas = useMemo(() => [...new Set(data.alumnos.map(a => a.empresa).filter(Boolean))].sort(), [data.alumnos])
  const unidades = useMemo(() => {
    let arr = data.alumnos
    if (filtroEmpresa.length) arr = arr.filter(a => filtroEmpresa.includes(a.empresa))
    return [...new Set(arr.map(a => a.unidadNegocio).filter(Boolean))].sort()
  }, [data.alumnos, filtroEmpresa])
  const uOperativas = useMemo(() => {
    let arr = data.alumnos
    if (filtroEmpresa.length) arr = arr.filter(a => filtroEmpresa.includes(a.empresa))
    if (filtroUN.length) arr = arr.filter(a => filtroUN.includes(a.unidadNegocio))
    return [...new Set(arr.map(a => a.unidadOperativa).filter(Boolean))].sort()
  }, [data.alumnos, filtroEmpresa, filtroUN])

  useEffect(() => { setFiltroUN(prev => prev.filter(u => unidades.includes(u))) }, [unidades])
  useEffect(() => { setFiltroUO(prev => prev.filter(u => uOperativas.includes(u))) }, [uOperativas])

  const alumnosFiltrados = useMemo(() => {
    let arr = data.alumnos
    if (tabEtapa === 'opt') arr = arr.filter(a => (a.etapa || '').toUpperCase().includes('OPT'))
    if (filtroGeneracion.length) arr = arr.filter(a => filtroGeneracion.includes(a.generacion))
    if (filtroPerfil.length) arr = arr.filter(a => filtroPerfil.includes(a.perfil))
    if (filtroEmpresa.length) arr = arr.filter(a => filtroEmpresa.includes(a.empresa))
    if (filtroUN.length) arr = arr.filter(a => filtroUN.includes(a.unidadNegocio))
    if (filtroUO.length) arr = arr.filter(a => filtroUO.includes(a.unidadOperativa))
    if (filtroEstado.length) {
      arr = arr.filter(a => {
        if (filtroEstado.includes('al_dia') && a.vencidas === 0 && a.completadas > 0) return true
        if (filtroEstado.includes('con_vencidas') && a.vencidas > 0) return true
        if (filtroEstado.includes('sin_iniciar') && a.completadas === 0) return true
        return false
      })
    }
    if (busqueda.length >= 2) {
      const q = busqueda.toLowerCase()
      arr = arr.filter(a => a.nombre?.toLowerCase().includes(q) || a.matricula?.toLowerCase().includes(q))
    }
    arr = [...arr].sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [data.alumnos, tabEtapa, filtroGeneracion, filtroPerfil, filtroEmpresa, filtroEstado, filtroUN, filtroUO, busqueda, sortField, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const alumnosPagina = alumnosFiltrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)

  useEffect(() => { setPagina(1) }, [tabEtapa, filtroGeneracion, filtroPerfil, filtroEmpresa, filtroEstado, filtroUN, filtroUO, busqueda, portalId, sortField, sortDir])

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortIcon = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const inp = {
    border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px',
    fontSize: 13, background: '#fff', color: '#0f172a',
  }
  const paginBtn = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
    padding: '5px 10px', cursor: 'pointer', fontSize: 14, color: '#334155', fontWeight: 600,
  }

  if (loading) return <div style={{ padding: 20, color: '#64748b' }}>Cargando seguimiento OPT...</div>
  if (error) return <div style={{ padding: 20, color: '#ef4444' }}>Error: {error}</div>

  if (selectedAlumno) {
    return <AlumnoDetalle alumno={selectedAlumno} onBack={() => setSelectedAlumno(null)} />
  }

  const tabStyle = (active) => ({
    padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
    background: 'none', color: active ? '#3b82f6' : '#64748b',
    transition: 'all 0.15s',
  })

  const totalOpt = data.alumnos.filter(a => (a.etapa || '').toUpperCase().includes('OPT')).length
  const totalTodos = data.alumnos.length

  return (
    <div>
      {/* Tabs Etapa */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        <button style={tabStyle(tabEtapa === 'opt')} onClick={() => setTabEtapa('opt')}>
          En OPT <span style={{ background: tabEtapa === 'opt' ? '#dbeafe' : '#f1f5f9', color: tabEtapa === 'opt' ? '#3b82f6' : '#94a3b8', padding: '1px 8px', borderRadius: 10, fontSize: 11, marginLeft: 6 }}>{totalOpt}</span>
        </button>
        <button style={tabStyle(tabEtapa === 'todos')} onClick={() => setTabEtapa('todos')}>
          Todos <span style={{ background: tabEtapa === 'todos' ? '#dbeafe' : '#f1f5f9', color: tabEtapa === 'todos' ? '#3b82f6' : '#94a3b8', padding: '1px 8px', borderRadius: 10, fontSize: 11, marginLeft: 6 }}>{totalTodos}</span>
        </button>
        <button style={tabStyle(tabEtapa === 'alertas')} onClick={() => setTabEtapa('alertas')}>
          <span style={{ color: tabEtapa === 'alertas' ? '#dc2626' : '#64748b' }}>Alertas</span>
        </button>
        <button style={tabStyle(tabEtapa === 'reporte')} onClick={() => setTabEtapa('reporte')}>
          Reporte
        </button>
      </div>

      {tabEtapa === 'alertas' && (
        <AlertasPanel token={token} alumnos={data.alumnos} onSelectAlumno={al => setSelectedAlumno(al)} />
      )}

      {tabEtapa === 'reporte' && (
        <ReportePanel alumnos={data.alumnos} portales={data.portales} />
      )}

      {tabEtapa !== 'alertas' && tabEtapa !== 'reporte' && <>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {data.portales.length > 1 && (
          <select value={portalId} onChange={e => setPortalId(e.target.value)} style={inp}>
            <option value="">Todos los portales</option>
            {data.portales.map(p => <option key={p.PortalId} value={p.PortalId}>{p.Nombre}</option>)}
          </select>
        )}
        <MultiSelect options={generaciones} selected={filtroGeneracion} onChange={setFiltroGeneracion} placeholder="Generación" />
        <MultiSelect options={perfiles} selected={filtroPerfil} onChange={setFiltroPerfil} placeholder="Perfil" />
        <MultiSelect options={empresas} selected={filtroEmpresa} onChange={setFiltroEmpresa} placeholder="Empresa" />
        <MultiSelect options={unidades} selected={filtroUN} onChange={setFiltroUN} placeholder="Unidad Negocio" />
        <MultiSelect options={uOperativas} selected={filtroUO} onChange={setFiltroUO} placeholder="Unidad Operativa" />
        <MultiSelect options={['al_dia', 'con_vencidas', 'sin_iniciar']} selected={filtroEstado} onChange={setFiltroEstado} placeholder="Estado" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar alumno..."
          style={{ ...inp, minWidth: 180 }}
        />
        <button onClick={() => cargar(portalId)} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Actualizar
        </button>
        <button onClick={() => setShowWhatsApp(true)} style={{
          background: '#25d366', color: '#fff', border: 'none', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar encuesta
        </button>
      </div>

      <SummaryCards alumnos={alumnosFiltrados} />

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {[
                { field: 'nombre', label: 'Alumno', width: '18%' },
                { field: 'generacion', label: 'Gen.', width: '6%' },
                { field: 'perfil', label: 'Perfil', width: '8%' },
                { field: 'empresa', label: 'Empresa', width: '7%' },
                ...(tabEtapa === 'todos' ? [{ field: 'etapa', label: 'Etapa', width: '7%' }] : []),
                { field: 'semanaActual', label: 'Sem.', width: '5%' },
                { field: 'completadas', label: 'Compl.', width: '8%' },
                { field: 'vencidas', label: 'Venc.', width: '6%' },
                { field: 'porcentaje', label: 'Avance', width: '12%' },
                { field: 'totalKm', label: 'Km', width: '12%' },
                { field: 'totalHrs', label: 'Hrs', width: '10%' },
              ].map(col => (
                <th key={col.field}
                  onClick={() => toggleSort(col.field)}
                  style={{
                    padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em', whiteSpace: 'nowrap', userSelect: 'none',
                    width: col.width, overflow: 'hidden',
                  }}>
                  {col.label}{sortIcon(col.field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.length === 0 && (
              <tr>
                <td colSpan={tabEtapa === 'todos' ? 11 : 10} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  No se encontraron alumnos con los filtros seleccionados
                </td>
              </tr>
            )}
            {alumnosPagina.map(al => {
              return (
                <tr key={al.matricula}
                  onClick={() => setSelectedAlumno(al)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{al.nombre}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{al.matricula}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{al.generacion || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{al.perfil || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{al.empresa || '—'}</td>
                  {tabEtapa === 'todos' && (
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: (al.etapa || '').toUpperCase().includes('OPT') ? '#dbeafe' : '#f0fdf4',
                        color: (al.etapa || '').toUpperCase().includes('OPT') ? '#1d4ed8' : '#166534',
                      }}>{al.etapa || '—'}</span>
                    </td>
                  )}
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#3b82f6' }}>{al.semanaActual}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>{al.completadas}</span>
                    <span style={{ color: '#94a3b8' }}> / {al.totalEncuestas}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {al.vencidas > 0 ? (
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>{al.vencidas}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', minWidth: 120 }}>
                    <ProgressBar porcentaje={al.porcentaje} />
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {al.totalKm > 0 ? (
                      <div>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{al.totalKm.toLocaleString('es-MX')}</span>
                        {al.metaKm && (
                          <>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}> / {al.metaKm.toLocaleString('es-MX')}</span>
                            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 3, width: 70 }}>
                              <div style={{ width: `${Math.min(100, al.pctKm)}%`, height: '100%', borderRadius: 2, background: semaforoColor(al.pctKm) }} />
                            </div>
                          </>
                        )}
                      </div>
                    ) : <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {al.totalHrs > 0 ? (
                      <div>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{al.totalHrs}</span>
                        {al.metaHrs && (
                          <>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}> / {al.metaHrs}</span>
                            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 3, width: 70 }}>
                              <div style={{ width: `${Math.min(100, al.pctHrs)}%`, height: '100%', borderRadius: 2, background: semaforoColor(al.pctHrs) }} />
                            </div>
                          </>
                        )}
                      </div>
                    ) : <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
          <span>Mostrar</span>
          <select value={porPagina} onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1) }}
            style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13, background: '#fff' }}>
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>por página</span>
          <span style={{ color: '#94a3b8', marginLeft: 8 }}>
            {alumnosFiltrados.length} alumno{alumnosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setPagina(1)} disabled={paginaActual <= 1}
            style={{ ...paginBtn, opacity: paginaActual <= 1 ? 0.4 : 1 }}>«</button>
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual <= 1}
            style={{ ...paginBtn, opacity: paginaActual <= 1 ? 0.4 : 1 }}>‹</button>
          <span style={{ padding: '0 10px', fontSize: 13, color: '#334155', fontWeight: 600 }}>
            {paginaActual} / {totalPaginas}
          </span>
          <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual >= totalPaginas}
            style={{ ...paginBtn, opacity: paginaActual >= totalPaginas ? 0.4 : 1 }}>›</button>
          <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual >= totalPaginas}
            style={{ ...paginBtn, opacity: paginaActual >= totalPaginas ? 0.4 : 1 }}>»</button>
        </div>
      </div>
      </>}

      {showWhatsApp && (
        <WhatsAppModal
          alumnos={data.alumnos}
          onClose={() => setShowWhatsApp(false)}
        />
      )}
    </div>
  )
}
