const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgres://celebra:celebra@localhost:5432/celebra" });

p.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename")
  .then(r => {
    console.log(r.rows.map(x => x.tablename).join("\n") || "(no tables)");
    p.end();
  })
  .catch(e => { console.error(e.message); p.end(); });
