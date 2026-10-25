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
  PAYLOAD_TOO_LARGE:
    "Los datos enviados son demasiado grandes. Revisa los campos e intenta de nuevo.",
  NOT_AUTHENTICATED: "Inicia sesión para continuar.",
  ACCESS_TOKEN_EXPIRED: "Tu sesión terminó. Inicia sesión de nuevo.",
  SESSION_INVALID: "Tu sesión terminó. Inicia sesión de nuevo.",
  SESSION_REFRESH_CONFLICT: "Tu sesión se renovó en otra pestaña. Intenta de nuevo.",
  INVALID_CREDENTIALS:
    "Correo o contraseña incorrectos. Después de varios intentos fallidos, el acceso se bloquea temporalmente: espera unos minutos antes de volver a intentar.",
  CURRENT_PASSWORD_INCORRECT: "La contraseña actual no es correcta. Revísala e intenta de nuevo.",
  PERMISSION_DENIED: "Tu cuenta no tiene permiso para realizar esta acción.",
  TEACHER_PROFILE_REQUIRED: "Esta cuenta no tiene un perfil de docente.",
  CSRF_TOKEN_INVALID:
    "La sesión de seguridad del formulario expiró. Recarga la página e intenta de nuevo.",
  CSRF_ORIGIN_NOT_ALLOWED: "La solicitud viene de un sitio no autorizado.",
  EMAIL_ALREADY_REGISTERED:
    "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.",
  EMPLOYEE_NUMBER_ALREADY_REGISTERED:
    "Ese número de empleado ya está registrado en otra cuenta. Revísalo o déjalo en blanco.",
  PASSWORD_POLICY_VIOLATION: "La contraseña no cumple los requisitos de seguridad.",
};

/** Mensajes de validación de los formularios (Zod). */
export const VALIDATION_MESSAGES = {
  required: "Este campo es obligatorio.",
  email: "Escribe un correo electrónico válido, por ejemplo nombre@tesh.edu.mx.",
  personName: "Usa solo letras, espacios, apóstrofos, guiones o puntos.",
  employeeNumber: "Usa solo letras, números y guiones, sin espacios.",
  maxLength: (max: number) => `Escribe como máximo ${max} caracteres.`,
} as const;
