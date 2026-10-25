import { z } from "zod";

import { CLIENT_ERROR_CODES, ERROR_MESSAGES } from "@/constants/error-messages";
import { BACKEND_UNAVAILABLE_STATUSES } from "@/constants/http";

/** Formato único de error que responde el backend. */
const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).default({}),
  }),
});

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, status: number, details: Record<string, unknown> = {}) {
    super(getErrorMessage(code));
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Construye el error a partir de una respuesta no exitosa y su cuerpo (si era JSON). */
  static fromResponse(status: number, payload: unknown): ApiError {
    const parsed = apiErrorBodySchema.safeParse(payload);
    if (parsed.success) {
      return new ApiError(parsed.data.error.code, status, parsed.data.error.details);
    }
    const code = BACKEND_UNAVAILABLE_STATUSES.has(status)
      ? CLIENT_ERROR_CODES.backendUnavailable
      : CLIENT_ERROR_CODES.unknown;
    return new ApiError(code, status);
  }
}

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[CLIENT_ERROR_CODES.unknown] ?? code;
}

/** Único punto que convierte cualquier error en un mensaje para la persona usuaria. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return getErrorMessage(CLIENT_ERROR_CODES.unknown);
}
