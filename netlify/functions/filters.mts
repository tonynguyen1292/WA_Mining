import type { Config, Context } from "@netlify/functions";
import { getFilterOptions } from "../../db/queries.js";
import { errorResponse, jsonResponse } from "../lib/http.js";

/**
 * Distinct filter option values (commodities, regions, stages, site types)
 * that populate the UI's filter controls. Ports backend/app/api/routes/meta.py.
 */
export default async (_req: Request, _context: Context): Promise<Response> => {
  try {
    const options = await getFilterOptions();
    return jsonResponse(options);
  } catch (err) {
    return errorResponse(err);
  }
};

export const config: Config = {
  path: "/api/meta/filters",
  method: "GET",
};
