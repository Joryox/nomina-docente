import type { ApiErrorCode } from "@/lib/api-types";

/**
 * Mensajes en español para los códigos de error estables de la API (y del cliente).
 * Cada mensaje dice qué pasó y cómo corregirlo. `API_ERROR_MESSAGES` usa `satisfies`
 * contra el tipo generado del backend: si aparece un código nuevo, TypeScript exige su texto.
 */
export const CLIENT_ERROR_CODES = {
  network: "NETWORK_ERROR",
  backendUnavailable: "BACKEND_UNAVAILABLE",
  invalidResponse: "INVALID_RESPONSE",
  unknown: "UNKNOWN_ERROR",
} as const;

type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

const CLIENT_ERROR_MESSAGES: Readonly<Record<ClientErrorCode, string>> = {
  [CLIENT_ERROR_CODES.network]:
    "No hay conexión con el servidor. Revisa tu conexión a internet e intenta de nuevo.",
  [CLIENT_ERROR_CODES.backendUnavailable]:
    "El servidor del sistema no responde. Intenta de nuevo en unos minutos.",
  [CLIENT_ERROR_CODES.invalidResponse]:
    "El servidor respondió con datos inesperados. Intenta de nuevo; si persiste, avisa al área de sistemas.",
  [CLIENT_ERROR_CODES.unknown]: "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
};

export const API_ERROR_MESSAGES = {
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
    "Correo o contraseña incorrectos. Revísalos e intenta de nuevo; después de varios intentos fallidos el acceso se bloquea unos minutos.",
  ACCOUNT_LOCKED:
    "Tu cuenta está bloqueada temporalmente por varios intentos fallidos. Espera unos minutos e intenta de nuevo.",
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
  CAREER_NOT_FOUND: "La carrera no existe. Elige una carrera de la lista.",
  CAREER_INACTIVE: "La carrera ya no está disponible. Elige otra carrera de la lista.",
  RATE_NOT_FOUND: "La tarifa no existe en el catálogo. Elige una tarifa de la lista.",
  RATE_INACTIVE: "La tarifa ya no está vigente. Elige una tarifa vigente de la lista.",
  SUBJECT_NOT_FOUND: "La materia no existe. Recarga la página y elígela de nuevo.",
  SUBJECT_ALREADY_EXISTS: "Ya registraste una materia con ese nombre. Usa la que ya existe.",
  SUBJECT_INACTIVE: "La materia está desactivada. Reactívala antes de usarla.",
  SUBJECT_HAS_ACTIVE_ASSIGNMENTS:
    "La materia tiene clases activas. Desactívalas o elimínalas en Mis clases antes de quitarla.",
  ASSIGNMENT_NOT_FOUND: "La clase no existe. Recarga la página y elígela de nuevo.",
  ASSIGNMENT_ALREADY_EXISTS:
    "Ya tienes una clase activa de esa materia en esa carrera y con ese grupo. Escribe otro grupo o, si cambió la tarifa, edita la clase existente.",
  ASSIGNMENT_INACTIVE: "La clase está desactivada. Reactívala en Mis clases antes de modificarla.",
  ASSIGNMENT_HAS_LOGBOOK:
    "La clase tiene sesiones en la bitácora: no se puede borrar ni cambiar su materia o carrera. Desactívala y crea una nueva.",
  SCHEDULE_NOT_FOUND: "El horario no existe. Recarga la página.",
  SCHEDULE_OVERLAP: "El horario se empalma con otra de tus clases. Elige otra hora.",
  SCHEDULE_RANGES_OVERLAP:
    "Dos rangos de horas de la captura se empalman el mismo día. Revisa las horas.",
  TIME_RANGE_INVALID:
    "La hora de salida debe ser posterior a la hora de entrada. Una clase no puede cruzar la medianoche.",
  CLASS_TOO_SHORT: "La clase dura menos de lo permitido. Revisa la hora de entrada y de salida.",
  CLASS_TOO_LONG: "La clase dura más de lo permitido. Revisa la hora de entrada y de salida.",
  LOGBOOK_ENTRY_NOT_FOUND: "La sesión no existe en tu bitácora. Recarga la página.",
  SESSION_OVERLAP: "La sesión se empalma con otra sesión registrada ese día. Revisa las horas.",
  SESSION_DATE_IN_FUTURE:
    "No se registran sesiones con fecha futura. Elige hoy o una fecha anterior.",
  SESSION_NOT_FINISHED: "La sesión todavía no termina. Regístrala después de la hora de salida.",
  SESSION_DATE_TOO_OLD:
    "La sesión es demasiado antigua para registrarla. Si falta, avisa a tu coordinación.",
  ASSIGNMENT_INACTIVE_ON_DATE:
    "La clase no estaba activa en esa fecha. Elige una fecha anterior u otra clase.",
  SCHEDULE_NOT_ON_DATE: "El horario elegido no corresponde al día de la semana de la fecha.",
  PERIOD_LOCKED: "La quincena ya tiene recibo emitido: su bitácora no se puede modificar.",
  PERIOD_IN_FUTURE: "La quincena todavía no empieza.",
  PERIOD_NOT_FINISHED: "La quincena todavía no termina. Emite el recibo cuando concluya.",
  PERIOD_WITHOUT_SESSIONS:
    "La quincena no tiene sesiones registradas. Registra tu bitácora antes de emitir el recibo.",
  RECEIPT_ALREADY_ISSUED: "Ya emitiste el recibo de esta quincena.",
  RECEIPT_NOT_FOUND: "El recibo no existe. Recarga la página.",
} as const satisfies Record<ApiErrorCode, string>;

export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  ...CLIENT_ERROR_MESSAGES,
  ...API_ERROR_MESSAGES,
};

/**
 * Mensajes que usan los datos de `error.details` para decir exactamente qué pasó. Los
 * datos ya vienen validados por `lib/api-error.ts`.
 */
export const DETAILED_ERROR_MESSAGES = {
  scheduleOverlap: (
    weekday: string,
    range: string,
    otherClass: string,
    otherRange: string,
    allOrNothing: boolean,
  ) =>
    `El ${weekday}, ${range} se empalma con ${otherClass} (${otherRange}).${allOrNothing ? " No se guardó ningún horario." : ""} Elige otra hora de entrada o de salida para ese día.`,
  scheduleRangesOverlap: (weekday: string, first: string, second: string) =>
    `El ${weekday}, ${first} y ${second} se empalman. Cambia las horas o quita ese día de uno de los rangos.`,
  sessionOverlap: (otherClass: string, range: string) =>
    `La sesión se empalma con ${otherClass}, registrada ese día de ${range}. Revisa la hora de entrada y de salida.`,
  classTooShort: (minutes: number) =>
    `La clase debe durar al menos ${minutes} minutos. Revisa la hora de entrada y de salida.`,
  classTooLong: (minutes: number) =>
    `La clase puede durar como máximo ${minutes} minutos. Revisa la hora de entrada y de salida.`,
  sessionTooOld: (days: number) =>
    `Solo se registran sesiones de los últimos ${days} días. Si falta una más antigua, avisa a tu coordinación.`,
  receiptAlreadyIssued: (folio: string) =>
    `Ya emitiste el recibo de esta quincena (folio ${folio}).`,
  subjectAlreadyExists: (name: string, isActive: boolean) =>
    isActive
      ? `Ya registraste la materia «${name}». Usa la que ya existe.`
      : `Ya registraste la materia «${name}», pero está desactivada. Reactívala para usarla.`,
} as const;

/** Mensajes de validación de los formularios (Zod). */
export const VALIDATION_MESSAGES = {
  required: "Este campo es obligatorio.",
  email: "Escribe un correo electrónico válido, por ejemplo nombre@tesh.edu.mx.",
  personName: "Usa solo letras, espacios, apóstrofos, guiones o puntos.",
  employeeNumber: "Usa solo letras, números y guiones, sin espacios.",
  passwordMismatch: "Las contraseñas no coinciden. Escríbela igual en ambos campos.",
  maxLength: (max: number) => `Escribe como máximo ${max} caracteres.`,
  subjectCode: "Usa solo letras, números y guiones, sin espacios, por ejemplo SCD-1004.",
  groupCode: "Usa solo letras, números y guiones, por ejemplo 3101 o 3101-A.",
  weekdaysRequired: "Elige al menos un día.",
  rangesOverlap: (weekday: string) =>
    `Este rango se empalma con otro el ${weekday}. Cambia las horas o quita ese día.`,
  selectOption: "Elige una opción de la lista.",
  clockTime: "Escribe la hora en formato de 24 horas, por ejemplo 07:00.",
  date: "Elige una fecha válida.",
  endAfterStart: "La hora de salida debe ser posterior a la hora de entrada.",
  classTooShort: (minutes: number) => `La clase debe durar al menos ${minutes} minutos.`,
  classTooLong: (minutes: number) => `La clase puede durar como máximo ${minutes} minutos.`,
  futureDate: "No se registran sesiones con fecha futura.",
  dateTooOld: (days: number) => `Solo se registran sesiones de los últimos ${days} días.`,
} as const;
