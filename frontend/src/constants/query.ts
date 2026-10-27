/** Valores por defecto de TanStack Query. */
export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_MAX_RETRIES = 2;
/** Catálogos y reglas cambian muy poco: se consideran vigentes 5 minutos. */
export const CATALOG_STALE_TIME_MS = 5 * 60_000;
/** Máximo de elementos por página que acepta la API (MAX_PAGE_SIZE en el backend). */
export const API_MAX_PAGE_SIZE = 100;
/** Espera tras la última tecla antes de buscar en el servidor. */
export const SEARCH_DEBOUNCE_MS = 300;
/** Quincenas recientes que se ofrecen en los selectores de la bitácora y la vista previa. */
export const RECENT_PERIODS_COUNT = 6;
/** Años que se ofrecen en la lista de recibos emitidos (el actual y los anteriores). */
export const RECEIPT_YEARS_COUNT = 3;
