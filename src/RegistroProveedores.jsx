import { useEffect, useRef, useState } from 'react'
import {
  getSolicitudesProveedor, getSolicitudProveedorById,
  createSolicitudProveedor, updateSolicitudProveedor,
  enviarSolicitudProveedor, aprobarSolicitudProveedor, rechazarSolicitudProveedor,
  subirDocumentoProveedor, descargarDocumentoProveedor, eliminarDocumentoProveedor,
  eliminarSolicitudProveedor,
} from './api'

// ── Documentos requeridos por tipo de persona ─────────────────────────────────
const DOCS_MORAL = [
  { key: 'constancia_fiscal',   label: 'Constancia de situación fiscal' },
  { key: 'estado_cuenta',       label: 'Carátula del estado de cuenta bancario' },
  { key: 'acta_constitutiva',   label: 'Acta constitutiva' },
  { key: 'id_representante',    label: 'Identificación oficial del representante legal' },
  { key: 'poder_legal',         label: 'Poder Legal del representante legal' },
  { key: 'comprobante_domicilio', label: 'Comprobante de domicilio' },
  { key: 'opinion_fiscal',      label: 'Opinión del cumplimiento de obligaciones fiscales positiva' },
]
const DOCS_FISICA = [
  { key: 'constancia_fiscal',   label: 'Constancia de situación fiscal' },
  { key: 'estado_cuenta',       label: 'Carátula del estado de cuenta bancario' },
  { key: 'id_oficial',          label: 'Identificación oficial' },
  { key: 'comprobante_domicilio', label: 'Comprobante de domicilio' },
  { key: 'opinion_fiscal',      label: 'Opinión del cumplimiento de obligaciones fiscales positiva (antigüedad ≤ 1 mes)' },
]

const ALLOWED_EXT = ['.pdf', '.xml', '.jpg', '.jpeg', '.png']
const ALLOWED_TYPES = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png']

function estadoBadge(estado) {
  const map = {
    borrador:  { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Borrador' },
    pendiente: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Pendiente' },
    aprobado:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Aprobado' },
    rechazado: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'Rechazado' },
  }
  const s = map[estado] || map.borrador
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function emptyForm() {
  return {
    FechaRegistro: new Date().toISOString().slice(0, 10),
    CondicionesPago: '', RazonSocial: '', RFC: '',
    Calle: '', Colonia: '', Ciudad: '', EstadoDir: '', CodigoPostal: '',
    ProductoServicio: '', TipoPersona: 'moral',
    GerenteNombre: '', GerenteTelefono: '', GerenteFax: '', GerenteEmail: '',
    CxCNombre: '', CxCTelefono: '', CxCFax: '', CxCEmail: '',
    Banco: '', Clabe: '', NoCuenta: '', Moneda: 'MXN', Referencia: '',
  }
}

function inputStyle(small) {
  return {
    width: '100%', padding: small ? '5px 8px' : '7px 10px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: small ? '12px' : '13px', boxSizing: 'border-box', background: '#fff',
  }
}

function SectionHeader({ title }) {
  return (
    <div style={{ background: '#111827', color: '#fff', padding: '6px 12px',
      fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', borderRadius: '4px' }}>
      {title}
    </div>
  )
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Formulario de solicitud ───────────────────────────────────────────────────
function FormularioSolicitud({ solicitudId, currentUser, onGuardado, readOnly }) {
  const [form, setForm] = useState(emptyForm())
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(!!solicitudId)
  const [saving, setSaving] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [docErrors, setDocErrors] = useState({})
  const fileInputRefs = useRef({})

  const docsRequeridos = form.TipoPersona === 'fisica' ? DOCS_FISICA : DOCS_MORAL

  useEffect(() => {
    if (!solicitudId) { setLoading(false); return }
    getSolicitudProveedorById(solicitudId)
      .then(data => {
        setForm({
          FechaRegistro:    String(data.FechaRegistro || '').slice(0, 10),
          CondicionesPago:  data.CondicionesPago  || '',
          RazonSocial:      data.RazonSocial      || '',
          RFC:              data.RFC              || '',
          Calle:            data.Calle            || '',
          Colonia:          data.Colonia          || '',
          Ciudad:           data.Ciudad           || '',
          EstadoDir:        data.EstadoDir        || '',
          CodigoPostal:     data.CodigoPostal     || '',
          ProductoServicio: data.ProductoServicio || '',
          TipoPersona:      data.TipoPersona      || 'moral',
          GerenteNombre:    data.GerenteNombre    || '',
          GerenteTelefono:  data.GerenteTelefono  || '',
          GerenteFax:       data.GerenteFax       || '',
          GerenteEmail:     data.GerenteEmail     || '',
          CxCNombre:        data.CxCNombre        || '',
          CxCTelefono:      data.CxCTelefono      || '',
          CxCFax:           data.CxCFax           || '',
          CxCEmail:         data.CxCEmail         || '',
          Banco:            data.Banco            || '',
          Clabe:            data.Clabe            || '',
          NoCuenta:         data.NoCuenta         || '',
          Moneda:           data.Moneda           || 'MXN',
          Referencia:       data.Referencia       || '',
        })
        setDocs(data.documentos || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [solicitudId])

  function f(field) { return e => setForm(prev => ({ ...prev, [field]: e.target.value })) }

  async function guardar(e) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      if (solicitudId) {
        await updateSolicitudProveedor(solicitudId, form)
      } else {
        const res = await createSolicitudProveedor(form)
        onGuardado(res.solicitudId)
        setSuccess('Solicitud guardada como borrador.')
        return
      }
      setSuccess('Cambios guardados.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function enviar() {
    if (!solicitudId) { setError('Guarda primero la solicitud.'); return }
    if (!window.confirm('¿Enviar la solicitud a autorización? Ya no podrás editarla.')) return
    setError(null); setEnviando(true)
    try {
      await enviarSolicitudProveedor(solicitudId)
      setSuccess('Solicitud enviada a autorización.')
      onGuardado(solicitudId)
    } catch (err) { setError(err.message) }
    finally { setEnviando(false) }
  }

  function handleFileSelect(tipoDoc, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const extOk = ALLOWED_EXT.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!extOk) { setDocErrors(p => ({ ...p, [tipoDoc]: 'Formato no permitido (PDF, XML, JPG, PNG).' })); return }
    if (file.size > 20 * 1024 * 1024) { setDocErrors(p => ({ ...p, [tipoDoc]: 'Supera 20 MB.' })); return }
    setDocErrors(p => ({ ...p, [tipoDoc]: null }))
    const reader = new FileReader()
    reader.onload = async () => {
      setUploadingDoc(tipoDoc)
      try {
        await subirDocumentoProveedor(solicitudId, tipoDoc, reader.result, file.name)
        const updated = await getSolicitudProveedorById(solicitudId)
        setDocs(updated.documentos || [])
        setSuccess(`Documento "${file.name}" guardado.`)
      } catch (err) { setDocErrors(p => ({ ...p, [tipoDoc]: err.message })) }
      finally { setUploadingDoc(null); if (fileInputRefs.current[tipoDoc]) fileInputRefs.current[tipoDoc].value = '' }
    }
    reader.readAsDataURL(file)
  }

  async function eliminarDoc(docId) {
    if (!window.confirm('¿Eliminar este documento?')) return
    try {
      await eliminarDocumentoProveedor(solicitudId, docId)
      setDocs(prev => prev.filter(d => d.DocumentoId !== docId))
    } catch (err) { setError(err.message) }
  }

  if (loading) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>Cargando...</p>

  const docsByTipo = Object.fromEntries(docs.map(d => [d.TipoDocumento, d]))
  const esEditable = !readOnly

  return (
    <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Datos generales ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <Field label="Fecha">
          <input type="date" style={inputStyle()} value={form.FechaRegistro} onChange={f('FechaRegistro')} disabled={!esEditable} />
        </Field>
        <Field label="Condiciones de Pago">
          <input type="text" style={inputStyle()} value={form.CondicionesPago} onChange={f('CondicionesPago')} disabled={!esEditable} placeholder="Ej. 30 días" />
        </Field>
        <Field label="Tipo de persona">
          <select style={inputStyle()} value={form.TipoPersona} onChange={f('TipoPersona')} disabled={!esEditable}>
            <option value="moral">Persona Moral</option>
            <option value="fisica">Persona Física</option>
          </select>
        </Field>
      </div>

      {/* ── Información general ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Información General" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Razón Social *" span={1}>
            <input type="text" style={inputStyle()} value={form.RazonSocial} onChange={f('RazonSocial')} required disabled={!esEditable} />
          </Field>
          <Field label="RFC *">
            <input type="text" style={inputStyle()} value={form.RFC} onChange={f('RFC')} required disabled={!esEditable} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <Field label="Calle y No.">
            <input type="text" style={inputStyle(true)} value={form.Calle} onChange={f('Calle')} disabled={!esEditable} />
          </Field>
          <Field label="Colonia">
            <input type="text" style={inputStyle(true)} value={form.Colonia} onChange={f('Colonia')} disabled={!esEditable} />
          </Field>
          <Field label="Ciudad">
            <input type="text" style={inputStyle(true)} value={form.Ciudad} onChange={f('Ciudad')} disabled={!esEditable} />
          </Field>
          <Field label="Estado">
            <input type="text" style={inputStyle(true)} value={form.EstadoDir} onChange={f('EstadoDir')} disabled={!esEditable} />
          </Field>
          <Field label="C.P.">
            <input type="text" style={inputStyle(true)} value={form.CodigoPostal} onChange={f('CodigoPostal')} disabled={!esEditable} />
          </Field>
        </div>
        <div style={{ marginTop: '10px' }}>
          <Field label="Producto / Servicio">
            <input type="text" style={inputStyle()} value={form.ProductoServicio} onChange={f('ProductoServicio')} disabled={!esEditable} />
          </Field>
        </div>
      </div>

      {/* ── Contactos ───────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Contactos" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '140px', padding: '6px 8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}></th>
                {['Nombre', 'Teléfono', 'Fax', 'E-mail'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', background: '#f9fafb', border: '1px solid #e5e7eb', fontWeight: 600, color: '#1e3a8a', textAlign: 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Gerente Ventas', fields: ['GerenteNombre','GerenteTelefono','GerenteFax','GerenteEmail'] },
                { label: 'Cuentas por Cobrar', fields: ['CxCNombre','CxCTelefono','CxCFax','CxCEmail'] },
              ].map(row => (
                <tr key={row.label}>
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#d97706', fontSize: '11px', whiteSpace: 'nowrap' }}>{row.label}</td>
                  {row.fields.map(field => (
                    <td key={field} style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>
                      <input type={field.includes('Email') ? 'email' : 'text'} style={{ ...inputStyle(true), border: 'none', background: 'transparent', padding: '2px 4px' }}
                        value={form[field]} onChange={f(field)} disabled={!esEditable} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Info bancaria ───────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Información Bancaria para Pago por Transferencia" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
          <Field label="Banco"><input type="text" style={inputStyle(true)} value={form.Banco} onChange={f('Banco')} disabled={!esEditable} /></Field>
          <Field label="CLABE"><input type="text" style={inputStyle(true)} value={form.Clabe} onChange={f('Clabe')} disabled={!esEditable} /></Field>
          <Field label="No. Cuenta"><input type="text" style={inputStyle(true)} value={form.NoCuenta} onChange={f('NoCuenta')} disabled={!esEditable} /></Field>
          <Field label="Moneda">
            <select style={inputStyle(true)} value={form.Moneda} onChange={f('Moneda')} disabled={!esEditable}>
              <option value="MXN">MXN</option><option value="USD">USD</option><option value="EUR">EUR</option>
            </select>
          </Field>
          <Field label="Referencia"><input type="text" style={inputStyle(true)} value={form.Referencia} onChange={f('Referencia')} disabled={!esEditable} /></Field>
        </div>
      </div>

      {/* ── Soporte documental ──────────────────────────────────────────────── */}
      {solicitudId && (
        <div>
          <SectionHeader title="Soporte Documental" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docsRequeridos.map((doc, idx) => {
              const existente = docsByTipo[doc.key]
              const isUploading = uploadingDoc === doc.key
              return (
                <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                  border: `1px solid ${existente ? '#bbf7d0' : '#e5e7eb'}`,
                  background: existente ? '#f0fdf4' : '#fafafa', borderRadius: '8px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{existente ? '✅' : '📄'}</span>
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: existente ? 500 : 400, color: existente ? '#15803d' : '#374151' }}>
                    <span style={{ marginRight: '6px', color: '#6b7280', fontWeight: 700 }}>{idx + 1}.</span>
                    {doc.label}
                    {existente && <span style={{ marginLeft: '8px', color: '#6b7280', fontWeight: 400 }}>— {existente.Nombre}</span>}
                  </span>
                  {existente && (
                    <button type="button" onClick={() => descargarDocumentoProveedor(solicitudId, existente.DocumentoId, existente.Nombre)}
                      style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Descargar
                    </button>
                  )}
                  {esEditable && (
                    <>
                      <input ref={el => fileInputRefs.current[doc.key] = el} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png"
                        style={{ display: 'none' }} id={`doc-input-${doc.key}`}
                        onChange={e => handleFileSelect(doc.key, e)} />
                      <label htmlFor={`doc-input-${doc.key}`} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                        background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {isUploading ? 'Subiendo...' : existente ? 'Reemplazar' : 'Subir'}
                      </label>
                      {existente && (
                        <button type="button" onClick={() => eliminarDoc(existente.DocumentoId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
            {Object.values(docErrors).filter(Boolean).map((e, i) => (
              <p key={i} style={{ margin: 0, fontSize: '11px', color: '#b91c1c' }}>{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Acciones ────────────────────────────────────────────────────────── */}
      {error && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'10px 14px', color:'#b91c1c', fontSize:'13px' }}>{error}</div>}
      {success && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 14px', color:'#15803d', fontSize:'13px' }}>{success}</div>}

      {esEditable && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving}
            style={{ padding:'9px 20px', borderRadius:'8px', border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          {solicitudId && (
            <button type="button" onClick={enviar} disabled={enviando}
              style={{ padding:'9px 20px', borderRadius:'8px', border:'none', background:'#1e3a8a', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
              {enviando ? 'Enviando...' : 'Enviar a autorización'}
            </button>
          )}
        </div>
      )}
    </form>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function RegistroProveedores({ currentUser, currentUserRol }) {
  const esAutorizador = ['admin', 'autorizador1'].includes(currentUserRol)
  const [activeTab, setActiveTab]       = useState('lista')
  const [solicitudes, setSolicitudes]   = useState([])
  const [loadingList, setLoadingList]   = useState(true)
  const [selectedId, setSelectedId]     = useState(null)
  const [selectedEstado, setSelectedEstado] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [actionError, setActionError]   = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  function cargarLista() {
    setLoadingList(true)
    getSolicitudesProveedor()
      .then(setSolicitudes)
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }

  useEffect(() => { cargarLista() }, [])

  function abrirSolicitud(sol) {
    setSelectedId(sol.SolicitudId)
    setSelectedEstado(sol.Estado)
    setActiveTab('formulario')
  }

  function nuevaSolicitud() {
    setSelectedId(null)
    setSelectedEstado(null)
    setActiveTab('formulario')
  }

  function handleGuardado(id) {
    setSelectedId(id)
    setSelectedEstado('borrador')
    cargarLista()
  }

  async function handleAprobar(id) {
    if (!window.confirm('¿Aprobar esta solicitud? Se creará el proveedor en el catálogo.')) return
    setActionError(null)
    try {
      await aprobarSolicitudProveedor(id)
      setActionSuccess('Solicitud aprobada. Proveedor dado de alta en el catálogo.')
      cargarLista()
      setActiveTab('lista')
    } catch (err) { setActionError(err.message) }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return
    setActionError(null)
    try {
      await eliminarSolicitudProveedor(id)
      setActionSuccess('Solicitud eliminada.')
      cargarLista()
    } catch (err) { setActionError(err.message) }
  }

  async function handleRechazar() {
    setActionError(null)
    try {
      await rechazarSolicitudProveedor(rechazandoId, motivoRechazo)
      setActionSuccess('Solicitud rechazada.')
      setRechazandoId(null); setMotivoRechazo('')
      cargarLista()
      setActiveTab('lista')
    } catch (err) { setActionError(err.message) }
  }

  const tabs = [
    { key: 'lista', label: 'Solicitudes' },
    { key: 'formulario', label: selectedId ? 'Ver / Editar' : 'Nueva solicitud' },
  ]

  const readOnly = selectedEstado && selectedEstado !== 'borrador'
  const puedeFirmar = esAutorizador && selectedEstado === 'pendiente'

  return (
    <div className="cotizacion-page">
      <div className="panel card">
        <div className="panel-header space-between" style={{ flexWrap:'wrap', gap:'16px', alignItems:'center' }}>
          <div>
            <p style={{ margin:'8px 0 0', color:'#6b7280' }}>Solicita el alta de un proveedor y gestiona autorizaciones.</p>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {tabs.map(t => (
              <button key={t.key} type="button"
                className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
            {activeTab === 'lista' && (
              <button type="button" className="primary-button" onClick={nuevaSolicitud} style={{ fontSize:'13px', padding:'8px 16px' }}>
                + Nueva solicitud
              </button>
            )}
          </div>
        </div>

        {actionSuccess && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px', padding:'12px 16px', color:'#15803d', fontSize:'14px', marginBottom:'4px' }}>
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'12px 16px', color:'#b91c1c', fontSize:'14px', marginBottom:'4px' }}>
            {actionError}
          </div>
        )}

        {/* ── Lista ─────────────────────────────────────────────────────────── */}
        {activeTab === 'lista' && (
          loadingList ? (
            <p style={{ textAlign:'center', color:'#9ca3af', padding:'40px 0' }}>Cargando...</p>
          ) : solicitudes.length === 0 ? (
            <div style={{ textAlign:'center', color:'#9ca3af', padding:'60px 0' }}>
              <p>No hay solicitudes aún.</p>
              <button type="button" className="primary-button" onClick={nuevaSolicitud} style={{ marginTop:'12px' }}>
                Crear primera solicitud
              </button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr>
                    {['#', 'Razón Social', 'RFC', 'Tipo', 'Solicitante', 'Fecha', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ background:'#1e3a8a', color:'#fff', padding:'8px 10px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((sol, i) => (
                    <tr key={sol.SolicitudId} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6', color:'#6b7280', fontWeight:600 }}>{sol.SolicitudId}</td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6', fontWeight:600 }}>{sol.RazonSocial || '—'}</td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6' }}>{sol.RFC || '—'}</td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6', textTransform:'capitalize' }}>{sol.TipoPersona || '—'}</td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6' }}>{sol.CreadoPor || '—'}</td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>
                        {sol.FechaCreacion ? new Date(sol.FechaCreacion).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6' }}>{estadoBadge(sol.Estado)}</td>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid #f3f4f6' }}>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <button type="button" className="ghost-button" onClick={() => abrirSolicitud(sol)}
                            style={{ fontSize:'11px', padding:'3px 10px' }}>
                            {sol.Estado === 'borrador' ? 'Editar' : 'Ver'}
                          </button>
                          {esAutorizador && sol.Estado === 'pendiente' && (<>
                            <button type="button" onClick={() => handleAprobar(sol.SolicitudId)}
                              style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'6px', background:'#16a34a', color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>
                              Aprobar
                            </button>
                            <button type="button" onClick={() => { setRechazandoId(sol.SolicitudId); setMotivoRechazo(''); setActionError(null) }}
                              style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'6px', background:'#fee2e2', color:'#b91c1c', border:'1px solid #fca5a5', cursor:'pointer', fontWeight:600 }}>
                              Rechazar
                            </button>
                          </>)}
                          {currentUserRol === 'admin' && (
                            <button type="button" onClick={() => handleEliminar(sol.SolicitudId)}
                              style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'6px', background:'#fee2e2', color:'#b91c1c', border:'1px solid #fca5a5', cursor:'pointer', fontWeight:600 }}>
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Formulario ────────────────────────────────────────────────────── */}
        {activeTab === 'formulario' && (
          <div>
            {selectedEstado && (
              <div style={{ marginBottom:'16px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                {estadoBadge(selectedEstado)}
                {puedeFirmar && (
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button type="button" onClick={() => handleAprobar(selectedId)}
                      style={{ padding:'6px 16px', borderRadius:'8px', background:'#16a34a', color:'#fff', border:'none', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>
                      Aprobar solicitud
                    </button>
                    <button type="button" onClick={() => { setRechazandoId(selectedId); setMotivoRechazo(''); setActionError(null) }}
                      style={{ padding:'6px 16px', borderRadius:'8px', background:'#fee2e2', color:'#b91c1c', border:'1px solid #fca5a5', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>
                      Rechazar solicitud
                    </button>
                  </div>
                )}
              </div>
            )}
            <FormularioSolicitud
              solicitudId={selectedId}
              currentUser={currentUser}
              onGuardado={handleGuardado}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* ── Modal rechazo ─────────────────────────────────────────────────────── */}
      {rechazandoId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'20px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'440px', padding:'24px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin:'0 0 16px', fontSize:'16px', fontWeight:700 }}>Rechazar solicitud</h3>
            <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Motivo del rechazo</label>
            <textarea className="form-control" rows={3} value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              placeholder="Describa el motivo..." style={{ width:'100%', boxSizing:'border-box' }} />
            {actionError && <p style={{ color:'#b91c1c', fontSize:'12px', marginTop:'6px' }}>{actionError}</p>}
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'16px' }}>
              <button type="button" onClick={() => setRechazandoId(null)}
                style={{ padding:'8px 18px', borderRadius:'8px', border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:'13px' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleRechazar}
                style={{ padding:'8px 18px', borderRadius:'8px', border:'none', background:'#b91c1c', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
