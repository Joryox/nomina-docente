/** Elemento de la paginación: número de página o hueco («…»). */
export type PageItem = number | "gap";

/**
 * Páginas a mostrar: siempre la primera, la última y las vecinas de la actual; los huecos se
 * marcan con "gap". Con pocas páginas se muestran todas. Ej.: 1 … 4 5 6 … 12.
 */
export function paginationRange(page: number, totalPages: number, siblings = 1): PageItem[] {
  const visibleSlots = siblings * 2 + 5;
  if (totalPages <= visibleSlots) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(2, page - siblings);
  const end = Math.min(totalPages - 1, page + siblings);
  const items: PageItem[] = [1];
  if (start > 2) {
    items.push(start === 3 ? 2 : "gap");
  }
  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }
  if (end < totalPages - 1) {
    items.push(end === totalPages - 2 ? totalPages - 1 : "gap");
  }
  items.push(totalPages);
  return items;
}

/** Primer y último elemento mostrados ("Mostrando 21–40 de 135"). */
export function pageBounds(page: number, pageSize: number, total: number) {
  if (total === 0) {
    return { from: 0, to: 0 };
  }
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, from + pageSize - 1) };
}
