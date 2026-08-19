import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://celebra:celebra@localhost:5432/celebra",
});

async function seed() {
  const db = drizzle(pool);

  const password = "admin123";
  const hash = await bcrypt.hash(password, 10);

  const userId = "00000000-0000-0000-0000-00000000ad01";
  const systemTenantId = "00000000-0000-0000-0000-000000000000";

  // System tenant
  await pool.query(
    `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [systemTenantId, "system", "System"],
  );

  // Business users table (password already hashed with bcryptjs)
  await pool.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, email) DO NOTHING`,
    [userId, systemTenantId, "Super Admin", "admin@celebra.com", hash, "super_admin"],
  );

  // Default guest roles
  for (const role of ["Family", "Friend", "VIP", "Vendor"]) {
    const exists = await pool.query(`SELECT 1 FROM guest_roles WHERE name = $1`, [role]);
    if (exists.rowCount === 0) {
      await pool.query(`INSERT INTO guest_roles (name) VALUES ($1)`, [role]);
    }
  }

  // Sample category + template
  const categoryId = "00000000-0000-0000-0000-00000000c001";
  await pool.query(
    `INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [categoryId, "Wedding", "wedding"],
  );

  const templateId = "00000000-0000-0000-0000-00000000t001";
  const jsonSchema = {
    hero: {
      title: { type: "text", label: "Title", required: true, default: "Our Wedding" },
      subtitle: { type: "text", label: "Subtitle", default: "We are getting married" },
      date: { type: "date", label: "Event Date", default: "2026-12-31" },
    },
  };
  const htmlBundle = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:Georgia,serif;color:#1C322D">
  <div style="text-align:center;padding:80px 24px">
    <h1 style="font-size:40px;margin:0">{{hero.title}}</h1>
    <p style="font-size:20px;color:#555">{{hero.subtitle}}</p>
    <p style="font-size:16px;color:#777">{{hero.date}}</p>
  </div>
</body></html>`;

  await pool.query(
    `INSERT INTO templates (id, category_id, name, version, html_bundle, json_schema, is_active)
     VALUES ($1, $2, $3, 1, $4, $5, true) ON CONFLICT (id) DO NOTHING`,
    [templateId, categoryId, "Classic Wedding", htmlBundle, JSON.stringify(jsonSchema)],
  );

  console.log("Seed complete:");
  console.log("  Email:    admin@celebra.com");
  console.log("  Password: admin123");
  console.log("  Role:     super_admin");
  console.log("  Login at: http://localhost:3000/login");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
