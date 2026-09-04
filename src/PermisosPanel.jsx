import { useEffect, useState } from 'react'
import { getPermisos, updatePermisosRol } from './api'

const ROLES_DEFAULT = [
  'admin', 'autorizador1', 'autorizador2', 'empleado',
  'jefe_mantenimiento', 'mantenimiento', 'seguridad', 'encargado_vehiculos',
]

const ROL_LABELS = {
  admin: 'Admin',
  autorizador1: 'Autorizador 1',
  autorizador2: 'Autorizador 2',
  empleado: 'Empleado',
  jefe_mantenimiento: 'Jefe Mtto.',
  mantenimiento: 'Mantenimiento',
  seguridad: 'Seguridad',
  encargado_vehiculos: 'Enc. Vehículos',
}

const SECCIONES = [
  { titulo: 'Inicio', vistas: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inicio', label: 'Inicio' },
  ]},
  { titulo: 'Herramientas', vistas: [
    { id: 'mantenimiento', label: 'Mtto.' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'ordenesCompra', label: 'OC' },
    { id: 'registroProveedores', label: 'Reg. Prov.' },
    { id: 'cotizacion', label: 'Cotización' },
    { id: 'historial', label: 'Historial' },
    { id: 'aprobaciones', label: 'Aprobaciones' },
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'vehiculos', label: 'Vehículos' },
    { id: 'seguridad', label: 'Seguridad' },
  ]},
  { titulo: 'Catálogos', vistas: [
    { id: 'cursos', label: 'Cursos' },
    { id: 'conceptos', label: 'Conceptos' },
    { id: 'coaches', label: 'Coaches' },
    { id: 'modalidades', label: 'Modalidades' },
    { id: 'clientes', label: 'Empresas' },
    { id: 'proveedores', label: 'Proveedores' },
    { id: 'unidadesNegocio', label: 'Und. Neg.' },
    { id: 'areasConsumo', label: 'Áreas' },
  ]},
  { titulo: 'Administración', vistas: [
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'permisos', label: 'Permisos' },
  ]},
]

const ALL_VISTAS = SECCIONES.flatMap(s => s.vistas.map(v => v.id))

export default function PermisosPanel() {
  const [permisos, setPermisos] = useState({})
  const [roles, setRoles] = useState(ROLES_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)
  const [savedOk, setSavedOk] = useState(null)
  const [nuevoRol, setNuevoRol] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    setLoading(true)
    getPermisos()
      .then(data => {
        setPermisos(data)
        // Merge API roles with defaults (preservar orden default + agregar extras)
        const apiRoles = Object.keys(data)
        const merged = [...new Set([...ROLES_DEFAULT, ...apiRoles])]
        setRoles(merged)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function toggle(rolId, vista) {
    setPermisos(prev => {
      const actual = new Set(prev[rolId] || [])
      actual.has(vista) ? actual.delete(vista) : actual.add(vista)
      return { ...prev, [rolId]: [...actual] }
    })
  }

  function toggleAll(rolId, todas) {
    setPermisos(prev => ({ ...prev, [rolId]: todas ? [...ALL_VISTAS] : [] }))
  }

  async function handleGuardar(rolId) {
    setSaving(rolId)
    setSavedOk(null)
    try {
      await updatePermisosRol(rolId, permisos[rolId] || [])
      setSavedOk(rolId)
      setTimeout(() => setSavedOk(null), 2000)
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(null)
    }
  }

  function handleAgregarRol() {
    const r = nuevoRol.trim().toLowerCase().replace(/\s+/g, '_')
    if (!r) { setAddError('Escribe un nombre de rol'); return }
    if (roles.includes(r)) { setAddError('Ese rol ya existe'); return }
    setRoles(prev => [...prev, r])
    setPermisos(prev => ({ ...prev, [r]: [] }))
    setNuevoRol('')
    setAddError('')
  }

  if (loading) return <div className="notification">Cargando permisos...</div>
  if (error) return <div className="notification error">{error}</div>

  return (
    <section className="panel card">
      <div className="panel-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
          Configura qué vistas puede ver cada rol. Los cambios aplican en el próximo inicio de sesión.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <input
            type="text"
            className="form-control"
            placeholder="nombre_rol_nuevo"
            value={nuevoRol}
            onChange={e => { setNuevoRol(e.target.value); setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAgregarRol()}
            style={{ width: '180px', padding: '6px 10px', fontSize: '13px' }}
          />
          <button className="ghost-button" style={{ fontSize: '13px', padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={handleAgregarRol}>
            + Agregar rol
          </button>
          {addError && <span style={{ color: '#dc2626', fontSize: '12px' }}>{addError}</span>}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px', width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle(true)} rowSpan={2}>Rol</th>
              {SECCIONES.map(s => (
                <th key={s.titulo} colSpan={s.vistas.length}
                  style={{ ...thStyle(), background: '#f0f4ff', textAlign: 'center', fontWeight: 700 }}>
                  {s.titulo}
                </th>
              ))}
              <th style={thStyle(true)} rowSpan={2}>Acciones</th>
            </tr>
            <tr>
              {SECCIONES.flatMap(s => s.vistas.map(v => (
                <th key={v.id} style={{
                  ...thStyle(), fontWeight: 500,
                  writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  padding: '8px 6px', maxWidth: '28px', whiteSpace: 'nowrap',
                }}>
                  {v.label}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {roles.map(rolId => {
              const selSet = new Set(permisos[rolId] || [])
              const todas = ALL_VISTAS.every(v => selSet.has(v))
              const label = ROL_LABELS[rolId] || rolId
              return (
                <tr key={rolId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ ...tdStyle(), fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" title="Seleccionar todas"
                        checked={todas}
                        onChange={() => toggleAll(rolId, !todas)}
                        style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                      />
                      {label}
                    </div>
                  </td>
                  {ALL_VISTAS.map(vista => (
                    <td key={vista} style={{ ...tdStyle(), textAlign: 'center' }}>
                      <input type="checkbox"
                        checked={selSet.has(vista)}
                        onChange={() => toggle(rolId, vista)}
                        style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                      />
                    </td>
                  ))}
                  <td style={{ ...tdStyle(), whiteSpace: 'nowrap' }}>
                    <button
                      className="primary-button"
                      style={{
                        fontSize: '12px', padding: '4px 12px',
                        background: savedOk === rolId ? '#16a34a' : undefined,
                        borderColor: savedOk === rolId ? '#16a34a' : undefined,
                      }}
                      disabled={saving !== null}
                      onClick={() => handleGuardar(rolId)}
                    >
                      {saving === rolId ? '...' : savedOk === rolId ? 'Guardado ✓' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function thStyle(header = false) {
  return {
    padding: header ? '10px 12px' : '6px 8px',
    border: '1px solid #e5e7eb',
    background: header ? '#f9fafb' : undefined,
    textAlign: 'left',
    verticalAlign: 'middle',
  }
}

function tdStyle() {
  return {
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    verticalAlign: 'middle',
  }
}
