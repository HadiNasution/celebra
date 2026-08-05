const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgres://celebra:celebra@localhost:5432/celebra" });

async function fix() {
  await p.query(`ALTER TABLE users DROP CONSTRAINT users_role_check`);
  await p.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'owner', 'admin', 'staff'))`);
  console.log("users_role_check fixed — super_admin added");
  p.end();
}

fix().catch(e => { console.error(e.message); p.end(); });
