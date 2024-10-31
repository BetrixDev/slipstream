import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import path from "path";

const client = neon(process.env.DATABASE_URL);
export const db = drizzle(client);

await migrate(db, {
  migrationsFolder: path.join(process.cwd(), "migrations"),
});

console.log("Database migrated");
