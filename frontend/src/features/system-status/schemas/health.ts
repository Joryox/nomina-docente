import { z } from "zod";

/** Contrato de GET /api/v1/health (espejo de app.schemas.health en el backend). */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "unavailable"]),
  version: z.string(),
  environment: z.enum(["development", "test", "production"]),
});
