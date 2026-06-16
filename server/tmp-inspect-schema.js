import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

console.log('config', config);

const pool = new sql.ConnectionPool(config);

try {
  await pool.connect();
  const tables = ['Empresas', 'Cursos', 'Coaches', 'Modalidades', 'CotizacionEstados', 'ConceptosCosto', 'CotizacionCostos', 'Cotizaciones', 'CotizacionParticipantes'];
  for (const table of tables) {
    const result = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}' ORDER BY ORDINAL_POSITION`);
    console.log(`\nTABLE ${table}:`, result.recordset.map((row) => row.COLUMN_NAME));
  }
} catch (error) {
  console.error('INSPECT ERROR', error);
} finally {
  await pool.close();
}
