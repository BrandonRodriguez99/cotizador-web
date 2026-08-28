import { useState, useEffect, useCallback } from 'react'
import { getGeneraciones, getAsistencia, getMovimientosAlumno } from './api'
import * as XLSX from 'xlsx'

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{
      flex: 1, minWidth: '110px', padding: '16px 20px', borderRadius: '10px',
      background: bg, border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

// ─── Modal de detalle de movimientos ──────────────────────────────────────────
function ModalMovimientos({ alumno, fecha, onClose }) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  useEffect(() => {
    setLoading(true)
    getMovimientosAlumno(alumno.Matricula, fecha)
      .then(list => { setMovimientos(list); setLoading(false) })
      .catch(e  => { setError(e.message);  setLoading(false) })
  }, [alumno.Matricula, fecha])

  const entradas = movimientos.filter(m => m.TipoAcceso === 'entrada').length
  const salidas  = movimientos.filter(m => m.TipoAcceso === 'salida').length

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                Movimientos del día
              </p>
              <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {alumno.Nombre}
              </h3>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                {alumno.Matricula}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1, padding: '0 0 0 12px' }}
            >×</button>
          </div>

          <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
            <span style={{
              padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              background: alumno.Presente ? '#dcfce7' : '#fee2e2',
              color:      alumno.Presente ? '#15803d' : '#b91c1c',
            }}>
              {alumno.Presente ? 'Presente' : 'Ausente'}
            </span>
            {!loading && movimientos.length > 0 && (
              <>
                <span style={{ padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8' }}>
                  {entradas} entrada{entradas !== 1 ? 's' : ''}
                </span>
                <span style={{ padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#fafaf5', color: '#92400e' }}>
                  {salidas} salida{salidas !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading && <p style={{ color: '#94a3b8', fontSize: '14px' }}>Cargando movimientos…</p>}
          {error   && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}

          {!loading && !error && movimientos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>—</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Sin registros de acceso para esta fecha.</p>
            </div>
          )}

          {!loading && movimientos.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Línea de tiempo vertical */}
              <div style={{
                position: 'absolute', left: '19px', top: '10px', bottom: '10px',
                width: '2px', background: '#f1f5f9',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {movimientos.map((m, i) => {
                  const esEntrada = m.TipoAcceso === 'entrada'
                  const hora = m.FechaHora ? new Date(m.FechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
                  return (
                    <div key={m.RegistroId} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', paddingBottom: i < movimientos.length - 1 ? '20px' : 0 }}>
                      {/* Punto en la línea */}
                      <div style={{
                        width: '40px', flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: '2px',
                      }}>
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #fff',
                          background: esEntrada ? '#16a34a' : '#ea580c',
                          boxShadow: `0 0 0 3px ${esEntrada ? '#dcfce7' : '#ffedd5'}`,
                          flexShrink: 0,
                        }} />
                      </div>

                      {/* Contenido */}
                      <div style={{
                        flex: 1, background: '#fafafa', border: '1px solid #f1f5f9',
                        borderRadius: '10px', padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '13px', fontWeight: 700,
                            color: esEntrada ? '#15803d' : '#c2410c',
                          }}>
                            {esEntrada ? '↓ Entrada' : '↑ Salida'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {hora}
                          </span>
                        </div>
                        {m.RegistradoPor && (
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            Registrado por: {m.RegistradoPor}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AsistenciaGeneracion() {
  const [generaciones, setGeneraciones] = useState([])
  const [genId, setGenId]               = useState('')
  const [fecha, setFecha]               = useState(new Date().toISOString().substring(0, 10))
  const [datos, setDatos]               = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [filtro, setFiltro]             = useState('todos')
  const [busqueda, setBusqueda]         = useState('')
  const [detalleAlumno, setDetalleAlumno] = useState(null)

  useEffect(() => {
    getGeneraciones()
      .then(list => {
        setGeneraciones(list)
        if (list.length > 0) setGenId(String(list[0].GeneracionId))
      })
      .catch(e => setError(e.message))
  }, [])

  const cargar = useCallback(async () => {
    if (!genId) return
    setLoading(true); setError('')
    try {
      setDatos(await getAsistencia(genId, fecha))
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [genId, fecha])

  useEffect(() => { cargar() }, [cargar])

  const alumnos    = datos?.alumnos || []
  const presentes  = alumnos.filter(a => a.Presente).length
  const ausentes   = alumnos.length - presentes
  const porcentaje = alumnos.length ? Math.round(presentes / alumnos.length * 100) : 0

  const filtrados = alumnos.filter(a => {
    if (filtro === 'presentes' && !a.Presente) return false
    if (filtro === 'ausentes'  &&  a.Presente) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (a.Nombre || '').toLowerCase().includes(q) ||
             (a.Matricula || '').toLowerCase().includes(q)
    }
    return true
  })

  function exportarExcel() {
    const genNombre = generaciones.find(g => String(g.GeneracionId) === genId)?.Nombre || genId
    const filas = alumnos.map((a, i) => ({
      '#':            i + 1,
      'Matrícula':    a.Matricula || '',
      'Nombre':       a.Nombre || '',
      'Estado':       a.Presente ? 'Presente' : 'Ausente',
      'Hora Entrada': a.HoraEntrada ? new Date(a.HoraEntrada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—',
      'Hora Salida':  a.HoraSalida  ? new Date(a.HoraSalida).toLocaleTimeString('es-MX',  { hour: '2-digit', minute: '2-digit' }) : '—',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [{ wch: 4 }, { wch: 18 }, { wch: 36 }, { wch: 10 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
    XLSX.writeFile(wb, `Asistencia_${genNombre}_${fecha}.xlsx`)
  }

  const genNombreActual = generaciones.find(g => String(g.GeneracionId) === genId)?.Nombre || ''

  return (
    <div>
      {/* ── Filtros ── */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
        padding: '16px', background: '#f9fafb', borderRadius: '10px', marginBottom: '20px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ flex: '2', minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
            Generación
          </label>
          <select className="form-control" value={genId} onChange={e => setGenId(e.target.value)}>
            {generaciones.map(g => (
              <option key={g.GeneracionId} value={g.GeneracionId}>{g.Nombre}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
            Fecha
          </label>
          <input type="date" className="form-control" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
          <button type="button" className="ghost-button" onClick={cargar} disabled={loading}>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          {datos && (
            <button type="button" className="ghost-button" onClick={exportarExcel}>
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {error && <div className="notification error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* ── Tarjetas resumen ── */}
      {datos && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <StatCard label="Total alumnos" value={alumnos.length} color="#2563eb" bg="#eff6ff" />
          <StatCard label="Presentes"     value={presentes}       color="#16a34a" bg="#f0fdf4" />
          <StatCard label="Ausentes"      value={ausentes}        color="#dc2626" bg="#fef2f2" />
          <StatCard label="Asistencia"    value={`${porcentaje}%`}
            color={porcentaje >= 80 ? '#16a34a' : porcentaje >= 60 ? '#d97706' : '#dc2626'}
            bg={porcentaje >= 80 ? '#f0fdf4' : porcentaje >= 60 ? '#fefce8' : '#fef2f2'}
          />
        </div>
      )}

      {/* ── Subtítulo ── */}
      {datos && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>
            {genNombreActual} — {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Toca un alumno para ver el detalle de sus movimientos
          </span>
        </div>
      )}

      {/* ── Pills de filtro + búsqueda ── */}
      {datos && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['todos', 'presentes', 'ausentes'].map(f => (
            <button key={f} type="button" onClick={() => setFiltro(f)} style={{
              padding: '4px 14px', borderRadius: '999px', fontSize: '13px',
              fontWeight: filtro === f ? 700 : 400, cursor: 'pointer',
              border: '1px solid ' + (filtro === f ? '#2563eb' : '#d1d5db'),
              background: filtro === f ? '#2563eb' : '#fff',
              color: filtro === f ? '#fff' : '#374151',
            }}>
              {{ todos: 'Todos', presentes: 'Presentes', ausentes: 'Ausentes' }[f]}
            </button>
          ))}
          <input
            type="text"
            className="form-control"
            placeholder="Buscar nombre o matrícula…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ maxWidth: '240px', fontSize: '13px' }}
          />
        </div>
      )}

      {/* ── Tabla ── */}
      {datos && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="participants-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>#</th>
                  <th>Matrícula</th>
                  <th>Nombre</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>1ª entrada</th>
                  <th style={{ textAlign: 'center' }}>Última salida</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Movimientos</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      Sin alumnos para los filtros aplicados.
                    </td>
                  </tr>
                ) : filtrados.map((a, i) => (
                  <tr
                    key={a.OperadorId}
                    onClick={() => setDetalleAlumno(a)}
                    style={{
                      background: a.Presente ? undefined : '#fef9f9',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = a.Presente ? '' : '#fef9f9'}
                  >
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>{a.Matricula}</td>
                    <td>{a.Nombre}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                        background: a.Presente ? '#dcfce7' : '#fee2e2',
                        color:      a.Presente ? '#15803d' : '#b91c1c',
                      }}>
                        {a.Presente ? 'Presente' : 'Ausente'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '13px', color: a.HoraEntrada ? '#111827' : '#9ca3af' }}>
                      {fmt(a.HoraEntrada)}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '13px', color: a.HoraSalida ? '#111827' : '#9ca3af' }}>
                      {fmt(a.HoraSalida)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {a.Presente ? (
                        <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>Ver →</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#d1d5db' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            {filtrados.length} de {alumnos.length} alumnos
          </div>
        </div>
      )}

      {!datos && !loading && !error && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
          Selecciona una generación para ver la asistencia.
        </div>
      )}

      {/* ── Modal de movimientos ── */}
      {detalleAlumno && (
        <ModalMovimientos
          alumno={detalleAlumno}
          fecha={fecha}
          onClose={() => setDetalleAlumno(null)}
        />
      )}
    </div>
  )
}
