import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  dialect: "postgresql",
  schema: "./app/lib/schema.ts",
  out: "./migrations",
});
