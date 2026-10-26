import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("conserva tamaño y color de texto semánticos", () => {
    expect(cn("text-label text-fg")).toBe("text-label text-fg");
  });

  it("resuelve conflictos dentro del mismo grupo", () => {
    expect(cn("text-body", "text-small")).toBe("text-small");
    expect(cn("text-fg", "text-danger-ink")).toBe("text-danger-ink");
    expect(cn("h-(--control-height-md) px-4", "h-auto px-0")).toBe("h-auto px-0");
  });
});
