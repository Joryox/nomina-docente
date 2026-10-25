/**
 * Límites y formatos fijos de los campos, espejo de backend/src/app/core/constants.py. Lo
 * configurable NO está aquí: la política de contraseñas (GET /auth/password-policy) y los
 * límites de clases y bitácora (GET /catalogs/business-rules) se consultan al backend.
 */
export const FIELD_LIMITS = {
  email: 254,
  personName: 100,
  employeeNumber: 20,
  subjectName: 150,
  subjectCode: 20,
  logbookNotes: 500,
  searchTerm: 100,
} as const;

export const SUBJECT_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
export const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
export const PERIOD_YEAR_RANGE = { min: 2000, max: 2100 } as const;
export const MINUTES_PER_HOUR = 60;

export const PERSON_NAME_PATTERN = /^\p{L}+(?:[ '.-]\p{L}+)*\.?$/u;
export const EMPLOYEE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
export const LETTER_PATTERN = /\p{L}/u;
export const DIGIT_PATTERN = /\d/;
