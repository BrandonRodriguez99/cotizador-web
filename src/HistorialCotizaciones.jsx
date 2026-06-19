import { useMemo, useEffect, useRef, useState } from 'react'
import { getCotizacionById } from './api'

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

function imprimirCotizacion(data) {
  const { cotizacion: c, costos = [], participantes = [] } = data
  const win = window.open('', '_blank')
  if (!win) { alert('Permite ventanas emergentes para descargar el PDF.'); return }

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${c.Folio} - Cotización</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
    .hdr{width:100%;border-collapse:collapse;border:2px solid #1e3a8a;margin-bottom:8px}
    .hdr td{border:1px solid #1e3a8a;padding:0}
    .hdr-logo{width:100px;text-align:center;padding:10px 6px;vertical-align:middle}
    .hdr-title{text-align:center;vertical-align:middle;font-size:18px;font-weight:900;letter-spacing:1px}
    .hdr-meta-row{display:flex;border-bottom:1px solid #1e3a8a}
    .hdr-meta-row:last-child{border-bottom:none}
    .hdr-meta-lbl{background:#e5e7eb;padding:3px 6px;width:45px;font-weight:bold;border-right:1px solid #1e3a8a}
    .hdr-meta-val{padding:3px 6px;font-weight:bold}
    .info{width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:0}
    .info td{border:1px solid #ccc;padding:5px 8px;font-size:11px;vertical-align:top}
    .info .lbl{background:#f0f0f0;font-weight:bold;white-space:nowrap;width:110px}
    .folio-hdr{background:#bfdbfe;text-align:center;font-weight:bold;font-size:10px;padding:3px}
    .folio-tbl{width:100%;border-collapse:collapse}
    .folio-tbl td{border-top:1px solid #ccc;padding:4px 8px;font-size:11px}
    .fl{background:#fef9c3;font-weight:bold;text-align:center;width:50%;border-right:1px solid #ccc}
    .fv{font-weight:bold;color:#1e3a8a;text-align:center}
    .items{width:100%;border-collapse:collapse}
    .items th{background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a}
    .items td{padding:5px 8px;border:1px solid #e0e0e0;font-size:10px}
    .items tr:nth-child(even) td{background:#f9fafb}
    .sec{background:#1e3a8a;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;margin-top:10px}
    .tot{width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-top:none}
    .tot td{padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px}
    .tot .sub{color:#6b7280;font-size:10px;padding-left:22px}
    .tot .grand{background:#1e3a8a;color:#fff;font-weight:bold;font-size:13px;border:none}
    .sigs{width:100%;border-collapse:collapse;margin-top:36px}
    .sigs td{text-align:center;padding:0 20px;vertical-align:bottom}
    .sig-line{border-top:1px solid #333;padding-top:5px;margin-top:30px}
    .sig-name{font-weight:bold;color:#1e3a8a;font-size:11px}
    .sig-role{font-size:10px;color:#6b7280}
    @media print{button{display:none}body{padding:12px}}
  </style></head><body>

  <table class="hdr"><tr>
    <td class="hdr-logo"><span style="font-size:22px;font-weight:900;color:#1e3a8a">UDAT</span></td>
    <td class="hdr-title">Cotización</td>
  </tr></table>

  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:0">
    <tr>
      <td style="padding:8px 10px;vertical-align:middle;border-right:1px solid #ccc">
        <div style="font-size:13px;font-weight:bold;color:#1e3a8a">UNIVERSIDAD DE AUTOTRANSPORTE SC</div>
        <div style="font-size:10px;color:#666;margin-top:2px">CARRETERA A COLOMBIA 2080, COL. ANDRES CABALLERO MORENO AGROP., ESCOBEDO, N.L. CP 66080</div>
      </td>
      <td style="width:200px;padding:0;vertical-align:top">
        <div class="folio-hdr">** Datos de la Cotización</div>
        <table class="folio-tbl"><tr><td class="fl">Folio</td><td class="fv">${c.Folio}</td></tr></table>
      </td>
    </tr>
  </table>

  <table class="info" style="margin-top:0">
    <tr>
      <td class="lbl">CLIENTE:</td><td>${c.Cliente||'-'}</td>
      <td class="lbl" style="width:80px">FECHA</td>
      <td style="width:120px">${fmtFecha(c.FechaInicio)!=='-'?fmtFecha(c.FechaInicio):fmtFecha(c.FechaCreacion)}</td>
    </tr>
    <tr><td class="lbl">CURSO:</td><td>${c.Curso||'-'}</td><td class="lbl">COACH</td><td>${c.Coach||'-'}</td></tr>
    <tr>
      <td class="lbl">MODALIDAD:</td><td>${c.Modalidad||'-'}</td>
      <td class="lbl">PARTICIPANTES</td><td>${c.ParticipantesCantidad||'-'} / ${c.DuracionDias||'-'} días</td>
    </tr>
    <tr><td class="lbl">CREADO POR:</td><td colspan="3">${c.CreadoPor||'-'}</td></tr>
  </table>

  ${costos.length > 0 ? `
  <div class="sec">DESGLOSE DE COSTOS</div>
  <table class="items"><thead><tr>
    <th>Concepto</th><th>Tipo Costo</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Unitario</th><th style="text-align:right">Total</th>
  </tr></thead><tbody>
  ${costos.map(r=>`<tr><td>${r.Concepto||''}</td><td>${r.TipoCosto||'-'}</td><td style="text-align:right">${r.Cantidad||''}</td><td style="text-align:right">${fmtMoney(r.CostoUnitario)}</td><td style="text-align:right">${fmtMoney(r.Total)}</td></tr>`).join('')}
  </tbody></table>` : ''}

  <div class="sec">RESUMEN FINANCIERO</div>
  <table class="tot">
    <tr><td>Costos Directos</td><td style="text-align:right">${fmtMoney(c.TotalCostosDirectos)}</td></tr>
    ${c.MargenUtilidadPctDirectos!=null?`<tr><td class="sub">└ Margen Directos (${c.MargenUtilidadPctDirectos}%)</td><td class="sub" style="text-align:right">${fmtMoney(c.MargenUtilidadDirectos)}</td></tr>`:''}
    <tr><td>Costos Indirectos</td><td style="text-align:right">${fmtMoney(c.TotalCostosIndirectos)}</td></tr>
    ${c.MargenUtilidadPctIndirectos!=null?`<tr><td class="sub">└ Margen Indirectos (${c.MargenUtilidadPctIndirectos}%)</td><td class="sub" style="text-align:right">${fmtMoney(c.MargenUtilidadIndirectos)}</td></tr>`:''}
    <tr><td>Total Costos</td><td style="text-align:right">${fmtMoney(c.TotalCostos)}</td></tr>
    <tr><td>Total Margen (${c.MargenUtilidadPct||0}%)</td><td style="text-align:right">${fmtMoney(c.MargenUtilidad)}</td></tr>
    <tr><td class="grand">TOTAL CON GANANCIA</td><td class="grand" style="text-align:right">${fmtMoney(c.TotalConGanancia)}</td></tr>
    <tr><td>Precio por Participante</td><td style="text-align:right">${fmtMoney(c.PrecioPorParticipante)}</td></tr>
    <tr><td>Precio Sugerido por Participante</td><td style="text-align:right">${fmtMoney(c.PrecioSugeridoPorParticipante)}</td></tr>
  </table>

  ${c.Observaciones?`<div class="sec">OBSERVACIONES</div><div style="border:1px solid #e0e0e0;border-top:none;padding:8px 10px;font-size:11px">${c.Observaciones}</div>`:''}

  ${participantes.length>0?`
  <div class="sec">PARTICIPANTES (${participantes.length})</div>
  <table class="items"><thead><tr><th>#</th><th>Nombre</th><th>Empresa</th><th>Factura 2</th><th>Factura 3</th></tr></thead><tbody>
  ${participantes.map((p,i)=>`<tr><td>${i+1}</td><td>${p.NombreCompleto||''}</td><td>${p.Empresa||''}</td><td>${p.Factura2||''}</td><td>${p.Factura3||''}</td></tr>`).join('')}
  </tbody></table>`:''}

  <table class="sigs"><tr>
    <td><div class="sig-line"><div class="sig-name">${c.CreadoPor||''}</div><div class="sig-role">Solicitante</div></div></td>
    <td><div class="sig-line"><div class="sig-name">&nbsp;</div><div class="sig-role">Vo.Bo. / Autorización</div></div></td>
  </table>

  <script>setTimeout(()=>{window.print()},500)</script>
  </body></html>`)
  win.document.close()
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
      const data = await getCotizacionById(cotizacionId)
      imprimirCotizacion(data)
    } catch (e) {
      alert('No se pudo cargar la cotización: ' + e.message)
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
