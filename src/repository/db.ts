// src/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../models/schema";
import postgres from "postgres";

// Use DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables!");
}

// Create postgres client
const sql = postgres(connectionString, {
  // optional: you can configure connection pooling, debug etc here
  ssl: { rejectUnauthorized: false }, // if your DB requires SSL, adjust accordingly
});

// Initialize Drizzle ORM with postgres client and schema
export const db = drizzle(sql, { schema });

export default db;
