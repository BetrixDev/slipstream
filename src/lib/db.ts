import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/neon-http";

const neonClient = neon(process.env.DATABASE_URL!);
export const db = drizzle(neonClient, { schema });
