import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import path from "path";

const neonClient = neon(process.env.DATABASE_URL);
export const db = drizzle(neonClient);

await migrate(db, {
  migrationsFolder: path.join(process.cwd(), "migrations"),
});

console.log("Database migrated");

process.exit(0);
