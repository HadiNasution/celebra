// Manual E2E smoke for Step 8 (public invitation). Requires a running backend (pnpm dev) + Postgres + Redis.
// Seeds a published invitation + guest directly, then exercises RSVP, guestbook, media upload.
const pg = require("pg");
const { randomUUID } = require("crypto");
const { readFileSync } = require("fs");

const API = "http://localhost:3001/api";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://celebra:celebra@localhost:5432/celebra",
});

async function main() {
  const slug = `public-test-${Date.now()}`;
  const tenantId = randomUUID();
  const invitationId = randomUUID();
  const contentId = randomUUID();
  const templateId = randomUUID();
  const categoryId = randomUUID();
  const guestId = randomUUID();
  const guestToken = randomUUID();

  const html = `<h1>{{hero.title}}</h1><p>Hi {{guest_name}}, you are invited on {{countdown.event_date}}.</p>`;

  await pool.query("BEGIN");
  await pool.query(`INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)`, [categoryId, "test", `cat-${slug}`]);
  await pool.query(
    `INSERT INTO templates (id, category_id, name, html_bundle, json_schema) VALUES ($1, $2, 'test', $3, '{}')`,
    [templateId, categoryId, html],
  );
  await pool.query(`INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)`, [tenantId, slug, "Public Test"]);
  await pool.query(`INSERT INTO invitations (id, tenant_id, template_version_id, slug, title, status) VALUES ($1, $2, $3, $4, 'Test', 'published')`, [
    invitationId, tenantId, templateId, slug,
  ]);
  await pool.query(`INSERT INTO invitation_contents (id, invitation_id, content_json) VALUES ($1, $2, $3)`, [
    contentId, invitationId, JSON.stringify({ hero: { title: "Our Wedding" }, countdown: { event_date: "2099-01-01T00:00:00Z" } }),
  ]);
  await pool.query(`INSERT INTO subscriptions (id, tenant_id, plan, status, expired_at) VALUES ($1, $2, '1_month', 'active', $3)`, [
    randomUUID(), tenantId, new Date(Date.now() + 30 * 24 * 3600 * 1000),
  ]);
  await pool.query(`INSERT INTO guests (id, invitation_id, token, name) VALUES ($1, $2, $3, 'Budi')`, [
    guestId, invitationId, guestToken,
  ]);
  await pool.query("COMMIT");

  const check = async (label, res) => {
    console.log(`${label}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    if (!res.ok) throw new Error(`${label} failed`);
  };

  const invite = await fetch(`${API}/public/invitation/${slug}?guest=${guestToken}`);
  await check("GET invitation", invite);

  const rsvp = await fetch(`${API}/public/invitation/${slug}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: guestToken, attendance: true, guestCount: 2, message: "See you!" }),
  });
  await check("POST rsvp", rsvp);

  const guestbook = await fetch(`${API}/public/invitation/${slug}/guestbook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestToken, message: "Congrats <b>both</b>!" }),
  });
  await check("POST guestbook", guestbook);
  await check("GET guestbook", await fetch(`${API}/public/invitation/${slug}/guestbook`));

  const form = new FormData();
  form.append("guestToken", guestToken);
  form.append("file", new Blob([Buffer.from("hello")], { type: "text/plain" }), "x.txt");
  await check("POST media bad mime", await fetch(`${API}/public/invitation/${slug}/media`, { method: "POST", body: form }));

  const form2 = new FormData();
  form2.append("guestToken", guestToken);
  form2.append("file", new Blob([Buffer.from("png-bytes")], { type: "image/png" }), "photo.png");
  const media = await fetch(`${API}/public/invitation/${slug}/media`, { method: "POST", body: form2 });
  await check("POST media image", media);
  const mediaBody = await media.json();
  const fetched = await fetch(`${API}/public/media/${mediaBody.objectKey}`);
  console.log(`GET media file: ${fetched.status}`);
  if (fetched.status !== 200) throw new Error("media file not served");

  await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
  await pool.end();
  console.log("All Step 8 smoke checks passed.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
