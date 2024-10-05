import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";

const libsql = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(libsql);

await migrate(db, {
  migrationsFolder: path.join(process.cwd(), "..", "..", "migrations"),
});

libsql.close();

console.log("Database migrated");
