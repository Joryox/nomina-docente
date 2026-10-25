export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Métodos que modifican datos y por eso envían el token CSRF (patrón double-submit). */
export const CSRF_PROTECTED_METHODS: ReadonlySet<HttpMethod> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export const CSRF_HEADER = "X-CSRF-Token";

/** Respuestas del proxy cuando el backend no está disponible. */
export const BACKEND_UNAVAILABLE_STATUSES: ReadonlySet<number> = new Set([500, 502, 503, 504]);
