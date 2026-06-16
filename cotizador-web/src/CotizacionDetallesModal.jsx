function fmtMoney(v) {
  return '$' + Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(val) {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime()) || d.getFullYear() < 1980) return '-'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function InfoField({ label, value }) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{value || '-'}</div>
    </div>
  )
}

function imprimirCotizacion(cotizacion, costos, participantes) {
  const win = window.open('', '_blank')
  if (!win) { alert('Permite ventanas emergentes para descargar el PDF.'); return }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${cotizacion.Folio} - Cotización</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
    /* HEADER */
    .hdr{width:100%;border-collapse:collapse;border:2px solid #1e3a8a;margin-bottom:8px}
    .hdr td{border:1px solid #1e3a8a;padding:0}
    .hdr-logo{width:100px;text-align:center;padding:10px 6px;vertical-align:middle}
    .hdr-title{text-align:center;vertical-align:middle;font-size:18px;font-weight:900;letter-spacing:1px}
    .hdr-meta{width:150px;font-size:10px}
    .hdr-meta-row{display:flex;border-bottom:1px solid #1e3a8a}
    .hdr-meta-row:last-child{border-bottom:none}
    .hdr-meta-lbl{background:#e5e7eb;padding:3px 6px;width:45px;font-weight:bold;border-right:1px solid #1e3a8a}
    .hdr-meta-val{padding:3px 6px;font-weight:bold}
    /* INFO BAND */
    .info{width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:0}
    .info td{border:1px solid #ccc;padding:6px 8px;font-size:11px;vertical-align:top}
    .info .lbl{background:#f0f0f0;font-weight:bold;white-space:nowrap;width:110px}
    /* YELLOW FOLIO BLOCK */
    .folio-hdr{background:#bfdbfe;text-align:center;font-weight:bold;font-size:10px;padding:3px}
    .folio-tbl{width:100%;border-collapse:collapse}
    .folio-tbl td{border-top:1px solid #ccc;padding:4px 8px;font-size:11px}
    .folio-tbl .fl{background:#fef9c3;font-weight:bold;text-align:center;width:50%;border-right:1px solid #ccc}
    .folio-tbl .fv{font-weight:bold;color:#1e3a8a;text-align:center}
    /* ITEMS TABLE */
    .items{width:100%;border-collapse:collapse;margin-top:0}
    .items th{background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a}
    .items td{padding:5px 8px;border:1px solid #e0e0e0;font-size:10px}
    .items tr:nth-child(even) td{background:#f9fafb}
    /* SECTION TITLE */
    .sec{background:#1e3a8a;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;margin-top:10px}
    /* TOTALS */
    .tot{width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-top:none}
    .tot td{padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px}
    .tot .sub{color:#6b7280;font-size:10px;padding-left:22px}
    .tot .grand{background:#1e3a8a;color:#fff;font-weight:bold;font-size:13px;border:none}
    /* SIGNATURES */
    .sigs{width:100%;border-collapse:collapse;margin-top:36px}
    .sigs td{text-align:center;padding:0 20px;vertical-align:bottom}
    .sig-line{border-top:1px solid #333;padding-top:5px;margin-top:30px}
    .sig-name{font-weight:bold;color:#1e3a8a;font-size:11px}
    .sig-role{font-size:10px;color:#6b7280}
    @media print{button{display:none}body{padding:12px}}
  </style></head><body>

  <!-- ENCABEZADO -->
  <table class="hdr"><tr>
    <td class="hdr-logo"><span style="font-size:22px;font-weight:900;color:#1e3a8a">UDAT</span></td>
    <td class="hdr-title">Cotización</td>
  </tr></table>

  <!-- EMPRESA + FOLIO -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:0">
    <tr>
      <td style="padding:8px 10px;vertical-align:middle;border-right:1px solid #ccc">
        <div style="font-size:13px;font-weight:bold;color:#1e3a8a">UNIVERSIDAD DE AUTOTRANSPORTE SC</div>
        <div style="font-size:10px;color:#666;margin-top:2px">CARRETERA A COLOMBIA 2080, COL. ANDRES CABALLERO MORENO AGROP., ESCOBEDO, N.L. CP 66080</div>
      </td>
      <td style="width:200px;padding:0;vertical-align:top">
        <div class="folio-hdr">** Datos de la Cotización</div>
        <table class="folio-tbl"><tr><td class="fl">Folio</td><td class="fv">${cotizacion.Folio}</td></tr></table>
      </td>
    </tr>
  </table>

  <!-- DATOS GENERALES -->
  <table class="info" style="margin-top:0">
    <tr>
      <td class="lbl">CLIENTE:</td>
      <td>${cotizacion.Cliente || '-'}</td>
      <td class="lbl" style="width:80px">FECHA</td>
      <td style="width:120px">${fmtFecha(cotizacion.FechaInicio) !== '-' ? fmtFecha(cotizacion.FechaInicio) : fmtFecha(cotizacion.FechaCreacion)}</td>
    </tr>
    <tr>
      <td class="lbl">CURSO:</td>
      <td>${cotizacion.Curso || '-'}</td>
      <td class="lbl">COACH</td>
      <td>${cotizacion.Coach || '-'}</td>
    </tr>
    <tr>
      <td class="lbl">MODALIDAD:</td>
      <td>${cotizacion.Modalidad || '-'}</td>
      <td class="lbl">PARTICIPANTES</td>
      <td>${cotizacion.ParticipantesCantidad || '-'} / ${cotizacion.DuracionDias || '-'} días</td>
    </tr>
    <tr>
      <td class="lbl">CREADO POR:</td>
      <td colspan="3">${cotizacion.CreadoPor || '-'}</td>
    </tr>
  </table>

  <!-- COSTOS -->
  ${costos.length > 0 ? `
  <div class="sec">DESGLOSE DE COSTOS</div>
  <table class="items"><thead><tr>
    <th>Concepto</th><th>Tipo Costo</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Unitario</th><th style="text-align:right">Total</th>
  </tr></thead><tbody>
  ${costos.map(r => `<tr><td>${r.Concepto||''}</td><td>${r.TipoCosto||'-'}</td><td style="text-align:right">${r.Cantidad||''}</td><td style="text-align:right">${fmtMoney(r.CostoUnitario)}</td><td style="text-align:right">${fmtMoney(r.Total)}</td></tr>`).join('')}
  </tbody></table>` : ''}

  <!-- RESUMEN FINANCIERO -->
  <div class="sec">RESUMEN FINANCIERO</div>
  <table class="tot">
    <tr><td>Costos Directos</td><td style="text-align:right">${fmtMoney(cotizacion.TotalCostosDirectos)}</td></tr>
    ${cotizacion.MargenUtilidadPctDirectos != null ? `<tr><td class="sub">└ Margen Directos (${cotizacion.MargenUtilidadPctDirectos}%)</td><td class="sub" style="text-align:right">${fmtMoney(cotizacion.MargenUtilidadDirectos)}</td></tr>` : ''}
    <tr><td>Costos Indirectos</td><td style="text-align:right">${fmtMoney(cotizacion.TotalCostosIndirectos)}</td></tr>
    ${cotizacion.MargenUtilidadPctIndirectos != null ? `<tr><td class="sub">└ Margen Indirectos (${cotizacion.MargenUtilidadPctIndirectos}%)</td><td class="sub" style="text-align:right">${fmtMoney(cotizacion.MargenUtilidadIndirectos)}</td></tr>` : ''}
    <tr><td>Total Costos</td><td style="text-align:right">${fmtMoney(cotizacion.TotalCostos)}</td></tr>
    <tr><td>Total Margen (${cotizacion.MargenUtilidadPct || 0}%)</td><td style="text-align:right">${fmtMoney(cotizacion.MargenUtilidad)}</td></tr>
    <tr><td class="grand">TOTAL CON GANANCIA</td><td class="grand" style="text-align:right">${fmtMoney(cotizacion.TotalConGanancia)}</td></tr>
    <tr><td>Precio por Participante</td><td style="text-align:right">${fmtMoney(cotizacion.PrecioPorParticipante)}</td></tr>
    <tr><td>Precio Sugerido por Participante</td><td style="text-align:right">${fmtMoney(cotizacion.PrecioSugeridoPorParticipante)}</td></tr>
  </table>

  ${cotizacion.Observaciones ? `
  <div class="sec">OBSERVACIONES</div>
  <div style="border:1px solid #e0e0e0;border-top:none;padding:8px 10px;font-size:11px">${cotizacion.Observaciones}</div>` : ''}

  ${participantes.length > 0 ? `
  <div class="sec">PARTICIPANTES (${participantes.length})</div>
  <table class="items"><thead><tr><th>#</th><th>Nombre</th><th>Empresa</th><th>Factura 2</th><th>Factura 3</th></tr></thead><tbody>
  ${participantes.map((p,i)=>`<tr><td>${i+1}</td><td>${p.NombreCompleto||''}</td><td>${p.Empresa||''}</td><td>${p.Factura2||''}</td><td>${p.Factura3||''}</td></tr>`).join('')}
  </tbody></table>` : ''}

  <!-- FIRMAS -->
  <table class="sigs"><tr>
    <td><div class="sig-line"><div class="sig-name">${cotizacion.CreadoPor || ''}</div><div class="sig-role">Solicitante</div></div></td>
    <td><div class="sig-line"><div class="sig-name">&nbsp;</div><div class="sig-role">Vo.Bo. / Autorización</div></div></td>
  </table>

  <script>setTimeout(()=>{window.print()},500)</script>
  </body></html>`)
  win.document.close()
}

export default function CotizacionDetallesModal({ open, cotizacionData, loading, error, onClose }) {
  if (!open) return null

  const { cotizacion, participantes = [], costos = [] } = cotizacionData || {}

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>
              {loading ? 'Cargando...' : cotizacion ? `Cotización ${cotizacion.Folio}` : 'Detalles de Cotización'}
            </h2>
            {cotizacion && (
              <span style={{
                display: 'inline-block', marginTop: '4px', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                backgroundColor: cotizacion.Estado === 'Aprobada' ? '#d1fae5' : cotizacion.Estado === 'Rechazada' ? '#fee2e2' : '#e0e7ff',
                color: cotizacion.Estado === 'Aprobada' ? '#065f46' : cotizacion.Estado === 'Rechazada' ? '#991b1b' : '#3730a3',
              }}>
                {cotizacion.Estado || 'Borrador'}
              </span>
            )}
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading && <div className="notification">Cargando detalles...</div>}
          {error   && <div className="notification error">{error}</div>}

          {!loading && !error && cotizacion && (
            <>
              {/* Datos generales */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Generales</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  <InfoField label="Cliente"      value={cotizacion.Cliente} />
                  <InfoField label="Curso"        value={cotizacion.Curso} />
                  <InfoField label="Coach"        value={cotizacion.Coach} />
                  <InfoField label="Modalidad"    value={cotizacion.Modalidad} />
                  <InfoField label="Duración"     value={cotizacion.DuracionDias ? `${cotizacion.DuracionDias} días / ${cotizacion.SesionesPorDia || 0} sesiones` : null} />
                  <InfoField label="Participantes" value={cotizacion.ParticipantesCantidad} />
                  <InfoField label="Fecha inicio" value={fmtFecha(cotizacion.FechaInicio)} />
                  <InfoField label="Fecha fin"    value={fmtFecha(cotizacion.FechaFin)} />
                  <InfoField label="Creado por"   value={cotizacion.CreadoPor} />
                  <InfoField label="Creación"     value={fmtFecha(cotizacion.FechaCreacion)} />
                </div>
              </div>

              {/* Resumen financiero */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '14px', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumen Financiero</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {/* Directos */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Costos Directos</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmtMoney(cotizacion.TotalCostosDirectos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 8px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>└ Margen Directos ({cotizacion.MargenUtilidadPctDirectos ?? '-'}%)</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{cotizacion.MargenUtilidadDirectos != null ? fmtMoney(cotizacion.MargenUtilidadDirectos) : '-'}</span>
                  </div>
                  {/* Indirectos */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Costos Indirectos</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmtMoney(cotizacion.TotalCostosIndirectos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 8px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>└ Margen Indirectos ({cotizacion.MargenUtilidadPctIndirectos ?? '-'}%)</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{cotizacion.MargenUtilidadIndirectos != null ? fmtMoney(cotizacion.MargenUtilidadIndirectos) : '-'}</span>
                  </div>
                  {/* Totales */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Total Costos</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmtMoney(cotizacion.TotalCostos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Total Margen ({cotizacion.MargenUtilidadPct || 0}%)</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmtMoney(cotizacion.MargenUtilidad)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid #059669', marginTop: '4px' }}>
                    <span style={{ fontSize: '15px', color: '#059669', fontWeight: '700' }}>Total con Ganancia</span>
                    <span style={{ fontSize: '15px', color: '#059669', fontWeight: '700' }}>{fmtMoney(cotizacion.TotalConGanancia)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Precio / Participante</label>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>{fmtMoney(cotizacion.PrecioPorParticipante)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Precio Sugerido</label>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>{fmtMoney(cotizacion.PrecioSugeridoPorParticipante)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Costos desglosados */}
              {costos.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desglose de Costos</h3>
                  <div className="table-wrap">
                    <table className="participants-table">
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Tipo Costo</th>
                          <th>Fórmula</th>
                          <th style={{ textAlign: 'right' }}>Cantidad</th>
                          <th style={{ textAlign: 'right' }}>Unitario</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costos.map((r, i) => (
                          <tr key={i}>
                            <td>{r.Concepto}</td>
                            <td>{r.TipoCosto || '-'}</td>
                            <td>{r.Formula || '-'}</td>
                            <td style={{ textAlign: 'right' }}>{r.Cantidad}</td>
                            <td style={{ textAlign: 'right' }}>{fmtMoney(r.CostoUnitario)}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmtMoney(r.Total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Participantes */}
              {participantes.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participantes ({participantes.length})</h3>
                  <div className="table-wrap">
                    <table className="participants-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nombre</th>
                          <th>Empresa</th>
                          <th>Factura 2</th>
                          <th>Factura 3</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantes.map((p, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{p.NombreCompleto || '-'}</td>
                            <td>{p.Empresa || '-'}</td>
                            <td>{p.Factura2 || '-'}</td>
                            <td>{p.Factura3 || '-'}</td>
                            <td>{p.Observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {cotizacion.Observaciones && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones</h3>
                  <div style={{ padding: '14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                    {cotizacion.Observaciones}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {cotizacion && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => imprimirCotizacion(cotizacion, costos, participantes)}
            >
              Descargar PDF
            </button>
          )}
          <button type="button" className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
