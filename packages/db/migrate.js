import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "path";

const queryClient = postgres(process.env.DATABASE_URL);
export const db = drizzle(queryClient);

await migrate(db, {
  migrationsFolder: path.join(process.cwd(), "migrations"),
});

console.log("Database migrated");
