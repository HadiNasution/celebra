import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // ponytail: single connection avoids drizzle prepared statement SCRAM auth bug
});

export const db = drizzle(pool, { schema });

export type DbClient = typeof db;
