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
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear())
  return `${dd}/${mm}/${yy}`
}

export async function generarListaAsistenciaPDF({ cursoNombre, generacion, sesion, inscritos, instructor }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const logo = await loadLogo()

  const ml = 10
  const pageW = 215.9
  const usableW = pageW - ml * 2

  const ROWS_PER_PAGE = 18
  const ROW_H = 11

  const totalRows = Math.max(inscritos.length, ROWS_PER_PAGE)
  const pages = Math.ceil(totalRows / ROWS_PER_PAGE)

  const tema = generacion ? `${cursoNombre} — ${generacion}` : cursoNombre

  for (let page = 0; page < pages; page++) {
    if (page > 0) doc.addPage()
    let y = 10

    // ── HEADER ──
    const headerH = 20
    const logoW = 28
    const rightW = 56
    const titleW = usableW - logoW - rightW
    const labelW = 22
    const valW = rightW - labelW

    doc.setDrawColor(0)
    doc.setLineWidth(0.3)

    // Logo cell
    doc.rect(ml, y, logoW, headerH)
    if (logo) {
      doc.addImage(logo, 'PNG', ml + 4, y + 1.5, 17, 17)
    }

    // Title cell
    doc.rect(ml + logoW, y, titleW, headerH)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Lista de Asistencia', ml + logoW + titleW / 2, y + headerH / 2 + 2, { align: 'center' })

    // Right: 3 rows
    const rh = headerH / 3
    const rx = ml + logoW + titleW

    for (let i = 0; i < 3; i++) {
      doc.rect(rx, y + rh * i, labelW, rh)
      doc.rect(rx + labelW, y + rh * i, valW, rh)
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const labels = ['Clave', 'Rev.', 'Fecha:']
    const values = ['FRH02-04', '03', '07/25']
    for (let i = 0; i < 3; i++) {
      doc.setFont('helvetica', 'bold')
      doc.text(labels[i], rx + 2, y + rh * i + rh / 2 + 1)
      doc.setFont('helvetica', 'normal')
      doc.text(values[i], rx + labelW + 2, y + rh * i + rh / 2 + 1)
    }

    y += headerH

    // ── INFO SECTION ──
    const infoH = 10
    const temaW = 70
    const fechaW = 34
    const horaW = 24
    const respW = usableW - temaW - fechaW - horaW

    // Row 1
    doc.rect(ml, y, temaW, infoH)
    doc.rect(ml + temaW, y, fechaW, infoH)
    doc.rect(ml + temaW + fechaW, y, horaW, infoH)
    doc.rect(ml + temaW + fechaW + horaW, y, respW, infoH)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Tema expuesto/Motivo de reunión:', ml + 2, y + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(tema || '', ml + 2, y + 7.5, { maxWidth: temaW - 4 })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha:', ml + temaW + 2, y + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(fmtFechaPDF(sesion?.Fecha) || '', ml + temaW + 2, y + 7.5)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Hora:', ml + temaW + fechaW + 2, y + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(sesion?.HoraInicio || '', ml + temaW + fechaW + 2, y + 7.5)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Nombre y firma del Responsable:', ml + temaW + fechaW + horaW + 2, y + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(instructor || '', ml + temaW + fechaW + horaW + 2, y + 7.5, { maxWidth: respW - 4 })

    y += infoH

    // Row 2
    doc.rect(ml, y, temaW, infoH)
    doc.rect(ml + temaW, y, usableW - temaW, infoH)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Empresa:', ml + temaW + 2, y + infoH / 2 + 1)

    y += infoH

    // ── TABLE HEADER ──
    const cols = [
      { header: 'No.', w: 12, align: 'center' },
      { header: 'Número de\nempleado', w: 26, align: 'center' },
      { header: 'Nombre del Participante', w: 56, align: 'left' },
      { header: 'Puesto', w: 30, align: 'left' },
      { header: 'Unidad de Negocio - Área', w: 38, align: 'left' },
      { header: 'Firma', w: usableW - 12 - 26 - 56 - 30 - 38, align: 'center' },
    ]

    const thH = 10
    doc.setFillColor(0, 32, 96)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')

    let x = ml
    for (const col of cols) {
      doc.rect(x, y, col.w, thH, 'FD')
      const lines = col.header.split('\n')
      if (lines.length > 1) {
        doc.text(lines[0], x + col.w / 2, y + thH / 2 - 1, { align: 'center' })
        doc.text(lines[1], x + col.w / 2, y + thH / 2 + 2.5, { align: 'center' })
      } else {
        doc.text(col.header, x + col.w / 2, y + thH / 2 + 1, { align: 'center', maxWidth: col.w - 2 })
      }
      x += col.w
    }

    y += thH
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    // ── TABLE ROWS ──
    const startIdx = page * ROWS_PER_PAGE
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
      const idx = startIdx + i
      const insc = idx < inscritos.length ? inscritos[idx] : null

      x = ml
      for (let c = 0; c < cols.length; c++) {
        doc.rect(x, y, cols[c].w, ROW_H)

        doc.setFontSize(7)
        let text = ''
        if (c === 0) {
          text = String(idx + 1)
          doc.setFont('helvetica', 'bold')
          doc.text(text, x + cols[c].w / 2, y + ROW_H / 2 + 1, { align: 'center' })
          doc.setFont('helvetica', 'normal')
        } else if (insc) {
          switch (c) {
            case 1: text = insc.NumeroEmpleado || ''; break
            case 2: text = insc.NombreCompleto || ''; break
            case 3: text = ''; break
            case 4: text = insc.Terminal || ''; break
            case 5: text = ''; break
          }
          if (text) {
            doc.text(text, x + 2, y + ROW_H / 2 + 1, { maxWidth: cols[c].w - 4 })
          }
        }

        x += cols[c].w
      }

      y += ROW_H
    }
  }

  const safeName = (cursoNombre || 'curso').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Lista_Asistencia_${safeName}_S${sesion?.NumeroSesion || ''}.pdf`)
}
