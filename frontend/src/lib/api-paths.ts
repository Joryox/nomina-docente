type QueryValue = string | number | boolean | null | undefined;

/** Agrega parámetros de consulta a una ruta de la API, omitiendo los vacíos. */
export function withQuery(path: string, params: Readonly<Record<string, QueryValue>>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
