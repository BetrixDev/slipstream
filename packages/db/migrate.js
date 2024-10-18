import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "path";

const client = postgres(process.env.DATABASE_URL, { prepare: false });
export const db = drizzle(client);

await migrate(db, {
  migrationsFolder: path.join(process.cwd(), "..", "..", "migrations"),
});

console.log("Database migrated");
