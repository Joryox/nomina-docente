import type { ApiWarningCode } from "@/lib/api-types";

/**
 * Textos de las advertencias de la API: la operación se hizo, pero conviene revisar algo.
 * `satisfies` contra el tipo generado exige un texto para cada código del backend.
 */
export const WARNING_MESSAGES = {
  SESSION_NOT_SCHEDULED:
    "Esa clase no está en tu horario ese día. La sesión se registró; revisa que la fecha sea correcta.",
  SESSION_TIMES_DIFFER:
    "Las horas de la sesión no coinciden con el horario programado. Se guardaron las horas capturadas.",
  PERIOD_NOT_FINISHED:
    "La quincena aún no termina: la vista previa puede cambiar con las sesiones que registres.",
  SCHEDULED_CLASSES_NOT_REGISTERED:
    "Hay clases programadas que ya terminaron y no están en la bitácora. Regístralas si las impartiste.",
  SESSIONS_OUTSIDE_SCHEDULE:
    "Algunas sesiones no coinciden con el horario programado. Revisa que las horas sean correctas.",
  ASSIGNMENT_RATE_CHANGED:
    "La tarifa de una clase cambió dentro de la quincena: cada sesión se paga con la tarifa vigente cuando se registró.",
} as const satisfies Record<ApiWarningCode, string>;
