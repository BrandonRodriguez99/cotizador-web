import React from 'react'
import {
  createCliente,
  updateCliente,
  deleteCliente,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoachesTodos,
  createConcepto,
  updateConcepto,
  deleteConcepto,
  createCurso,
  updateCurso,
  deleteCurso,
  createModalidad,
  updateModalidad,
  deleteModalidad,
  getClientes,
  getCoaches,
  getConceptos,
  getCursos,
  getCursosTodos,
  getModalidades,
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  getUnidadesNegocio,
  createUnidadNegocio,
  updateUnidadNegocio,
  deleteUnidadNegocio,
  getAreasConsumo,
  createAreaConsumo,
  updateAreaConsumo,
  deleteAreaConsumo,
} from './api'

export const CATALOG_DEFINITIONS = {
  clientes: {
    title: 'Empresas',
    subtitle: 'Catálogo de clientes y empresas',
    idField: 'ClienteId',
    fetch: getClientes,
    create: createCliente,
    update: updateCliente,
    delete: deleteCliente,
    columns: [
      { header: 'ID', accessor: 'ClienteId' },
      { header: 'Nombre', accessor: 'Nombre' },
    ],
    fields: [{ name: 'Nombre', label: 'Nombre de la empresa', required: true }],
  },
  proveedores: {
    title: 'Proveedores',
    subtitle: 'Catálogo de proveedores para órdenes de compra',
    idField: 'ProveedorId',
    fetch: getProveedores,
    create: createProveedor,
    update: updateProveedor,
    delete: deleteProveedor,
    columns: [
      { header: 'ID', accessor: 'ProveedorId' },
      { header: 'Proveedor', accessor: 'Nombre' },
      { header: 'RFC', accessor: 'RFC' },
      { header: 'Correo', accessor: 'Correo' },
      { header: 'Teléfono', accessor: 'Telefono' },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre del proveedor', required: true },
      { name: 'RFC', label: 'RFC', required: false },
      { name: 'Correo', label: 'Correo electrónico', type: 'text' },
      { name: 'Telefono', label: 'Teléfono', type: 'text' },
    ],
  },
  unidadesNegocio: {
    title: 'Unidad de Negocio',
    subtitle: 'Catálogo de unidades de negocio para órdenes de compra',
    idField: 'UnidadNegocioId',
    fetch: getUnidadesNegocio,
    create: createUnidadNegocio,
    update: updateUnidadNegocio,
    delete: deleteUnidadNegocio,
    columns: [
      { header: 'ID', accessor: 'UnidadNegocioId' },
      { header: 'Unidad de negocio', accessor: 'Nombre' },
      { header: 'Responsable', accessor: 'Responsable' },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre de la unidad', required: true },
      { name: 'Responsable', label: 'Responsable', type: 'text' },
    ],
  },
  cursos: {
    title: 'Cursos',
    subtitle: 'Catálogo de programas y cursos',
    idField: 'CursoId',
    fetch: getCursosTodos,
    create: createCurso,
    update: updateCurso,
    delete: deleteCurso,
    columns: [
      { header: 'ID', accessor: 'CursoId' },
      { header: 'Nombre', accessor: 'Nombre' },
      { header: 'Descripción', accessor: 'Descripcion' },
      { header: 'Tipo', accessor: 'TipoCurso' },
      { header: 'Horas', accessor: 'Horas' },
      { header: 'Costo', accessor: 'Costo' },
      { header: 'Duración (días)', accessor: 'DuracionDefaultDias' },
      { header: 'Activo', accessor: 'Activo', render: (value) => value === false || value === 0
        ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' },
              React.createElement('circle', { cx: 12, cy: 12, r: 10, fill: '#f97316' }),
              React.createElement('path', { d: 'M8 8l8 8M16 8l-8 8', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round' })
            ),
            'Inactivo'
          )
        : React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' },
              React.createElement('path', { d: 'M12 1.5c-.6 0-1.1.3-1.4.7L9 3.4l-1.8-.5c-.6-.2-1.2 0-1.6.4L4.3 4.6c-.4.4-.5 1-.4 1.6l.5 1.8-1.2 1.4c-.4.5-.6 1.1-.4 1.7l.5 1.8-1 1.5c-.3.5-.3 1.1 0 1.6l1 1.5-.5 1.8c-.2.6 0 1.2.4 1.7l1.2 1.4-.5 1.8c-.1.6.1 1.2.4 1.6l1.3 1.3c.4.4 1 .6 1.6.4l1.8-.5 1.4 1.2c.5.4 1.1.5 1.7.4L12 22.5c.6 0 1.1-.3 1.4-.7l1.6-1.2 1.8.5c.6.2 1.2 0 1.6-.4l1.3-1.3c.4-.4.5-1 .4-1.6l-.5-1.8 1.2-1.4c.4-.5.6-1.1.4-1.7l-.5-1.8 1-1.5c.3-.5.3-1.1 0-1.6l-1-1.5.5-1.8c.2-.6 0-1.2-.4-1.7l-1.2-1.4.5-1.8c.1-.6-.1-1.2-.4-1.6L18.3 3.3c-.4-.4-1-.6-1.6-.4l-1.8.5L13.4 2.2c-.3-.4-.8-.7-1.4-.7z', fill: '#2563eb' }),
              React.createElement('path', { d: 'M8.5 12.5l2.5 2.5 4.5-5', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' })
            ),
            'Activo'
          )
      },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre del curso', required: true },
      { name: 'Descripcion', label: 'Descripción del curso' },
      { name: 'TipoCurso', label: 'Tipo de curso', type: 'select', options: [
        { value: '', label: '-- Seleccionar --' },
        { value: 'Mandatorio', label: 'Mandatorio' },
        { value: 'Extraordinario', label: 'Extraordinario' },
      ]},
      { name: 'Horas', label: 'Horas', type: 'number' },
      { name: 'Costo', label: 'Costo ($)', type: 'number' },
      { name: 'DuracionDefaultDias', label: 'Duración por defecto (días)', type: 'number' },
      { name: 'Activo', label: 'Activo', type: 'checkbox' },
    ],
  },
  coaches: {
    title: 'Coaches',
    subtitle: 'Catálogo de coaches e instructores',
    idField: 'CoachId',
    fetch: getCoachesTodos,
    create: createCoach,
    update: updateCoach,
    delete: deleteCoach,
    columns: [
      { header: 'ID', accessor: 'CoachId' },
      { header: 'Nombre', accessor: 'Nombre' },
      {
        header: 'Costo',
        accessor: 'Costo',
        render: (value) => (value != null ? `$ ${Number(value).toFixed(2)}` : '-'),
      },
      { header: 'Activo', accessor: 'Activo', render: (value) => value === false || value === 0
        ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' },
              React.createElement('circle', { cx: 12, cy: 12, r: 10, fill: '#f97316' }),
              React.createElement('path', { d: 'M8 8l8 8M16 8l-8 8', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round' })
            ),
            'Inactivo'
          )
        : React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' },
              React.createElement('path', { d: 'M12 1.5c-.6 0-1.1.3-1.4.7L9 3.4l-1.8-.5c-.6-.2-1.2 0-1.6.4L4.3 4.6c-.4.4-.5 1-.4 1.6l.5 1.8-1.2 1.4c-.4.5-.6 1.1-.4 1.7l.5 1.8-1 1.5c-.3.5-.3 1.1 0 1.6l1 1.5-.5 1.8c-.2.6 0 1.2.4 1.7l1.2 1.4-.5 1.8c-.1.6.1 1.2.4 1.6l1.3 1.3c.4.4 1 .6 1.6.4l1.8-.5 1.4 1.2c.5.4 1.1.5 1.7.4L12 22.5c.6 0 1.1-.3 1.4-.7l1.6-1.2 1.8.5c.6.2 1.2 0 1.6-.4l1.3-1.3c.4-.4.5-1 .4-1.6l-.5-1.8 1.2-1.4c.4-.5.6-1.1.4-1.7l-.5-1.8 1-1.5c.3-.5.3-1.1 0-1.6l-1-1.5.5-1.8c.2-.6 0-1.2-.4-1.7l-1.2-1.4.5-1.8c.1-.6-.1-1.2-.4-1.6L18.3 3.3c-.4-.4-1-.6-1.6-.4l-1.8.5L13.4 2.2c-.3-.4-.8-.7-1.4-.7z', fill: '#2563eb' }),
              React.createElement('path', { d: 'M8.5 12.5l2.5 2.5 4.5-5', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' })
            ),
            'Activo'
          )
      },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre del coach', required: true },
      { name: 'Costo', label: 'Costo ($)', type: 'number', step: '0.01' },
      { name: 'Activo', label: 'Activo', type: 'checkbox' },
    ],
  },
  modalidades: {
    title: 'Modalidades',
    subtitle: 'Catálogo de modalidades disponibles',
    idField: 'ModalidadId',
    fetch: getModalidades,
    create: createModalidad,
    update: updateModalidad,
    delete: deleteModalidad,
    columns: [
      { header: 'ID', accessor: 'ModalidadId' },
      { header: 'Nombre', accessor: 'Nombre' },
    ],
    fields: [{ name: 'Nombre', label: 'Nombre de la modalidad', required: true }],
  },
  conceptos: {
    title: 'Conceptos de Costo',
    subtitle: 'Catálogo de conceptos de costo',
    idField: 'ConceptoCostoId',
    fetch: getConceptos,
    create: createConcepto,
    update: updateConcepto,
    delete: deleteConcepto,
    columns: [
      { header: 'ID', accessor: 'ConceptoCostoId' },
      { header: 'Concepto', accessor: 'Nombre' },
      { header: 'Tipo de costo', accessor: 'TipoCosto' },
      { header: 'Tipo de cálculo', accessor: 'TipoCalculo' },
      { header: 'Fórmula', accessor: 'Formula' },
      {
        header: 'Costo unitario',
        accessor: 'CostoUnitario',
        render: (value) => (value != null ? `$ ${Number(value).toFixed(2)}` : '-'),
      },
    ],
    fields: [
      {
        name: 'TipoCosto',
        label: 'Tipo de costo',
        type: 'select',
        options: [
          { value: 'Directos', label: 'Directos' },
          { value: 'Indirectos', label: 'Indirectos' },
        ],
        placeholder: 'Selecciona tipo de costo',
        required: true,
      },
      { name: 'Nombre', label: 'Concepto', required: true },
      {
        name: 'TipoCalculo',
        label: 'Tipo de cálculo',
        type: 'select',
        options: [
          { value: 'Por sesión', label: 'Por sesión' },
          { value: 'Por participante', label: 'Por participante' },
          { value: 'Por evento', label: 'Por evento' },
          { value: 'Por hora', label: 'Por hora' },
          { value: 'Por día', label: 'Por día' },
        ],
        placeholder: 'Selecciona cómo se costeará',
        required: true,
      },
      {
        name: 'Formula',
        label: 'Fórmula',
        placeholder: 'Ej: Sesiones x Días, Participantes, Eventos, Horas',
        required: true,
      },
      { name: 'CostoUnitario', label: 'Costo unitario', type: 'number', step: '0.01', required: true },
    ],
  },
  proveedores: {
    title: 'Proveedores',
    subtitle: 'Catálogo de proveedores para las órdenes de compra',
    idField: 'ProveedorId',
    fetch: getProveedores,
    create: createProveedor,
    update: updateProveedor,
    delete: deleteProveedor,
    columns: [
      { header: 'ID', accessor: 'ProveedorId' },
      { header: 'Nombre', accessor: 'Nombre' },
      { header: 'Contacto', accessor: 'Contacto' },
      { header: 'Teléfono', accessor: 'Telefono' },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre del proveedor', required: true },
      { name: 'Contacto', label: 'Persona de contacto' },
      { name: 'Telefono', label: 'Teléfono', type: 'text' },
      { name: 'Email', label: 'Correo electrónico', type: 'text' },
    ],
  },
  unidadesNegocio: {
    title: 'Unidades de negocio',
    subtitle: 'Catálogo de unidades de negocio para órdenes de compra',
    idField: 'UnidadNegocioId',
    fetch: getUnidadesNegocio,
    create: createUnidadNegocio,
    update: updateUnidadNegocio,
    delete: deleteUnidadNegocio,
    columns: [
      { header: 'ID', accessor: 'UnidadNegocioId' },
      { header: 'Nombre', accessor: 'Nombre' },
      { header: 'Responsable', accessor: 'Responsable' },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre de la unidad de negocio', required: true },
      { name: 'Responsable', label: 'Responsable' },
      { name: 'Area', label: 'Área' },
    ],
  },
  areasConsumo: {
    title: 'Áreas de Consumo',
    subtitle: 'Catálogo de áreas de destino para consumos de material de limpieza',
    idField: 'AreaConsumoId',
    fetch: getAreasConsumo,
    create: createAreaConsumo,
    update: updateAreaConsumo,
    delete: deleteAreaConsumo,
    columns: [
      { header: 'ID', accessor: 'AreaConsumoId' },
      { header: 'Nombre del área', accessor: 'Nombre' },
      { header: 'Descripción', accessor: 'Descripcion' },
    ],
    fields: [
      { name: 'Nombre', label: 'Nombre del área', required: true },
      { name: 'Descripcion', label: 'Descripción', type: 'text' },
    ],
  },
}

export function emptyFormForCatalog(catalogKey) {
  const fields = CATALOG_DEFINITIONS[catalogKey]?.fields || []
  return fields.reduce((acc, field) => {
    acc[field.name] = field.type === 'checkbox' ? 1 : ''
    return acc
  }, {})
}
