import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  // MUST be netlify/database/migrations so Netlify applies them automatically
  // during deploy.
  out: "netlify/database/migrations",
});
