import type { Config, Context } from "@netlify/functions";

/** Liveness probe. Ports backend/app/api/routes/health.py. */
export default async (_req: Request, _context: Context): Promise<Response> => {
  return Response.json({ status: "ok" });
};

export const config: Config = {
  path: "/health",
  method: "GET",
};
