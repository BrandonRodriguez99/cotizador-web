import { useEffect, useState, useMemo } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

function fetchSeguimiento(token, portalId) {
  const url = `${API}/seguimiento-opt${portalId ? `?portalId=${portalId}` : ''}`
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => {
    if (!r.ok) throw new Error('Error al cargar seguimiento')
    return r.json()
  })
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
  const promedioAvance = total ? Math.round(alumnos.reduce((s, a) => s + a.porcentaje, 0) / total) : 0

  const cards = [
    { label: 'Total Alumnos',   value: total,          color: '#3b82f6' },
    { label: 'Al Día',          value: alDia,           color: '#22c55e' },
    { label: 'Con Vencidas',    value: conVencidas,     color: '#ef4444' },
    { label: 'Sin Iniciar',     value: sinIniciar,      color: '#f59e0b' },
    { label: 'Avance Promedio', value: `${promedioAvance}%`, color: '#8b5cf6' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: '#fff', borderRadius: 12, padding: '16px 18px',
          border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
        </div>
      ))}
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
  const sev = SEVERITY_STYLES[severity]
  if (sev) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '2px 8px', borderRadius: 6, background: sev.bg, color: sev.color, fontWeight: 600,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sev.dot, flexShrink: 0 }} />
        {valor}
      </span>
    )
  }
  return <span>{valor}</span>
}

function EvaluacionCard({ ev, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const isEncargado = ev.tipo === 'encargado'
  const borderColor = isEncargado ? '#c084fc' : '#86efac'
  const iconBg = isEncargado ? '#f3e8ff' : '#dcfce7'
  const iconColor = isEncargado ? '#7c3aed' : '#166534'

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
            {new Date(ev.fecha).toLocaleDateString('es-MX')} · {ev.operador}
            {ev.portal && <span style={{ color: '#94a3b8' }}> · {ev.portal}</span>}
          </div>
        </div>
        <span style={{
          padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: isEncargado ? '#f3e8ff' : '#dcfce7',
          color: isEncargado ? '#7c3aed' : '#166534',
        }}>
          {isEncargado ? 'Evaluación semanal OPT' : 'Respuesta alumno'}
        </span>
        <span style={{ fontSize: 16, color: '#94a3b8', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginTop: 12 }}>
            <tbody>
              {ev.valores.filter(v => v.tipo !== 'alumno' && v.tipo !== 'operador_tutor').map((v, i) => (
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
              {evalData.valores.filter(v => v.tipo !== 'alumno' && v.tipo !== 'operador_tutor').map((v, i) => (
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
  }, [alumno.matricula])

  const evalsAlumno = evaluaciones.filter(e => e.tipo === 'alumno')
  const evalsEncargado = evaluaciones.filter(e => e.tipo === 'encargado')

  const dtab = (active) => ({
    padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
    background: 'none', color: active ? '#3b82f6' : '#64748b',
  })

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer',
        fontSize: 13, padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        ← Volver al listado
      </button>

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
            <div style={{ fontSize: 36, fontWeight: 800, color: alumno.porcentaje >= 80 ? '#22c55e' : alumno.porcentaje >= 50 ? '#f59e0b' : '#ef4444' }}>
              {alumno.porcentaje}%
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>avance encuestas</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
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
              {evalsEncargado.map(ev => <EvaluacionCard key={ev.respuestaId} ev={ev} defaultOpen />)}
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
              {evaluaciones.map(ev => <EvaluacionCard key={ev.respuestaId} ev={ev} />)}
            </div>
          )}
        </>
      )}
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

export default function SeguimientoOPT({ usuario }) {
  const [data, setData] = useState({ portales: [], alumnos: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [portalId, setPortalId] = useState('')
  const [filtroGeneracion, setFiltroGeneracion] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [selectedAlumno, setSelectedAlumno] = useState(null)
  const [sortField, setSortField] = useState('nombre')
  const [sortDir, setSortDir] = useState('asc')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const [tabEtapa, setTabEtapa] = useState('opt')

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

  const alumnosFiltrados = useMemo(() => {
    let arr = data.alumnos
    if (tabEtapa === 'opt') arr = arr.filter(a => (a.etapa || '').toUpperCase().includes('OPT'))
    if (filtroGeneracion) arr = arr.filter(a => a.generacion === filtroGeneracion)
    if (filtroPerfil) arr = arr.filter(a => a.perfil === filtroPerfil)
    if (filtroEmpresa) arr = arr.filter(a => a.empresa === filtroEmpresa)
    if (filtroEstado === 'al_dia') arr = arr.filter(a => a.vencidas === 0 && a.completadas > 0)
    if (filtroEstado === 'con_vencidas') arr = arr.filter(a => a.vencidas > 0)
    if (filtroEstado === 'sin_iniciar') arr = arr.filter(a => a.completadas === 0)
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
  }, [data.alumnos, tabEtapa, filtroGeneracion, filtroPerfil, filtroEmpresa, filtroEstado, busqueda, sortField, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const alumnosPagina = alumnosFiltrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)

  useEffect(() => { setPagina(1) }, [tabEtapa, filtroGeneracion, filtroPerfil, filtroEmpresa, filtroEstado, busqueda, portalId, sortField, sortDir])

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
      </div>

      {tabEtapa === 'alertas' && (
        <AlertasPanel token={token} alumnos={data.alumnos} onSelectAlumno={al => setSelectedAlumno(al)} />
      )}

      {tabEtapa !== 'alertas' && <>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {data.portales.length > 1 && (
          <select value={portalId} onChange={e => setPortalId(e.target.value)} style={inp}>
            <option value="">Todos los portales</option>
            {data.portales.map(p => <option key={p.PortalId} value={p.PortalId}>{p.Nombre}</option>)}
          </select>
        )}
        <select value={filtroGeneracion} onChange={e => setFiltroGeneracion(e.target.value)} style={inp}>
          <option value="">Todas las generaciones</option>
          {generaciones.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)} style={inp}>
          <option value="">Todos los perfiles</option>
          {perfiles.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} style={inp}>
          <option value="">Todas las empresas</option>
          {empresas.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={inp}>
          <option value="">Todos los estados</option>
          <option value="al_dia">Al día</option>
          <option value="con_vencidas">Con vencidas</option>
          <option value="sin_iniciar">Sin iniciar</option>
        </select>
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
      </div>

      <SummaryCards alumnos={alumnosFiltrados} />

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {[
                { field: 'nombre', label: 'Alumno' },
                { field: 'generacion', label: 'Generación' },
                { field: 'perfil', label: 'Perfil' },
                { field: 'empresa', label: 'Empresa' },
                ...(tabEtapa === 'todos' ? [{ field: 'etapa', label: 'Etapa' }] : []),
                { field: 'semanaActual', label: 'Semana' },
                { field: 'completadas', label: 'Completadas' },
                { field: 'vencidas', label: 'Vencidas' },
                { field: 'porcentaje', label: 'Avance' },
              ].map(col => (
                <th key={col.field}
                  onClick={() => toggleSort(col.field)}
                  style={{
                    padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em', whiteSpace: 'nowrap', userSelect: 'none',
                  }}>
                  {col.label}{sortIcon(col.field)}
                </th>
              ))}
              <th style={{ padding: '10px 14px', width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.length === 0 && (
              <tr>
                <td colSpan={tabEtapa === 'todos' ? 10 : 9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  No se encontraron alumnos con los filtros seleccionados
                </td>
              </tr>
            )}
            {alumnosPagina.map(al => {
              const statusColor = al.vencidas > 0 ? '#ef4444' : al.completadas > 0 ? '#22c55e' : '#f59e0b'
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
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: statusColor,
                    }} />
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
    </div>
  )
}
