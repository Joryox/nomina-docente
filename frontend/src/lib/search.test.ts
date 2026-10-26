import { describe, expect, it } from "vitest";

import { compareText, matchesSearch, normalizeForSearch } from "./search";

describe("búsqueda insensible a acentos", () => {
  it("normaliza mayúsculas, acentos y espacios", () => {
    expect(normalizeForSearch("  Matemáticas   DISCRETAS ")).toBe("matematicas discretas");
    expect(normalizeForSearch("Diseño")).toBe("diseno");
  });

  it.each([
    ["matematicas", "Matemáticas Discretas"],
    ["BASES de", "Bases de Datos"],
    ["gastro", "Licenciatura en Gastronomía"],
    ["datos bases", "Bases de Datos"],
    ["isc", "Ingeniería en Sistemas Computacionales", "ISC"],
  ])("%j encuentra %j", (query, ...texts) => {
    expect(matchesSearch(query, ...texts)).toBe(true);
  });

  it("no encuentra lo que no coincide", () => {
    expect(matchesSearch("química", "Matemáticas")).toBe(false);
  });

  it("una búsqueda vacía coincide con todo", () => {
    expect(matchesSearch("  ", "Cualquier cosa")).toBe(true);
  });

  it("ordena como en español", () => {
    const names = ["Redes", "Álgebra", "algoritmos", "Bases"].sort(compareText);
    expect(names).toEqual(["Álgebra", "algoritmos", "Bases", "Redes"]);
  });
});
