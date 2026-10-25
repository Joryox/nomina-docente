/**
 * Límites y formatos de los campos, espejo de backend/src/app/core/constants.py. La
 * política de contraseñas NO está aquí: se consulta al backend (GET /auth/password-policy).
 */
export const FIELD_LIMITS = {
  email: 254,
  personName: 100,
  employeeNumber: 20,
} as const;

export const PERSON_NAME_PATTERN = /^\p{L}+(?:[ '.-]\p{L}+)*\.?$/u;
export const EMPLOYEE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
export const LETTER_PATTERN = /\p{L}/u;
export const DIGIT_PATTERN = /\d/;
