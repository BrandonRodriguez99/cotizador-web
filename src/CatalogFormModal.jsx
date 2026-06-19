import { useEffect, useState } from 'react'
import { emptyFormForCatalog } from './catalogConfig'

export default function CatalogFormModal({
  open,
  catalogKey,
  definition,
  initialData,
  mode = 'create',
  onClose,
  onSubmit,
  saving,
  error,
}) {
  const [form, setForm] = useState({})

  useEffect(() => {
    if (!open || !catalogKey) return

    if (mode === 'edit' && initialData) {
      setForm({ ...initialData })
      return
    }

    setForm(emptyFormForCatalog(catalogKey))
  }, [open, catalogKey, mode, initialData])

  if (!open || !definition) return null

  function getDefaultFormula(tipo) {
    switch (tipo) {
      case 'Por sesión':
        return 'Sesiones x Días'
      case 'Por participante':
        return 'Participantes'
      case 'Por evento':
        return 'Eventos'
      case 'Por hora':
        return 'Horas'
      case 'Por día':
        return 'Días'
      default:
        return ''
    }
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => {
      const nextForm = { ...prev, [name]: value }
      if (name === 'TipoCalculo' && (!prev.Formula || !prev.Formula.trim())) {
        nextForm.Formula = getDefaultFormula(value)
      }
      return nextForm
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    // Solo enviar los campos definidos en definition.fields (no campos internos del DB)
    const allowedFields = definition?.fields?.map((f) => f.name) || []
    const safeForm = {}

    for (const fieldName of allowedFields) {
      const v = form[fieldName]
      if (v === undefined || v === null) {
        safeForm[fieldName] = v ?? null
        continue
      }
      if (typeof v === 'object') {
        try { JSON.stringify(v); safeForm[fieldName] = v }
        catch { safeForm[fieldName] = String(v) }
      } else {
        safeForm[fieldName] = v
      }
    }

    // Coerce numeric fields
    definition?.fields?.forEach((f) => {
      if (f.type === 'number' && safeForm[f.name] !== undefined && safeForm[f.name] !== '' && safeForm[f.name] !== null) {
        const n = Number(safeForm[f.name])
        safeForm[f.name] = Number.isFinite(n) ? n : safeForm[f.name]
      }
    })

    onSubmit(safeForm)
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="catalog-form-title">{mode === 'edit' ? 'Editar registro' : 'Nuevo registro'} — {definition.title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {definition.fields.map((field) => (
            <div key={field.name} className="form-field">
              <span className="form-field-label">
                {field.label}
                {field.required && <span className="required-mark"> *</span>}
              </span>
              {field.type === 'select' && field.options ? (
                <select
                  className="form-control"
                  name={field.name}
                  value={form[field.name] ?? ''}
                  onChange={handleChange}
                  required={field.required}
                >
                  <option value="">{field.placeholder || 'Seleccionar...'}</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-control"
                  type={field.type || 'text'}
                  name={field.name}
                  placeholder={field.placeholder || ''}
                  value={form[field.name] ?? ''}
                  onChange={handleChange}
                  required={field.required}
                  step={field.step}
                  min={field.type === 'number' ? 0 : undefined}
                />
              )}
            </div>
          ))}

          {error && <div className="notification error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
