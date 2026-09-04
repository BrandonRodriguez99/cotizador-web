import { useEffect, useState } from 'react'
import { getPermisos, updatePermisosRol } from './api'

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'autorizador1', label: 'Autorizador 1' },
  { id: 'autorizador2', label: 'Autorizador 2' },
  { id: 'empleado', label: 'Empleado' },
  { id: 'jefe_mantenimiento', label: 'Jefe Mtto.' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'encargado_vehiculos', label: 'Enc. Vehículos' },
]

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)
  const [savedOk, setSavedOk] = useState(null)

  useEffect(() => {
    setLoading(true)
    getPermisos()
      .then(data => setPermisos(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function toggle(rol, vista) {
    setPermisos(prev => {
      const actual = new Set(prev[rol] || [])
      actual.has(vista) ? actual.delete(vista) : actual.add(vista)
      return { ...prev, [rol]: [...actual] }
    })
  }

  function toggleAll(rol, todas) {
    setPermisos(prev => ({ ...prev, [rol]: todas ? [...ALL_VISTAS] : [] }))
  }

  async function handleGuardar(rol) {
    setSaving(rol)
    setSavedOk(null)
    try {
      await updatePermisosRol(rol, permisos[rol] || [])
      setSavedOk(rol)
      setTimeout(() => setSavedOk(null), 2000)
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="notification">Cargando permisos...</div>
  if (error) return <div className="notification error">{error}</div>

  const colSpanPerSeccion = SECCIONES.map(s => s.vistas.length)
  const totalCols = ALL_VISTAS.length

  return (
    <section className="panel card">
      <div className="panel-header">
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
          Configura qué vistas puede ver cada rol. Los cambios aplican en el próximo inicio de sesión.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px', width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle(true)} rowSpan={2}>Rol</th>
              {SECCIONES.map((s, i) => (
                <th key={s.titulo} colSpan={colSpanPerSeccion[i]}
                  style={{ ...thStyle(), background: '#f0f4ff', textAlign: 'center', fontWeight: 700 }}>
                  {s.titulo}
                </th>
              ))}
              <th style={thStyle(true)} rowSpan={2}>Acciones</th>
            </tr>
            <tr>
              {SECCIONES.flatMap(s => s.vistas.map(v => (
                <th key={v.id} style={{ ...thStyle(), fontWeight: 500, writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '8px 6px', maxWidth: '28px', whiteSpace: 'nowrap' }}>
                  {v.label}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(rol => {
              const selSet = new Set(permisos[rol] || [])
              const todas = ALL_VISTAS.every(v => selSet.has(v))
              return (
                <tr key={rol.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ ...tdStyle(), fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" title="Seleccionar todas"
                        checked={todas}
                        onChange={() => toggleAll(rol.id, !todas)}
                        style={{ cursor: 'pointer' }}
                      />
                      {rol.label}
                    </div>
                  </td>
                  {ALL_VISTAS.map(vista => (
                    <td key={vista} style={{ ...tdStyle(), textAlign: 'center' }}>
                      <input type="checkbox"
                        checked={selSet.has(vista)}
                        onChange={() => toggle(rol.id, vista)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                  ))}
                  <td style={{ ...tdStyle(), whiteSpace: 'nowrap' }}>
                    <button
                      className="primary-button"
                      style={{ fontSize: '12px', padding: '4px 12px', background: savedOk === rol.id ? '#16a34a' : undefined, borderColor: savedOk === rol.id ? '#16a34a' : undefined }}
                      disabled={saving !== null}
                      onClick={() => handleGuardar(rol.id)}
                    >
                      {saving === rol.id ? '...' : savedOk === rol.id ? 'Guardado' : 'Guardar'}
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
