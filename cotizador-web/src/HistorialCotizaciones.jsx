import { useMemo, useEffect, useRef, useState } from 'react'
import { getCotizacionById } from './api'
import { descargarPdfCotizacion } from './pdfUtils'

const POR_PAGINA = 15

function fmtMoney(v) {
  return '$' + Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(val) {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime()) || d.getFullYear() < 1980) return '-'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function AccionesMenu({ cotizacion, onVer, onPdf, onEditar, onEliminar, descargando, currentUser, currentUserRol }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '8px 16px', fontSize: '13px',
    background: 'none', border: 'none', cursor: 'pointer',
    textAlign: 'left', color: '#111827', whiteSpace: 'nowrap',
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? '#f3f4f6' : 'none', border: '1px solid #e5e7eb',
          borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
          fontSize: '16px', lineHeight: 1, color: '#6b7280',
        }}
        title="Acciones"
      >
        ⋮
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '4px',
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, minWidth: '150px',
        }}>
          <button type="button" style={itemStyle}
            onClick={() => { setOpen(false); onVer() }}>
            👁 Ver detalle
          </button>
          {cotizacion.CreadoPor === currentUser && (
            <button type="button" style={itemStyle}
              onClick={() => { setOpen(false); onEditar() }}>
              ✏️ Editar
            </button>
          )}
          <button type="button"
            style={{ ...itemStyle, opacity: descargando ? 0.6 : 1 }}
            disabled={descargando}
            onClick={() => { setOpen(false); onPdf() }}>
            📄 {descargando ? 'Generando...' : 'PDF'}
          </button>
          {(currentUserRol === 'admin' || currentUserRol === 'autorizador1' || currentUserRol === 'autorizador2') && (
            <>
              <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
              <button type="button"
                style={{ ...itemStyle, color: '#dc2626' }}
                onClick={() => { setOpen(false); onEliminar() }}>
                🗑 Eliminar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistorialCotizaciones({ cotizaciones, loading, error, onVerCotizacion, onEditarCotizacion, onDeleteCotizacion, currentUser, currentUserRol }) {
  const [texto, setTexto]         = useState('')
  const [estado, setEstado]       = useState('')
  const [desde, setDesde]         = useState('')
  const [hasta, setHasta]         = useState('')
  const [pagina, setPagina]       = useState(1)
  const [descargando, setDescargando] = useState(null)

  const filtrados = useMemo(() => {
    setPagina(1)
    return cotizaciones.filter(c => {
      if (texto) {
        const q = texto.toLowerCase()
        const matchFolio   = (c.Folio    || '').toLowerCase().includes(q)
        const matchCliente = (c.Cliente  || '').toLowerCase().includes(q)
        const matchCurso   = (c.Curso    || '').toLowerCase().includes(q)
        const matchCoach   = (c.Coach    || '').toLowerCase().includes(q)
        if (!matchFolio && !matchCliente && !matchCurso && !matchCoach) return false
      }
      if (estado && (c.Estado || '').toLowerCase() !== estado.toLowerCase()) return false
      if (desde || hasta) {
        const fc = c.FechaCreacion ? new Date(c.FechaCreacion) : null
        if (!fc || isNaN(fc.getTime()) || fc.getFullYear() < 1980) return false
        if (desde && fc < new Date(desde)) return false
        if (hasta) {
          const h = new Date(hasta); h.setHours(23, 59, 59, 999)
          if (fc > h) return false
        }
      }
      return true
    })
  }, [cotizaciones, texto, estado, desde, hasta])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const hayFiltros = texto || estado || desde || hasta

  function limpiar() {
    setTexto(''); setEstado(''); setDesde(''); setHasta(''); setPagina(1)
  }

  async function handleDescargar(cotizacionId) {
    setDescargando(cotizacionId)
    try {
      const { cotizacion, costos, participantes } = await getCotizacionById(cotizacionId)
      await descargarPdfCotizacion(cotizacion, costos, participantes)
    } catch (e) {
      alert('No se pudo generar el PDF: ' + e.message)
    } finally {
      setDescargando(null)
    }
  }

  const estadosUnicos = useMemo(() => {
    const set = new Set(cotizaciones.map(c => c.Estado).filter(Boolean))
    return [...set].sort()
  }, [cotizaciones])

  return (
    <section className="panel card">
      <div className="panel-header space-between">
        <div>
          <h2>Historial de Cotizaciones</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Listado de cotizaciones guardadas</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Buscar</label>
          <input
            className="form-control"
            type="text"
            placeholder="Folio, cliente, curso o coach..."
            value={texto}
            onChange={e => setTexto(e.target.value)}
          />
        </div>
        <div style={{ flex: '1', minWidth: '140px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Estado</label>
          <select className="form-control" value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {estadosUnicos.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ flex: '1', minWidth: '140px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Desde</label>
          <input className="form-control" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div style={{ flex: '1', minWidth: '140px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Hasta</label>
          <input className="form-control" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        {hayFiltros && (
          <button type="button" className="ghost-button" onClick={limpiar} style={{ alignSelf: 'flex-end' }}>
            Limpiar
          </button>
        )}
      </div>

      {loading && <div className="notification">Cargando historial...</div>}
      {error   && <div className="notification error">{error}</div>}

      <div className="table-wrap">
        <table className="participants-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Curso</th>
              <th>Coach</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  {hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'No hay cotizaciones registradas.'}
                </td>
              </tr>
            ) : (
              paginados.map(c => (
                <tr key={c.CotizacionId}>
                  <td style={{ fontWeight: '600', color: '#2563eb' }}>{c.Folio}</td>
                  <td>{c.Cliente || '-'}</td>
                  <td>{c.Curso || '-'}</td>
                  <td>{c.Coach || '-'}</td>
                  <td>
                    <span style={{
                      padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                      backgroundColor: c.Estado === 'Aprobada' ? '#d1fae5' : c.Estado === 'Rechazada' ? '#fee2e2' : '#fef3c7',
                      color:           c.Estado === 'Aprobada' ? '#065f46' : c.Estado === 'Rechazada' ? '#991b1b' : '#92400e',
                    }}>
                      {c.Estado || 'Pendiente'}
                    </span>
                  </td>
                  <td>{fmtMoney(c.TotalConGanancia)}</td>
                  <td>{fmtFecha(c.FechaCreacion)}</td>
                  <td>
                    <AccionesMenu
                      cotizacion={c}
                      descargando={descargando === c.CotizacionId}
                      onVer={() => onVerCotizacion(c.CotizacionId)}
                      onEditar={() => onEditarCotizacion && onEditarCotizacion(c.CotizacionId)}
                      onPdf={() => handleDescargar(c.CotizacionId)}
                      onEliminar={() => onDeleteCotizacion(c.CotizacionId, c.Folio)}
                      currentUser={currentUser}
                      currentUserRol={currentUserRol}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: conteo + paginación */}
      <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          {hayFiltros
            ? `${filtrados.length} de ${cotizaciones.length} cotizaciones`
            : `${cotizaciones.length} cotizaciones`}
        </span>

        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: '4px 10px' }}
              disabled={paginaActual === 1}
              onClick={() => setPagina(1)}
            >
              «
            </button>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: '4px 10px' }}
              disabled={paginaActual === 1}
              onClick={() => setPagina(p => p - 1)}
            >
              ‹
            </button>
            <span style={{ fontSize: '13px', padding: '0 8px' }}>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: '4px 10px' }}
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina(p => p + 1)}
            >
              ›
            </button>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: '4px 10px' }}
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina(totalPaginas)}
            >
              »
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
