/**
 * Devuelve `value` solo si es una ruta interna de la aplicación (empieza con una sola `/`).
 * Evita redirecciones abiertas del tipo `?siguiente=https://otro-sitio` o `//otro-sitio`.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
