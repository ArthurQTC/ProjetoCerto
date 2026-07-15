
const { Pool } = require('pg');

async function reorderRefs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_RDS,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Fetching all unique months from levantamentos...");
    const monthsRes = await pool.query(`
      SELECT DISTINCT 
        EXTRACT(MONTH FROM to_date("dataSolicitacao", 'DD/MM/YYYY')) as month,
        EXTRACT(YEAR FROM to_date("dataSolicitacao", 'DD/MM/YYYY')) as year
      FROM levantamentos
      WHERE "dataSolicitacao" IS NOT NULL AND "dataSolicitacao" LIKE '%/%/%'
    `);

    console.log(`Found ${monthsRes.rows.length} months. Reordering each...`);

    for (const mRow of monthsRes.rows) {
      const { month, year } = mRow;
      if (!month || !year) continue;

      console.log(`Processing ${month}/${year}...`);
      
      const res = await pool.query(`
        SELECT id, "dataSolicitacao", "createdAt" 
        FROM levantamentos 
        WHERE EXTRACT(MONTH FROM to_date("dataSolicitacao", 'DD/MM/YYYY')) = $1
          AND EXTRACT(YEAR FROM to_date("dataSolicitacao", 'DD/MM/YYYY')) = $2
          AND status NOT IN ('EXCLUIDO', 'EXCLUIDO_PERMANENTE')
        ORDER BY 
          to_date("dataSolicitacao", 'DD/MM/YYYY') ASC,
          "createdAt" ASC,
          id ASC
      `, [month, year]);

      console.log(`  Found ${res.rows.length} items in ${month}/${year}. Updating refs...`);

      for (let i = 0; i < res.rows.length; i++) {
        const row = res.rows[i];
        const newRef = `LV${String(i + 1).padStart(2, '0')}`;
        await pool.query('UPDATE levantamentos SET ref = $1 WHERE id = $2', [newRef, row.id]);
        console.log(`    Updated ID ${row.id} to ${newRef}`);
      }
    }

    console.log("Success! All refs reordered by month.");
  } catch (err) {
    console.error("Error reordering refs:", err);
  } finally {
    await pool.end();
  }
}

reorderRefs();
