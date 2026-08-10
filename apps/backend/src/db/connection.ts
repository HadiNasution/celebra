import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// ponytail: raw pg pool bypasses drizzle prepared statement SCRAM auth bug
export const rawPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://celebra:celebra@localhost:5432/celebra",
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://celebra:celebra@localhost:5432/celebra",
  max: 1, // ponytail: single connection avoids drizzle prepared statement SCRAM auth bug
});

export const db = drizzle(pool, { schema });

export type DbClient = typeof db;
