import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
  server: {
    preset: "vercel",
    prerender: {
      routes: [
        "/",
        "/pricing",
        "/success",
        "/videos",
        "/privacy-policy",
        "/terms-of-service",
        "/sign-in",
        "/sign-up",
      ],
    },
  },
});
