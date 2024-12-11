import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.js";
import { drizzle } from "drizzle-orm/neon-http";

const neonClient = neon(process.env.DATABASE_URL!);
export const db = drizzle(neonClient, { schema });

export * from "./schema.js";
export * from "drizzle-orm";
