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

function centerText(doc, text, x, y, w, h, fontSize) {
  doc.setFontSize(fontSize || 7)
  const lines = doc.splitTextToSize(text, w - 4)
  const lineH = (fontSize || 7) * 0.4
  const totalH = lines.length * lineH
  const startY = y + (h - totalH) / 2 + lineH * 0.8
  lines.forEach((line, i) => {
    doc.text(line, x + w / 2, startY + i * lineH, { align: 'center' })
  })
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

  // Layout heights
  const headerH = 18
  const infoH = 8
  const thH = 9
  const fixedH = mt + headerH + infoH * 2 + thH + mb

  const numRows = Math.max(inscritos.length, 18)
  const rowH = Math.min(11, Math.max(6, (pageH - fixedH) / numRows))

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  let y = mt

  // ── HEADER ──
  const logoW = 26
  const rightW = 52
  const titleW = usableW - logoW - rightW
  const labelW = 20
  const valW = rightW - labelW

  doc.rect(ml, y, logoW, headerH)
  if (logo) doc.addImage(logo, 'PNG', ml + 3.5, y + 1, 16, 16)

  doc.rect(ml + logoW, y, titleW, headerH)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Lista de Asistencia', ml + logoW + titleW / 2, y + headerH / 2 + 2, { align: 'center' })

  const rx = ml + logoW + titleW
  const rh = headerH / 3
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

  // ── INFO ROW 1 ──
  const temaW = 68
  const fechaW = 32
  const horaW = 22
  const respW = usableW - temaW - fechaW - horaW

  doc.rect(ml, y, temaW, infoH)
  doc.rect(ml + temaW, y, fechaW, infoH)
  doc.rect(ml + temaW + fechaW, y, horaW, infoH)
  doc.rect(ml + temaW + fechaW + horaW, y, respW, infoH)

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

  y += infoH

  // ── INFO ROW 2 ──
  doc.rect(ml, y, temaW, infoH)
  doc.rect(ml + temaW, y, usableW - temaW, infoH)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Empresa:', ml + temaW + 2, y + infoH / 2 + 1)

  y += infoH

  // ── TABLE HEADER ──
  const cols = [
    { header: 'No.', w: 12 },
    { header: 'Número de empleado', w: 28 },
    { header: 'Nombre del Participante', w: 54 },
    { header: 'Puesto', w: 28 },
    { header: 'Unidad de Negocio - Área', w: 40 },
    { header: 'Firma', w: usableW - 12 - 28 - 54 - 28 - 40 },
  ]

  doc.setFillColor(0, 32, 96)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')

  let x = ml
  for (const col of cols) {
    doc.rect(x, y, col.w, thH, 'FD')
    centerText(doc, col.header, x, y, col.w, thH, 7)
    x += col.w
  }

  y += thH
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  // ── TABLE ROWS ──
  for (let i = 0; i < numRows; i++) {
    const insc = i < inscritos.length ? inscritos[i] : null

    x = ml
    for (let c = 0; c < cols.length; c++) {
      doc.rect(x, y, cols[c].w, rowH)

      doc.setFontSize(7)
      const cy = y + rowH / 2 + 1

      if (c === 0) {
        doc.setFont('helvetica', 'bold')
        doc.text(String(i + 1), x + cols[c].w / 2, cy, { align: 'center' })
        doc.setFont('helvetica', 'normal')
      } else if (insc) {
        let text = ''
        switch (c) {
          case 1: text = insc.NumeroEmpleado || ''; break
          case 2: text = insc.NombreCompleto || ''; break
          case 3: text = ''; break
          case 4: text = insc.Terminal || ''; break
          case 5: text = ''; break
        }
        if (text) doc.text(text, x + 2, cy, { maxWidth: cols[c].w - 4 })
      }

      x += cols[c].w
    }

    y += rowH
  }

  const safeName = (cursoNombre || 'curso').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Lista_Asistencia_${safeName}_S${sesion?.NumeroSesion || ''}.pdf`)
}
