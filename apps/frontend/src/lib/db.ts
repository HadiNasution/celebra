import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./auth-schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

export const db = drizzle(pool, { schema });
