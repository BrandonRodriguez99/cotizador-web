import { useEffect, useMemo, useRef, useState } from 'react'
import {
  downloadOrdenCompraPdf, downloadSolicitudFondosPdf,
  getFacturaOrden, saveFacturaOrden,
  uploadFacturaArchivo, downloadFacturaArchivo,
  getSolicitudFondos, createSolicitudFondos, approveSolicitudFondos, getSolicitudesFondosPendientes,
  getEvaluacionProveedor, saveEvaluacionProveedor,
  deleteOrdenCompra,
} from './api'

function formatMoney(value) {
  return `$ ${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getOrderStatus(order) {
  if (order.rechazo?.rechazado || order.Rechazado) return 'Rechazada'
  const approvals = order.aprobaciones || order.Aprobaciones || []
  if (!approvals.length) return 'Pendiente'
  if (approvals.every((a) => a.aprobado || a.Aprobado)) return 'Aprobada'
  return 'En proceso'
}

function normalizeApproval(a) {
  return {
    step:      a.step      ?? a.Paso,
    label:     a.label     ?? a.Etiqueta,
    aprobado:  Boolean(a.aprobado ?? a.Aprobado),
    aprobadoPor: a.aprobadoPor ?? a.AprobadoPor,
  }
}

function StatusBadge({ status }) {
  const styles = {
    Aprobada:   { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' },
    Rechazada:  { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
    'En proceso':{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    Pendiente:  { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  }
  const s = styles[status] || styles.Pendiente
  return (
    <span style={{ ...s, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

const APPROVER_OPTIONS = ['Administración', 'Secretaría Académica']
const ROLE_TO_APPROVER = { autorizador1: 'Administración', autorizador2: 'Secretaría Académica' }

// ── Criterios de evaluación ────────────────────────────────────────────────────
const EVAL_CRITERIOS = {
  compras: [
    { key: 'calidad', label: 'Calidad del producto', max: 60, items: [
      'Cumplió con las especificaciones técnicas y de funcionalidad requeridas de acuerdo al requerimiento',
      'Los productos entregados estaban en buenas condiciones físicas y su apariencia satisface las expectativas',
    ]},
    { key: 'tiempos', label: 'Cumplimiento en los tiempos de entrega', max: 20, items: [
      'La entrega se realizó en los tiempos pactados',
    ]},
    { key: 'cantidad', label: 'Cumplimiento en cantidad', max: 10, items: [
      'Cumplió con la entrega total de las cantidades solicitadas en los tiempos dados',
    ]},
    { key: 'posventa', label: 'Servicio posventa', max: 10, items: [
      'Dio respuesta a los requerimientos o reclamos realizados',
      'Es oportuna la respuesta a los requerimientos realizados',
      'Las garantías del producto fueron atendidas satisfactoriamente',
    ]},
  ],
  servicios: [
    { key: 'calidad', label: 'Calidad del servicio', max: 60, items: [
      'Logística: contó con la logística necesaria en cuanto transporte, equipos y herramientas menores para cumplir con el objeto del contrato',
      'Durante la ejecución del servicio contó con personal técnico calificado para cumplir las actividades propias del servicio',
      'El servicio se prestó de acuerdo a lo pactado con el contratista o proveedor del servicio',
      'Equipos y herramientas: se contó con los equipos y herramientas adecuados para las tareas propias de la ejecución del servicio',
    ]},
    { key: 'tiempos', label: 'Cumplimiento en los tiempos de entrega', max: 10, items: [
      'Cumplió con los tiempos de entrega pactados para la prestación del servicio',
    ]},
    { key: 'cantidad', label: 'Cumplimiento en cantidad', max: 10, items: [
      'Cumplimiento con la entrega de las cantidades solicitadas',
    ]},
    { key: 'posventa', label: 'Servicio durante y posventa', max: 20, items: [
      'Dio respuesta a los requerimientos o reclamos realizados',
      'La respuesta dada a los requerimientos realizados fue oportuna',
    ]},
  ],
}

// ── Modal base ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 600 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>{title}</h3>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Modal: Factura ─────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png']
const ALLOWED_EXT   = ['.pdf', '.xml', '.jpg', '.jpeg', '.png']

function fileIcon(nombre) {
  const ext = (nombre || '').toLowerCase()
  if (ext.endsWith('.pdf'))  return '📄'
  if (ext.endsWith('.xml'))  return '🗂️'
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png')) return '🖼️'
  return '📎'
}

function FacturaModal({ orden, onClose, onSuccess }) {
  const [loading, setLoading]   = useState(true)
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({
    fechaFactura: new Date().toISOString().slice(0, 10),
    monto: orden.Total || '', observaciones: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)   // { name, base64, size }
  const [uploadingFile, setUploadingFile] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [fileError, setFileError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    getFacturaOrden(orden.OrdenCompraId)
      .then(r => {
        if (r) {
          setExisting(r)
          setForm({
            fechaFactura: String(r.FechaFactura || '').slice(0, 10),
            monto: r.Monto || '',
            observaciones: r.Observaciones || '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orden.OrdenCompraId])

  function handleFileChange(e) {
    setFileError(null)
    setSelectedFile(null)
    const file = e.target.files?.[0]
    if (!file) return

    const extOk = ALLOWED_EXT.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!extOk) {
      setFileError('Formato no permitido. Usa PDF, XML, JPG o PNG.')
      e.target.value = ''
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setFileError('El archivo supera el límite de 20 MB.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => setSelectedFile({ name: file.name, base64: reader.result, size: file.size })
    reader.readAsDataURL(file)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)

    try {
      setSaving(true)
      await saveFacturaOrden(orden.OrdenCompraId, form)

      if (selectedFile) {
        setUploadingFile(true)
        await uploadFacturaArchivo(orden.OrdenCompraId, selectedFile.base64, selectedFile.name)
        setUploadingFile(false)
      }

      onSuccess(
        selectedFile
          ? `Factura y archivo "${selectedFile.name}" guardados correctamente.`
          : 'Factura guardada correctamente.'
      )
    } catch (err) {
      setUploadingFile(false)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload() {
    setFileError(null)
    try {
      await downloadFacturaArchivo(orden.OrdenCompraId, existing?.ArchivoNombre)
    } catch (err) {
      setFileError(err.message)
    }
  }

  if (loading) return (
    <Modal title="Registrar Factura" onClose={onClose}>
      <p style={{ color: '#9ca3af', textAlign: 'center' }}>Cargando...</p>
    </Modal>
  )

  const savingLabel = uploadingFile ? 'Subiendo archivo...' : saving ? 'Guardando...' : existing ? 'Actualizar factura' : 'Guardar factura'

  return (
    <Modal title={`Factura — ${orden.Folio}`} onClose={onClose} width={560}>
      {existing && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#1d4ed8' }}>
          Factura ya registrada. Puedes actualizar los datos o reemplazar el archivo.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Datos de la factura */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Número de factura</label>
            <div style={{
              padding: '8px 12px', borderRadius: '8px', background: '#f3f4f6',
              border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 700,
              color: existing?.NumeroFactura ? '#1d4ed8' : '#9ca3af', letterSpacing: '0.04em',
            }}>
              {existing?.NumeroFactura || 'Se asignará automáticamente'}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Fecha de factura *</label>
            <input className="form-control" type="date" value={form.fechaFactura}
              onChange={e => setForm(f => ({ ...f, fechaFactura: e.target.value }))} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Monto facturado</label>
          <input className="form-control" type="number" min="0" step="0.01" value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Observaciones</label>
          <textarea className="form-control" rows={2} value={form.observaciones}
            onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            placeholder="Notas sobre la factura" />
        </div>

        {/* ── Archivo adjunto ── */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
            Archivo de factura <span style={{ color: '#9ca3af', fontWeight: 400 }}>(PDF, XML, JPG, PNG · máx. 20 MB)</span>
          </label>

          {/* Archivo actual en BD */}
          {existing?.ArchivoNombre && !selectedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '10px',
            }}>
              <span style={{ fontSize: '20px' }}>{fileIcon(existing.ArchivoNombre)}</span>
              <span style={{ flex: 1, fontSize: '13px', color: '#15803d', fontWeight: 500, wordBreak: 'break-all' }}>
                {existing.ArchivoNombre}
              </span>
              <button type="button" onClick={handleDownload}
                style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '8px', background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Descargar
              </button>
            </div>
          )}

          {/* Archivo recién seleccionado */}
          {selectedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '10px',
            }}>
              <span style={{ fontSize: '20px' }}>{fileIcon(selectedFile.name)}</span>
              <span style={{ flex: 1, fontSize: '13px', color: '#1d4ed8', fontWeight: 500, wordBreak: 'break-all' }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                {(selectedFile.size / 1024).toFixed(0)} KB
              </span>
              <button type="button" onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px', lineHeight: 1 }}>
                ×
              </button>
            </div>
          )}

          {/* Input de archivo */}
          <div style={{ position: 'relative' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xml,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="factura-file-input"
            />
            <label htmlFor="factura-file-input" style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              padding: '10px 16px', border: '1.5px dashed #d1d5db', borderRadius: '10px',
              background: '#fafafa', fontSize: '13px', color: '#6b7280', transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}
            >
              <span style={{ fontSize: '18px' }}>📎</span>
              {existing?.ArchivoNombre
                ? 'Seleccionar nuevo archivo para reemplazar'
                : 'Seleccionar archivo de factura'}
            </label>
          </div>

          {fileError && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#b91c1c' }}>{fileError}</p>
          )}
        </div>

        {error && <div className="notification error">{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving || uploadingFile}>
            {savingLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Helpers: monto en letras (español) ────────────────────────────────────────
function _numWords(n) {
  if (n === 0) return 'CERO'
  const ONES = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
                'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE']
  const TWENTIES = ['VEINTE','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO',
                    'VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE']
  const TENS = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA']
  const HUND = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
                'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS']
  function b100(n) {
    if (n < 20) return ONES[n]
    if (n < 30) return TWENTIES[n - 20]
    const u = n % 10
    return u === 0 ? TENS[Math.floor(n/10)] : `${TENS[Math.floor(n/10)]} Y ${ONES[u]}`
  }
  function b1000(n) {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'
    if (n < 100) return b100(n)
    const h = Math.floor(n/100), rest = n % 100
    return rest === 0 ? HUND[h] : `${HUND[h]} ${b100(rest)}`
  }
  let res = '', r = n
  if (r >= 1000000) {
    const m = Math.floor(r/1000000)
    res += m === 1 ? 'UN MILLÓN' : `${b1000(m)} MILLONES`
    r %= 1000000; if (r > 0) res += ' '
  }
  if (r >= 1000) {
    const t = Math.floor(r/1000)
    res += t === 1 ? 'MIL' : `${b1000(t)} MIL`
    r %= 1000; if (r > 0) res += ' '
  }
  if (r > 0) res += b1000(r)
  return res.trim()
}
function montoEnLetras(monto) {
  const num = Number(monto)
  if (!monto && monto !== 0 || isNaN(num)) return ''
  const [intStr, decStr = '00'] = num.toFixed(2).split('.')
  return `${_numWords(parseInt(intStr, 10))} PESOS ${decStr}/100 M.N.`
}

// ── Componentes de UI comunes ─────────────────────────────────────────────────
function SFLabel({ children }) {
  return <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{children}</label>
}
function SFReadonly({ value, wide }) {
  return (
    <div style={{ padding:'7px 10px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'7px',
                  fontSize:'13px', fontWeight:600, color:'#111827', minHeight:'34px',
                  gridColumn: wide ? 'span 2' : undefined }}>
      {value || <span style={{ color:'#d1d5db' }}>—</span>}
    </div>
  )
}
function SFInput({ value, onChange, placeholder, type='text', ...rest }) {
  return <input className="form-control" type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ fontSize:'13px' }} {...rest} />
}
function SFCheckbox({ label, checked, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px', fontWeight: checked ? 700 : 400, color: checked ? '#1d4ed8' : '#374151' }}>
      <span style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:'16px', height:'16px', border:`2px solid ${checked ? '#2563eb' : '#9ca3af'}`,
        borderRadius:'3px', background: checked ? '#2563eb' : 'white', flexShrink:0, fontSize:'10px', color:'white'
      }}>{checked ? '✓' : ''}</span>
      {label}
    </label>
  )
}

// ── Modal: Solicitud de Fondos ─────────────────────────────────────────────────
function SolicitudFondosModal({ orden, onClose, onSuccess, currentUserRol, readOnly: sfReadOnly = false }) {
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({
    terminal: '', fechaPago: new Date().toISOString().slice(0, 10),
    formaPago: 'TRANSFERENCIA', moneda: 'MN', entregarA: 'BENEFICIARIO',
    nombreBanco: '', ciudad: '', estadoBanco: '', pais: 'México',
    numSucursal: '', nombreSucursal: '', swift: '', numCuenta: '', claveInterbancaria: '', aea: '',
    monto: '', concepto: '',
  })
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState(null)

  const aprobacion1 = orden.Aprobaciones?.find(a => a.step === 1)
  const aprobacion2 = orden.Aprobaciones?.find(a => a.step === 2)

  function applyExistingSF(sf, defaultMonto, defaultConcepto) {
    setExisting(sf)
    setForm({
      terminal: sf.Terminal || '',
      fechaPago: String(sf.FechaPago || new Date().toISOString()).slice(0, 10),
      formaPago: sf.FormaPago || 'TRANSFERENCIA',
      moneda: sf.Moneda || 'MN',
      entregarA: sf.EntregarA || 'BENEFICIARIO',
      nombreBanco: sf.NombreBanco || '',
      ciudad: sf.Ciudad || '',
      estadoBanco: sf.EstadoBanco || '',
      pais: sf.Pais || 'México',
      numSucursal: sf.NumSucursal || '',
      nombreSucursal: sf.NombreSucursal || '',
      swift: sf.Swift || '',
      numCuenta: sf.NumCuenta || '',
      claveInterbancaria: sf.ClaveInterbancaria || '',
      aea: sf.AEA || '',
      monto: sf.Monto || defaultMonto,
      concepto: sf.Concepto || defaultConcepto,
    })
  }

  useEffect(() => {
    Promise.all([
      getSolicitudFondos(orden.OrdenCompraId).catch(() => null),
      getFacturaOrden(orden.OrdenCompraId).catch(() => null),
    ]).then(([sf, fac]) => {
      const defaultMonto = fac?.Monto || orden.Total || ''
      const defaultConcepto = orden.Observaciones || `Orden ${orden.Folio} — ${orden.Proveedor}`
      if (sf) applyExistingSF(sf, defaultMonto, defaultConcepto)
      else setForm(f => ({ ...f, monto: defaultMonto, concepto: defaultConcepto }))
    }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden.OrdenCompraId])

  async function handleApprove(paso) {
    setError(null)
    try {
      setApproving(true)
      await approveSolicitudFondos(orden.OrdenCompraId, paso)
      const sf = await getSolicitudFondos(orden.OrdenCompraId)
      if (sf) setExisting(sf)
    } catch (err) { setError(err.message) }
    finally { setApproving(false) }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      setSaving(true)
      const result = await createSolicitudFondos(orden.OrdenCompraId, form)
      onSuccess(`Solicitud de fondos ${result.folio || existing?.Folio || ''} guardada correctamente.`)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <Modal title="Solicitud de Fondos" onClose={onClose} width={720}>
      <p style={{ color:'#9ca3af', textAlign:'center' }}>Cargando...</p>
    </Modal>
  )

  const fechaObj = form.fechaPago ? new Date(form.fechaPago + 'T12:00:00') : new Date()
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const fechaLarga = `${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]} de ${fechaObj.getFullYear()}`

  const sectionStyle = { border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'12px' }
  const gridStyle    = { display:'grid', gap:'10px' }

  return (
    <Modal title={`Solicitud de Fondos — ${orden.Folio}${sfReadOnly ? ' (solo lectura)' : ''}`} onClose={onClose} width={720}>
      {sfReadOnly && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'10px 16px', marginBottom:'4px', fontSize:'12px', color:'#92400e', display:'flex', alignItems:'center', gap:'8px' }}>
          <span>🔒</span><span>Modo visualización — solo los datos registrados son visibles, no puedes editar.</span>
        </div>
      )}
      <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      <fieldset disabled={sfReadOnly} style={{ border:'none', padding:0, margin:0, minWidth:0 }}>

        {/* Folio banner */}
        {existing?.Folio && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'10px 16px' }}>
            <span style={{ fontSize:'13px', color:'#1e40af' }}>Solicitud ya registrada — puedes actualizar los datos de pago</span>
            <span style={{ fontWeight:800, fontSize:'15px', color:'#1d4ed8', letterSpacing:'0.05em' }}>{existing.Folio}</span>
          </div>
        )}

        {/* ── SECCIÓN 1: Datos generales ── */}
        <div style={sectionStyle}>
          <p style={{ margin:0, fontWeight:700, fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Datos generales</p>
          <div style={{ ...gridStyle, gridTemplateColumns:'1fr 1fr' }}>
            <div>
              <SFLabel>Unidad de Negocio</SFLabel>
              <SFReadonly value={orden.UnidadNegocio} />
            </div>
            <div>
              <SFLabel>Terminal</SFLabel>
              <SFInput value={form.terminal} onChange={set('terminal')} placeholder="Ej. Escobedo" />
            </div>
          </div>

          <div style={{ ...gridStyle, gridTemplateColumns:'1fr 1fr' }}>
            <div>
              <SFLabel>Fecha de solicitud</SFLabel>
              <SFInput type="date" value={form.fechaPago} onChange={set('fechaPago')} />
            </div>
            <div style={{ paddingTop:'4px' }}>
              <SFLabel>Día / Mes / Año</SFLabel>
              <div style={{ display:'flex', gap:'8px' }}>
                {[fechaObj.getDate(), fechaObj.getMonth()+1, fechaObj.getFullYear()].map((v, i) => (
                  <div key={i} style={{ flex: i === 2 ? 2 : 1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'7px', padding:'6px 10px', textAlign:'center', fontWeight:700, fontSize:'13px', color:'#111827' }}>{v}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Forma de pago + moneda */}
          <div style={{ ...gridStyle, gridTemplateColumns:'1fr 1fr' }}>
            <div>
              <SFLabel>Forma de pago</SFLabel>
              <div style={{ display:'flex', gap:'16px', paddingTop:'6px' }}>
                {['CHEQUE','TRANSFERENCIA'].map(opt => (
                  <SFCheckbox key={opt} label={opt} checked={form.formaPago === opt}
                    onChange={() => setForm(f => ({ ...f, formaPago: opt }))} />
                ))}
              </div>
            </div>
            <div>
              <SFLabel>Moneda</SFLabel>
              <div style={{ display:'flex', gap:'16px', paddingTop:'6px' }}>
                {[['MN','M.N.'],['DOLARES','Dólares'],['OTRO','Otro']].map(([val, lbl]) => (
                  <SFCheckbox key={val} label={lbl} checked={form.moneda === val}
                    onChange={() => setForm(f => ({ ...f, moneda: val }))} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <SFLabel>Solicitud del pago para el día</SFLabel>
            <div style={{ padding:'8px 12px', background:'#fefce8', border:'1px solid #fde68a', borderRadius:'7px', fontSize:'13px', fontWeight:600, color:'#92400e' }}>
              {fechaLarga}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: Importe ── */}
        <div style={sectionStyle}>
          <p style={{ margin:0, fontWeight:700, fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Importe</p>
          <div style={{ ...gridStyle, gridTemplateColumns:'1fr 2fr' }}>
            <div>
              <SFLabel>Importe $</SFLabel>
              <SFInput type="number" min="0" step="0.01" value={form.monto} onChange={set('monto')} placeholder="0.00" />
            </div>
            <div>
              <SFLabel>Cantidad en letra</SFLabel>
              <div style={{ padding:'7px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'7px', fontSize:'12px', fontWeight:600, color:'#15803d', minHeight:'34px', lineHeight:'1.4' }}>
                {form.monto ? montoEnLetras(form.monto) : <span style={{ color:'#d1d5db' }}>—</span>}
              </div>
            </div>
          </div>
          <div style={{ ...gridStyle, gridTemplateColumns:'1fr 1fr' }}>
            <div>
              <SFLabel>Beneficiario</SFLabel>
              <SFReadonly value={orden.Proveedor} />
            </div>
            <div>
              <SFLabel>Descripción</SFLabel>
              <SFInput value={form.concepto} onChange={set('concepto')} placeholder="Concepto del pago" />
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 3: Entrega de cheque (condicional) ── */}
        {form.formaPago === 'CHEQUE' && (
          <div style={sectionStyle}>
            <p style={{ margin:0, fontWeight:700, fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cheque — Instrucción de entrega</p>
            <div style={{ display:'flex', gap:'32px', paddingTop:'4px' }}>
              {[['BENEFICIARIO','Entregar al beneficiario'],['SOLICITANTE','Entregar al solicitante']].map(([val, lbl]) => (
                <SFCheckbox key={val} label={lbl} checked={form.entregarA === val}
                  onChange={() => setForm(f => ({ ...f, entregarA: val }))} />
              ))}
            </div>
          </div>
        )}

        {/* ── SECCIÓN 4: Datos bancarios (condicional) ── */}
        {form.formaPago === 'TRANSFERENCIA' && (
          <div style={sectionStyle}>
            <p style={{ margin:0, fontWeight:700, fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Para uso exclusivo en transferencia
              <span style={{ fontWeight:400, fontSize:'10px', marginLeft:'6px' }}>(agregar copia del estado de cuenta cuando es por primera vez)</span>
            </p>
            <div style={{ ...gridStyle, gridTemplateColumns:'1fr 1fr' }}>
              <div><SFLabel>Nombre del banco</SFLabel><SFInput value={form.nombreBanco} onChange={set('nombreBanco')} /></div>
              <div><SFLabel>Ciudad</SFLabel><SFInput value={form.ciudad} onChange={set('ciudad')} /></div>
              <div><SFLabel>Estado</SFLabel><SFInput value={form.estadoBanco} onChange={set('estadoBanco')} /></div>
              <div><SFLabel>País</SFLabel><SFInput value={form.pais} onChange={set('pais')} /></div>
              <div><SFLabel>N° de sucursal</SFLabel><SFInput value={form.numSucursal} onChange={set('numSucursal')} /></div>
              <div><SFLabel>Nombre de la sucursal</SFLabel><SFInput value={form.nombreSucursal} onChange={set('nombreSucursal')} /></div>
              <div><SFLabel>N° de cuenta</SFLabel><SFInput value={form.numCuenta} onChange={set('numCuenta')} /></div>
              <div><SFLabel>SWIFT</SFLabel><SFInput value={form.swift} onChange={set('swift')} /></div>
              <div style={{ gridColumn:'span 2' }}><SFLabel>Clave interbancaria (CLABE)</SFLabel><SFInput value={form.claveInterbancaria} onChange={set('claveInterbancaria')} /></div>
              <div><SFLabel>AEA</SFLabel><SFInput value={form.aea} onChange={set('aea')} /></div>
            </div>
          </div>
        )}

        {/* ── SECCIÓN 5: Firmas ── */}
        <div style={{ ...gridStyle, gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
          {[
            { rol:'SOLICITA', nombre: orden.Creador, cargo: 'Solicitante' },
            { rol:'AUTORIZA', nombre: aprobacion1?.aprobadoPor, cargo: 'Administración' },
            { rol:'AUTORIZA', nombre: aprobacion2?.aprobadoPor, cargo: 'Secretaría Académica' },
          ].map((s, i) => (
            <div key={i} style={{ border:'1px solid #e5e7eb', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
              <p style={{ margin:'0 0 28px', fontSize:'10px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.rol}</p>
              <div style={{ borderTop:'1px solid #374151', paddingTop:'8px' }}>
                <p style={{ margin:'0 0 2px', fontSize:'12px', fontWeight:700, color:'#111827' }}>{s.nombre || '—'}</p>
                <p style={{ margin:0, fontSize:'10px', color:'#6b7280' }}>{s.cargo}</p>
              </div>
            </div>
          ))}
        </div>

        </fieldset>

        {/* ── SECCIÓN 6: Estado de autorización ── */}
        {existing && (() => {
          const canApprove1 = (currentUserRol === 'autorizador1' || currentUserRol === 'admin') && !existing.Aprobado1
          const canApprove2 = (currentUserRol === 'autorizador2' || currentUserRol === 'admin') && existing.Aprobado1 && !existing.Aprobado2
          const fmtDate = (d) => d ? String(d).slice(0, 10) : null
          return (
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ background:'#f9fafb', padding:'10px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Estado de autorización</span>
                {existing.Estado === 'aprobada'
                  ? <span style={{ fontSize:'12px', fontWeight:700, color:'#16a34a', background:'#f0fdf4', padding:'2px 10px', borderRadius:'999px', border:'1px solid #bbf7d0' }}>✓ Autorizada</span>
                  : <span style={{ fontSize:'12px', fontWeight:700, color:'#b45309', background:'#fffbeb', padding:'2px 10px', borderRadius:'999px', border:'1px solid #fde68a' }}>Pendiente</span>}
              </div>
              {[
                { label:'Paso 1 — Administración', aprobado: existing.Aprobado1, por: existing.AprobadoPor1, fecha: fmtDate(existing.FechaAprobacion1), canApprove: canApprove1, paso: 1 },
                { label:'Paso 2 — Secretaría Académica', aprobado: existing.Aprobado2, por: existing.AprobadoPor2, fecha: fmtDate(existing.FechaAprobacion2), canApprove: canApprove2, paso: 2, blocked: !existing.Aprobado1 },
              ].map((step) => (
                <div key={step.paso} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 16px', borderBottom: step.paso === 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize:'18px' }}>{step.blocked ? '🔒' : step.aprobado ? '✅' : '⏳'}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#374151' }}>{step.label}</p>
                    {step.aprobado
                      ? <p style={{ margin:0, fontSize:'12px', color:'#6b7280' }}>Aprobado por <strong>{step.por}</strong> el {step.fecha}</p>
                      : step.blocked
                        ? <p style={{ margin:0, fontSize:'12px', color:'#9ca3af' }}>Esperando aprobación del paso 1</p>
                        : <p style={{ margin:0, fontSize:'12px', color:'#b45309' }}>Pendiente de aprobación</p>}
                  </div>
                  {step.canApprove && (
                    <button type="button" disabled={approving}
                      onClick={() => handleApprove(step.paso)}
                      style={{ padding:'6px 16px', borderRadius:'8px', background:'#16a34a', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:'13px', whiteSpace:'nowrap' }}>
                      {approving ? '...' : 'Aprobar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })()}

        {error && <div className="notification error">{error}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
          <div>
            {existing && (
              <button type="button" className="ghost-button"
                style={{ color:'#1d4ed8', borderColor:'#bfdbfe', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                onClick={async () => {
                  try { await downloadSolicitudFondosPdf(orden.OrdenCompraId, existing.Folio) }
                  catch(e) { alert(e.message) }
                }}>
                Descargar PDF
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button type="button" className="secondary-button" onClick={onClose}>Cerrar</button>
            {!sfReadOnly && (
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Guardando...' : existing ? 'Actualizar solicitud' : 'Generar solicitud'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Evaluación al Proveedor ─────────────────────────────────────────────
function calcCatScore(cat, criterios) {
  const checked = cat.items.filter((_, i) => criterios[`${cat.key}_${i}`]).length
  return cat.items.length > 0
    ? Math.round((cat.max / cat.items.length) * checked * 100) / 100
    : 0
}

function EvaluacionModal({ orden, tipoForzado, isAdmin, isAutorizador = false, onClose, onSuccess }) {
  const tipo = tipoForzado || 'compras'
  const categorias = EVAL_CRITERIOS[tipo] || EVAL_CRITERIOS.compras

  const blankCriterios = () => {
    const obj = {}
    categorias.forEach(cat => cat.items.forEach((_, i) => { obj[`${cat.key}_${i}`] = false }))
    return obj
  }

  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState(null)
  const [criterios, setCriterios] = useState(blankCriterios)
  const [form, setForm] = useState({ observaciones: '', departamento: orden.UnidadNegocio || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Carga datos de esta evaluación específica (por tipo)
  useEffect(() => {
    setLoading(true)
    setCriterios(blankCriterios())
    setForm({ observaciones: '', departamento: orden.UnidadNegocio || '' })
    setExisting(null)

    getEvaluacionProveedor(orden.OrdenCompraId, tipo)
      .then(r => {
        if (r) {
          setExisting(r)
          const crit = r.Criterios || {}
          const parsed = {}
          categorias.forEach(cat => cat.items.forEach((_, i) => {
            parsed[`${cat.key}_${i}`] = Boolean(crit[`${cat.key}_${i}`])
          }))
          setCriterios(parsed)
          setForm({
            observaciones: r.Observaciones || '',
            departamento: r.Departamento || orden.UnidadNegocio || '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden.OrdenCompraId, tipo])

  // Solo lectura si: es autorizador (nunca puede evaluar), o si ya existe y no es admin
  const readOnly = Boolean(isAutorizador || (existing && !isAdmin))

  function toggleCriterio(key) {
    if (readOnly) return
    setCriterios(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const catScores = Object.fromEntries(categorias.map(cat => [cat.key, calcCatScore(cat, criterios)]))
  const total = categorias.reduce((sum, cat) => sum + catScores[cat.key], 0)
  const aprobada = total >= 80

  async function handleSave(e) {
    e.preventDefault()
    if (readOnly) return
    setError(null)
    const payload = {
      tipo,
      criterios,
      puntajeCalidad:  catScores.calidad  || 0,
      puntajeTiempos:  catScores.tiempos  || 0,
      puntajeCantidad: catScores.cantidad || 0,
      puntajePosventa: catScores.posventa || 0,
      observaciones: form.observaciones,
      departamento: form.departamento,
    }
    try {
      setSaving(true)
      await saveEvaluacionProveedor(orden.OrdenCompraId, payload)
      onSuccess(`Evaluación ${tipo} guardada — ${total.toFixed(2)}/100 ${aprobada ? '✓ APROBADA' : '✗ NO APROBADA'}`)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <Modal title="Evaluación al Proveedor" onClose={onClose} width={780}>
      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>Cargando...</p>
    </Modal>
  )

  return (
    <Modal title="" onClose={onClose} width={780}>
      {/* Header estilo formato */}
      <div style={{ border: '2px solid #d1d5db', borderRadius: '12px', overflow: 'hidden', marginBottom: '0' }}>
        {/* Encabezado */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px', borderBottom: '2px solid #d1d5db' }}>
          <div style={{ borderRight: '2px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#f9fafb' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>U</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>Evaluación a Proveedor</span>
          </div>
          <div style={{ borderLeft: '2px solid #d1d5db', padding: '8px 12px', fontSize: '11px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '2px' }}>
              <span style={{ color: '#6b7280' }}>No.</span><span style={{ fontWeight: 700 }}>FGA02-01</span>
              <span style={{ color: '#6b7280' }}>Rev.</span><span>2</span>
              <span style={{ color: '#6b7280' }}>Fecha.</span><span>20-Mar-2020</span>
            </div>
          </div>
        </div>

        {/* Datos del proveedor */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div><strong>Proveedor:</strong> {orden.Proveedor}</div>
            <div><strong>Requisición No.:</strong> {orden.Folio}</div>
            <div><strong>Tipo:</strong> <span style={{ textTransform: 'capitalize', color: tipo === 'servicios' ? '#7c3aed' : '#1d4ed8', fontWeight: 600 }}>{tipo}</span></div>
            <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-MX')}</div>
          </div>
        </div>

        {/* Banner solo lectura */}
        {readOnly && (
          <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '10px 16px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔒</span>
            <span>Esta evaluación ya fue registrada y no puede modificarse. Solo el administrador puede editarla.</span>
          </div>
        )}

        {/* Tabla de criterios */}
        <form onSubmit={handleSave}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              {/* Banner tipo — igual al documento físico */}
              <tr style={{ background: '#f59e0b' }}>
                <th colSpan={3} style={{ padding: '9px 10px', fontWeight: 800, color: '#1c1917', textTransform: 'uppercase', textAlign: 'center', fontSize: '13px', letterSpacing: '0.06em', border: '1px solid #d97706' }}>
                  {tipo === 'servicios' ? 'SERVICIOS' : 'COMPRAS O SUMINISTROS'}
                </th>
                <th style={{ padding: '9px 6px', border: '1px solid #d97706', textAlign: 'center', fontWeight: 700, color: '#1c1917', fontSize: '11px' }}>Cumple</th>
                <th colSpan={2} style={{ padding: '9px 6px', border: '1px solid #d97706', textAlign: 'center', fontWeight: 700, color: '#1c1917', fontSize: '11px' }}>Puntaje</th>
              </tr>
              <tr style={{ background: '#fef3c7' }}>
                <th style={{ padding: '6px 10px', fontWeight: 700, color: '#374151', textAlign: 'left', width: '24%', border: '1px solid #d1d5db' }}></th>
                <th style={{ padding: '6px 10px', border: '1px solid #d1d5db', textAlign: 'left' }}></th>
                <th style={{ padding: '6px 10px', border: '1px solid #d1d5db', textAlign: 'center', width: '60px' }}></th>
                <th style={{ padding: '6px 10px', border: '1px solid #d1d5db', textAlign: 'center', width: '55px', fontSize: '11px', fontWeight: 600 }}>Máximo</th>
                <th style={{ padding: '6px 10px', border: '1px solid #d1d5db', textAlign: 'center', width: '70px', fontSize: '11px', fontWeight: 600 }}>Asig.</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, catIdx) => (
                cat.items.map((item, itemIdx) => {
                  const ck = `${cat.key}_${itemIdx}`
                  const isFirst = itemIdx === 0
                  return (
                    <tr key={ck} style={{ background: catIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      {isFirst && (
                        <td rowSpan={cat.items.length} style={{
                          padding: '8px 10px', border: '1px solid #e5e7eb',
                          fontWeight: 700, color: '#111827', verticalAlign: 'top',
                          fontSize: '12px', lineHeight: 1.4,
                        }}>
                          {cat.label}
                        </td>
                      )}
                      <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', lineHeight: 1.5, color: '#374151' }}>
                        {item}
                      </td>
                      <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <input type="checkbox" checked={criterios[ck] || false}
                          onChange={() => toggleCriterio(ck)}
                          disabled={readOnly}
                          style={{ width: 16, height: 16, cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.7 : 1 }} />
                      </td>
                      {isFirst && (
                        <td rowSpan={cat.items.length} style={{ padding: '8px 10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 700 }}>
                          {cat.max}
                        </td>
                      )}
                      {isFirst && (
                        <td rowSpan={cat.items.length} style={{
                          padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center',
                          background: catScores[cat.key] > 0 ? '#fef9c3' : undefined,
                        }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: catScores[cat.key] > 0 ? '#92400e' : '#9ca3af' }}>
                            {catScores[cat.key].toFixed(2)}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })
              ))}
              <tr style={{ background: '#fef3c7' }}>
                <td colSpan={3} style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 800, fontSize: '14px' }}>TOTAL</td>
                <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: '#374151' }}>100</td>
                <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 800, fontSize: '15px',
                  color: aprobada ? '#15803d' : '#dc2626',
                  background: aprobada ? '#dcfce7' : '#fee2e2',
                }}>
                  {total.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Observaciones y departamento */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Observaciones</label>
                <textarea className="form-control" rows={2} value={form.observaciones}
                  readOnly={readOnly}
                  style={readOnly ? { background: '#f9fafb', color: '#374151' } : undefined}
                  onChange={e => !readOnly && setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Departamento que realiza la evaluación</label>
                <input className="form-control" value={form.departamento} readOnly
                  style={{ background: '#f3f4f6', color: '#374151' }} />
              </div>
            </div>

            {/* Interpretación */}
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#92400e', marginBottom: '6px', textAlign: 'center' }}>Interpretación</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <strong>Calificación:</strong> Mayor a 80 puntos<br />
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>NOTA: La evaluación aprobatoria es de 80</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    padding: '6px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                    background: aprobada ? '#dcfce7' : '#fee2e2',
                    color: aprobada ? '#15803d' : '#b91c1c',
                    border: `1px solid ${aprobada ? '#bbf7d0' : '#fca5a5'}`,
                  }}>
                    {total}/100 — {aprobada ? 'El proveedor permanece por un periodo más' : 'Proveedor no aprobado'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="notification error" style={{ margin: '0 16px 16px' }}>{error}</div>}

          <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="secondary-button" onClick={onClose}>Cerrar</button>
            {!readOnly && (
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Guardando...' : existing ? 'Actualizar evaluación' : 'Guardar evaluación'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ── Helpers form ───────────────────────────────────────────────────────────────
function createEmptyLine() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    Cantidad: '1', Descripcion: '', UnidadMedida: '', PrecioUnitario: '0.00',
  }
}

function emptyOrderForm(folioValue) {
  return {
    Folio: folioValue || '', UnidadNegocioId: '', ProveedorId: '',
    Fecha: new Date().toISOString().slice(0, 10),
    Tipo: 'compras', Observaciones: '',
    LineItems: [createEmptyLine()],
  }
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function OrdenesCompra({
  proveedores = [], unidadesNegocio = [], folio, ordenes = [],
  currentUser, currentUserRol, onCreateOrden, onApproveOrden, onRejectOrden, onDeleteOrden,
}) {
  const rolApprover = ROLE_TO_APPROVER[currentUserRol] || null
  const [activeSection, setActiveSection] = useState('crear')
  const [form, setForm] = useState(emptyOrderForm(folio))
  const [formError, setFormError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedApprover, setSelectedApprover] = useState(rolApprover || APPROVER_OPTIONS[0])
  const [rejectReason, setRejectReason] = useState('')
  const [modal, setModal] = useState(null) // { type, orden }
  const [successMsg, setSuccessMsg] = useState(null)
  const [sfPendientes, setSfPendientes] = useState([])
  const [sfActionError, setSfActionError] = useState(null)

  useEffect(() => {
    setForm((current) => ({ ...current, Folio: folio || current.Folio }))
  }, [folio])

  useEffect(() => {
    if (activeSection === 'autorizar' && (currentUserRol === 'autorizador1' || currentUserRol === 'autorizador2' || currentUserRol === 'admin')) {
      getSolicitudesFondosPendientes().then(setSfPendientes).catch(() => setSfPendientes([]))
    }
  }, [activeSection, currentUserRol])

  async function handleApproveSF(ordenId, paso) {
    setSfActionError(null)
    try {
      await approveSolicitudFondos(ordenId, paso)
      const updated = await getSolicitudesFondosPendientes()
      setSfPendientes(updated)
    } catch (err) { setSfActionError(err.message) }
  }

  const computedLines = useMemo(
    () => form.LineItems.map((line) => {
      const cantidad = Number(line.Cantidad) || 0
      const precioUnitario = Number(line.PrecioUnitario) || 0
      return { ...line, Cantidad: cantidad, PrecioUnitario: precioUnitario, subtotal: cantidad * precioUnitario }
    }),
    [form.LineItems]
  )

  const summary = useMemo(() => {
    const subtotal = computedLines.reduce((sum, line) => sum + line.subtotal, 0)
    const iva = Number((subtotal * 0.16).toFixed(2))
    const total = Number((subtotal + iva).toFixed(2))
    return { subtotal, iva, total }
  }, [computedLines])

  function updateField(name, value) { setForm((prev) => ({ ...prev, [name]: value })) }
  function updateLine(id, name, value) {
    setForm((prev) => ({
      ...prev,
      LineItems: prev.LineItems.map((item) => (item.id === id ? { ...item, [name]: value } : item)),
    }))
  }
  function addLine() { setForm((prev) => ({ ...prev, LineItems: [...prev.LineItems, createEmptyLine()] })); setFormError(null) }
  function removeLine(id) {
    setForm((prev) => {
      const lines = prev.LineItems.filter((item) => item.id !== id)
      return { ...prev, LineItems: lines.length ? lines : [createEmptyLine()] }
    })
  }

  const hasValidLineItem = computedLines.some((line) => line.Descripcion.trim())
  const saveDisabled = !form.UnidadNegocioId || !form.ProveedorId || !hasValidLineItem

  async function handleSaveOrden(event) {
    event.preventDefault()
    setFormError(null)
    if (!form.UnidadNegocioId) { setFormError('Selecciona la unidad de negocio.'); return }
    if (!form.ProveedorId) { setFormError('Selecciona el proveedor.'); return }
    if (!hasValidLineItem) { setFormError('Agrega al menos una partida con descripción.'); return }

    const orderPayload = {
      ...form,
      UnidadNegocio: unidadesNegocio.find((u) => String(u.UnidadNegocioId) === String(form.UnidadNegocioId))?.Nombre || '',
      Proveedor: proveedores.find((p) => String(p.ProveedorId) === String(form.ProveedorId))?.Nombre || '',
      LineItems: computedLines.filter((line) => line.Descripcion.trim()),
      Subtotal: summary.subtotal, Iva: summary.iva, Total: summary.total,
      Creador: currentUser || 'Usuario actual',
      FechaCreacion: new Date().toISOString(),
      aprobaciones: [
        { step: 1, label: 'Administración', aprobado: false, aprobadoPor: null, fecha: null },
        { step: 2, label: 'Secretaría Académica', aprobado: false, aprobadoPor: null, fecha: null },
      ],
      rechazo: null,
    }
    try {
      setSaving(true)
      await onCreateOrden(orderPayload)
      setForm(emptyOrderForm(folio))
      setActiveSection('misOrdenes')
    } catch (err) { setFormError(err?.message || 'No se pudo guardar la orden.') }
    finally { setSaving(false) }
  }

  function canApprove(order) {
    if (order.rechazo?.rechazado || order.Rechazado) return false
    const approvals = (order.aprobaciones || order.Aprobaciones || []).map(normalizeApproval)
    const idx = APPROVER_OPTIONS.indexOf(selectedApprover)
    if (idx < 0 || !approvals[idx] || approvals[idx].aprobado) return false
    return approvals.slice(0, idx).every((a) => a.aprobado)
  }

  function canReject(order) {
    if (order.rechazo?.rechazado || order.Rechazado) return false
    const approvals = (order.aprobaciones || order.Aprobaciones || []).map(normalizeApproval)
    return !approvals.every((a) => a.aprobado)
  }

  async function handleDownloadPdf(orderId, folioLabel) {
    setActionError(null)
    try {
      const blob = await downloadOrdenCompraPdf(orderId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${folioLabel}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { setActionError('No se pudo descargar el PDF.') }
  }

  async function handleApprove(orderId) {
    setActionError(null)
    try { await onApproveOrden(orderId, selectedApprover) }
    catch (err) { setActionError(err?.message || 'No se pudo autorizar la orden.') }
  }

  async function handleReject(orderId) {
    setActionError(null)
    if (!rejectReason.trim()) { setActionError('Agrega un motivo de rechazo.'); return }
    try { await onRejectOrden(orderId, selectedApprover, rejectReason.trim()); setRejectReason('') }
    catch (err) { setActionError(err?.message || 'No se pudo rechazar la orden.') }
  }

  const isAdmin = currentUserRol === 'admin'
  const isAutorizador = currentUserRol === 'autorizador1' || currentUserRol === 'autorizador2'

  const [filtros, setFiltros] = useState({ texto:'', unidadNegocio:'', estado:'', tipo:'', fechaDesde:'', fechaHasta:'' })
  const hasFiltros = Object.values(filtros).some(Boolean)
  const setF = (k) => (e) => setFiltros(f => ({ ...f, [k]: e.target.value }))
  function resetFiltros() { setFiltros({ texto:'', unidadNegocio:'', estado:'', tipo:'', fechaDesde:'', fechaHasta:'' }) }

  function filtrarOrdenes(lista) {
    return lista.filter(order => {
      const status = getOrderStatus(order)
      const tipo   = (order.Tipo || 'compras').toLowerCase()
      const fecha  = String(order.Fecha || '').slice(0, 10)
      if (filtros.texto) {
        const q = filtros.texto.toLowerCase()
        if (!['Folio','Proveedor','Creador','UnidadNegocio'].some(k => (order[k]||'').toLowerCase().includes(q))) return false
      }
      if (filtros.unidadNegocio && String(order.UnidadNegocioId||'') !== filtros.unidadNegocio) return false
      if (filtros.estado && status !== filtros.estado) return false
      if (filtros.tipo && tipo !== filtros.tipo) return false
      if (filtros.fechaDesde && fecha < filtros.fechaDesde) return false
      if (filtros.fechaHasta && fecha > filtros.fechaHasta) return false
      return true
    })
  }

  function openModal(type, orden, readOnly = false) {
    setSuccessMsg(null)
    setModal({ type, orden, isAdmin, isAutorizador, readOnly })
  }

  function closeModal() { setModal(null) }

  function handleModalSuccess(msg) {
    setModal(null)
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 6000)
  }

  async function handleDeleteOrden(order) {
    if (!window.confirm(`¿Eliminar la orden ${order.Folio}? Esta acción no se puede deshacer.`)) return
    try {
      await onDeleteOrden(order.OrdenCompraId)
      setSuccessMsg(`Orden ${order.Folio} eliminada correctamente.`)
      setTimeout(() => setSuccessMsg(null), 6000)
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const misOrdenes = useMemo(
    () => filtrarOrdenes(ordenes.filter((o) => !currentUser || o.Creador === currentUser)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordenes, currentUser, filtros]
  )

  const ordenesPendientesAutorizacion = useMemo(() => {
    const idx = APPROVER_OPTIONS.indexOf(selectedApprover)
    const base = ordenes.filter((order) => {
      if (order.rechazo?.rechazado || order.Rechazado) return false
      const approvals = (order.aprobaciones || order.Aprobaciones || []).map(normalizeApproval)
      if (!approvals[idx]) return false
      if (approvals[idx].aprobado) return false
      return approvals.slice(0, idx).every((a) => a.aprobado)
    })
    return filtrarOrdenes(base)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenes, selectedApprover, filtros])

  const TABS = [
    { key: 'crear', label: 'Nueva orden' },
    { key: 'misOrdenes', label: `Mis órdenes${misOrdenes.length ? ` (${misOrdenes.length})` : ''}` },
    { key: 'historial', label: 'Órdenes de Compra' },
    { key: 'autorizar', label: 'Autorizar' },
  ]

  return (
    <div className="cotizacion-page">
      <div className="panel card">
        <div className="panel-header space-between" style={{ flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div>
            <h2>Órdenes de Compra</h2>
            <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
              Crea órdenes, consulta su estatus, autoriza y gestiona facturación y evaluación.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <button key={tab.key} type="button"
                className={`tab-btn${activeSection === tab.key ? ' active' : ''}`}
                onClick={() => setActiveSection(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', color: '#15803d', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            {successMsg}
          </div>
        )}

        {/* ── BUSCADOR / FILTROS ── */}
        <div style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'12px 14px', display:'flex', flexWrap:'wrap', gap:'10px', alignItems:'flex-end', marginBottom:'4px' }}>
          <div style={{ flex:'2 1 180px' }}>
            <span style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280', marginBottom:'4px' }}>Buscar</span>
            <input className="form-control" type="text" value={filtros.texto} onChange={setF('texto')}
              placeholder="Folio, proveedor, área, creador..." style={{ fontSize:'13px' }} />
          </div>
          <div style={{ flex:'1 1 140px' }}>
            <span style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280', marginBottom:'4px' }}>Unidad de negocio</span>
            <select className="form-control" value={filtros.unidadNegocio} onChange={setF('unidadNegocio')} style={{ fontSize:'13px' }}>
              <option value="">Todas</option>
              {unidadesNegocio.map(u => <option key={u.UnidadNegocioId} value={String(u.UnidadNegocioId)}>{u.Nombre}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <span style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280', marginBottom:'4px' }}>Estado</span>
            <select className="form-control" value={filtros.estado} onChange={setF('estado')} style={{ fontSize:'13px' }}>
              <option value="">Todos</option>
              {['Aprobada','En proceso','Pendiente','Rechazada'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 110px' }}>
            <span style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280', marginBottom:'4px' }}>Tipo</span>
            <select className="form-control" value={filtros.tipo} onChange={setF('tipo')} style={{ fontSize:'13px' }}>
              <option value="">Todos</option>
              <option value="compras">Compras</option>
              <option value="servicios">Servicios</option>
            </select>
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <span style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280', marginBottom:'4px' }}>Desde</span>
            <input className="form-control" type="date" value={filtros.fechaDesde} onChange={setF('fechaDesde')} style={{ fontSize:'13px' }} />
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <span style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280', marginBottom:'4px' }}>Hasta</span>
            <input className="form-control" type="date" value={filtros.fechaHasta} onChange={setF('fechaHasta')} style={{ fontSize:'13px' }} />
          </div>
          {hasFiltros && (
            <button type="button" className="ghost-button" onClick={resetFiltros}
              style={{ fontSize:'12px', padding:'6px 14px', alignSelf:'flex-end', color:'#6b7280' }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── CREAR ── */}
        {activeSection === 'crear' && (
          <form onSubmit={handleSaveOrden} className="datos-generales-form">
            <div className="form-row form-row-4">
              <div className="form-field">
                <span className="form-field-label">Folio automático</span>
                <input className="form-control" type="text" value={form.Folio} readOnly />
              </div>
              <div className="form-field">
                <span className="form-field-label">Tipo de orden *</span>
                <select className="form-control" value={form.Tipo} onChange={(e) => updateField('Tipo', e.target.value)}>
                  <option value="compras">Compras / Suministros</option>
                  <option value="servicios">Servicios</option>
                </select>
              </div>
              <div className="form-field">
                <span className="form-field-label">Unidad de negocio</span>
                <select className="form-control" value={form.UnidadNegocioId} onChange={(e) => updateField('UnidadNegocioId', e.target.value)}>
                  <option value="">Seleccionar unidad</option>
                  {unidadesNegocio.map((u) => (
                    <option key={u.UnidadNegocioId} value={u.UnidadNegocioId}>{u.Nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <span className="form-field-label">Proveedor</span>
                <select className="form-control" value={form.ProveedorId} onChange={(e) => updateField('ProveedorId', e.target.value)}>
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.ProveedorId} value={p.ProveedorId}>{p.Nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row form-row-4">
              <div className="form-field">
                <span className="form-field-label">Fecha</span>
                <input className="form-control" type="date" value={form.Fecha} onChange={(e) => updateField('Fecha', e.target.value)} />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 3' }}>
                <span className="form-field-label">Observaciones</span>
                <input className="form-control" value={form.Observaciones} onChange={(e) => updateField('Observaciones', e.target.value)} placeholder="Notas adicionales sobre la orden" />
              </div>
            </div>

            <div className="table-wrap">
              <table className="participants-table">
                <thead>
                  <tr>
                    <th>Cantidad</th><th>Descripción</th><th>Unidad medida</th>
                    <th>Precio unitario</th><th>Subtotal</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {form.LineItems.map((line) => (
                    <tr key={line.id}>
                      <td><input className="form-control" type="number" min="0" value={line.Cantidad} onChange={(e) => updateLine(line.id, 'Cantidad', e.target.value)} /></td>
                      <td><input className="form-control" type="text" value={line.Descripcion} onChange={(e) => updateLine(line.id, 'Descripcion', e.target.value)} placeholder="Descripción de la partida" /></td>
                      <td><input className="form-control" type="text" value={line.UnidadMedida} onChange={(e) => updateLine(line.id, 'UnidadMedida', e.target.value)} placeholder="Ej. hrs, pza" /></td>
                      <td><input className="form-control" type="number" min="0" step="0.01" value={line.PrecioUnitario} onChange={(e) => updateLine(line.id, 'PrecioUnitario', e.target.value)} /></td>
                      <td>{formatMoney((Number(line.Cantidad) || 0) * (Number(line.PrecioUnitario) || 0))}</td>
                      <td><button className="ghost-button" type="button" onClick={() => removeLine(line.id)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="ghost-button" onClick={addLine}>+ Agregar partida</button>

            <div className="panel card cost-panel" style={{ marginTop: '16px', padding: '16px 20px' }}>
              <div className="summary-column" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span><strong>{formatMoney(summary.subtotal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IVA 16%</span><strong>{formatMoney(summary.iva)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span><strong>Total</strong></span><strong>{formatMoney(summary.total)}</strong>
                </div>
              </div>
            </div>

            {formError && <div className="notification error">{formError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="primary-button" type="submit" disabled={saving || saveDisabled}>
                {saving ? 'Guardando...' : 'Guardar orden'}
              </button>
            </div>
          </form>
        )}

        {/* ── MIS ÓRDENES ── */}
        {activeSection === 'misOrdenes' && (
          <div>
            <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>
              Órdenes creadas por <strong>{currentUser || 'ti'}</strong>
            </p>
            {misOrdenes.length === 0 ? (
              <div className="notification" style={{ textAlign: 'center' }}>
                Aún no tienes órdenes de compra creadas.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Folio</th><th>Tipo</th><th>Proveedor</th><th>Unidad de negocio</th>
                      <th>Total</th><th>Fecha</th><th>Estado</th><th>Aprobaciones</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {misOrdenes.map((order) => {
                      const status = getOrderStatus(order)
                      const approvals = (order.aprobaciones || order.Aprobaciones || []).map(normalizeApproval)
                      const isAprobada = status === 'Aprobada'
                      const tipoLabel = (order.Tipo || order.tipo || 'compras').toLowerCase()
                      return (
                        <tr key={order.OrdenCompraId}>
                          <td><strong>{order.Folio}</strong></td>
                          <td>
                            <span style={{
                              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                              background: tipoLabel === 'servicios' ? '#f5f3ff' : '#eff6ff',
                              color: tipoLabel === 'servicios' ? '#7c3aed' : '#1d4ed8',
                            }}>
                              {tipoLabel === 'servicios' ? 'Servicios' : 'Compras'}
                            </span>
                          </td>
                          <td>{order.Proveedor}</td>
                          <td>{order.UnidadNegocio}</td>
                          <td><strong>{formatMoney(order.Total)}</strong></td>
                          <td>{String(order.Fecha || '').slice(0, 10)}</td>
                          <td><StatusBadge status={status} /></td>
                          <td>
                            {approvals.map((a) => (
                              <div key={a.step} style={{ fontSize: '12px', color: a.aprobado ? '#047857' : '#6b7280', marginBottom: '4px' }}>
                                {a.aprobado ? '✓' : '○'} {a.label}: {a.aprobado ? (a.aprobadoPor || '–') : 'Pendiente'}
                              </div>
                            ))}
                            {(order.rechazo?.rechazado || order.Rechazado) && (
                              <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                                ✕ Rechazada por {order.rechazo?.rechazadoPor || order.RechazadoPor}
                                {order.MotivoRechazo ? ` — ${order.MotivoRechazo}` : ''}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '100px' }}>
                              <button type="button" className="ghost-button"
                                style={{ fontSize: '11px', padding: '4px 10px' }}
                                onClick={() => handleDownloadPdf(order.OrdenCompraId, order.Folio)}>
                                PDF
                              </button>
                              {isAprobada && (
                                <>
                                  <button type="button" className="ghost-button"
                                    style={{ fontSize: '11px', padding: '4px 10px', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                                    onClick={() => openModal('factura', order)}>
                                    Factura
                                  </button>
                                  <button type="button" className="ghost-button"
                                    style={{ fontSize: '11px', padding: '4px 10px', color: '#15803d', borderColor: '#bbf7d0' }}
                                    onClick={() => openModal('solicitud', order)}>
                                    Sol. Fondos
                                  </button>
                                      <button type="button" className="ghost-button"
                                    style={{ fontSize: '11px', padding: '4px 10px', color: '#16a34a', borderColor: '#bbf7d0' }}
                                    onClick={() => openModal('evaluacion-compras', order)}>
                                    Eval. Compras
                                  </button>
                                  <button type="button" className="ghost-button"
                                    style={{ fontSize: '11px', padding: '4px 10px', color: '#7c3aed', borderColor: '#ddd6fe' }}
                                    onClick={() => openModal('evaluacion-servicios', order)}>
                                    Eval. Servicios
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── AUTORIZAR ── */}
        {activeSection === 'autorizar' && (
          <div>
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafb', borderRadius: '16px' }}>
              <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <span className="form-field-label">Firmar como</span>
                  {rolApprover ? (
                    <input className="form-control" type="text" value={rolApprover} readOnly style={{ background: '#f3f4f6', color: '#374151' }} />
                  ) : (
                    <select className="form-control" value={selectedApprover} onChange={(e) => setSelectedApprover(e.target.value)}>
                      {APPROVER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <span className="form-field-label">Motivo de rechazo (si aplica)</span>
                  <input className="form-control" type="text" value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo para rechazar" />
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Mostrando órdenes pendientes de autorización por <strong>{selectedApprover}</strong>
                {' — '}El flujo es: Administración → Secretaría Académica.
              </p>
            </div>

            {actionError && <div className="notification error" style={{ marginBottom: '16px' }}>{actionError}</div>}

            {ordenesPendientesAutorizacion.length === 0 ? (
              <div className="notification" style={{ textAlign: 'center' }}>
                No hay órdenes pendientes de autorización para <strong>{selectedApprover}</strong>.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Folio</th><th>Tipo</th><th>Proveedor</th><th>Unidad de negocio</th>
                      <th>Creado por</th><th>Total</th><th>Fecha</th><th>Acciones</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesPendientesAutorizacion.map((order) => (
                      <tr key={order.OrdenCompraId}>
                        <td><strong>{order.Folio}</strong></td>
                        <td>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                            background: (order.Tipo||'compras').toLowerCase() === 'servicios' ? '#f5f3ff' : '#eff6ff',
                            color: (order.Tipo||'compras').toLowerCase() === 'servicios' ? '#7c3aed' : '#1d4ed8' }}>
                            {(order.Tipo||'compras').toLowerCase() === 'servicios' ? 'Servicios' : 'Compras'}
                          </span>
                        </td>
                        <td>{order.Proveedor}</td>
                        <td>{order.UnidadNegocio}</td>
                        <td>{order.Creador}</td>
                        <td><strong>{formatMoney(order.Total)}</strong></td>
                        <td>{order.Fecha}</td>
                        <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button type="button" className="primary-button"
                            style={{ padding: '8px 14px', fontSize: '13px' }}
                            onClick={() => handleApprove(order.OrdenCompraId)}>
                            Autorizar
                          </button>
                          <button type="button" className="secondary-button"
                            style={{ padding: '8px 14px', fontSize: '13px' }}
                            disabled={!canReject(order)}
                            onClick={() => handleReject(order.OrdenCompraId)}>
                            Rechazar
                          </button>
                        </td>
                        <td>
                          <div style={{ display:'flex', flexDirection:'column', gap:'4px', minWidth:'100px' }}>
                            <button type="button" className="ghost-button"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => handleDownloadPdf(order.OrdenCompraId, order.Folio)}>
                              PDF
                            </button>
                            <button type="button" className="ghost-button"
                              style={{ fontSize: '11px', padding: '4px 10px', color: '#15803d', borderColor: '#bbf7d0' }}
                              onClick={() => openModal('solicitud', order, !isAdmin)}>
                              Sol. Fondos
                            </button>
                            <button type="button" className="ghost-button"
                              style={{ fontSize: '11px', padding: '4px 10px', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                              onClick={() => openModal('evaluacion-compras', order)}>
                              Eval. Compras
                            </button>
                            <button type="button" className="ghost-button"
                              style={{ fontSize: '11px', padding: '4px 10px', color: '#7c3aed', borderColor: '#ddd6fe' }}
                              onClick={() => openModal('evaluacion-servicios', order)}>
                              Eval. Servicios
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Solicitudes de Fondos pendientes ── */}
            <div style={{ marginTop: '28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '12px', display:'flex', alignItems:'center', gap:'8px' }}>
                Solicitudes de Fondos pendientes
                {sfPendientes.filter(sf => {
                  if (currentUserRol === 'autorizador1') return !sf.Aprobado1
                  if (currentUserRol === 'autorizador2') return sf.Aprobado1 && !sf.Aprobado2
                  return true
                }).length > 0 && (
                  <span style={{ background:'#ef4444', color:'white', borderRadius:'999px', fontSize:'11px', fontWeight:700, padding:'2px 8px' }}>
                    {sfPendientes.filter(sf => {
                      if (currentUserRol === 'autorizador1') return !sf.Aprobado1
                      if (currentUserRol === 'autorizador2') return sf.Aprobado1 && !sf.Aprobado2
                      return true
                    }).length}
                  </span>
                )}
              </h3>
              {sfActionError && <div className="notification error" style={{ marginBottom:'12px' }}>{sfActionError}</div>}
              {(() => {
                const visible = sfPendientes.filter(sf => {
                  if (currentUserRol === 'autorizador1') return !sf.Aprobado1
                  if (currentUserRol === 'autorizador2') return sf.Aprobado1 && !sf.Aprobado2
                  return true
                })
                if (visible.length === 0) return (
                  <div className="notification" style={{ textAlign:'center' }}>No hay solicitudes de fondos pendientes.</div>
                )
                return (
                  <div className="table-wrap">
                    <table className="participants-table">
                      <thead>
                        <tr>
                          <th>Folio SF</th><th>Orden</th><th>Proveedor</th><th>Unidad de Negocio</th>
                          <th>Monto</th><th>Paso 1</th><th>Paso 2</th><th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map(sf => {
                          const canP1 = (currentUserRol === 'autorizador1' || currentUserRol === 'admin') && !sf.Aprobado1
                          const canP2 = (currentUserRol === 'autorizador2' || currentUserRol === 'admin') && sf.Aprobado1 && !sf.Aprobado2
                          return (
                            <tr key={sf.SolicitudId}>
                              <td><strong style={{ color:'#1d4ed8' }}>{sf.Folio}</strong></td>
                              <td>{sf.OrdenFolio}</td>
                              <td>{sf.Proveedor}</td>
                              <td>{sf.UnidadNegocio}</td>
                              <td><strong>{formatMoney(sf.Monto)}</strong></td>
                              <td>{sf.Aprobado1 ? <span style={{ color:'#16a34a', fontWeight:700 }}>✓ {sf.AprobadoPor1}</span> : <span style={{ color:'#b45309' }}>⏳ Pendiente</span>}</td>
                              <td>{sf.Aprobado1 ? (sf.Aprobado2 ? <span style={{ color:'#16a34a', fontWeight:700 }}>✓ {sf.AprobadoPor2}</span> : <span style={{ color:'#b45309' }}>⏳ Pendiente</span>) : <span style={{ color:'#d1d5db' }}>🔒</span>}</td>
                              <td>
                                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                                  {canP1 && <button type="button" className="primary-button" style={{ padding:'6px 14px', fontSize:'13px' }} onClick={() => handleApproveSF(sf.OrdenCompraId, 1)}>Aprobar (Paso 1)</button>}
                                  {canP2 && <button type="button" className="primary-button" style={{ padding:'6px 14px', fontSize:'13px', background:'#7c3aed' }} onClick={() => handleApproveSF(sf.OrdenCompraId, 2)}>Aprobar (Paso 2)</button>}
                                  <button type="button" className="ghost-button"
                                    style={{ padding:'6px 12px', fontSize:'12px', color:'#374151' }}
                                    onClick={() => { const o = ordenes.find(x => x.OrdenCompraId === sf.OrdenCompraId); if (o) openModal('solicitud', o, !isAdmin) }}>
                                    Ver detalle
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>

          </div>
        )}

        {/* ── HISTORIAL DE ÓRDENES ── */}
        {activeSection === 'historial' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Órdenes de Compra</h2>
              <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', borderRadius: '999px', padding: '2px 10px' }}>
                {filtrarOrdenes(ordenes).length}{hasFiltros ? ` de ${ordenes.length}` : ''} orden{filtrarOrdenes(ordenes).length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="table-wrap">
              <table className="participants-table">
                <thead>
                  <tr>
                    <th>Folio</th><th>Tipo</th><th>Proveedor</th><th>Creado por</th>
                    <th>Total</th><th>Estado</th><th>Documentos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarOrdenes(ordenes).length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No hay órdenes registradas.</td></tr>
                  ) : filtrarOrdenes(ordenes).map((order) => {
                    const status = getOrderStatus(order)
                    const tipoLabel = (order.Tipo||'compras').toLowerCase()
                    const isAprobada = status === 'Aprobada'
                    return (
                      <tr key={order.OrdenCompraId}>
                        <td><strong>{order.Folio}</strong></td>
                        <td>
                          <span style={{ fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'999px',
                            background: tipoLabel === 'servicios' ? '#f5f3ff' : '#eff6ff',
                            color: tipoLabel === 'servicios' ? '#7c3aed' : '#1d4ed8' }}>
                            {tipoLabel === 'servicios' ? 'Servicios' : 'Compras'}
                          </span>
                        </td>
                        <td>{order.Proveedor}</td>
                        <td>{order.Creador}</td>
                        <td>{formatMoney(order.Total)}</td>
                        <td><StatusBadge status={status} /></td>
                        <td>
                          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                            <button type="button" className="ghost-button"
                              style={{ fontSize:'11px', padding:'3px 8px' }}
                              onClick={() => handleDownloadPdf(order.OrdenCompraId, order.Folio)}>
                              PDF
                            </button>
                            <button type="button" className="ghost-button"
                              style={{ fontSize:'11px', padding:'3px 8px', color:'#b45309', borderColor:'#fde68a' }}
                              onClick={() => openModal('factura', order)}>
                              Factura
                            </button>
                            {isAprobada && (
                              <>
                                <button type="button" className="ghost-button"
                                  style={{ fontSize:'11px', padding:'3px 8px', color:'#15803d', borderColor:'#bbf7d0' }}
                                  onClick={() => openModal('solicitud', order, !isAdmin)}>
                                  Sol. Fondos
                                </button>
                                <button type="button" className="ghost-button"
                                  style={{ fontSize:'11px', padding:'3px 8px', color:'#1d4ed8', borderColor:'#bfdbfe' }}
                                  onClick={() => openModal('evaluacion-compras', order)}>
                                  Eval. Compras
                                </button>
                                <button type="button" className="ghost-button"
                                  style={{ fontSize:'11px', padding:'3px 8px', color:'#7c3aed', borderColor:'#ddd6fe' }}
                                  onClick={() => openModal('evaluacion-servicios', order)}>
                                  Eval. Servicios
                                </button>
                              </>
                            )}
                            {(isAdmin || isAutorizador) && (
                              <button type="button" className="ghost-button"
                                style={{ fontSize:'11px', padding:'3px 8px', color:'#dc2626', borderColor:'#fecaca' }}
                                onClick={() => handleDeleteOrden(order)}>
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {modal?.type === 'factura' && (
        <FacturaModal orden={modal.orden} onClose={closeModal} onSuccess={handleModalSuccess} />
      )}
      {modal?.type === 'solicitud' && (
        <SolicitudFondosModal orden={modal.orden} currentUserRol={currentUserRol} readOnly={modal.readOnly} onClose={closeModal} onSuccess={handleModalSuccess} />
      )}
      {modal?.type === 'evaluacion-compras' && (
        <EvaluacionModal orden={modal.orden} tipoForzado="compras" isAdmin={modal.isAdmin} isAutorizador={modal.isAutorizador} onClose={closeModal} onSuccess={handleModalSuccess} />
      )}
      {modal?.type === 'evaluacion-servicios' && (
        <EvaluacionModal orden={modal.orden} tipoForzado="servicios" isAdmin={modal.isAdmin} isAutorizador={modal.isAutorizador} onClose={closeModal} onSuccess={handleModalSuccess} />
      )}
    </div>
  )
}
