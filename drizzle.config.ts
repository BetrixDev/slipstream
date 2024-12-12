import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: in config file so can't use env from lib
    url: process.env.DATABASE_URL!,
  },
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./migrations",
});
