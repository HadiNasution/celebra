import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://celebra:celebra@localhost:5432/celebra",
});

async function seed() {
  const db = drizzle(pool);

  // --- System admin ---
  const password = "admin123";
  const hash = await bcrypt.hash(password, 10);
  const userId = "00000000-0000-0000-0000-00000000ad01";
  const systemTenantId = "00000000-0000-0000-0000-000000000000";

  await pool.query(
    `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [systemTenantId, "system", "System"],
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, email) DO NOTHING`,
    [userId, systemTenantId, "Super Admin", "admin@celebra.com", hash, "super_admin"],
  );

  // --- Guest roles ---
  for (const role of ["Family", "Friend", "VIP", "Vendor"]) {
    const exists = await pool.query(`SELECT 1 FROM guest_roles WHERE name = $1`, [role]);
    if (exists.rowCount === 0) {
      await pool.query(`INSERT INTO guest_roles (name) VALUES ($1)`, [role]);
    }
  }

  // --- Clear existing templates and categories ---
  await pool.query("DELETE FROM templates");
  await pool.query("DELETE FROM categories");
  console.log("Cleared existing templates and categories.");

  // --- Categories ---
  const categoryData = [
    { name: "Wedding", slug: "wedding" },
    { name: "School Event", slug: "school-event" },
    { name: "Birthday", slug: "birthday" },
    { name: "Office Event", slug: "office-event" },
    { name: "Event", slug: "event" },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categoryData) {
    const id = crypto.randomUUID();
    categoryIds[cat.slug] = id;
    await pool.query(
      `INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)`,
      [id, cat.name, cat.slug],
    );
  }
  console.log(`Seeded ${categoryData.length} categories.`);

  // --- Templates ---
  type TemplateData = {
    name: string;
    categorySlug: string;
    previewImage: string;
    jsonSchema: Record<string, unknown>;
    htmlBundle: string;
  };

  const templateData: TemplateData[] = [
    {
      name: "Classic Wedding",
      categorySlug: "wedding",
      previewImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
      jsonSchema: {
        hero: {
          title: { type: "text", label: "Title", required: true, default: "Our Wedding" },
          subtitle: { type: "text", label: "Subtitle", default: "We are getting married" },
          date: { type: "date", label: "Event Date", default: "2026-12-31" },
        },
      },
      htmlBundle: `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:Georgia,serif;color:#1C322D">
  <div style="text-align:center;padding:80px 24px">
    <h1 style="font-size:40px;margin:0">{{hero.title}}</h1>
    <p style="font-size:20px;color:#555">{{hero.subtitle}}</p>
    <p style="font-size:16px;color:#777">{{hero.date}}</p>
  </div>
</body></html>`,
    },
    {
      name: "Birthday Celebration",
      categorySlug: "birthday",
      previewImage: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600&h=400&fit=crop",
      jsonSchema: {
        hero: {
          title: { type: "text", label: "Title", required: true, default: "Happy Birthday!" },
          subtitle: { type: "text", label: "Subtitle", default: "Come celebrate with us" },
          date: { type: "date", label: "Event Date", default: "2026-12-31" },
        },
      },
      htmlBundle: `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:Poppins,sans-serif;color:#333;background:#fff5f5">
  <div style="text-align:center;padding:80px 24px">
    <h1 style="font-size:40px;margin:0;color:#e11d48">{{hero.title}}</h1>
    <p style="font-size:20px;color:#666">{{hero.subtitle}}</p>
    <p style="font-size:16px;color:#999">{{hero.date}}</p>
  </div>
</body></html>`,
    },
    {
      name: "Corporate Event",
      categorySlug: "event",
      previewImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
      jsonSchema: {
        hero: {
          title: { type: "text", label: "Title", required: true, default: "Annual Company Event" },
          subtitle: { type: "text", label: "Subtitle", default: "You are invited" },
          date: { type: "date", label: "Event Date", default: "2026-12-31" },
        },
      },
      htmlBundle: `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:Inter,sans-serif;color:#1a1a2e;background:#f8f9fa">
  <div style="text-align:center;padding:80px 24px">
    <h1 style="font-size:40px;margin:0;color:#1a1a2e">{{hero.title}}</h1>
    <p style="font-size:20px;color:#555">{{hero.subtitle}}</p>
    <p style="font-size:16px;color:#999">{{hero.date}}</p>
  </div>
</body></html>`,
    },
  ];

  for (const tpl of templateData) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO templates (id, category_id, name, version, preview_image, html_bundle, json_schema, is_active)
       VALUES ($1, $2, $3, 1, $4, $5, $6, true)`,
      [id, categoryIds[tpl.categorySlug], tpl.name, tpl.previewImage, tpl.htmlBundle, JSON.stringify(tpl.jsonSchema)],
    );
  }
  console.log(`Seeded ${templateData.length} templates.`);

  console.log("\nSeed complete:");
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
