import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { getAccesoAlumnos, registrarAcceso, eliminarAcceso } from './api'

const COOLDOWN_MS = 4000

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AccesoAlumnos({ usuario = {} }) {
  const esAdmin = usuario?.rol === 'admin'
  const [modo, setModo]           = useState(null) // 'Entrada' | 'Salida'
  const [escaneando, setEscaneando] = useState(false)
  const [registros, setRegistros] = useState([])
  const [feedback, setFeedback]   = useState(null) // { tipo: 'ok'|'error', msg, nombre }
  const [loadingList, setLoadingList] = useState(false)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().substring(0, 10))

  const scannerRef  = useRef(null)
  const cooldownRef = useRef({}) // matricula -> timestamp
  const feedbackTimer = useRef(null)

  const cargarRegistros = useCallback(async () => {
    setLoadingList(true)
    try { setRegistros(await getAccesoAlumnos(fechaFiltro)) }
    catch (e) { console.error(e) }
    finally   { setLoadingList(false) }
  }, [fechaFiltro])

  useEffect(() => { cargarRegistros() }, [cargarRegistros])

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return
    try { await eliminarAcceso(id); cargarRegistros() }
    catch (e) { alert(e.message) }
  }

  // ── Iniciar / detener escáner ──────────────────────────────────────────────
  useEffect(() => {
    if (!escaneando) return

    const qr = new Html5Qrcode('qr-reader')
    scannerRef.current = qr

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async (text) => {
        const matricula = text.trim()
        const ahora = Date.now()
        if (cooldownRef.current[matricula] && ahora - cooldownRef.current[matricula] < COOLDOWN_MS) return
        cooldownRef.current[matricula] = ahora

        clearTimeout(feedbackTimer.current)
        setFeedback({ tipo: 'cargando', msg: `Verificando ${matricula}…` })

        try {
          const res = await registrarAcceso(matricula, modo)
          setFeedback({ tipo: 'ok', msg: 'Acceso registrado', nombre: res.Nombre, matricula, hora: fmt(res.FechaHora) })
          cargarRegistros()
        } catch (e) {
          setFeedback({ tipo: 'error', msg: e.message || 'Matrícula no encontrada', matricula })
        }

        feedbackTimer.current = setTimeout(() => setFeedback(null), 3500)
      },
      () => {} // errores de frame ignorados
    ).catch(console.error)

    return () => {
      clearTimeout(feedbackTimer.current)
      qr.stop().catch(() => {}).then(() => qr.clear())
    }
  }, [escaneando, modo, cargarRegistros])

  function seleccionarModo(m) {
    setModo(m)
    setEscaneando(true)
    setFeedback(null)
  }

  function detener() {
    setEscaneando(false)
    setFeedback(null)
  }

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

      {/* ── Panel izquierdo: control + escáner ── */}
      <div style={{ flex: '0 0 340px', minWidth: '280px' }}>

        {/* Selección de modo */}
        {!escaneando && (
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 16px', fontWeight: 600, fontSize: '15px' }}>
              Selecciona el tipo de registro
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => seleccionarModo('Entrada')}
                style={{
                  flex: 1, padding: '20px 12px', borderRadius: '10px', border: '2px solid #16a34a',
                  background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '16px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Entrada
              </button>
              <button
                type="button"
                onClick={() => seleccionarModo('Salida')}
                style={{
                  flex: 1, padding: '20px 12px', borderRadius: '10px', border: '2px solid #dc2626',
                  background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: '16px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Salida
              </button>
            </div>
          </div>
        )}

        {/* Escáner activo */}
        {escaneando && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{
                padding: '4px 14px', borderRadius: '999px', fontWeight: 700, fontSize: '13px',
                background: modo === 'Entrada' ? '#f0fdf4' : '#fef2f2',
                color: modo === 'Entrada' ? '#15803d' : '#b91c1c',
                border: `1px solid ${modo === 'Entrada' ? '#16a34a' : '#dc2626'}`,
              }}>
                Modo: {modo}
              </span>
              <button
                type="button"
                onClick={detener}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: '#f9fafb', color: '#374151', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Detener
              </button>
            </div>

            {/* Área de cámara */}
            <div id="qr-reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }} />

            {/* Feedback del último escaneo */}
            <div style={{ marginTop: '12px', minHeight: '64px' }}>
              {feedback && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', fontSize: '14px',
                  background: feedback.tipo === 'ok' ? '#f0fdf4' : feedback.tipo === 'error' ? '#fef2f2' : '#f3f4f6',
                  border: `1px solid ${feedback.tipo === 'ok' ? '#86efac' : feedback.tipo === 'error' ? '#fca5a5' : '#e5e7eb'}`,
                  color: feedback.tipo === 'ok' ? '#15803d' : feedback.tipo === 'error' ? '#b91c1c' : '#6b7280',
                }}>
                  {feedback.tipo === 'ok' && (
                    <>
                      <div style={{ fontWeight: 700 }}>{feedback.nombre}</div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>{feedback.matricula} · {feedback.hora}</div>
                    </>
                  )}
                  {feedback.tipo === 'error' && (
                    <>
                      <div style={{ fontWeight: 600 }}>No encontrado</div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>Matrícula: {feedback.matricula}</div>
                      <div style={{ fontSize: '12px' }}>{feedback.msg}</div>
                    </>
                  )}
                  {feedback.tipo === 'cargando' && <div style={{ color: '#6b7280' }}>{feedback.msg}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Panel derecho: historial del día ── */}
      <div style={{ flex: 1, minWidth: '300px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>
              Registros del día
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                className="form-control"
                style={{ fontSize: '13px', padding: '4px 8px' }}
                value={fechaFiltro}
                onChange={e => setFechaFiltro(e.target.value)}
              />
              <button type="button" className="ghost-button" style={{ fontSize: '13px', padding: '4px 10px' }} onClick={cargarRegistros}>
                Actualizar
              </button>
            </div>
          </div>

          {loadingList && <div className="notification">Cargando…</div>}

          <div style={{ overflowX: 'auto' }}>
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Matrícula</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  {esAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 && !loadingList ? (
                  <tr>
                    <td colSpan={esAdmin ? 5 : 4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Sin registros para esta fecha.
                    </td>
                  </tr>
                ) : (
                  registros.map((r, i) => (
                    <tr key={r.RegistroId ?? i}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(r.FechaHora)}</td>
                      <td style={{ fontWeight: 600 }}>{r.Matricula}</td>
                      <td>{r.Nombre || '-'}</td>
                      <td>
                        <span style={{
                          padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                          background: r.TipoAcceso === 'Entrada' ? '#f0fdf4' : '#fef2f2',
                          color: r.TipoAcceso === 'Entrada' ? '#15803d' : '#b91c1c',
                        }}>
                          {r.TipoAcceso}
                        </span>
                      </td>
                      {esAdmin && (
                        <td>
                          <button
                            type="button"
                            onClick={() => handleEliminar(r.RegistroId)}
                            style={{
                              fontSize: '11px', padding: '2px 8px', borderRadius: '5px',
                              background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
                              cursor: 'pointer', fontWeight: 600,
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">Total: {registros.length} registros</div>
        </div>
      </div>
    </div>
  )
}
