import { describe, expect, it } from "vitest";

import { pageBounds, paginationRange } from "./pagination";

describe("paginationRange", () => {
  it("muestra todas las páginas cuando son pocas", () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(1, 0)).toEqual([]);
  });

  it("marca huecos alrededor de la página actual", () => {
    expect(paginationRange(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
  });

  it("no usa un hueco para esconder una sola página", () => {
    expect(paginationRange(4, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(paginationRange(1, 12)).toEqual([1, 2, "gap", 12]);
    expect(paginationRange(12, 12)).toEqual([1, "gap", 11, 12]);
  });
});

describe("pageBounds", () => {
  it("calcula el rango mostrado", () => {
    expect(pageBounds(2, 20, 135)).toEqual({ from: 21, to: 40 });
    expect(pageBounds(7, 20, 135)).toEqual({ from: 121, to: 135 });
    expect(pageBounds(1, 20, 0)).toEqual({ from: 0, to: 0 });
  });
});
