import { useState } from 'react'
import { descargarPdfCotizacion } from './pdfUtils'

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

export default function CotizacionDetallesModal({ open, cotizacionData, loading, error, onClose }) {
  const [descargando, setDescargando] = useState(false)
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
              disabled={descargando}
              onClick={async () => {
                setDescargando(true)
                try { await descargarPdfCotizacion(cotizacion, costos, participantes) }
                catch (e) { alert('No se pudo generar el PDF: ' + e.message) }
                finally { setDescargando(false) }
              }}
            >
              {descargando ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          )}
          <button type="button" className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
