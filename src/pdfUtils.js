import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function fmtMoney(v) {
  return '$' + Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(val) {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime()) || d.getFullYear() < 1980) return '-'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function generarHtmlCotizacion(cotizacion, costos = [], participantes = []) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;width:794px;padding:20px;background:#fff;box-sizing:border-box">

    <!-- ENCABEZADO -->
    <table style="width:100%;border-collapse:collapse;border:2px solid #1e3a8a;margin-bottom:8px">
      <tr>
        <td style="width:100px;text-align:center;padding:10px 6px;vertical-align:middle;border:1px solid #1e3a8a">
          <span style="font-size:22px;font-weight:900;color:#1e3a8a">UDAT</span>
        </td>
        <td style="text-align:center;vertical-align:middle;font-size:18px;font-weight:900;letter-spacing:1px;border:1px solid #1e3a8a">
          Cotización
        </td>
      </tr>
    </table>

    <!-- EMPRESA + FOLIO -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:0">
      <tr>
        <td style="padding:8px 10px;vertical-align:middle;border-right:1px solid #ccc">
          <div style="font-size:13px;font-weight:bold;color:#1e3a8a">UNIVERSIDAD DE AUTOTRANSPORTE SC</div>
          <div style="font-size:10px;color:#666;margin-top:2px">CARRETERA A COLOMBIA 2080, COL. ANDRES CABALLERO MORENO AGROP., ESCOBEDO, N.L. CP 66080</div>
        </td>
        <td style="width:200px;padding:0;vertical-align:top">
          <div style="background:#bfdbfe;text-align:center;font-weight:bold;font-size:10px;padding:3px;border-bottom:1px solid #ccc">** Datos de la Cotización</div>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="background:#fef9c3;font-weight:bold;text-align:center;width:50%;border-right:1px solid #ccc;padding:4px 8px;font-size:11px">Folio</td>
              <td style="font-weight:bold;color:#1e3a8a;text-align:center;padding:4px 8px;font-size:11px">${cotizacion.Folio}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- DATOS GENERALES -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-top:0">
      <tr>
        <td style="background:#f0f0f0;font-weight:bold;white-space:nowrap;width:110px;padding:6px 8px;border:1px solid #ccc">CLIENTE:</td>
        <td style="padding:6px 8px;border:1px solid #ccc">${cotizacion.Cliente || '-'}</td>
        <td style="background:#f0f0f0;font-weight:bold;width:80px;padding:6px 8px;border:1px solid #ccc">FECHA</td>
        <td style="width:120px;padding:6px 8px;border:1px solid #ccc">${fmtFecha(cotizacion.FechaInicio) !== '-' ? fmtFecha(cotizacion.FechaInicio) : fmtFecha(cotizacion.FechaCreacion)}</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0;font-weight:bold;padding:6px 8px;border:1px solid #ccc">CURSO:</td>
        <td style="padding:6px 8px;border:1px solid #ccc">${cotizacion.Curso || '-'}</td>
        <td style="background:#f0f0f0;font-weight:bold;padding:6px 8px;border:1px solid #ccc">COACH</td>
        <td style="padding:6px 8px;border:1px solid #ccc">${cotizacion.Coach || '-'}</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0;font-weight:bold;padding:6px 8px;border:1px solid #ccc">MODALIDAD:</td>
        <td style="padding:6px 8px;border:1px solid #ccc">${cotizacion.Modalidad || '-'}</td>
        <td style="background:#f0f0f0;font-weight:bold;padding:6px 8px;border:1px solid #ccc">PARTICIPANTES</td>
        <td style="padding:6px 8px;border:1px solid #ccc">${cotizacion.ParticipantesCantidad || '-'} / ${cotizacion.DuracionDias || '-'} días</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0;font-weight:bold;padding:6px 8px;border:1px solid #ccc">CREADO POR:</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #ccc">${cotizacion.CreadoPor || '-'}</td>
      </tr>
    </table>

    ${costos.length > 0 ? `
    <!-- COSTOS -->
    <div style="background:#1e3a8a;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;margin-top:10px">DESGLOSE DE COSTOS</div>
    <table style="width:100%;border-collapse:collapse;margin-top:0">
      <thead>
        <tr>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">Concepto</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">Tipo Costo</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:right;font-size:10px;border:1px solid #1e3a8a">Cantidad</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:right;font-size:10px;border:1px solid #1e3a8a">Unitario</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:right;font-size:10px;border:1px solid #1e3a8a">Total</th>
        </tr>
      </thead>
      <tbody>
        ${costos.map((r, i) => `
        <tr style="${i % 2 === 1 ? 'background:#f9fafb' : ''}">
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${r.Concepto || ''}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${r.TipoCosto || '-'}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px;text-align:right">${r.Cantidad || ''}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px;text-align:right">${fmtMoney(r.CostoUnitario)}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px;text-align:right">${fmtMoney(r.Total)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <!-- RESUMEN FINANCIERO -->
    <div style="background:#1e3a8a;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;margin-top:10px">RESUMEN FINANCIERO</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-top:none">
      <tr><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px">Costos Directos</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right">${fmtMoney(cotizacion.TotalCostosDirectos)}</td></tr>
      ${cotizacion.MargenUtilidadPctDirectos != null ? `<tr><td style="padding:5px 10px 5px 22px;border-bottom:1px solid #e0e0e0;font-size:10px;color:#6b7280">└ Margen Directos (${cotizacion.MargenUtilidadPctDirectos}%)</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:10px;color:#6b7280;text-align:right">${fmtMoney(cotizacion.MargenUtilidadDirectos)}</td></tr>` : ''}
      <tr><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px">Costos Indirectos</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right">${fmtMoney(cotizacion.TotalCostosIndirectos)}</td></tr>
      ${cotizacion.MargenUtilidadPctIndirectos != null ? `<tr><td style="padding:5px 10px 5px 22px;border-bottom:1px solid #e0e0e0;font-size:10px;color:#6b7280">└ Margen Indirectos (${cotizacion.MargenUtilidadPctIndirectos}%)</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:10px;color:#6b7280;text-align:right">${fmtMoney(cotizacion.MargenUtilidadIndirectos)}</td></tr>` : ''}
      <tr><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px">Total Costos</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right">${fmtMoney(cotizacion.TotalCostos)}</td></tr>
      <tr><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px">Total Margen (${cotizacion.MargenUtilidadPct || 0}%)</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right">${fmtMoney(cotizacion.MargenUtilidad)}</td></tr>
      <tr><td style="padding:6px 10px;background:#1e3a8a;color:#fff;font-weight:bold;font-size:13px">TOTAL CON GANANCIA</td><td style="padding:6px 10px;background:#1e3a8a;color:#fff;font-weight:bold;font-size:13px;text-align:right">${fmtMoney(cotizacion.TotalConGanancia)}</td></tr>
      <tr><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px">Precio por Participante</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right">${fmtMoney(cotizacion.PrecioPorParticipante)}</td></tr>
      <tr><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px">Precio Sugerido por Participante</td><td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right">${fmtMoney(cotizacion.PrecioSugeridoPorParticipante)}</td></tr>
    </table>

    ${cotizacion.Observaciones ? `
    <div style="background:#1e3a8a;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;margin-top:10px">OBSERVACIONES</div>
    <div style="border:1px solid #e0e0e0;border-top:none;padding:8px 10px;font-size:11px">${cotizacion.Observaciones}</div>` : ''}

    ${participantes.length > 0 ? `
    <div style="background:#1e3a8a;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;margin-top:10px">PARTICIPANTES (${participantes.length})</div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">#</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">Nombre</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">Empresa</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">Factura 2</th>
          <th style="background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;border:1px solid #1e3a8a">Factura 3</th>
        </tr>
      </thead>
      <tbody>
        ${participantes.map((p, i) => `
        <tr style="${i % 2 === 1 ? 'background:#f9fafb' : ''}">
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${i + 1}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${p.NombreCompleto || ''}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${p.Empresa || ''}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${p.Factura2 || ''}</td>
          <td style="padding:5px 8px;border:1px solid #e0e0e0;font-size:10px">${p.Factura3 || ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <!-- FIRMAS -->
    <table style="width:100%;border-collapse:collapse;margin-top:36px">
      <tr>
        <td style="text-align:center;padding:0 20px;vertical-align:bottom">
          <div style="border-top:1px solid #333;padding-top:5px;margin-top:30px">
            <div style="font-weight:bold;color:#1e3a8a;font-size:11px">${cotizacion.CreadoPor || ''}</div>
            <div style="font-size:10px;color:#6b7280">Solicitante</div>
          </div>
        </td>
        <td style="text-align:center;padding:0 20px;vertical-align:bottom">
          <div style="border-top:1px solid #333;padding-top:5px;margin-top:30px">
            <div style="font-weight:bold;color:#1e3a8a;font-size:11px">&nbsp;</div>
            <div style="font-size:10px;color:#6b7280">Vo.Bo. / Autorización</div>
          </div>
        </td>
      </tr>
    </table>
  </div>`
}

export async function descargarPdfCotizacion(cotizacion, costos = [], participantes = []) {
  const contenedor = document.createElement('div')
  contenedor.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;'
  contenedor.innerHTML = generarHtmlCotizacion(cotizacion, costos, participantes)
  document.body.appendChild(contenedor)

  try {
    const canvas = await html2canvas(contenedor, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height * imgW) / canvas.width

    let heightRestante = imgH
    let posicion = 0

    pdf.addImage(imgData, 'JPEG', 0, posicion, imgW, imgH)
    heightRestante -= pageH

    while (heightRestante > 0) {
      posicion -= pageH
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, posicion, imgW, imgH)
      heightRestante -= pageH
    }

    pdf.save(`${cotizacion.Folio || 'cotizacion'}.pdf`)
  } finally {
    document.body.removeChild(contenedor)
  }
}
