/** Valores por defecto de TanStack Query. */
export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_MAX_RETRIES = 2;
/** Catálogos y reglas cambian muy poco: se consideran vigentes 5 minutos. */
export const CATALOG_STALE_TIME_MS = 5 * 60_000;
/** Máximo de elementos por página que acepta la API (MAX_PAGE_SIZE en el backend). */
export const API_MAX_PAGE_SIZE = 100;
