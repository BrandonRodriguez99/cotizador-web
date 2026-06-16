import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import catalogsRouter from './routes/catalogos.js';
import cotizacionesRouter from './routes/cotizaciones.js';
import ordenesCompraRouter from './routes/ordenescompra.js';
import authRouter, { initAuthTables } from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import { autenticar, soloAdmin } from './middleware/autenticar.js';

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API funcionando');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/catalogos', catalogsRouter);
app.use('/api/cotizaciones', cotizacionesRouter);
app.use('/api/ordenescompra', ordenesCompraRouter);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', autenticar, soloAdmin, usuariosRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
  initAuthTables().catch((err) => console.error('⚠ initAuthTables:', err));
});
