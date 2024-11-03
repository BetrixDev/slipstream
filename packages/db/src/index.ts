import * as schema from "./schema.js";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Client } from "@neondatabase/serverless";

const neon = new Client({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(neon, { schema });

export * from "./schema.js";
export * from "drizzle-orm";
