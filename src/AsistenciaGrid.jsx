import { useState, useEffect, useCallback, useRef } from 'react'
import { getGeneraciones, getAsistenciaGrid, guardarAsistencia, getCriterios, updateCriterios } from './api'
import * as XLSX from 'xlsx'

const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

const TIPO_DEFAULT = {
  A:  { bg: '#dcfce7', color: '#16a34a' },
  MD: { bg: '#fef3c7', color: '#d97706' },
  D:  { bg: '#f3f4f6', color: '#6b7280' },
  F:  { bg: '#fee2e2', color: '#dc2626' },
  I:  { bg: '#e0f2fe', color: '#0891b2' },
  P:  { bg: '#ede9fe', color: '#7c3aed' },
  B:  { bg: '#fef2e8', color: '#78350f' },
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function computeStats(dias) {
  let totalHoras = 0
  const cnts = { A: 0, MD: 0, F: 0, I: 0, P: 0, B: 0 }
  for (const cell of Object.values(dias)) {
    if (!cell || cell.tipo === 'D') continue
    totalHoras += cell.horas || 0
    if (cell.tipo in cnts) cnts[cell.tipo]++
  }
  return { totalHoras, ...cnts }
}

// ─── Modal de criterios ────────────────────────────────────────────────────────
function ModalCriterios({ criterios, onSave, onClose }) {
  const [form, setForm] = useState(criterios.map(c => ({ ...c })))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try { await onSave(form); onClose() }
    catch (e) { alert('Error al guardar: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>Criterios de asistencia</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
          Define cuántas horas vale cada tipo de registro.
        </p>

        {form.map((c, i) => (
          <div key={c.Tipo} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 800,
              background: hexToRgba(c.Color, 0.15), color: c.Color, width: '100%',
            }}>{c.Tipo}</span>
            <input
              className="form-control"
              value={c.Label}
              onChange={e => setForm(f => f.map((x, j) => j !== i ? x : { ...x, Label: e.target.value }))}
              placeholder="Etiqueta"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number" min="0" max="24" step="0.5"
                className="form-control"
                value={c.Horas}
                onChange={e => setForm(f => f.map((x, j) => j !== i ? x : { ...x, Horas: e.target.value }))}
                style={{ width: '64px' }}
              />
              <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>hrs</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
          <strong>D</strong> (domingo) y <strong>MD</strong> (sábado) se asignan automáticamente. Las horas de D no cuentan en el total.
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="ghost-button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="primary-button" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar criterios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Selector de tipo en celda ─────────────────────────────────────────────────
function CellPicker({ tipos, onSelect, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 500, background: '#fff',
      border: '1px solid #e5e7eb', borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,.15)',
      padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px',
      minWidth: '140px', top: '100%', left: '50%', transform: 'translateX(-50%)',
    }}>
      {tipos.map(t => (
        <button key={t.Tipo} onClick={() => onSelect(t.Tipo)} style={{
          padding: '7px 4px', borderRadius: '6px', border: 'none', cursor: 'pointer',
          fontWeight: 800, fontSize: '12px',
          background: hexToRgba(t.Color, 0.15), color: t.Color,
        }}>{t.Tipo}</button>
      ))}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AsistenciaGrid() {
  const [generaciones, setGeneraciones] = useState([])
  const [genId, setGenId]               = useState('')
  const [gridData, setGridData]         = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [criterios, setCriterios]       = useState([])
  const [showCriterios, setShowCriterios] = useState(false)
  const [activeCell, setActiveCell]     = useState(null)
  const [saving, setSaving]             = useState({})

  useEffect(() => {
    getGeneraciones()
      .then(list => { setGeneraciones(list); if (list.length) setGenId(String(list[0].GeneracionId)) })
      .catch(e => setError(e.message))
    getCriterios().then(setCriterios).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    if (!genId) return
    setLoading(true); setError(''); setGridData(null); setActiveCell(null)
    try {
      const raw = await getAsistenciaGrid(genId)
      raw.alumnos = raw.alumnos.map(a => ({ ...a, ...computeStats(a.dias) }))
      setGridData(raw)
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [genId])

  useEffect(() => { cargar() }, [cargar])

  const tipoStyle = {}
  for (const c of criterios) {
    tipoStyle[c.Tipo] = { bg: hexToRgba(c.Color, 0.15), color: c.Color, label: c.Label }
  }
  for (const [k, v] of Object.entries(TIPO_DEFAULT)) {
    if (!tipoStyle[k]) tipoStyle[k] = { bg: v.bg, color: v.color, label: k }
  }

  async function handleCellChange(alumnoIdx, fecha, tipo) {
    setActiveCell(null)
    const alumno = gridData.alumnos[alumnoIdx]
    const horasCrit = criterios.find(c => c.Tipo === tipo)?.Horas ?? 0

    setGridData(prev => {
      const alumnos = prev.alumnos.map((a, i) => {
        if (i !== alumnoIdx) return a
        const newDias = { ...a.dias, [fecha]: { tipo, horas: Number(horasCrit), esManual: true } }
        return { ...a, dias: newDias, ...computeStats(newDias) }
      })
      return { ...prev, alumnos }
    })

    const key = `${alumnoIdx}_${fecha}`
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await guardarAsistencia({ operadorId: alumno.OperadorId, generacionId: genId, matricula: alumno.Matricula, fecha, tipo })
    } catch (e) {
      alert('Error al guardar: ' + e.message)
      cargar()
    } finally {
      setSaving(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  async function handleSaveCriterios(nuevos) {
    await updateCriterios(nuevos)
    setCriterios(nuevos)
    cargar()
  }

  function exportarExcel() {
    if (!gridData) return
    const { generacion, fechas, alumnos } = gridData
    const wb = XLSX.utils.book_new()

    const header = ['#', 'Matrícula', 'Nombre', ...fechas.map(f => {
      const d = new Date(f + 'T12:00:00')
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${DIAS_SEMANA[d.getDay()]}`
    }), 'Total hrs', 'A', 'MD', 'F', 'I', 'P', 'B']

    const rows = alumnos.map((a, i) => [
      i + 1, a.Matricula, a.Nombre,
      ...fechas.map(f => a.dias[f]?.tipo || ''),
      a.totalHoras, a.A, a.MD, a.F, a.I, a.P, a.B,
    ])

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = [{ wch: 4 }, { wch: 18 }, { wch: 34 }, ...fechas.map(() => ({ wch: 7 })),
      { wch: 9 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
    XLSX.writeFile(wb, `Grid_${generacion}_${new Date().toISOString().substring(0,10)}.xlsx`)
  }

  if (!gridData && !loading && !error) {
    return <p style={{ color: '#94a3b8', padding: '32px', textAlign: 'center' }}>Selecciona una generación para ver el registro.</p>
  }

  const { fechas = [], alumnos = [] } = gridData || {}

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <select className="form-control" style={{ maxWidth: '280px' }} value={genId} onChange={e => setGenId(e.target.value)}>
          {generaciones.map(g => <option key={g.GeneracionId} value={g.GeneracionId}>{g.Nombre}</option>)}
        </select>
        <button className="ghost-button" onClick={cargar} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
        {gridData && <button className="ghost-button" onClick={exportarExcel}>Exportar Excel</button>}
        <button className="ghost-button" onClick={() => setShowCriterios(true)} style={{ marginLeft: 'auto' }}>Criterios</button>
      </div>

      {error && <div className="notification error" style={{ marginBottom: '12px' }}>{error}</div>}

      {/* ── Leyenda de tipos ── */}
      {criterios.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {criterios.map(c => (
            <span key={c.Tipo} style={{
              padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              background: hexToRgba(c.Color, 0.15), color: c.Color, border: `1px solid ${hexToRgba(c.Color, 0.3)}`,
            }}>
              {c.Tipo} = {c.Label} ({c.Horas}h)
            </span>
          ))}
        </div>
      )}

      {loading && <p style={{ color: '#94a3b8', fontSize: '14px' }}>Cargando registros…</p>}

      {/* ── Grid ── */}
      {gridData && !loading && (
        <>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            {gridData.generacion} · Desde {new Date(gridData.fechaInicio + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} · {fechas.length} días · {alumnos.length} alumnos
            <span style={{ marginLeft: '12px' }}>— Haz clic en cualquier celda para editar</span>
          </p>

          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap', minWidth: '100%' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thFixed(0)}>#</th>
                  <th style={thFixed(32)}>Matrícula</th>
                  <th style={thFixed(142)}>Nombre</th>
                  {fechas.map(f => {
                    const d = new Date(f + 'T12:00:00')
                    const esDom = d.getDay() === 0
                    const esSab = d.getDay() === 6
                    return (
                      <th key={f} style={{
                        ...thDate,
                        background: esDom ? '#f1f5f9' : esSab ? '#fefce8' : '#fff',
                        color: esDom ? '#94a3b8' : esSab ? '#92400e' : '#374151',
                        borderLeft: '1px solid #f1f5f9',
                      }}>
                        <div style={{ fontWeight: 700 }}>{d.getDate()}</div>
                        <div style={{ fontSize: '10px', fontWeight: 400 }}>{DIAS_SEMANA[d.getDay()]}</div>
                      </th>
                    )
                  })}
                  <th style={thTotals}>Total hrs</th>
                  <th style={{ ...thTotals, color: '#16a34a' }}>A</th>
                  <th style={{ ...thTotals, color: '#d97706' }}>MD</th>
                  <th style={{ ...thTotals, color: '#dc2626' }}>F</th>
                  <th style={{ ...thTotals, color: '#0891b2' }}>I</th>
                  <th style={{ ...thTotals, color: '#7c3aed' }}>P</th>
                  <th style={{ ...thTotals, color: '#78350f' }}>B</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((alumno, ai) => (
                  <tr key={alumno.OperadorId} style={{ borderTop: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={tdFixed(0, '#fff')}>{ai + 1}</td>
                    <td style={{ ...tdFixed(32, '#fff'), fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{alumno.Matricula}</td>
                    <td style={{ ...tdFixed(142, '#fff'), maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alumno.Nombre}</td>
                    {fechas.map(f => {
                      const cell = alumno.dias[f]
                      const tipo = cell?.tipo || 'F'
                      const st = tipoStyle[tipo] || TIPO_DEFAULT[tipo] || {}
                      const isSaving = saving[`${ai}_${f}`]
                      const isActive = activeCell?.alumnoIdx === ai && activeCell?.fecha === f
                      const esDom = new Date(f + 'T12:00:00').getDay() === 0
                      const esSab = new Date(f + 'T12:00:00').getDay() === 6
                      return (
                        <td key={f} style={{
                          padding: '3px 2px', textAlign: 'center', position: 'relative',
                          background: esDom ? '#f8fafc' : esSab ? '#fefce8' : undefined,
                          borderLeft: '1px solid #f8fafc',
                        }}>
                          <button
                            onClick={() => setActiveCell(isActive ? null : { alumnoIdx: ai, fecha: f })}
                            style={{
                              width: '100%', minWidth: '28px', padding: '4px 3px',
                              borderRadius: '5px', border: isActive ? `2px solid ${st.color}` : '2px solid transparent',
                              background: isSaving ? '#f1f5f9' : st.bg,
                              color: isSaving ? '#94a3b8' : st.color,
                              fontWeight: 800, fontSize: '11px', cursor: 'pointer',
                              opacity: isSaving ? 0.6 : 1,
                            }}
                          >{isSaving ? '…' : tipo}</button>
                          {isActive && (
                            <CellPicker
                              tipos={criterios}
                              onSelect={t => handleCellChange(ai, f, t)}
                              onClose={() => setActiveCell(null)}
                            />
                          )}
                        </td>
                      )
                    })}
                    <td style={tdTotal}>{alumno.totalHoras}</td>
                    <td style={{ ...tdTotal, color: '#16a34a', fontWeight: 700 }}>{alumno.A ?? 0}</td>
                    <td style={{ ...tdTotal, color: '#d97706', fontWeight: 700 }}>{alumno.MD ?? 0}</td>
                    <td style={{ ...tdTotal, color: '#dc2626', fontWeight: 700 }}>{alumno.F ?? 0}</td>
                    <td style={{ ...tdTotal, color: '#0891b2', fontWeight: 700 }}>{alumno.I ?? 0}</td>
                    <td style={{ ...tdTotal, color: '#7c3aed', fontWeight: 700 }}>{alumno.P ?? 0}</td>
                    <td style={{ ...tdTotal, color: '#78350f', fontWeight: 700 }}>{alumno.B ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCriterios && criterios.length > 0 && (
        <ModalCriterios
          criterios={criterios}
          onSave={handleSaveCriterios}
          onClose={() => setShowCriterios(false)}
        />
      )}
    </div>
  )
}

// ─── Estilos de celdas ────────────────────────────────────────────────────────
const thFixed = (left) => ({
  position: 'sticky', left, zIndex: 2, background: '#f8fafc',
  padding: '8px 6px', textAlign: 'left', fontWeight: 600, color: '#64748b',
  fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '2px solid #e5e7eb',
  borderRight: '1px solid #e5e7eb',
})
const thDate = {
  padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#374151',
  fontSize: '11px', borderBottom: '2px solid #e5e7eb', minWidth: '34px',
}
const thTotals = {
  padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#374151',
  fontSize: '11px', borderBottom: '2px solid #e5e7eb', borderLeft: '2px solid #e5e7eb',
  background: '#f8fafc',
}
const tdFixed = (left, bg) => ({
  position: 'sticky', left, zIndex: 1, background: bg,
  padding: '6px 6px', color: '#374151', fontSize: '12px',
  borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap',
})
const tdTotal = {
  padding: '6px 8px', textAlign: 'center', color: '#374151', fontSize: '12px',
  borderLeft: '2px solid #e5e7eb', background: '#f8fafc', fontVariantNumeric: 'tabular-nums',
}
