/**
 * Mensajes en español para los códigos de error estables de la API (y del cliente).
 * Cada mensaje dice qué pasó y cómo corregirlo.
 */
export const CLIENT_ERROR_CODES = {
  network: "NETWORK_ERROR",
  backendUnavailable: "BACKEND_UNAVAILABLE",
  invalidResponse: "INVALID_RESPONSE",
  unknown: "UNKNOWN_ERROR",
} as const;

export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  [CLIENT_ERROR_CODES.network]:
    "No hay conexión con el servidor. Revisa tu conexión a internet e intenta de nuevo.",
  [CLIENT_ERROR_CODES.backendUnavailable]:
    "El servidor del sistema no responde. Intenta de nuevo en unos minutos.",
  [CLIENT_ERROR_CODES.invalidResponse]:
    "El servidor respondió con datos inesperados. Intenta de nuevo; si persiste, avisa al área de sistemas.",
  [CLIENT_ERROR_CODES.unknown]: "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
  BAD_REQUEST: "La solicitud no es válida. Revisa los datos e intenta de nuevo.",
  NOT_FOUND: "No encontramos lo que buscas. Verifica que siga existiendo.",
  METHOD_NOT_ALLOWED: "Esta acción no está permitida.",
  CONFLICT: "La operación choca con información que ya existe. Revisa los datos.",
  BUSINESS_RULE_VIOLATION: "La operación no cumple las reglas del sistema. Revisa los datos.",
  VALIDATION_ERROR: "Algunos datos no son válidos. Corrige los campos marcados.",
  INTERNAL_ERROR: "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
};
