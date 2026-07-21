import type { Config, Context } from "@netlify/functions";
import { getKpis } from "../../db/queries.js";
import { errorResponse, jsonResponse, parseFilters } from "../lib/http.js";

/**
 * Portfolio KPI summary (totals + breakdowns + top projects) for the current
 * filter selection. Ports backend/app/api/routes/portfolio.py. Note the KPI
 * endpoint applies every filter except free-text search.
 */
export default async (req: Request, _context: Context): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const { search: _search, ...filters } = parseFilters(url);
    const kpis = await getKpis(filters);
    return jsonResponse(kpis);
  } catch (err) {
    return errorResponse(err);
  }
};

export const config: Config = {
  path: "/api/kpis",
  method: "GET",
};
