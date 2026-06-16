import { query } from '../db.js';

async function seedIfEmpty(table, countQuery, insertFn) {
  const count = await query(countQuery);
  if (count.recordset[0].n > 0) {
    console.log(`  ${table}: ya tiene datos, se omite.`);
    return;
  }
  await insertFn();
  console.log(`  ${table}: datos de ejemplo insertados.`);
}

await seedIfEmpty('Empresas', 'SELECT COUNT(*) AS n FROM Empresas', () =>
  query(`INSERT INTO Empresas (Nombre) VALUES
    (N'UDAT Corporativo'), (N'Transportes del Norte'), (N'Grupo Industrial TM')`)
);

await seedIfEmpty('Cursos', 'SELECT COUNT(*) AS n FROM Cursos', () =>
  query(`INSERT INTO Cursos (Nombre, DuracionDefaultDias) VALUES
    (N'Liderazgo Operativo', 9),
    (N'Coaching Ejecutivo', 5),
    (N'Seguridad Industrial DC-3', 3)`)
);

await seedIfEmpty('Coaches', 'SELECT COUNT(*) AS n FROM Coaches', () =>
  query(`INSERT INTO Coaches (Nombre) VALUES
    (N'Elena Morantes'), (N'María González'), (N'Carlos Mendoza')`)
);

await seedIfEmpty('Modalidades', 'SELECT COUNT(*) AS n FROM Modalidades', () =>
  query(`INSERT INTO Modalidades (Nombre) VALUES
    (N'Presencial'), (N'Virtual'), (N'Híbrida')`)
);

console.log('Seed completado.');
process.exit(0);
