const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function getToken() {
  return typeof window !== 'undefined' ? window.localStorage.getItem('cotizador-token') : null;
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/${path}`, options);
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('cotizador-token');
      localStorage.removeItem('cotizador-usuario');
      window.location.replace('/login');
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }
    const errorBody = await response.text();
    let message = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      message = parsed.error || errorBody;
    } catch {
      // usar texto plano
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}

async function postJson(path, body) {
  return fetchJson(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function putJson(path, body) {
  return fetchJson(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function readLocalCatalog(key, defaults = []) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [...defaults]
  }
  try {
    const raw = window.localStorage.getItem(`cotizador-${key}`)
    if (!raw) {
      window.localStorage.setItem(`cotizador-${key}`, JSON.stringify(defaults))
      return [...defaults]
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...defaults]
  } catch (err) {
    return [...defaults]
  }
}

function writeLocalCatalog(key, items) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  window.localStorage.setItem(`cotizador-${key}`, JSON.stringify(items))
}

function nextLocalId(items, idField) {
  return items.reduce((max, item) => {
    const value = Number(item[idField]) || 0
    return value > max ? value : max
  }, 0) + 1
}

function createLocalCatalogItem(key, idField, data) {
  const items = readLocalCatalog(key, [])
  const nextId = nextLocalId(items, idField)
  const nextItem = { ...data, [idField]: nextId }
  items.push(nextItem)
  writeLocalCatalog(key, items)
  return nextItem
}

function updateLocalCatalogItem(key, idField, id, data) {
  const items = readLocalCatalog(key, [])
  const index = items.findIndex((item) => String(item[idField]) === String(id))
  if (index < 0) {
    throw new Error('Registro no encontrado')
  }
  items[index] = { ...items[index], ...data }
  writeLocalCatalog(key, items)
  return items[index]
}

function deleteLocalCatalogItem(key, idField, id) {
  const items = readLocalCatalog(key, [])
  const nextItems = items.filter((item) => String(item[idField]) !== String(id))
  writeLocalCatalog(key, nextItems)
  return { affected: items.length - nextItems.length }
}

async function deleteJson(path) {
  return fetchJson(path, {
    method: 'DELETE',
  });
}

export function getClientes() {
  return fetchJson('catalogos/clientes');
}

export function getCursos() {
  return fetchJson('catalogos/cursos');
}

export function getCoaches() {
  return fetchJson('catalogos/coaches');
}

export function getModalidades() {
  return fetchJson('catalogos/modalidades');
}

export function getConceptos() {
  return fetchJson('catalogos/conceptos');
}

export function getProveedores() {
  return fetchJson('catalogos/proveedores');
}

export function createProveedor(data) {
  return postJson('catalogos/proveedores', data);
}

export function updateProveedor(id, data) {
  return putJson(`catalogos/proveedores/${id}`, data);
}

export function deleteProveedor(id) {
  return deleteJson(`catalogos/proveedores/${id}`);
}

export function getUnidadesNegocio() {
  return fetchJson('catalogos/unidadesnegocio');
}

export function createUnidadNegocio(data) {
  return postJson('catalogos/unidadesnegocio', data);
}

export function updateUnidadNegocio(id, data) {
  return putJson(`catalogos/unidadesnegocio/${id}`, data);
}

export function deleteUnidadNegocio(id) {
  return deleteJson(`catalogos/unidadesnegocio/${id}`);
}

export function getEstados() {
  return fetchJson('catalogos/estados');
}

export function searchParticipantes(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchJson(`catalogos/participantes${query}`);
}

export function createCliente(data) {
  return postJson('catalogos/clientes', data);
}

export function updateCliente(id, data) {
  return putJson(`catalogos/clientes/${id}`, data);
}

export function deleteCliente(id, hard = false) {
  const q = hard ? '?hard=1' : '';
  return deleteJson(`catalogos/clientes/${id}${q}`);
}

export function createCurso(data) {
  return postJson('catalogos/cursos', data);
}

export function updateCurso(id, data) {
  return putJson(`catalogos/cursos/${id}`, data);
}

export function deleteCurso(id, hard = false) {
  const q = hard ? '?hard=1' : '';
  return deleteJson(`catalogos/cursos/${id}${q}`);
}

export function createCoach(data) {
  return postJson('catalogos/coaches', data);
}

export function updateCoach(id, data) {
  return putJson(`catalogos/coaches/${id}`, data);
}

export function deleteCoach(id, hard = false) {
  const q = hard ? '?hard=1' : '';
  return deleteJson(`catalogos/coaches/${id}${q}`);
}

export function createModalidad(data) {
  return postJson('catalogos/modalidades', data);
}

export function updateModalidad(id, data) {
  return putJson(`catalogos/modalidades/${id}`, data);
}

export function deleteModalidad(id, hard = false) {
  const q = hard ? '?hard=1' : '';
  return deleteJson(`catalogos/modalidades/${id}${q}`);
}

export function createConcepto(data) {
  return postJson('catalogos/conceptos', data);
}

export function updateConcepto(id, data) {
  return putJson(`catalogos/conceptos/${id}`, data);
}

export function deleteConcepto(id, hard = false) {
  const q = hard ? '?hard=1' : '';
  return deleteJson(`catalogos/conceptos/${id}${q}`);
}

export async function getCotizaciones() {
  return fetchJson('cotizaciones', { headers: authHeaders() });
}

export async function getCotizacionById(id) {
  return fetchJson(`cotizaciones/${id}`, { headers: authHeaders() });
}

export async function deleteCotizacion(id) {
  return fetchJson(`cotizaciones/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function getCotizacionesPendientes() {
  return fetchJson('cotizaciones/pendientes/list', { headers: authHeaders() });
}

export async function enviarCotizacionAprobacion(id, usuario) {
  return fetchJson(`cotizaciones/${id}/enviar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario }),
  });
}

export async function aprobarCotizacion(id, aprobado = true, aprobador = null, comentarios = '') {
  return fetchJson(`cotizaciones/${id}/aprobar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ aprobado, aprobador, comentarios }),
  });
}

export async function generateFolio() {
  return fetchJson('cotizaciones/generate/folio');
}

export async function createCotizacion(data) {
  return postJson('cotizaciones', data);
}

export async function updateCotizacion(id, data) {
  return fetchJson(`cotizaciones/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function getDashboard() {
  return fetchJson('dashboard', { headers: authHeaders() });
}

export async function getOrdenesCompra() {
  return fetchJson('ordenescompra', { headers: authHeaders() });
}

export async function deleteOrdenCompra(id) {
  return fetchJson(`ordenescompra/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function createOrdenCompra(data) {
  return postJson('ordenescompra', data);
}

export async function approveOrdenCompra(id, aprobador, nombre) {
  const paso = aprobador === "Administración" ? 1 : 2;
  return fetchJson(`ordenescompra/${id}/aprobar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ paso, aprobador: nombre || aprobador }),
  });
}

export async function rejectOrdenCompra(id, aprobador, motivo) {
  return fetchJson(`ordenescompra/${id}/rechazar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ aprobador, motivo }),
  });
}

export async function getFacturaOrden(id) {
  return fetchJson(`ordenescompra/${id}/factura`, { headers: authHeaders() });
}

export async function saveFacturaOrden(id, data) {
  return fetchJson(`ordenescompra/${id}/factura`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function uploadFacturaArchivo(id, archivoBase64, archivoNombre) {
  return fetchJson(`ordenescompra/${id}/factura/archivo`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ archivoBase64, archivoNombre }),
  });
}

export async function downloadFacturaArchivo(id, nombreOriginal) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/ordenescompra/${id}/factura/archivo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('No se pudo descargar el archivo');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreOriginal || 'factura';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getSolicitudFondos(id) {
  return fetchJson(`ordenescompra/${id}/solicitud-fondos`, { headers: authHeaders() });
}

export async function createSolicitudFondos(id, data) {
  return fetchJson(`ordenescompra/${id}/solicitud-fondos`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function approveSolicitudFondos(ordenId, paso) {
  return fetchJson(`ordenescompra/${ordenId}/solicitud-fondos/aprobar`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ paso }),
  });
}

export async function getSolicitudesFondosPendientes() {
  return fetchJson('solicitudes-fondos/pendientes', { headers: authHeaders() });
}

export async function getEvaluacionProveedor(id, tipo) {
  const q = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  return fetchJson(`ordenescompra/${id}/evaluacion${q}`, { headers: authHeaders() });
}

export async function saveEvaluacionProveedor(id, data) {
  return fetchJson(`ordenescompra/${id}/evaluacion`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function downloadSolicitudFondosPdf(id, folio) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/ordenescompra/${id}/solicitud-fondos/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("No se pudo generar el PDF de la solicitud");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SF-${folio || id}.pdf`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export async function downloadOrdenCompraPdf(id) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/ordenescompra/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("No se pudo generar el PDF");
  return response.blob();
}

// ─── Recepción OC ────────────────────────────────────────────────────────────
export async function registrarRecepcionOC(id, lineas, recibidoPor) {
  return fetchJson(`ordenescompra/${id}/recepcion`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ lineas, recibidoPor }),
  });
}

// ─── Áreas de Consumo ─────────────────────────────────────────────────────────
export async function getAreasConsumo() {
  return fetchJson('areas-consumo', { headers: authHeaders() });
}
export async function createAreaConsumo(data) {
  return fetchJson('areas-consumo', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
}
export async function updateAreaConsumo(id, data) {
  return fetchJson(`areas-consumo/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
}
export async function deleteAreaConsumo(id) {
  return fetchJson(`areas-consumo/${id}`, { method: 'DELETE', headers: authHeaders() });
}

// ─── Consumos de Limpieza ─────────────────────────────────────────────────────
export async function getConsumos() {
  return fetchJson('consumos', { headers: authHeaders() });
}
export async function registrarConsumo(data) {
  return fetchJson('consumos', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function getMe(token) {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function login(correo, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
  return data;
}

export async function cambiarPassword(token, passwordActual, passwordNuevo) {
  const res = await fetch(`${API_BASE_URL}/auth/cambiar-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ passwordActual, passwordNuevo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
  return data;
}

export async function recuperarPassword(correo) {
  const res = await fetch(`${API_BASE_URL}/auth/recuperar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al recuperar contraseña');
  return data;
}

export async function restablecerPassword(correo, codigo, passwordNuevo) {
  const res = await fetch(`${API_BASE_URL}/auth/restablecer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, codigo, passwordNuevo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña');
  return data;
}

// ─── Usuarios (admin) ─────────────────────────────────────────────────────────

export async function getUsuarios(token) {
  const res = await fetch(`${API_BASE_URL}/usuarios`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al listar usuarios');
  return data;
}

export async function createUsuario(token, data) {
  const res = await fetch(`${API_BASE_URL}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error al crear usuario');
  return body;
}

export async function updateUsuario(token, id, data) {
  const res = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error al actualizar usuario');
  return body;
}

export async function resetearPasswordUsuario(token, id, password) {
  const res = await fetch(`${API_BASE_URL}/usuarios/${id}/resetear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error al resetear contraseña');
  return body;
}

// ── Órdenes de Mantenimiento ──────────────────────────────────────────────────
export function getOrdenesMantenimiento() { return fetchJson('ordenes-mantenimiento', { headers: authHeaders() }) }
export function getOrdenMantenimientoById(id) { return fetchJson(`ordenes-mantenimiento/${id}`, { headers: authHeaders() }) }
export function createOrdenMantenimiento(data) { return fetchJson('ordenes-mantenimiento', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function updateOrdenMantenimiento(id, data) { return fetchJson(`ordenes-mantenimiento/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }

// ── Inventario ────────────────────────────────────────────────────────────────
export function getInventario() { return fetchJson('inventario', { headers: authHeaders() }) }
export function getInventarioDashboard() { return fetchJson('inventario/dashboard', { headers: authHeaders() }) }
export function createProducto(data) { return fetchJson('inventario', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function updateProducto(id, data) { return fetchJson(`inventario/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }
export function ajustarStock(id, data) { return fetchJson(`inventario/${id}/ajuste`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }

// ── Seguridad — Catálogos ─────────────────────────────────────────────────────
export function getVehiculos() { return fetchJson('seguridad/vehiculos', { headers: authHeaders() }) }
export function createVehiculo(data) { return fetchJson('seguridad/vehiculos', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function updateVehiculo(id, data) { return fetchJson(`seguridad/vehiculos/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }

export function getExtintores() { return fetchJson('seguridad/extintores', { headers: authHeaders() }) }
export function createExtintor(data) { return fetchJson('seguridad/extintores', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function updateExtintor(id, data) { return fetchJson(`seguridad/extintores/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }
export function getRevisionesExtintor(id) { return fetchJson(`seguridad/extintores/${id}/revisiones`, { headers: authHeaders() }) }
export function createRevisionExtintor(data) { return fetchJson('seguridad/revisiones-extintores', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }

export function getPuntosRevision() { return fetchJson('seguridad/puntos-revision', { headers: authHeaders() }) }
export function createPuntoRevision(data) { return fetchJson('seguridad/puntos-revision', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function updatePuntoRevision(id, data) { return fetchJson(`seguridad/puntos-revision/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }
export function createAreaRevision(puntoId, data) { return fetchJson(`seguridad/puntos-revision/${puntoId}/areas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function updateAreaRevision(id, data) { return fetchJson(`seguridad/areas/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }

// ── Seguridad — Rondines ──────────────────────────────────────────────────────
export function getRondines() { return fetchJson('seguridad/rondines', { headers: authHeaders() }) }
export function getRondinById(id) { return fetchJson(`seguridad/rondines/${id}`, { headers: authHeaders() }) }
export function createRondin() { return fetchJson('seguridad/rondines', { method: 'POST', headers: authHeaders(), body: JSON.stringify({}) }) }
export function marcarRegistroRondin(rondinId, registroId, data) {
  return fetchJson(`seguridad/rondines/${rondinId}/registro/${registroId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
}
export function finalizarRondin(id, data) { return fetchJson(`seguridad/rondines/${id}/finalizar`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }

// ── Seguridad — Visitas ───────────────────────────────────────────────────────
export function getVisitas(fecha) {
  const q = fecha ? `?fecha=${fecha}` : ''
  return fetchJson(`seguridad/visitas${q}`, { headers: authHeaders() })
}
export function createVisita(data) { return fetchJson('seguridad/visitas', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function registrarSalidaVisita(id, data) { return fetchJson(`seguridad/visitas/${id}/salida`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data || {}) }) }

// ── Seguridad — Órdenes de Vehículo ──────────────────────────────────────────
export function getOrdenesVehiculo(params = {}) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()
  return fetchJson(`seguridad/ordenes-vehiculo${q ? '?' + q : ''}`, { headers: authHeaders() })
}
export function createOrdenVehiculo(data) { return fetchJson('seguridad/ordenes-vehiculo', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }) }
export function autorizarOrdenVehiculo(id) { return fetchJson(`seguridad/ordenes-vehiculo/${id}/autorizar`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({}) }) }
export function rechazarOrdenVehiculo(id, data) { return fetchJson(`seguridad/ordenes-vehiculo/${id}/rechazar`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }
export function registrarSalidaVehiculo(id, data) { return fetchJson(`seguridad/ordenes-vehiculo/${id}/salida`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }
export function registrarLlegadaVehiculo(id, data) { return fetchJson(`seguridad/ordenes-vehiculo/${id}/llegada`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }) }
async function uploadToCloudinary(base64, folder) {
  const fd = new FormData()
  fd.append('file', base64)
  fd.append('upload_preset', 'douxyql6')
  fd.append('folder', folder)
  const r = await fetch('https://api.cloudinary.com/v1_1/kcj1hrdy/image/upload', { method: 'POST', body: fd })
  const data = await r.json()
  if (data.error) throw new Error(data.error.message)
  return { url: data.secure_url }
}

export function uploadFotoVehiculo(base64) { return uploadToCloudinary(base64, 'vehiculos') }

export function deleteVehiculo(id) { return fetchJson(`seguridad/vehiculos/${id}`, { method: 'DELETE', headers: authHeaders() }) }
export function deleteExtintor(id) { return fetchJson(`seguridad/extintores/${id}`, { method: 'DELETE', headers: authHeaders() }) }
export function deleteVisita(id) { return fetchJson(`seguridad/visitas/${id}`, { method: 'DELETE', headers: authHeaders() }) }
export function deleteRondin(id) { return fetchJson(`seguridad/rondines/${id}`, { method: 'DELETE', headers: authHeaders() }) }
export function deleteOrdenVehiculo(id) { return fetchJson(`seguridad/ordenes-vehiculo/${id}`, { method: 'DELETE', headers: authHeaders() }) }

export function getDashboardSeguridad() { return fetchJson('seguridad/dashboard', { headers: authHeaders() }) }

export function uploadFotoRondin(base64) { return uploadToCloudinary(base64, 'rondines') }
