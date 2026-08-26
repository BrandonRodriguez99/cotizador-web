import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { getAccesoAlumnos, registrarAcceso, eliminarAcceso } from './api'

const COOLDOWN_MS = 4000
const POR_PAGINA  = 15

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AccesoAlumnos({ usuario = {} }) {
  const esAdmin = usuario?.rol === 'admin'

  const [modo, setModo]             = useState(null)
  const [escaneando, setEscaneando] = useState(false)
  const [registros, setRegistros]   = useState([])
  const [feedback, setFeedback]     = useState(null)
  const [loadingList, setLoadingList] = useState(false)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().substring(0, 10))
  const [pagina, setPagina]         = useState(1)

  // Contadores de la sesión actual (solo mientras se escanea)
  const [contadorEntradas, setContadorEntradas] = useState(0)
  const [contadorSalidas, setContadorSalidas]   = useState(0)

  const scannerRef    = useRef(null)
  const cooldownRef   = useRef({})
  const feedbackTimer = useRef(null)

  const cargarRegistros = useCallback(async () => {
    setLoadingList(true)
    try {
      const data = await getAccesoAlumnos(fechaFiltro)
      setRegistros(data)
      setPagina(1)
    }
    catch (e) { console.error(e) }
    finally   { setLoadingList(false) }
  }, [fechaFiltro])

  useEffect(() => { cargarRegistros() }, [cargarRegistros])

  // Resetear contadores al cambiar de modo o al iniciar sesión
  function seleccionarModo(m) {
    setModo(m)
    setEscaneando(true)
    setFeedback(null)
    setContadorEntradas(0)
    setContadorSalidas(0)
  }

  function detener() {
    setEscaneando(false)
    setFeedback(null)
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return
    try { await eliminarAcceso(id); cargarRegistros() }
    catch (e) { alert(e.message) }
  }

  // ── Escáner ────────────────────────────────────────────────────────────────
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
          if (modo === 'Entrada') setContadorEntradas(n => n + 1)
          else                    setContadorSalidas(n => n + 1)
          cargarRegistros()
        } catch (e) {
          setFeedback({ tipo: 'error', msg: e.message || 'Matrícula no encontrada', matricula })
        }

        feedbackTimer.current = setTimeout(() => setFeedback(null), 3500)
      },
      () => {}
    ).catch(console.error)

    return () => {
      clearTimeout(feedbackTimer.current)
      qr.stop().catch(() => {}).then(() => qr.clear())
    }
  }, [escaneando, modo, cargarRegistros])

  // ── Paginación ─────────────────────────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const paginados    = registros.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const entradas = registros.filter(r => r.TipoAcceso === 'Entrada').length
  const salidas  = registros.filter(r => r.TipoAcceso === 'Salida').length

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

      {/* ── Panel izquierdo ── */}
      <div style={{ flex: '0 0 340px', minWidth: '280px' }}>

        {/* Selección de modo */}
        {!escaneando && (
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 16px', fontWeight: 600, fontSize: '15px' }}>
              Selecciona el tipo de registro
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => seleccionarModo('Entrada')} style={{
                flex: 1, padding: '20px 12px', borderRadius: '10px', border: '2px solid #16a34a',
                background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '16px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Entrada
              </button>
              <button type="button" onClick={() => seleccionarModo('Salida')} style={{
                flex: 1, padding: '20px 12px', borderRadius: '10px', border: '2px solid #dc2626',
                background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: '16px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              }}>
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
              <button type="button" onClick={detener} style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid #d1d5db',
                background: '#f9fafb', color: '#374151', cursor: 'pointer', fontSize: '13px',
              }}>
                Detener
              </button>
            </div>

            {/* Contadores de sesión */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: '8px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
              }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', lineHeight: 1 }}>
                  {contadorEntradas}
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>Entradas</div>
              </div>
              <div style={{
                flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: '8px',
                background: '#fef2f2', border: '1px solid #fecaca',
              }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c', lineHeight: 1 }}>
                  {contadorSalidas}
                </div>
                <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px', fontWeight: 600 }}>Salidas</div>
              </div>
              <div style={{
                flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: '8px',
                background: '#f3f4f6', border: '1px solid #e5e7eb',
              }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#374151', lineHeight: 1 }}>
                  {contadorEntradas + contadorSalidas}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontWeight: 600 }}>Total</div>
              </div>
            </div>

            <div id="qr-reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }} />

            {/* Feedback */}
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
                  {feedback.tipo === 'cargando' && <div>{feedback.msg}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Panel derecho: historial ── */}
      <div style={{ flex: 1, minWidth: '300px' }}>
        <div className="card" style={{ padding: '16px' }}>

          {/* Header con resumen del día */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>Registros del día</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', background: '#f0fdf4', padding: '2px 10px', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
                  {entradas} entradas
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', background: '#fef2f2', padding: '2px 10px', borderRadius: '999px', border: '1px solid #fecaca' }}>
                  {salidas} salidas
                </span>
              </div>
            </div>
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
                {paginados.length === 0 && !loadingList ? (
                  <tr>
                    <td colSpan={esAdmin ? 5 : 4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Sin registros para esta fecha.
                    </td>
                  </tr>
                ) : (
                  paginados.map((r, i) => (
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
                          <button type="button" onClick={() => handleEliminar(r.RegistroId)} style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '5px',
                            background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
                            cursor: 'pointer', fontWeight: 600,
                          }}>
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

          {/* Footer: conteo + paginación */}
          <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>Total: {registros.length} registros</span>
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button type="button" className="ghost-button" style={{ padding: '3px 8px' }}
                  disabled={paginaActual === 1} onClick={() => setPagina(1)}>«</button>
                <button type="button" className="ghost-button" style={{ padding: '3px 8px' }}
                  disabled={paginaActual === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
                <span style={{ fontSize: '13px', padding: '0 8px' }}>
                  {paginaActual} / {totalPaginas}
                </span>
                <button type="button" className="ghost-button" style={{ padding: '3px 8px' }}
                  disabled={paginaActual === totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
                <button type="button" className="ghost-button" style={{ padding: '3px 8px' }}
                  disabled={paginaActual === totalPaginas} onClick={() => setPagina(totalPaginas)}>»</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
