import type { Config, Context } from "@netlify/functions";
import { getSite, listSites, listSitesForExport, sitesToCsv } from "../../db/queries.js";
import { errorResponse, jsonResponse, parseFilters, single } from "../lib/http.js";

/**
 * Serves the /api/sites tree: the paginated list, the CSV export, and the
 * per-site detail lookup. Routing is dispatched from the pathname here rather
 * than relying on static-vs-parameter match priority, so `/api/sites/export`
 * can never be swallowed by the `:site_code` case.
 *
 * Ports backend/app/api/routes/sites.py.
 */
export default async (req: Request, _context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const rest = url.pathname.replace(/^\/api\/sites\/?/, "");

  try {
    // CSV export of the current filtered+sorted view -- the full result set.
    if (rest === "export") {
      const filters = parseFilters(url);
      const sort = single(url, "sort");
      const rows = await listSitesForExport(filters, sort);
      const csv = sitesToCsv(rows);
      // UTF-8 BOM so Excel on Windows opens it in the right encoding.
      return new Response("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="wa_mining_sites.csv"',
          "Cache-Control": "no-store",
        },
      });
    }

    // Per-site detail.
    if (rest !== "") {
      const site = await getSite(decodeURIComponent(rest));
      if (!site) return jsonResponse({ detail: `Site '${decodeURIComponent(rest)}' not found` }, 404);
      return jsonResponse(site);
    }

    // Paginated, filtered, sorted list.
    const filters = parseFilters(url);
    const sort = single(url, "sort");
    const page = Math.max(1, Number(single(url, "page") ?? 1) || 1);
    const rawPageSize = Number(single(url, "page_size") ?? 25) || 25;
    const pageSize = Math.min(500, Math.max(1, rawPageSize));
    const result = await listSites(filters, sort, page, pageSize);
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
};

export const config: Config = {
  path: ["/api/sites", "/api/sites/*"],
  method: "GET",
};
