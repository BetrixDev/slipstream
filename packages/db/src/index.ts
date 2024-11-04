import * as schema from "./schema.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });

export * from "./schema.js";
export * from "drizzle-orm";
