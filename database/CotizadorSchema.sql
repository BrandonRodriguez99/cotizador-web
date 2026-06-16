-- Database schema for CotizadorServiciosUDAT
-- Usa esta creación en SQL Server o el motor que prefieras.

CREATE DATABASE CotizadorServiciosUDAT;
GO

USE CotizadorServiciosUDAT;
GO

-- Clientes / Empresas que solicitan la cotización
CREATE TABLE Clientes (
    ClienteId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(200) NOT NULL,
    TipoCliente NVARCHAR(100) NULL,
    RFC NVARCHAR(50) NULL,
    CorreoContacto NVARCHAR(150) NULL,
    TelefonoContacto NVARCHAR(50) NULL,
    Direccion NVARCHAR(400) NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaModificacion DATETIME2 NULL
);

-- Catálogo de cursos/programas
CREATE TABLE Cursos (
    CursoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(200) NOT NULL,
    Descripcion NVARCHAR(1000) NULL,
    DuracionBaseDias INT NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaModificacion DATETIME2 NULL
);

-- Catálogo de coaches/instructores
CREATE TABLE Coaches (
    CoachId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(200) NOT NULL,
    CorreoElectronico NVARCHAR(150) NULL,
    Telefono NVARCHAR(50) NULL,
    Especialidad NVARCHAR(200) NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaModificacion DATETIME2 NULL
);

-- Catálogo de modalidades de curso
CREATE TABLE Modalidades (
    ModalidadId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaModificacion DATETIME2 NULL
);

-- Catálogo de conceptos de costo para reutilizar en varias cotizaciones
CREATE TABLE ConceptosCosto (
    ConceptoCostoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(250) NOT NULL,
    TipoCalculo NVARCHAR(100) NULL,
    Formula NVARCHAR(250) NULL,
    CostoUnitario DECIMAL(18,2) NULL,
    Descripcion NVARCHAR(1000) NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaModificacion DATETIME2 NULL
);

-- Estado de cotización: borrador, enviado, aprobado, rechazado, cancelado
CREATE TABLE CotizacionEstados (
    EstadoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Tabla principal de cotizaciones
CREATE TABLE Cotizaciones (
    CotizacionId INT IDENTITY(1,1) PRIMARY KEY,
    Folio NVARCHAR(50) NOT NULL,
    ClienteId INT NOT NULL,
    CursoId INT NOT NULL,
    CoachId INT NOT NULL,
    ModalidadId INT NOT NULL,
    DuracionDias INT NULL,
    SesionesPorDia INT NULL,
    ParticipantesCantidad INT NULL,
    FechaInicio DATE NULL,
    FechaFin DATE NULL,
    Observaciones NVARCHAR(2000) NULL,
    TotalCostosDirectos DECIMAL(18,2) NULL,
    TotalCostosIndirectos DECIMAL(18,2) NULL,
    TotalCostos DECIMAL(18,2) NULL,
    MargenUtilidadPct DECIMAL(5,2) NULL,
    MargenUtilidad DECIMAL(18,2) NULL,
    TotalConGanancia DECIMAL(18,2) NULL,
    PrecioPorParticipante DECIMAL(18,2) NULL,
    PrecioSugeridoPorParticipante DECIMAL(18,2) NULL,
    EstadoId INT NOT NULL DEFAULT 1,
    CreadoPor NVARCHAR(150) NULL,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ModificadoPor NVARCHAR(150) NULL,
    FechaModificacion DATETIME2 NULL,
    FOREIGN KEY (ClienteId) REFERENCES Clientes(ClienteId),
    FOREIGN KEY (CursoId) REFERENCES Cursos(CursoId),
    FOREIGN KEY (CoachId) REFERENCES Coaches(CoachId),
    FOREIGN KEY (ModalidadId) REFERENCES Modalidades(ModalidadId),
    FOREIGN KEY (EstadoId) REFERENCES CotizacionEstados(EstadoId)
);

-- Detalle de costos de cada cotización
CREATE TABLE CotizacionCostos (
    CotizacionCostoId INT IDENTITY(1,1) PRIMARY KEY,
    CotizacionId INT NOT NULL,
    ConceptoCostoId INT NULL,
    Concepto NVARCHAR(250) NOT NULL,
    TipoCalculo NVARCHAR(100) NULL,
    Formula NVARCHAR(250) NULL,
    CostoUnitario DECIMAL(18,2) NULL,
    Cantidad NVARCHAR(100) NULL,
    Participantes NVARCHAR(100) NULL,
    Total DECIMAL(18,2) NULL,
    Orden INT NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (CotizacionId) REFERENCES Cotizaciones(CotizacionId),
    FOREIGN KEY (ConceptoCostoId) REFERENCES ConceptosCosto(ConceptoCostoId)
);

-- Participantes relacionados a la cotización, conectados con el catálogo de colaboradores existentes
CREATE TABLE CotizacionParticipantes (
    CotizacionParticipanteId INT IDENTITY(1,1) PRIMARY KEY,
    CotizacionId INT NOT NULL,
    EmpleadoId INT NULL,
    NumeroEmpleado NVARCHAR(50) NULL,
    NombreCompleto NVARCHAR(300) NOT NULL,
    Empresa NVARCHAR(200) NULL,
    Factura2 NVARCHAR(100) NULL,
    Factura3 NVARCHAR(100) NULL,
    Observaciones NVARCHAR(500) NULL,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (CotizacionId) REFERENCES Cotizaciones(CotizacionId)
);

-- Historial de aprobaciones y comentarios
CREATE TABLE CotizacionAprobaciones (
    CotizacionAprobacionId INT IDENTITY(1,1) PRIMARY KEY,
    CotizacionId INT NOT NULL,
    Aprobador NVARCHAR(200) NULL,
    FechaAprobacion DATETIME2 NULL,
    EstadoAnteriorId INT NULL,
    EstadoNuevoId INT NULL,
    Comentarios NVARCHAR(2000) NULL,
    FOREIGN KEY (CotizacionId) REFERENCES Cotizaciones(CotizacionId),
    FOREIGN KEY (EstadoAnteriorId) REFERENCES CotizacionEstados(EstadoId),
    FOREIGN KEY (EstadoNuevoId) REFERENCES CotizacionEstados(EstadoId)
);

-- Registro de eventos para auditoría y seguimiento
CREATE TABLE CotizacionEventos (
    EventoId INT IDENTITY(1,1) PRIMARY KEY,
    CotizacionId INT NOT NULL,
    TipoEvento NVARCHAR(150) NOT NULL,
    Mensaje NVARCHAR(1000) NULL,
    Usuario NVARCHAR(150) NULL,
    FechaEvento DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (CotizacionId) REFERENCES Cotizaciones(CotizacionId)
);

-- Opcional: guardar archivos o PDF generados
CREATE TABLE CotizacionDocumentos (
    DocumentoId INT IDENTITY(1,1) PRIMARY KEY,
    CotizacionId INT NOT NULL,
    NombreArchivo NVARCHAR(250) NOT NULL,
    TipoArchivo NVARCHAR(50) NULL,
    RutaArchivo NVARCHAR(500) NULL,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (CotizacionId) REFERENCES Cotizaciones(CotizacionId)
);

-- Población inicial de catálogos
INSERT INTO Modalidades (Nombre) VALUES ('Presencial'), ('Virtual'), ('Híbrido');
INSERT INTO CotizacionEstados (Nombre) VALUES ('Borrador'), ('Enviado'), ('Aprobado'), ('Rechazado'), ('Cancelado');

INSERT INTO Cursos (Nombre, Descripcion, DuracionBaseDias) VALUES
('Formación de Operadores', 'Curso de formación para operadores de planta.', 9),
('Desarrollo de Liderazgo', 'Programa de mejora de habilidades de liderazgo.', 5);

INSERT INTO Coaches (Nombre, CorreoElectronico, Telefono, Especialidad) VALUES
('Elena Morantes', 'elena.morantes@udat.com.mx', '55-1234-5678', 'Instructor de Operadores'),
('Laura Martínez', 'laura.martinez@example.com', '55-9876-5432', 'Coaching Ejecutivo');

INSERT INTO Clientes (Nombre, TipoCliente, RFC, CorreoContacto) VALUES
('TLH', 'Cliente Corporativo', 'TLH123456ABC', 'contacto@tlh.com');

INSERT INTO ConceptosCosto (Nombre, TipoCalculo, Formula, CostoUnitario, Descripcion) VALUES
('Instructor IMPARTICIÓN', 'Por sesión', 'Sesiones x Días', 1000.00, 'Costo por instrucción presencial por sesión'),
('Instructor sesión de coaching', 'Por sesión', 'Sesiones x Días', 1000.00, 'Costo por sesión de coaching'),
('Intervención por no acreditación', 'Por evento', 'Eventos', 1000.00, 'Costo por evento de intervención');
GO