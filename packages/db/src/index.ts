import * as schema from "./schema.js";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const client = neon(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

export * from "./schema.js";
export * from "drizzle-orm";
