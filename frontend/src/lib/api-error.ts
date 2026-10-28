import { z } from "zod";

import {
  CLIENT_ERROR_CODES,
  DETAILED_ERROR_MESSAGES,
  ERROR_MESSAGES,
} from "@/constants/error-messages";
import { BACKEND_UNAVAILABLE_STATUSES } from "@/constants/http";
import { WARNING_MESSAGES } from "@/constants/warning-messages";

import type { ApiErrorCode, ApiSchemas } from "./api-types";
import { formatClassLabel, formatTimeRange, formatWeekday } from "./formatters";

/** Formato único de error que responde el backend. */
const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).default({}),
  }),
});

type Details = Readonly<Record<string, unknown>>;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Details;

  constructor(code: string, status: number, details: Record<string, unknown> = {}) {
    super(getErrorMessage(code, details));
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

  /** Permite reaccionar a un código de dominio sin comparar textos. */
  is(code: ApiErrorCode): boolean {
    return this.code === code;
  }
}

const weekday = z.literal([1, 2, 3, 4, 5, 6, 7]);
const timeRange = { start_time: z.string(), end_time: z.string() };
const conflictingClass = {
  subject_name: z.string(),
  career_code: z.string(),
  group: z.string().nullable(),
  ...timeRange,
};
const scheduleConflicts = z.object({
  weekday,
  ...timeRange,
  all_or_nothing: z.boolean(),
  conflicts: z.array(z.object(conflictingClass)).min(1),
});
const rangesConflict = z.object({
  weekday,
  ranges: z.array(z.object(timeRange)).length(2),
});
const sessionConflicts = z.object({
  conflicts: z.array(z.object(conflictingClass)).min(1),
});

function classOf(conflict: z.infer<z.ZodObject<typeof conflictingClass>>): string {
  return formatClassLabel(conflict.subject_name, conflict.career_code, conflict.group);
}

/** Mensajes que usan los datos del error; si los datos no vienen, se usa el texto general. */
const DETAILED: Partial<Record<string, (details: Details) => string | undefined>> = {
  SCHEDULE_OVERLAP: (details) => {
    const parsed = scheduleConflicts.safeParse(details).data;
    const first = parsed?.conflicts[0];
    return parsed && first
      ? DETAILED_ERROR_MESSAGES.scheduleOverlap(
          formatWeekday(parsed.weekday),
          formatTimeRange(parsed.start_time, parsed.end_time),
          classOf(first),
          formatTimeRange(first.start_time, first.end_time),
          parsed.all_or_nothing,
        )
      : undefined;
  },
  SCHEDULE_RANGES_OVERLAP: (details) => {
    const parsed = rangesConflict.safeParse(details).data;
    const [first, second] = parsed?.ranges ?? [];
    return parsed && first && second
      ? DETAILED_ERROR_MESSAGES.scheduleRangesOverlap(
          formatWeekday(parsed.weekday),
          formatTimeRange(first.start_time, first.end_time),
          formatTimeRange(second.start_time, second.end_time),
        )
      : undefined;
  },
  SESSION_OVERLAP: (details) => {
    const first = sessionConflicts.safeParse(details).data?.conflicts[0];
    return first
      ? DETAILED_ERROR_MESSAGES.sessionOverlap(
          classOf(first),
          formatTimeRange(first.start_time, first.end_time),
        )
      : undefined;
  },
  CLASS_TOO_SHORT: (details) => {
    const minutes = z.object({ min_minutes: z.number() }).safeParse(details).data?.min_minutes;
    return minutes === undefined ? undefined : DETAILED_ERROR_MESSAGES.classTooShort(minutes);
  },
  CLASS_TOO_LONG: (details) => {
    const minutes = z.object({ max_minutes: z.number() }).safeParse(details).data?.max_minutes;
    return minutes === undefined ? undefined : DETAILED_ERROR_MESSAGES.classTooLong(minutes);
  },
  SESSION_DATE_TOO_OLD: (details) => {
    const days = z.object({ max_age_days: z.number() }).safeParse(details).data?.max_age_days;
    return days === undefined ? undefined : DETAILED_ERROR_MESSAGES.sessionTooOld(days);
  },
  RECEIPT_ALREADY_ISSUED: (details) => {
    const folio = z.object({ folio: z.string() }).safeParse(details).data?.folio;
    return folio === undefined ? undefined : DETAILED_ERROR_MESSAGES.receiptAlreadyIssued(folio);
  },
  SUBJECT_ALREADY_EXISTS: (details) => {
    const subject = z
      .object({ subject_name: z.string(), is_active: z.boolean() })
      .safeParse(details).data;
    return subject
      ? DETAILED_ERROR_MESSAGES.subjectAlreadyExists(subject.subject_name, subject.is_active)
      : undefined;
  },
};

export function getErrorMessage(code: string, details: Details = {}): string {
  return (
    DETAILED[code]?.(details) ??
    ERROR_MESSAGES[code] ??
    ERROR_MESSAGES[CLIENT_ERROR_CODES.unknown] ??
    code
  );
}

/** Único punto que convierte cualquier error en un mensaje para la persona usuaria. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return getErrorMessage(CLIENT_ERROR_CODES.unknown);
}

/** Texto en español de una advertencia de la API, por su código estable. */
export function toWarningMessage(warning: ApiSchemas["WarningItem"]): string {
  return WARNING_MESSAGES[warning.code];
}
