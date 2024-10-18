import * as schema from "./schema.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });

export * from "./schema.js";
export * from "drizzle-orm";
