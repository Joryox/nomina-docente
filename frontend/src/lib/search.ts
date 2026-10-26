import { LOCALE } from "@/constants/locale";

/**
 * Búsqueda tolerante para selectores (materias, carreras): ignora mayúsculas, acentos y
 * espacios repetidos, igual que la comparación de nombres del backend (RN-09). «bases de
 * datos» encuentra «Bases de Datos» y «matematicas» encuentra «Matemáticas».
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase(LOCALE)
    .replace(/\s+/g, " ")
    .trim();
}

/** `true` si cada palabra de la búsqueda aparece en alguno de los textos. */
export function matchesSearch(query: string, ...texts: (string | null | undefined)[]): boolean {
  const words = normalizeForSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const haystack = normalizeForSearch(texts.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}

const collator = new Intl.Collator(LOCALE, { sensitivity: "base", numeric: true });

/** Orden alfabético del español: «Álgebra» va junto a «Algoritmos», no al final. */
export function compareText(first: string, second: string): number {
  return collator.compare(first, second);
}
