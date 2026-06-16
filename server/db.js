import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD?.replace(/^"|"$/g, ''),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

const pool = new sql.ConnectionPool(config);
let poolConnectPromise;

pool.on('error', (err) => {
  console.error('SQL pool error:', err);
});

export async function getPool() {
  if (!poolConnectPromise) {
    poolConnectPromise = pool.connect().then(() => {
      console.log('✅ Conectado a SQL Server');
      return pool;
    }).catch((err) => {
      console.error('❌ Error al conectar el pool SQL:', err);
      throw err;
    });
  }

  return poolConnectPromise;
}

export async function query(queryText, inputs = []) {
  const pool = await getPool();
  const request = pool.request();

  for (const input of inputs) {
    request.input(input.name, input.type, input.value);
  }

  return request.query(queryText);
}
