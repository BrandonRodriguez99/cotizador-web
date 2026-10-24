import jsPDF from 'jspdf'

let logoCache = null
async function loadLogo() {
  if (logoCache) return logoCache
  try {
    const r = await fetch('/logo-udat-sello.png')
    const blob = await r.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => { logoCache = reader.result; resolve(logoCache) }
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

function fmtFechaPDF(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function generarListaAsistenciaPDF({ cursoNombre, generacion, sesion, inscritos, instructor }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const logo = await loadLogo()

  const ml = 10
  const mt = 8
  const mb = 8
  const pageW = 215.9
  const pageH = 279.4
  const usableW = pageW - ml * 2
  const tema = generacion ? `${cursoNombre} — ${generacion}` : cursoNombre

  const headerH = 18
  const infoRowH = 8
  const thH = 9
  const fixedH = mt + headerH + infoRowH * 2 + thH + mb

  const numRows = Math.max(inscritos.length, 18)
  const rowH = Math.min(11, Math.max(5.5, (pageH - fixedH) / numRows))

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  let y = mt

  // ═══ HEADER ═══
  const logoW = 26
  const rightW = 52
  const titleW = usableW - logoW - rightW
  const labelW = 20
  const valW = rightW - labelW
  const rx = ml + logoW + titleW
  const rh = headerH / 3

  doc.rect(ml, y, logoW, headerH)
  if (logo) doc.addImage(logo, 'PNG', ml + 3.5, y + 1, 16, 16)

  doc.rect(ml + logoW, y, titleW, headerH)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Lista de Asistencia', ml + logoW + titleW / 2, y + headerH / 2 + 2, { align: 'center' })

  const rlabels = ['Clave', 'Rev.', 'Fecha:']
  const rvals = ['FRH02-04', '03', '07/25']
  for (let i = 0; i < 3; i++) {
    doc.rect(rx, y + rh * i, labelW, rh)
    doc.rect(rx + labelW, y + rh * i, valW, rh)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(rlabels[i], rx + 2, y + rh * i + rh / 2 + 1)
    doc.setFont('helvetica', 'normal')
    doc.text(rvals[i], rx + labelW + 2, y + rh * i + rh / 2 + 1)
  }
  y += headerH

  // ═══ INFO ROW 1 ═══
  const temaW = 68
  const fechaW = 32
  const horaW = 22
  const respW = usableW - temaW - fechaW - horaW

  doc.rect(ml, y, temaW, infoRowH)
  doc.rect(ml + temaW, y, fechaW, infoRowH)
  doc.rect(ml + temaW + fechaW, y, horaW, infoRowH)
  doc.rect(ml + temaW + fechaW + horaW, y, respW, infoRowH)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Tema expuesto/Motivo de reunión:', ml + 2, y + 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(tema || '', ml + 2, y + 6.5, { maxWidth: temaW - 4 })

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha:', ml + temaW + 2, y + 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(fmtFechaPDF(sesion?.Fecha) || '', ml + temaW + 2, y + 6.5)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Hora:', ml + temaW + fechaW + 2, y + 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(sesion?.HoraInicio || '', ml + temaW + fechaW + 2, y + 6.5)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Nombre y firma del Responsable:', ml + temaW + fechaW + horaW + 2, y + 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(instructor || '', ml + temaW + fechaW + horaW + 2, y + 6.5, { maxWidth: respW - 4 })
  y += infoRowH

  // ═══ INFO ROW 2 ═══
  doc.rect(ml, y, temaW, infoRowH)
  doc.rect(ml + temaW, y, usableW - temaW, infoRowH)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Empresa:', ml + temaW + 2, y + infoRowH / 2 + 1)
  y += infoRowH

  // ═══ TABLE HEADER ═══
  const cols = [
    { header: 'No.',                     w: 12 },
    { header: 'Número de empleado',      w: 28 },
    { header: 'Nombre del Participante', w: 54 },
    { header: 'Puesto',                  w: 28 },
    { header: 'Unidad de Negocio - Área', w: 40 },
    { header: 'Firma',                   w: usableW - 12 - 28 - 54 - 28 - 40 },
  ]

  // Draw all header cell backgrounds first
  doc.setFillColor(0, 32, 96)
  let x = ml
  for (const col of cols) {
    doc.rect(x, y, col.w, thH, 'FD')
    x += col.w
  }

  // Draw header text on top — use font size 5.5 so all text fits on one line
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  x = ml
  for (const col of cols) {
    doc.text(col.header, x + col.w / 2, y + thH / 2 + 1, { align: 'center' })
    x += col.w
  }

  y += thH

  // ═══ TABLE ROWS ═══
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  for (let i = 0; i < numRows; i++) {
    const insc = i < inscritos.length ? inscritos[i] : null
    const cy = y + rowH / 2 + 1

    x = ml
    for (let c = 0; c < cols.length; c++) {
      doc.rect(x, y, cols[c].w, rowH)
      x += cols[c].w
    }

    // No.
    x = ml
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), x + cols[0].w / 2, cy, { align: 'center' })
    doc.setFont('helvetica', 'normal')

    if (insc) {
      // Número de empleado
      x = ml + cols[0].w
      doc.text(insc.NumeroEmpleado || '', x + 2, cy, { maxWidth: cols[1].w - 4 })

      // Nombre del Participante
      x += cols[1].w
      doc.text(insc.NombreCompleto || '', x + 2, cy, { maxWidth: cols[2].w - 4 })

      // Puesto (Plaza)
      x += cols[2].w
      doc.text(insc.Plaza || '', x + 2, cy, { maxWidth: cols[3].w - 4 })

      // Unidad de Negocio - Área (Area)
      x += cols[3].w
      doc.text(insc.Area || '', x + 2, cy, { maxWidth: cols[4].w - 4 })
    }

    y += rowH
  }

  const safeName = (cursoNombre || 'curso').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Lista_Asistencia_${safeName}_S${sesion?.NumeroSesion || ''}.pdf`)
}
