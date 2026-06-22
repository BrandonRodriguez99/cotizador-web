import { useEffect, useMemo, useRef, useState } from 'react'
import { createCotizacion, updateCotizacion, enviarCotizacionAprobacion } from './api'

function formatMoney(value) {
  return `$ ${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function evaluateFormula(formula, context) {
  if (!formula) {
    return { quantity: 0, participants: '-', quantityLabel: '-' }
  }

  const normalized = formula.replace(/×/gi, 'x').trim()
  const parts = normalized.split(/x/i).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) {
    return { quantity: 0, participants: '-', quantityLabel: '-' }
  }

  let quantity = 1
  let includesParticipants = false

  for (const part of parts) {
    const token = part.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g, '')
    const tokenValue = context[token] ?? (Number(part) || 0)
    if (token === 'Participantes') {
      includesParticipants = true
    }
    quantity *= tokenValue
  }

  return {
    quantity,
    participants: includesParticipants ? context.Participantes : '-',
    quantityLabel: Number.isFinite(quantity) ? quantity : '-',
  }
}

function participantName(p) {
  return (
    p.NombreCompleto ||
    `${p.Nombre || ''} ${p.ApellidoPaterno || ''} ${p.ApellidoMaterno || ''}`.trim()
  )
}

function FormField({ label, children, className = '' }) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <span className="form-field-label">{label}</span>
      {children}
    </div>
  )
}

export default function NuevaCotizacion({
  clientes,
  cursos,
  coaches,
  modalidades,
  unidadesNegocio,
  participantes,
  conceptos,
  selectedCliente,
  setSelectedCliente,
  selectedCurso,
  setSelectedCurso,
  selectedCoach,
  setSelectedCoach,
  selectedModalidad,
  setSelectedModalidad,
  selectedUnidadNegocio,
  setSelectedUnidadNegocio,
  duracionDias,
  setDuracionDias,
  sesionesPorDia,
  setSesionesPorDia,
  participantesCantidad,
  setParticipantesCantidad,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  observaciones,
  setObservaciones,
  margenPctDirectos,
  setMargenPctDirectos,
  margenPctIndirectos,
  setMargenPctIndirectos,
  estados,
  selectedEstado,
  folio,
  creadoPor,
  participantesSeleccionados,
  agregarParticipante,
  quitarParticipante,
  modalParticipantesOpen,
  setModalParticipantesOpen,
  searchParticipantesInput,
  setSearchParticipantesInput,
  participantesDisponibles,
  editingCotizacionId,
  initialConcepts,
  onSaved,
}) {
  const [selectedConcepts, setSelectedConcepts] = useState([])
  const [cotizacionId, setCotizacionId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterConceptos, setFilterConceptos] = useState('')
  const [hoveredConceptId, setHoveredConceptId] = useState(null)
  const isInitialEditLoadRef = useRef(false)
  const latestInitialConceptsRef = useRef(initialConcepts)

  const cursoSeleccionado = useMemo(
    () => cursos.find(c => String(c.CursoId) === String(selectedCurso)),
    [cursos, selectedCurso]
  )
  const esMandatorio = cursoSeleccionado?.TipoCurso === 'Mandatorio'

  const formulaContext = useMemo(() => {
    const dias = Number(duracionDias) || 0
    const participantesNum = Number(participantesCantidad) || 0
    const cursoHoras = Number(cursoSeleccionado?.Horas) || 0

    return {
      Días: dias,
      Dias: dias,
      Sesiones: 1,
      Participantes: participantesNum,
      Horas: cursoHoras || dias,
      Eventos: 1,
    }
  }, [duracionDias, participantesCantidad, cursoSeleccionado])

  // Mantiene el ref sincronizado con la prop en cada render (sin disparar efectos)
  useEffect(() => { latestInitialConceptsRef.current = initialConcepts })

  // Solo dispara cuando cambia el modo edición, no en cada re-render del padre
  useEffect(() => {
    const concepts = latestInitialConceptsRef.current
    if (concepts && concepts.length > 0) {
      setSelectedConcepts(concepts)
      isInitialEditLoadRef.current = true
    } else {
      setSelectedConcepts([])
      isInitialEditLoadRef.current = false
    }
  }, [editingCotizacionId])

  // Auto-rellena duración desde el curso seleccionado
  useEffect(() => {
    if (cursoSeleccionado?.DuracionDefaultDias) {
      setDuracionDias(String(cursoSeleccionado.DuracionDefaultDias))
    }
  }, [selectedCurso, cursos])

  // Auto-agrega el costo del instructor (solo Extraordinario) cuando se seleccionan coach y curso
  useEffect(() => {
    if (isInitialEditLoadRef.current) {
      isInitialEditLoadRef.current = false
      return
    }
    const coach = coaches.find(c => String(c.CoachId) === String(selectedCoach))
    const curso = cursos.find(c => String(c.CursoId) === String(selectedCurso))
    const esCursoMandatorio = curso?.TipoCurso === 'Mandatorio'
    const costoCoach = (!esCursoMandatorio && coach) ? Number(coach.Costo) : 0
    const horasCurso = curso ? Number(curso.Horas) : 0

    setSelectedConcepts(prev => {
      const sinInstructor = prev.filter(c => c.ConceptoCostoId !== '__instructor__')
      if (!esCursoMandatorio && costoCoach > 0 && horasCurso > 0) {
        return [...sinInstructor, {
          ConceptoCostoId: '__instructor__',
          Nombre: coach.Nombre,
          TipoCalculo: 'Por hora',
          Formula: `${horasCurso} hrs`,
          TipoCosto: 'Directos',
          CostoUnitario: costoCoach,
          quantityOverride: String(horasCurso),
        }]
      }
      return sinInstructor
    })
  }, [selectedCoach, selectedCurso, coaches, cursos])

  function getQuantity(concepto) {
    const evaluation = evaluateFormula(concepto.Formula, formulaContext)
    const computed = Number(evaluation.quantity) || 0
    if (concepto.quantityOverride != null && concepto.quantityOverride !== '') {
      return Number(concepto.quantityOverride) || 0
    }
    return computed
  }

  const costRows = useMemo(
    () => selectedConcepts.map((concepto, index) => {
      const computedQuantity = getQuantity(concepto)
      const unitCost = Number(concepto.CostoUnitario) || 0
      const totalAmount = unitCost * computedQuantity
      const evaluation = evaluateFormula(concepto.Formula, formulaContext)

      return {
        key: concepto.ConceptoCostoId || index,
        concept: concepto.Nombre,
        calcType: concepto.TipoCalculo || '-',
        tipoCosto: concepto.TipoCosto || concepto.Tipo || '',
        formula: concepto.Formula || '-',
        unitCost: formatMoney(unitCost),
        quantity: (concepto.quantityOverride != null && concepto.quantityOverride !== '')
          ? String(concepto.quantityOverride)
          : String(evaluation.quantityLabel === '-' ? 0 : evaluation.quantityLabel),
        participants: evaluation.participants === '-' ? '-' : String(evaluation.participants),
        total: formatMoney(totalAmount),
        totalAmount,
      }
    }),
    [selectedConcepts, formulaContext]
  )

  const totals = useMemo(() => {
    if (esMandatorio) {
      const cursoCosto = Number(cursoSeleccionado?.Costo) || 0
      const numParticipantes = Number(participantesCantidad) || 1
      const extraTotal = costRows.reduce((sum, row) => sum + row.totalAmount, 0)
      const total = cursoCosto + extraTotal
      return {
        directos: total, indirectos: 0, total,
        margenDirectos: 0, margenIndirectos: 0, margenTotal: 0,
        conGanancia: total,
        porParticipante: total / numParticipantes,
        sugerido: total / numParticipantes,
      }
    }

    const isIndirect = (row) => String(row.tipoCosto || '').toLowerCase().includes('indirect')
    const directos = costRows.reduce((sum, row) => sum + (isIndirect(row) ? 0 : row.totalAmount), 0)
    const indirectos = costRows.reduce((sum, row) => sum + (isIndirect(row) ? row.totalAmount : 0), 0)
    const total = directos + indirectos
    const margenDirectos = directos * ((Number(margenPctDirectos) || 0) / 100)
    const margenIndirectos = indirectos * ((Number(margenPctIndirectos) || 0) / 100)
    const margenTotal = margenDirectos + margenIndirectos
    const conGanancia = total + margenTotal
    const porParticipante = Number(participantesCantidad) ? conGanancia / Number(participantesCantidad) : 0
    return { directos, indirectos, total, margenDirectos, margenIndirectos, margenTotal, conGanancia, porParticipante, sugerido: porParticipante }
  }, [esMandatorio, cursoSeleccionado, costRows, margenPctDirectos, margenPctIndirectos, participantesCantidad])

  const conceptosFiltrados = useMemo(() => {
    const q = filterConceptos.trim().toLowerCase()
    if (!q) return conceptos
    return conceptos.filter(c =>
      (c.Nombre || '').toLowerCase().includes(q) ||
      (c.Formula || '').toLowerCase().includes(q)
    )
  }, [conceptos, filterConceptos])

  function handleAddConceptCard(concept) {
    if (selectedConcepts.some((c) => c.ConceptoCostoId === concept.ConceptoCostoId)) return
    setSelectedConcepts((current) => [...current, { ...concept, quantityOverride: '' }])
  }

  function handleRemoveConcept(conceptId) {
    setSelectedConcepts((current) => current.filter((c) => c.ConceptoCostoId !== conceptId))
  }

  function handleQuantityChange(conceptId, value) {
    setSelectedConcepts((current) =>
      current.map((c) =>
        c.ConceptoCostoId === conceptId
          ? { ...c, quantityOverride: value }
          : c
      )
    )
  }

  const displayParticipants = participantesSeleccionados

  function buildPayload() {
    const conceptosPayload = esMandatorio ? [] : selectedConcepts.map((c, i) => ({
      concepto: c.Nombre,
      tipoCalculo: c.TipoCalculo,
      formula: c.Formula,
      tipoCosto: c.TipoCosto || null,
      costoUnitario: Number(c.CostoUnitario) || 0,
      cantidad: c.quantityOverride != null && c.quantityOverride !== '' ? String(c.quantityOverride) : String(getQuantity(c)),
      participantes: '-',
      total: (Number(c.CostoUnitario) || 0) * (Number(c.quantityOverride) || getQuantity(c) || 0),
      orden: i + 1,
    }))
    return {
      folio,
      clienteId: Number(selectedCliente) || null,
      cursoId: Number(selectedCurso) || null,
      coachId: esMandatorio ? null : (Number(selectedCoach) || null),
      modalidadId: Number(selectedModalidad) || null,
      unidadNegocioId: null,
      duracionDias: Number(duracionDias) || null,
      sesionesPorDia: 1,
      participantesCantidad: Number(participantesCantidad) || null,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      observaciones,
      totalCostosDirectos: totals.directos,
      totalCostosIndirectos: totals.indirectos,
      totalCostos: totals.total,
      margenUtilidadPct: totals.total ? ((totals.margenTotal / totals.total) * 100) : 0,
      margenUtilidad: totals.margenTotal,
      margenUtilidadPctDirectos: esMandatorio ? 0 : (Number(margenPctDirectos) || 0),
      margenUtilidadPctIndirectos: esMandatorio ? 0 : (Number(margenPctIndirectos) || 0),
      margenUtilidadDirectos: totals.margenDirectos,
      margenUtilidadIndirectos: totals.margenIndirectos,
      totalConGanancia: totals.conGanancia,
      precioPorParticipante: totals.porParticipante,
      precioSugeridoPorParticipante: totals.sugerido,
      estado: "Pendiente",
      creadoPor,
      costos: conceptosPayload,
      participantes: participantesSeleccionados.map((p) => ({
        empleadoId: p.EmpleadoId || null,
        nombreCompleto: participantName(p),
        empresa: p.Empresa || null,
        factura2: p.Factura2 || null,
        factura3: p.Factura3 || null,
        observaciones: p.observaciones || null,
      })),
    }
  }

  async function handleSave() {
    if (!selectedCliente) {
      window.alert('Selecciona una empresa / cliente antes de guardar.')
      return
    }
    if (!selectedCurso) {
      window.alert('Selecciona un curso antes de guardar.')
      return
    }
    if (!selectedModalidad) {
      window.alert('Selecciona una modalidad antes de guardar.')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editingCotizacionId) {
        await updateCotizacion(editingCotizacionId, payload)
      } else {
        const res = await createCotizacion(payload)
        if (!res?.cotizacionId) return
      }
      setCotizacionId(null)
      setSelectedConcepts([])
      if (typeof onSaved === 'function') onSaved()
      try { window.alert(editingCotizacionId ? 'Cotización actualizada correctamente.' : 'Cotización guardada correctamente.') } catch (e) {}
    } catch (err) {
      console.error(err)
      try { window.alert('Error guardando cotización: ' + (err.message || err)) } catch (e) {}
    } finally {
      setSaving(false)
    }
  }

  async function handleSendToApproval() {
    try {
      if (!cotizacionId) {
        await handleSave()
      }
      if (!cotizacionId) {
        try { window.alert('No se pudo guardar la cotización antes de enviar a aprobación.') } catch (e) {}
        return
      }
      await enviarCotizacionAprobacion(cotizacionId, creadoPor)
      try { window.alert('Cotización enviada a aprobación.') } catch (e) {}
    } catch (err) {
      console.error(err)
      try { window.alert('Error enviando a aprobación: ' + (err.message || err)) } catch (e) {}
    }
  }

  function handleGeneratePdf() {
    const win = window.open('', '_blank')
    if (!win) { try { window.alert('Permite ventanas emergentes para generar PDF.') } catch (e) {} ; return }
    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${folio} - Cotización</title>
        <style>body{font-family: Arial, Helvetica, sans-serif; padding:20px; color:#111} h1{font-size:18px} table{width:100%; border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left}</style>
      </head>
      <body>
        <h1>Cotización ${folio}</h1>
        <p><strong>Cliente:</strong> ${clientes.find(c=>c.ClienteId==selectedCliente)?.Nombre || '-'}</p>
        <p><strong>Curso:</strong> ${cursos.find(c=>c.CursoId==selectedCurso)?.Nombre || '-'}</p>
        <p><strong>Coach:</strong> ${coaches.find(c=>c.CoachId==selectedCoach)?.Nombre || '-'}</p>
        <h2>Resumen de costos</h2>
        <table>
          <thead><tr><th>Concepto</th><th>Cantidad</th><th>Costo unitario</th><th>Total</th></tr></thead>
          <tbody>
            ${selectedConcepts.map(c=>`<tr><td>${c.Nombre}</td><td>${c.quantityOverride||getQuantity(c)||0}</td><td>${Number(c.CostoUnitario||0).toFixed(2)}</td><td>${(Number(c.CostoUnitario||0)*(Number(c.quantityOverride||getQuantity(c)||0))).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
        <h3>Total: ${totals.conGanancia.toFixed(2)}</h3>
        <script>setTimeout(()=>{window.print();},500)</script>
      </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="cotizacion-page">
      <section className="panel card">
        <div className="panel-header">
          <h2>1. Datos Generales</h2>
        </div>
        <div className="datos-generales-form">
          <div className="form-row form-row-5">
            <FormField label="Empresa / Cliente">
              <select className="form-control" value={selectedCliente} onChange={(e) => setSelectedCliente(e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.map((c) => <option key={c.ClienteId} value={c.ClienteId}>{c.Nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Curso / Programa">
              <select className="form-control" value={selectedCurso} onChange={(e) => setSelectedCurso(e.target.value)}>
                <option value="">Seleccionar...</option>
                {cursos.map((c) => <option key={c.CursoId} value={c.CursoId}>{c.Nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Tipo de Curso">
              <input
                className="form-control"
                readOnly
                value={cursoSeleccionado?.TipoCurso || '—'}
                style={{ background: '#f3f4f6', cursor: 'default', fontWeight: cursoSeleccionado?.TipoCurso ? '600' : 'normal', color: cursoSeleccionado?.TipoCurso === 'Mandatorio' ? '#1d4ed8' : cursoSeleccionado?.TipoCurso === 'Extraordinario' ? '#7c3aed' : '#6b7280' }}
              />
            </FormField>
            <FormField label="Modalidad">
              <select className="form-control" value={selectedModalidad} onChange={(e) => setSelectedModalidad(e.target.value)}>
                <option value="">Seleccionar...</option>
                {modalidades.map((m) => <option key={m.ModalidadId} value={m.ModalidadId}>{m.Nombre}</option>)}
              </select>
            </FormField>
            {!esMandatorio && (
              <FormField label="Coach / Instructor">
                <select className="form-control" value={selectedCoach} onChange={(e) => setSelectedCoach(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {coaches.map((c) => <option key={c.CoachId} value={c.CoachId}>{c.Nombre}</option>)}
                </select>
              </FormField>
            )}
          </div>

          <div className="form-row form-row-5">
            <FormField label="Duración del curso">
              <div className="field-with-suffix">
                <input
                  className="form-control"
                  readOnly
                  value={duracionDias || '—'}
                  style={{ background: '#f3f4f6', cursor: 'default' }}
                />
                <span className="field-suffix">días</span>
              </div>
            </FormField>
            <FormField label="Participantes">
              <div className="field-with-suffix">
                <input className="form-control" type="number" min="1" value={participantesCantidad} onChange={(e) => setParticipantesCantidad(e.target.value)} />
                <span className="field-suffix">alumnos</span>
              </div>
            </FormField>
            <FormField label="Fecha de inicio">
              <input className="form-control" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </FormField>
            <FormField label="Fecha de fin">
              <input className="form-control" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Observaciones (opcional)" className="form-field-full">
            <textarea
              className="form-control"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales de la cotización..."
              rows={4}
            />
          </FormField>
        </div>
      </section>

      <div className="cotizacion-middle">
        <section className="panel card cost-panel">
          <div className="panel-header">
            <h2>2. Desglose de Costos</h2>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar concepto..."
              value={filterConceptos}
              onChange={e => setFilterConceptos(e.target.value)}
              style={{ maxWidth: '280px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {conceptosFiltrados.map(concept => {
                const isAdded = selectedConcepts.some(c => c.ConceptoCostoId === concept.ConceptoCostoId)
                const isHovered = hoveredConceptId === concept.ConceptoCostoId
                const esIndirecto = (concept.TipoCosto || '').toLowerCase().includes('indirect')

                let borderColor = '#e5e7eb'
                let bgColor = '#fff'
                let nameColor = '#111827'
                let namePrefix = ''
                if (isAdded && isHovered) {
                  borderColor = '#fca5a5'; bgColor = '#fff1f2'; nameColor = '#dc2626'; namePrefix = '× '
                } else if (isAdded) {
                  borderColor = '#86efac'; bgColor = '#f0fdf4'; nameColor = '#15803d'; namePrefix = '✓ '
                } else if (isHovered) {
                  borderColor = '#3b82f6'; bgColor = '#eff6ff'
                }

                return (
                  <button
                    key={concept.ConceptoCostoId}
                    type="button"
                    onClick={() => isAdded ? handleRemoveConcept(concept.ConceptoCostoId) : handleAddConceptCard(concept)}
                    onMouseEnter={() => setHoveredConceptId(concept.ConceptoCostoId)}
                    onMouseLeave={() => setHoveredConceptId(null)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '8px 12px', borderRadius: '8px', textAlign: 'left',
                      cursor: 'pointer', minWidth: '150px',
                      border: `1.5px solid ${borderColor}`,
                      background: bgColor,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '600', color: nameColor, marginBottom: '2px' }}>
                      {namePrefix}{concept.Nombre}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{concept.Formula || '—'}</span>
                    <span style={{
                      marginTop: '5px', fontSize: '10px', fontWeight: '600',
                      padding: '1px 6px', borderRadius: '10px',
                      background: esIndirecto ? '#fef08a' : '#dbeafe',
                      color: esIndirecto ? '#854d0e' : '#1d4ed8',
                    }}>
                      {concept.TipoCosto || 'Sin tipo'}
                    </span>
                  </button>
                )
              })}
              {conceptosFiltrados.length === 0 && (
                <span style={{ fontSize: '13px', color: '#9ca3af', padding: '8px 0' }}>Sin coincidencias.</span>
              )}
            </div>
          </div>
          <div className="table-wrap">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo de cálculo</th>
                  <th>Fórmula</th>
                  <th>Costo Unitario</th>
                  <th>Cantidades</th>
                  <th>Participantes</th>
                  <th>Total</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {costRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', color: '#6b7280' }}>
                      {editingCotizacionId
                        ? 'Esta cotización no tiene costos guardados en la base de datos. Agrega los conceptos de costo nuevamente.'
                        : 'No hay conceptos agregados a la cotización.'}
                    </td>
                  </tr>
                ) : (
                  costRows.map((row, index) => (
                    <tr key={row.key || index}>
                      <td className="cell-strong">{row.concept}</td>
                      <td>{row.calcType}</td>
                      <td>{row.formula}</td>
                      <td>{row.unitCost}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(row.key, e.target.value)}
                        />
                      </td>
                      <td>{row.participants}</td>
                      <td className="cell-strong">{row.total}</td>
                      <td>
                        <button
                          className="icon-button"
                          type="button"
                          title="Quitar concepto"
                          onClick={() => handleRemoveConcept(row.key)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="summary-column">
          <section className="card summary-card">
            <h2>3. Resumen de la Cotización</h2>
            {esMandatorio ? (
              <>
                <div className="summary-row" style={{ background: '#eff6ff', borderRadius: '6px', padding: '8px 4px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#1d4ed8' }}>Curso Mandatorio</span>
                  <strong style={{ color: '#1d4ed8' }}>{cursoSeleccionado?.Nombre || ''}</strong>
                </div>
                <div className="summary-row">
                  <span>Duración</span>
                  <strong>{duracionDias || '—'} días</strong>
                </div>
                <div className="summary-row highlight-profit">
                  <span>Costo del curso</span>
                  <strong>{formatMoney(totals.conGanancia)}</strong>
                </div>
                <div className="summary-row">
                  <span>Precio por participante</span>
                  <strong>{formatMoney(totals.porParticipante)}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="summary-row">
                  <span>Total Costos Directos</span>
                  <strong>{formatMoney(totals.directos)}</strong>
                </div>
                <div className="summary-row">
                  <span>Total Costos Indirectos</span>
                  <strong>{formatMoney(totals.indirectos)}</strong>
                </div>
                <div className="summary-row total-costos">
                  <span>Total Costos</span>
                  <strong>{formatMoney(totals.total)}</strong>
                </div>
                <div className="summary-row">
                  <span>Margen de utilidad Directos (%)</span>
                  <div className="inline-input">
                    <input className="form-control" type="number" step="0.1" min="0" value={margenPctDirectos} onChange={(e) => setMargenPctDirectos(e.target.value)} />
                    <span>%</span>
                  </div>
                </div>
                <div className="summary-row">
                  <span>Margen de utilidad Indirectos (%)</span>
                  <div className="inline-input">
                    <input className="form-control" type="number" step="0.1" min="0" value={margenPctIndirectos} onChange={(e) => setMargenPctIndirectos(e.target.value)} />
                    <span>%</span>
                  </div>
                </div>
                <div className="summary-row">
                  <span>Margen Directos</span>
                  <strong>{formatMoney(totals.margenDirectos)}</strong>
                </div>
                <div className="summary-row">
                  <span>Margen Indirectos</span>
                  <strong>{formatMoney(totals.margenIndirectos)}</strong>
                </div>
                <div className="summary-row">
                  <span>Margen total</span>
                  <strong>{formatMoney(totals.margenTotal)}</strong>
                </div>
                <div className="summary-row highlight-profit">
                  <span>Total con ganancia</span>
                  <strong>{formatMoney(totals.conGanancia)}</strong>
                </div>
                <div className="summary-row">
                  <span>Total por participante</span>
                  <strong>{formatMoney(totals.porParticipante)}</strong>
                </div>
                <div className="summary-row">
                  <span>Precio sugerido por participante</span>
                  <strong>{formatMoney(totals.sugerido)}</strong>
                </div>
              </>
            )}
            <div className="button-group">
              <button type="button" className="primary-button btn-with-icon" onClick={handleGeneratePdf}>
            
                Generar Cotización (PDF)
              </button>
              <button type="button" className="secondary-button btn-with-icon" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingCotizacionId ? 'Actualizar Cotización' : 'Guardar Cotización'}
              </button>
            </div>
          </section>

          <section className="card info-card">
            <h3>Información de la Cotización</h3>
            <div className="info-row">
              <span>Folio</span>
              <strong>{folio || 'Generando...'}</strong>
            </div>
            <div className="info-row">
              <span>Fecha de creación</span>
              <strong>{new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</strong>
            </div>
            <div className="info-row">
              <span>Creado por</span>
              <strong>{creadoPor}</strong>
            </div>
            <div className="info-row">
              <span>Estado</span>
              <strong style={{ color: editingCotizacionId ? '#2563eb' : '#b45309' }}>
                {editingCotizacionId ? 'Editando' : 'Pendiente de aprobación'}
              </strong>
            </div>
          </section>
        </div>
      </div>

      <section className="panel card participants-panel">
        <div className="panel-header space-between">
          <div>
            <h2>4. Participantes</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: displayParticipants.length > 0 && Number(participantesCantidad) > 0 && displayParticipants.length >= Number(participantesCantidad) ? '#16a34a' : '#6b7280' }}>
              {Number(participantesCantidad) > 0
                ? `${displayParticipants.length} de ${participantesCantidad} cupos ocupados`
                : `${displayParticipants.length} participante${displayParticipants.length !== 1 ? 's' : ''} seleccionado${displayParticipants.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            className="secondary-button btn-with-icon"
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setModalParticipantesOpen(true)}
          >
            <span className="btn-icon" aria-hidden>✎</span>
            Seleccionar Participantes
          </button>
        </div>


        <div className="table-wrap">
          <table className="participants-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre del Participante</th>
                <th>Empresa</th>
                <th>Factura 2</th>
                <th>Factura 3</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">No hay participantes cargados.</td>
                </tr>
              ) : (
                displayParticipants.map((p, index) => {
                  const k = p.EmpleadoId ?? p.NumeroEmpleado ?? participantName(p)
                  return (
                    <tr key={k || index}>
                      <td>{index + 1}</td>
                      <td>{participantName(p) || '-'}</td>
                      <td>{p.Empresa || '-'}</td>
                      <td>{p.Factura2 || '-'}</td>
                      <td>{p.Factura3 || '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          title="Quitar participante"
                          onClick={() => quitarParticipante(k)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal para agregar participantes */}
        {modalParticipantesOpen && (() => {
          const limite = Number(participantesCantidad) || null
          const alLimite = limite !== null && participantesSeleccionados.length >= limite
          return (
            <div className="modal-overlay" onClick={() => setModalParticipantesOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                <div className="modal-header">
                  <div>
                    <h2 style={{ marginBottom: '4px' }}>Agregar Participantes</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: alLimite ? '#dc2626' : '#6b7280' }}>
                        {participantesSeleccionados.length}{limite ? `/${limite}` : ''} participante{participantesSeleccionados.length !== 1 ? 's' : ''} seleccionado{participantesSeleccionados.length !== 1 ? 's' : ''}
                      </span>
                      {limite && (
                        <div style={{ flex: 1, maxWidth: '120px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (participantesSeleccionados.length / limite) * 100)}%`,
                            background: alLimite ? '#dc2626' : '#2563eb',
                            borderRadius: '3px',
                            transition: 'width 0.2s',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setModalParticipantesOpen(false)}>✕</button>
                </div>

                <div className="modal-body">
                  {alLimite && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#991b1b' }}>
                      Cupo completo: ya tienes {limite} participante{limite !== 1 ? 's' : ''} seleccionado{limite !== 1 ? 's' : ''}. Quita alguno para agregar otro.
                    </div>
                  )}

                  {!alLimite && (
                    <div className="form-field form-field-full" style={{ marginBottom: '12px' }}>
                      <span className="form-field-label">Buscar por nombre o número de empleado</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Escriba al menos 2 caracteres..."
                        value={searchParticipantesInput}
                        onChange={(e) => setSearchParticipantesInput(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}

                  {!alLimite && searchParticipantesInput.length >= 2 && (
                    <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                      {participantesDisponibles.length === 0 ? (
                        <p style={{ color: '#6b7280', margin: '8px 0', fontSize: '13px' }}>No se encontraron colaboradores.</p>
                      ) : (
                        <>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                            {participantesDisponibles.length} resultado(s):
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {participantesDisponibles.map((participante) => {
                              const pKey = participante.EmpleadoId ?? participante.NumeroEmpleado ?? participantName(participante)
                        const isSelected = participantesSeleccionados.some((p) => (p.EmpleadoId ?? p.NumeroEmpleado ?? participantName(p)) === pKey)
                              return (
                                <div
                                  key={pKey}
                                  style={{
                                    padding: '9px 12px',
                                    border: `1px solid ${isSelected ? '#86efac' : '#e5e7eb'}`,
                                    borderRadius: '6px',
                                    backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                                    cursor: isSelected ? 'default' : 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                  onClick={() => !isSelected && agregarParticipante(participante)}
                                >
                                  <div>
                                    <div style={{ fontWeight: '500', fontSize: '13px' }}>{participantName(participante)}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                      {participante.Empresa && `${participante.Empresa}`}
                                      {participante.NumeroEmpleado && ` • Emp: ${participante.NumeroEmpleado}`}
                                    </div>
                                  </div>
                                  {isSelected
                                    ? <span style={{ fontSize: '12px', color: '#16a34a', whiteSpace: 'nowrap' }}>✓ Agregado</span>
                                    : <span style={{ fontSize: '12px', color: '#2563eb', whiteSpace: 'nowrap' }}>+ Agregar</span>
                                  }
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!alLimite && searchParticipantesInput.length < 2 && (
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: '8px 0 12px' }}>
                      Escribe al menos 2 caracteres para buscar.
                    </p>
                  )}

                  {participantesSeleccionados.length > 0 && (
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                        Participantes seleccionados:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                        {participantesSeleccionados.map((p, index) => {
                          const k = p.EmpleadoId ?? p.NumeroEmpleado ?? participantName(p)
                          return (
                            <div
                              key={k}
                              style={{
                                padding: '7px 12px',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '13px',
                              }}
                            >
                              <span><strong style={{ color: '#6b7280', marginRight: '6px' }}>{index + 1}.</strong>{participantName(p)}</span>
                              <button type="button" className="icon-button" onClick={() => quitarParticipante(k)} title="Quitar">✕</button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="primary-button" onClick={() => setModalParticipantesOpen(false)}>
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </section>
    </div>
  )
}
