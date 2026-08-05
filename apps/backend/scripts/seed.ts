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

  // Better Auth tables
  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
    [userId, "Super Admin", "admin@celebra.com", true],
  );

  await pool.query(
    `INSERT INTO account (id, user_id, provider_id, account_id, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [userId, userId, "credential", userId, hash],
  );

  // Business users table
  await pool.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, email) DO NOTHING`,
    [userId, systemTenantId, "Super Admin", "admin@celebra.com", hash, "super_admin"],
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
