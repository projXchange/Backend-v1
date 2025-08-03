import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../models/schema";
import postgres from "postgres";


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables!");
}

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(sql, { schema });

export default db;
