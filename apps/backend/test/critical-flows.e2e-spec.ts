import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { rawPool } from "../src/db/connection";

const rand = () => randomUUID().slice(0, 8);

let app: INestApplication;
let tokenA: string;
let tokenB: string;
let slugA: string;
let slugB: string;
let invitationAId: string;
let invitationBId: string;
let guestToken: string;

const emailA = `owner-a-${rand()}@test.local`;
const emailB = `owner-b-${rand()}@test.local`;
const checkoutEmail = `checkout-${rand()}@test.local`;
const password = "password123";

let tenantAId: string;
let tenantBId: string;
let templateId: string;
let categoryId: string;
const checkoutTenantIds: string[] = [];

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  categoryId = randomUUID();
  templateId = randomUUID();
  tenantAId = randomUUID();
  tenantBId = randomUUID();
  invitationAId = randomUUID();
  invitationBId = randomUUID();
  slugA = `inv-a-${rand()}`;
  slugB = `inv-b-${rand()}`;
  const passwordHash = await bcrypt.hash(password, 10);

  await rawPool.query(`INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)`, [
    categoryId,
    "Wedding",
    `cat-${rand()}`,
  ]);
  await rawPool.query(
    `INSERT INTO templates (id, category_id, name, version, html_bundle, json_schema) VALUES ($1, $2, $3, 1, $4, $5)`,
    [templateId, categoryId, "Test Template", "<h1>{{hero.title}}</h1>", JSON.stringify({ hero: { title: { type: "text", label: "Title", required: true } } })],
  );
  await rawPool.query(
    `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3), ($4, $5, $6)`,
    [tenantAId, `tenant-a-${rand()}`, "Tenant A", tenantBId, `tenant-b-${rand()}`, "Tenant B"],
  );
  await rawPool.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, 'owner'), ($6, $7, $8, $9, $10, 'owner')`,
    [randomUUID(), tenantAId, "Owner A", emailA, passwordHash, randomUUID(), tenantBId, "Owner B", emailB, passwordHash],
  );
  await rawPool.query(
    `INSERT INTO subscriptions (id, tenant_id, plan, status, expired_at) VALUES ($1, $2, '1_month', 'active', now() + interval '1 month'), ($3, $4, '1_month', 'active', now() + interval '1 month')`,
    [randomUUID(), tenantAId, randomUUID(), tenantBId],
  );
  await rawPool.query(
    `INSERT INTO invitations (id, tenant_id, template_version_id, slug, title, status) VALUES ($1, $2, $3, $4, $5, 'draft'), ($6, $7, $8, $9, $10, 'draft')`,
    [invitationAId, tenantAId, templateId, slugA, "Invitation A", invitationBId, tenantBId, templateId, slugB, "Invitation B"],
  );
  await rawPool.query(
    `INSERT INTO invitation_contents (id, invitation_id, content_json) VALUES ($1, $2, $3), ($4, $5, $6)`,
    [randomUUID(), invitationAId, JSON.stringify({ hero: { title: "A" } }), randomUUID(), invitationBId, JSON.stringify({ hero: { title: "B" } })],
  );
});

afterAll(async () => {
  if (app) await app.close();
  await rawPool.query(`DELETE FROM payments WHERE user_email = $1`, [checkoutEmail]);
  for (const id of [tenantAId, tenantBId, ...checkoutTenantIds]) {
    await rawPool.query(`DELETE FROM tenants WHERE id = $1`, [id]);
  }
  await rawPool.query(`DELETE FROM templates WHERE id = $1`, [templateId]);
  await rawPool.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
  await rawPool.end();
});

const http = () => request(app.getHttpServer());

describe("critical flows (e2e)", () => {
  it("auth: login with valid credentials returns a token", async () => {
    const res = await http().post("/api/auth/login").send({ email: emailA, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    tokenA = res.body.token;
  });

  it("auth: login with wrong password returns 401", async () => {
    const res = await http().post("/api/auth/login").send({ email: emailA, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("auth: login with unknown email returns 401", async () => {
    const res = await http().post("/api/auth/login").send({ email: "nobody@test.local", password });
    expect(res.status).toBe(401);
  });

  it("auth: protected endpoint without token returns 401", async () => {
    const res = await http().get("/api/invitations");
    expect(res.status).toBe(401);
  });

  it("isolation: tenant A listing invitations does not leak tenant B", async () => {
    const res = await http().get("/api/invitations").set("Cookie", `celebra_session=${tokenA}`);
    expect(res.status).toBe(200);
    const slugs = res.body.map((i: { slug: string }) => i.slug);
    expect(slugs).toContain(slugA);
    expect(slugs).not.toContain(slugB);
  });

  it("isolation: tenant A cannot fetch tenant B invitation", async () => {
    const res = await http().get(`/api/invitations/${invitationBId}`).set("Cookie", `celebra_session=${tokenA}`);
    expect(res.status).toBe(404);
  });

  it("publish: draft can be published, republish is rejected", async () => {
    const first = await http().post(`/api/invitations/${invitationAId}/publish`).set("Cookie", `celebra_session=${tokenA}`);
    expect(first.status).toBe(201);
    expect(first.body.publishedUrl).toBe(`/${slugA}`);

    const second = await http().post(`/api/invitations/${invitationAId}/publish`).set("Cookie", `celebra_session=${tokenA}`);
    expect(second.status).toBe(409);
  });

  it("publish: public invitation is served for a published invitation", async () => {
    const res = await http().get(`/api/public/invitation/${slugA}`);
    expect(res.status).toBe(200);
    expect(res.body.html).toContain("<h1>A</h1>");
  });

  it("guest: create a guest auto-generates a UUID token", async () => {
    const res = await http()
      .post(`/api/invitations/${invitationAId}/guests`)
      .set("Cookie", `celebra_session=${tokenA}`)
      .send({ name: "Alice" });
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[0-9a-f-]{36}$/);
    guestToken = res.body.token;
  });

  it("rsvp: valid token records attendance, invalid token returns 404", async () => {
    const ok = await http()
      .post(`/api/public/invitation/${slugA}/rsvp`)
      .send({ token: guestToken, attendance: true, guestCount: 1 });
    expect(ok.status).toBe(201);

    const bad = await http()
      .post(`/api/public/invitation/${slugA}/rsvp`)
      .send({ token: randomUUID(), attendance: true });
    expect(bad.status).toBe(404);
  });

  it("checkout: double confirm is idempotent (single tenant + user)", async () => {
    const checkout = await http()
      .post("/api/checkout")
      .send({ name: "Checkout Tenant", email: checkoutEmail, plan: "1_month" });
    expect(checkout.status).toBe(201);
    expect(checkout.body.paymentId).toBeTruthy();

    await http().post("/api/checkout/mock-confirm").send({ paymentId: checkout.body.paymentId });
    await http().post("/api/checkout/mock-confirm").send({ paymentId: checkout.body.paymentId });

    const { rows } = await rawPool.query(
      `SELECT tenant_id FROM payments WHERE id = $1`,
      [checkout.body.paymentId],
    );
    expect(rows[0].tenant_id).toBeTruthy();
    checkoutTenantIds.push(rows[0].tenant_id);

    const users = await rawPool.query(`SELECT id FROM users WHERE email = $1`, [checkoutEmail]);
    expect(users.rows.length).toBe(1);
  });
});
