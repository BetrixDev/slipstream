import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "turso",
  schema: "./src/schema.ts",
  out: "../../migrations",
});
