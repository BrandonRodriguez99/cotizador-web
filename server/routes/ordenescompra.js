import express from 'express';
import sql from 'mssql';
import PDFDocument from 'pdfkit';
import { getPool, query } from '../db.js';

const router = express.Router();
let ordenesTableReady = false;

function safeInt(val) {
  if (val == null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

async function ensureOrdenesCompraTables(pool) {
  if (ordenesTableReady) return;

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'OrdenesCompra' AND schema_id = SCHEMA_ID('dbo')
    )
    BEGIN
      CREATE TABLE OrdenesCompra (
        OrdenCompraId INT IDENTITY(1,1) PRIMARY KEY,
        Folio NVARCHAR(50) NOT NULL,
        UnidadNegocioId INT NULL,
        UnidadNegocio NVARCHAR(250) NULL,
        ProveedorId INT NULL,
        Proveedor NVARCHAR(250) NULL,
        Fecha DATE NULL,
        Observaciones NVARCHAR(2000) NULL,
        Subtotal DECIMAL(18,2) NULL,
        Iva DECIMAL(18,2) NULL,
        Total DECIMAL(18,2) NULL,
        Creador NVARCHAR(150) NULL,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        Aprobaciones NVARCHAR(MAX) NULL,
        Rechazo NVARCHAR(MAX) NULL
      );
    END

    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'OrdenesCompraLineas' AND schema_id = SCHEMA_ID('dbo')
    )
    BEGIN
      CREATE TABLE OrdenesCompraLineas (
        OrdenCompraLineaId INT IDENTITY(1,1) PRIMARY KEY,
        OrdenCompraId INT NOT NULL,
        Descripcion NVARCHAR(1000) NOT NULL,
        UnidadMedida NVARCHAR(100) NULL,
        Cantidad DECIMAL(18,4) NULL,
        PrecioUnitario DECIMAL(18,2) NULL,
        Total DECIMAL(18,2) NULL,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        FOREIGN KEY (OrdenCompraId) REFERENCES OrdenesCompra(OrdenCompraId)
      );
    END
  `);

  ordenesTableReady = true;
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureOrdenesCompraTables(pool);

    const result = await query(
      `SELECT * FROM OrdenesCompra ORDER BY OrdenCompraId DESC`
    );

    const ordenes = result.recordset.map((row) => ({
      ...row,
      Fecha: row.Fecha ? row.Fecha.toISOString().slice(0, 10) : null,
      aprobaciones: parseJson(row.Aprobaciones) || [],
      rechazo: parseJson(row.Rechazo),
    }));

    res.json(ordenes);
  } catch (error) {
    console.error('❌ ERROR LISTAR ORDENES COMPRA:', error);
    res.status(500).json({ error: 'Error al listar órdenes de compra' });
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureOrdenesCompraTables(pool);

    const {
      Folio,
      UnidadNegocioId,
      UnidadNegocio,
      ProveedorId,
      Proveedor,
      Fecha,
      Observaciones,
      Subtotal,
      Iva,
      Total,
      Creador,
      FechaCreacion,
      aprobaciones,
      rechazo,
      LineItems,
    } = req.body;

    const validLineItems = Array.isArray(LineItems)
      ? LineItems.filter((item) => item?.Descripcion && String(item.Descripcion).trim())
      : [];

    if (!Folio || !ProveedorId || !UnidadNegocioId || validLineItems.length === 0) {
      return res.status(400).json({ error: 'Folio, proveedor, unidad de negocio y al menos una partida son obligatorios' });
    }

    const request = pool.request();
    request.input('Folio', sql.NVarChar(50), Folio);
    request.input('UnidadNegocioId', sql.Int, safeInt(UnidadNegocioId));
    request.input('UnidadNegocio', sql.NVarChar(250), UnidadNegocio || null);
    request.input('ProveedorId', sql.Int, safeInt(ProveedorId));
    request.input('Proveedor', sql.NVarChar(250), Proveedor || null);
    request.input('Fecha', sql.Date, Fecha ? new Date(Fecha) : null);
    request.input('Observaciones', sql.NVarChar(2000), Observaciones || null);
    request.input('Subtotal', sql.Decimal(18, 2), Subtotal != null ? Number(Subtotal) : null);
    request.input('Iva', sql.Decimal(18, 2), Iva != null ? Number(Iva) : null);
    request.input('Total', sql.Decimal(18, 2), Total != null ? Number(Total) : null);
    request.input('Creador', sql.NVarChar(150), Creador || null);
    request.input('FechaCreacion', sql.DateTime2, FechaCreacion ? new Date(FechaCreacion) : new Date());
    request.input('Aprobaciones', sql.NVarChar(sql.MAX), JSON.stringify(aprobaciones || []));
    request.input('Rechazo', sql.NVarChar(sql.MAX), rechazo ? JSON.stringify(rechazo) : null);

    const insertResult = await request.query(`
      INSERT INTO OrdenesCompra (
        Folio,
        UnidadNegocioId,
        UnidadNegocio,
        ProveedorId,
        Proveedor,
        Fecha,
        Observaciones,
        Subtotal,
        Iva,
        Total,
        Creador,
        FechaCreacion,
        Aprobaciones,
        Rechazo
      )
      OUTPUT INSERTED.OrdenCompraId
      VALUES (
        @Folio,
        @UnidadNegocioId,
        @UnidadNegocio,
        @ProveedorId,
        @Proveedor,
        @Fecha,
        @Observaciones,
        @Subtotal,
        @Iva,
        @Total,
        @Creador,
        @FechaCreacion,
        @Aprobaciones,
        @Rechazo
      );
    `);

    const ordenCompraId = insertResult.recordset[0]?.OrdenCompraId;

    for (const line of validLineItems) {
      const lineRequest = pool.request();
      lineRequest.input('OrdenCompraId', sql.Int, ordenCompraId);
      lineRequest.input('Descripcion', sql.NVarChar(1000), line.Descripcion);
      lineRequest.input('UnidadMedida', sql.NVarChar(100), line.UnidadMedida || null);
      lineRequest.input('Cantidad', sql.Decimal(18, 4), line.Cantidad != null ? Number(line.Cantidad) : null);
      lineRequest.input('PrecioUnitario', sql.Decimal(18, 2), line.PrecioUnitario != null ? Number(line.PrecioUnitario) : null);
      lineRequest.input('Total', sql.Decimal(18, 2), line.subtotal != null ? Number(line.subtotal) : null);
      await lineRequest.query(`
        INSERT INTO OrdenesCompraLineas (
          OrdenCompraId,
          Descripcion,
          UnidadMedida,
          Cantidad,
          PrecioUnitario,
          Total
        ) VALUES (
          @OrdenCompraId,
          @Descripcion,
          @UnidadMedida,
          @Cantidad,
          @PrecioUnitario,
          @Total
        );
      `);
    }

    res.status(201).json({ OrdenCompraId: ordenCompraId });
  } catch (error) {
    console.error('❌ ERROR CREAR ORDEN COMPRA:', error);
    res.status(500).json({ error: 'Error al crear la orden de compra' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    const pool = await getPool();
    await ensureOrdenesCompraTables(pool);

    const orderResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Aprobaciones, Rechazo FROM OrdenesCompra WHERE OrdenCompraId = @id');

    if (!orderResult.recordset.length) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    const current = orderResult.recordset[0];
    const currentApprovals = parseJson(current.Aprobaciones) || [];
    const currentRejection = parseJson(current.Rechazo);

    let newApprovals = currentApprovals;
    let newRejection = currentRejection;

    if (req.body.aprobado) {
      const nextApproval = newApprovals.find((approval) => !approval.aprobado);
      if (!nextApproval) {
        return res.status(400).json({ error: 'No hay aprobaciones pendientes' });
      }

      nextApproval.aprobado = true;
      nextApproval.aprobadoPor = req.body.aprobador || null;
      nextApproval.fecha = new Date().toISOString();
      newRejection = null;
    } else if (req.body.Rechazado || req.body.rechazado) {
      newRejection = {
        rechazado: true,
        rechazadoPor: req.body.RechazadoPor || req.body.rechazadoPor || null,
        motivo: req.body.MotivoRechazo || req.body.motivo || null,
        fecha: new Date().toISOString(),
      };
    } else {
      return res.status(400).json({ error: 'Acción de aprobación o rechazo no especificada' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('Aprobaciones', sql.NVarChar(sql.MAX), JSON.stringify(newApprovals))
      .input('Rechazo', sql.NVarChar(sql.MAX), newRejection ? JSON.stringify(newRejection) : null)
      .query(`
        UPDATE OrdenesCompra
        SET Aprobaciones = @Aprobaciones,
            Rechazo = @Rechazo
        WHERE OrdenCompraId = @id
      `);

    res.sendStatus(204);
  } catch (error) {
    console.error('❌ ERROR ACTUALIZAR ORDEN COMPRA:', error);
    res.status(500).json({ error: 'Error al actualizar la orden de compra' });
  }
});

// ── Constantes institucionales ─────────────────────────────────────────────────
const DOC_NO    = 'FGA01-03';
const DOC_REV   = '1';
const DOC_FECHA = '21-Ene-2021';
const EMPRESA_NOMBRE    = 'UNIVERSIDAD DE AUTOTRANSPORTE SC';
const EMPRESA_DIRECCION = 'CARRETERA A COLOMBIA 2080, COL. ANDRES CABALLERO MORENO AGROP, ESCOBEDO, N.L. CP 66080';

// ── Helpers PDF ─────────────────────────────────────────────────────────────────
function fmtMXN(val) {
  return `$${Number(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cell(doc, x, y, w, h, opts = {}) {
  const {
    fill, text, size = 9, align = 'left',
    bold = false, color = '#111827', border = true, pad = 5,
  } = opts;

  if (fill) {
    doc.save().rect(x, y, w, h).fill(fill).restore();
  }
  if (border) {
    doc.save().rect(x, y, w, h).lineWidth(0.4).stroke('#aaaaaa').restore();
  }
  if (text !== undefined && text !== null && String(text).trim() !== '') {
    const lineH = size * 1.3;
    const ty = y + Math.max(2, (h - lineH) / 2);
    doc.save()
      .rect(x + 1, y + 1, w - 2, h - 2).clip()
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor(color)
      .text(String(text), x + pad, ty, { width: w - pad * 2, align, lineBreak: false })
      .restore();
  }
}

router.get('/:id/pdf', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalido' });

    const pool = await getPool();
    const [ordenResult, lineasResult] = await Promise.all([
      pool.request().input('id', sql.Int, id).query('SELECT * FROM OrdenesCompra WHERE OrdenCompraId = @id'),
      pool.request().input('id', sql.Int, id).query('SELECT * FROM OrdenesCompraLineas WHERE OrdenCompraId = @id ORDER BY OrdenCompraLineaId'),
    ]);

    if (!ordenResult.recordset.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const orden   = ordenResult.recordset[0];
    const lineas  = lineasResult.recordset;
    const aprobaciones = orden.Aprobaciones ? JSON.parse(orden.Aprobaciones) : [
      { step: 1, label: 'Administracion',    aprobado: false },
      { step: 2, label: 'Secretaria Academica', aprobado: false },
    ];
    const rechazo = orden.Rechazo ? JSON.parse(orden.Rechazo) : null;

    const fechaOrden = orden.Fecha
      ? new Date(orden.Fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    // ── Documento ──────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${orden.Folio}.pdf"`);
    doc.pipe(res);

    const ML = 40;
    const CW = 612 - ML * 2;   // content width = 532
    let y = 40;

    // ═══════════════════════════════════════════════════════════════════════════
    // ENCABEZADO INSTITUCIONAL
    // ═══════════════════════════════════════════════════════════════════════════
    const HDR_H = 62;
    const LOGO_W = 82, META_W = 132, TITLE_W = CW - LOGO_W - META_W;

    // Celda logo
    cell(doc, ML, y, LOGO_W, HDR_H, { fill: '#f1f5f9' });
    doc.save().circle(ML + LOGO_W / 2, y + HDR_H / 2, 27).fill('#1e3a8a').restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
      .text('UDAT', ML, y + HDR_H / 2 - 8, { width: LOGO_W, align: 'center' });

    // Celda título
    cell(doc, ML + LOGO_W, y, TITLE_W, HDR_H, {
      text: 'Orden de compra', size: 15, bold: true, align: 'center',
    });

    // Celdas meta (No. / Rev. / Fecha)
    const MH = HDR_H / 3;
    const MX = ML + LOGO_W + TITLE_W;
    [['No.', DOC_NO], ['Rev.', DOC_REV], ['Fecha', DOC_FECHA]].forEach(([lbl, val], i) => {
      cell(doc, MX, y + MH * i, META_W, MH, { fill: '#f3f4f6', border: true });
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
        .text(lbl, MX + 6, y + MH * i + MH / 2 - 5, { width: 36, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827')
        .text(val, MX + 44, y + MH * i + MH / 2 - 5, { width: META_W - 50, lineBreak: false });
    });
    y += HDR_H;

    // ═══════════════════════════════════════════════════════════════════════════
    // EMPRESA + DATOS A LLENAR POR ADQUISICIONES
    // ═══════════════════════════════════════════════════════════════════════════
    const INFO_H = 62;
    const ADQ_W = 192, INFO_W = CW - ADQ_W;

    cell(doc, ML, y, INFO_W, INFO_H, { fill: '#ffffff' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b')
      .text(EMPRESA_NOMBRE, ML + 6, y + 9, { width: INFO_W - 12, lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
      .text(EMPRESA_DIRECCION, ML + 6, y + 23, { width: INFO_W - 12 });

    const AX = ML + INFO_W;
    const ADQ_ROW = (INFO_H - 18) / 2;
    cell(doc, AX, y, ADQ_W, 18, { fill: '#dbeafe', text: '** Datos a llenar por Adquisiciones', size: 7.5, bold: true, align: 'center' });
    [['Folio', orden.Folio], ['Unidad de Negocio', orden.UnidadNegocio || '']].forEach(([lbl, val], i) => {
      cell(doc, AX,              y + 18 + ADQ_ROW * i, ADQ_W / 2, ADQ_ROW, { fill: '#fef9c3', text: lbl, size: 8, bold: true, align: 'center' });
      cell(doc, AX + ADQ_W / 2, y + 18 + ADQ_ROW * i, ADQ_W / 2, ADQ_ROW, { fill: '#fef9c3', text: val, size: 8, align: 'center' });
    });
    y += INFO_H;

    // ═══════════════════════════════════════════════════════════════════════════
    // PROVEEDOR / CREADO POR / FECHA
    // ═══════════════════════════════════════════════════════════════════════════
    const ROW_H = 22;
    const LBL_W = 95;

    cell(doc, ML, y, LBL_W, ROW_H, { fill: '#f3f4f6', text: 'PROVEEDOR:', bold: true, size: 9 });
    cell(doc, ML + LBL_W, y, CW - LBL_W - 130, ROW_H, { text: orden.Proveedor || '—', size: 9 });
    cell(doc, ML + CW - 130, y, 52, ROW_H, { fill: '#f3f4f6', text: 'FECHA', bold: true, size: 9, align: 'center' });
    cell(doc, ML + CW - 78, y, 78, ROW_H, { text: fechaOrden, size: 9, align: 'center' });
    y += ROW_H;

    cell(doc, ML, y, LBL_W, ROW_H, { fill: '#f3f4f6', text: 'CREADO POR:', bold: true, size: 9 });
    cell(doc, ML + LBL_W, y, CW - LBL_W, ROW_H, { text: orden.Creador || '—', size: 9 });
    y += ROW_H;

    // ═══════════════════════════════════════════════════════════════════════════
    // TABLA DE PARTIDAS
    // ═══════════════════════════════════════════════════════════════════════════
    const COLS = [
      { label: 'Cantidad',         w: 56,  align: 'center' },
      { label: 'Descripcion',      w: 0,   align: 'left'   },
      { label: 'Unidad de medida', w: 82,  align: 'center' },
      { label: 'Precio Unitario',  w: 84,  align: 'right'  },
      { label: 'Subtotal',         w: 84,  align: 'right'  },
    ];
    COLS[1].w = CW - COLS.reduce((s, c) => s + c.w, 0);

    // Cabecera
    const TH_H = 20;
    let cx = ML;
    for (const col of COLS) {
      cell(doc, cx, y, col.w, TH_H, { fill: '#1e3a8a', text: col.label, size: 8, bold: true, align: col.align, color: '#ffffff' });
      cx += col.w;
    }
    y += TH_H;

    // Filas
    const R_H = 18;
    const dataLineas = lineas.filter(l => l.Descripcion);
    const totalRows  = Math.max(dataLineas.length, 8);

    for (let i = 0; i < totalRows; i++) {
      const l = dataLineas[i];
      const subtotal = l
        ? (l.Total != null ? Number(l.Total) : Number(l.Cantidad || 0) * Number(l.PrecioUnitario || 0))
        : null;
      const rowFill = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const vals = l
        ? [l.Cantidad ?? '', l.Descripcion, l.UnidadMedida || '', fmtMXN(l.PrecioUnitario), fmtMXN(subtotal)]
        : ['', '', '', '', ''];

      cx = ML;
      for (let ci = 0; ci < COLS.length; ci++) {
        cell(doc, cx, y, COLS[ci].w, R_H, { fill: rowFill, text: vals[ci], size: 8.5, align: COLS[ci].align });
        cx += COLS[ci].w;
      }
      y += R_H;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOTALES
    // ═══════════════════════════════════════════════════════════════════════════
    y += 4;
    const TOT_LBL = CW - 100, TOT_VAL = 100;
    [
      { lbl: 'SUBTOTAL', val: fmtMXN(orden.Subtotal), bg: '#f9fafb', fg: '#111827', bold: false },
      { lbl: 'IVA 16%',  val: fmtMXN(orden.Iva),      bg: '#f9fafb', fg: '#111827', bold: false },
      { lbl: 'TOTAL',    val: fmtMXN(orden.Total),     bg: '#1e3a8a', fg: '#ffffff', bold: true  },
    ].forEach(({ lbl, val, bg, fg, bold }) => {
      const th = 20;
      cell(doc, ML, y, TOT_LBL, th, { fill: bg, text: lbl, size: 9, bold, align: 'right', color: fg });
      cell(doc, ML + TOT_LBL, y, TOT_VAL, th, { fill: bg, text: val, size: 9, bold, align: 'right', color: fg });
      y += th;
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // OBSERVACIONES
    // ═══════════════════════════════════════════════════════════════════════════
    if (orden.Observaciones) {
      y += 8;
      cell(doc, ML, y, CW, 28, { fill: '#f8fafc' });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151')
        .text('Observaciones:', ML + 6, y + 7, { width: 92, lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor('#374151')
        .text(orden.Observaciones, ML + 102, y + 7, { width: CW - 108 });
      y += 28;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FLUJO DE APROBACION
    // ═══════════════════════════════════════════════════════════════════════════
    y += 16;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a8a')
      .text('FLUJO DE APROBACION', ML, y);
    y += 14;

    // Cabecera tabla aprobaciones
    const AP_COLS = [CW * 0.30, CW * 0.26, CW * 0.22, CW * 0.22];
    ['Etapa', 'Responsable', 'Estado', 'Fecha'].forEach((h, i) => {
      const ax = ML + AP_COLS.slice(0, i).reduce((s, v) => s + v, 0);
      cell(doc, ax, y, AP_COLS[i], 20, { fill: '#1e3a8a', text: h, size: 8, bold: true, align: 'center', color: '#ffffff' });
    });
    y += 20;

    // Filas de aprobaciones
    aprobaciones.forEach((paso) => {
      const aprobado  = Boolean(paso.aprobado || paso.Aprobado);
      const rechazadoPorEste = rechazo?.rechazado && !aprobado;
      const bg = aprobado ? '#f0fdf4' : rechazadoPorEste ? '#fee2e2' : '#fffbeb';
      const estadoTxt   = aprobado ? 'Aprobado' : rechazadoPorEste ? 'Rechazado' : 'Pendiente';
      const estadoColor = aprobado ? '#15803d'  : rechazadoPorEste ? '#b91c1c'  : '#92400e';
      const responsable = aprobado
        ? (paso.aprobadoPor || paso.AprobadoPor || '—')
        : rechazadoPorEste
          ? (rechazo.rechazadoPor || '—')
          : '—';
      const fecha = (paso.fecha || paso.Fecha)
        ? new Date(paso.fecha || paso.Fecha).toLocaleDateString('es-MX')
        : '—';
      const etiqueta = paso.label || `Paso ${paso.step}`;

      [etiqueta, responsable, estadoTxt, fecha].forEach((val, i) => {
        const ax = ML + AP_COLS.slice(0, i).reduce((s, v) => s + v, 0);
        cell(doc, ax, y, AP_COLS[i], 20, {
          fill: bg, text: val, size: 8, align: 'center',
          color: i === 2 ? estadoColor : '#111827', bold: i === 2,
        });
      });
      y += 20;
    });

    // Motivo de rechazo (si existe)
    if (rechazo?.rechazado && rechazo?.motivo) {
      y += 4;
      cell(doc, ML, y, CW, 20, {
        fill: '#fee2e2',
        text: `Motivo de rechazo: ${rechazo.motivo}`,
        size: 8, color: '#b91c1c',
      });
      y += 20;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FIRMAS
    // ═══════════════════════════════════════════════════════════════════════════
    y += 20;
    const FW = CW / 3;
    const firmas = [
      { rol: 'SOLICITA',  nombre: orden.Creador,                    cargo: 'Solicitante'       },
      { rol: 'AUTORIZA',  nombre: aprobaciones[0]?.aprobadoPor || '', cargo: 'Administracion'   },
      { rol: 'AUTORIZA',  nombre: aprobaciones[1]?.aprobadoPor || '', cargo: 'Sec. Academica'   },
    ];

    firmas.forEach((f, i) => {
      const fx = ML + FW * i;
      // Recuadro exterior
      doc.save().rect(fx + 6, y, FW - 12, 70).lineWidth(0.4).stroke('#cccccc').restore();
      // Rol
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
        .text(f.rol, fx + 6, y + 5, { width: FW - 12, align: 'center', lineBreak: false });
      // Linea de firma
      doc.save().moveTo(fx + 16, y + 46).lineTo(fx + FW - 16, y + 46).lineWidth(0.6).stroke('#374151').restore();
      // Nombre
      doc.font('Helvetica').fontSize(8).fillColor('#111827')
        .text(f.nombre || '—', fx + 6, y + 49, { width: FW - 12, align: 'center', lineBreak: false });
      // Cargo
      doc.font('Helvetica').fontSize(7.5).fillColor('#6b7280')
        .text(f.cargo, fx + 6, y + 60, { width: FW - 12, align: 'center', lineBreak: false });
    });

    doc.end();
  } catch (error) {
    console.error('ERROR PDF ORDEN COMPRA:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar el PDF' });
  }
});

export default router;
