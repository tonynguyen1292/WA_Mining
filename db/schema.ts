import { numeric, pgTable, text } from "drizzle-orm/pg-core";

/**
 * A single mining/infrastructure/petroleum site (MINEDEX SITE_CODE grain).
 *
 * Mirrors the FastAPI SQLAlchemy `Site` model (backend/app/models/site.py)
 * and SQL/02_create_clean_table.sql, so the Netlify Functions API returns
 * exactly the shape the existing React frontend already consumes.
 *
 * Column *keys* are snake_case to match the JSON the frontend's types
 * (frontend/src/types/site.ts) expect, so a plain `select()` serializes
 * straight to the wire shape with no per-field renaming.
 */
export const sites = pgTable("sites", {
  site_code: text("site_code").primaryKey(),
  project_code: text("project_code"),
  project_title: text("project_title"),
  title: text("title"),
  short_title: text("short_title"),
  site_type: text("site_type"),
  subtype: text("subtype"),
  stage: text("stage"),
  target_group_name: text("target_group_name"),
  commodity_group_name: text("commodity_group_name"),
  development_region: text("development_region"),
  lga_name: text("lga_name"),
  // Numeric(10,6) in Postgres, as in the original model. Drizzle returns
  // numeric as a string to preserve precision; the API layer casts these
  // back to `number | null` before responding, matching the frontend type.
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  active_flag: text("active_flag"),
});

export type SiteRow = typeof sites.$inferSelect;
