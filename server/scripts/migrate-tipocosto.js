import { getPool } from '../db.js';

async function migrateConceptosTipoCosto() {
  try {
    const pool = await getPool();
    if (!pool) {
      console.error('No hay conexión a la base de datos');
      return;
    }

    // Backfill NULL values with 'Directos' as default
    const result = await pool.request().query(`
      UPDATE ConceptosCosto
      SET TipoCosto = 'Directos'
      WHERE TipoCosto IS NULL OR TipoCosto = '';
      
      SELECT @@ROWCOUNT AS affected;
    `);

    console.log('✅ Migration completada. Registros actualizados:', result.recordset[0].affected);
  } catch (err) {
    console.error('❌ Error en migration:', err);
    process.exit(1);
  }
}

migrateConceptosTipoCosto();
