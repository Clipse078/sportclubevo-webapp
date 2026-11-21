import { describe, expect, it } from "vitest";
import {
  computeSceDisplayPercent,
  formatSceCompletionInlineCaption,
  parseVereinsentwicklungCountCaption,
  sceCompletionFromCaption,
} from "../sce-completion-progress";

describe("sce-completion-progress", () => {
  it("parses count captions", () => {
    expect(parseVereinsentwicklungCountCaption("2 von 3 Aufgaben erledigt")).toEqual({
      completed: 2,
      total: 3,
    });
    expect(parseVereinsentwicklungCountCaption("1 von 2 Zielen erreicht")).toEqual({
      completed: 1,
      total: 2,
    });
  });

  it("floors display percent and reserves 100%", () => {
    expect(computeSceDisplayPercent(2, 3)).toBe(66);
    expect(computeSceDisplayPercent(3, 3)).toBe(100);
    expect(computeSceDisplayPercent(0, 3)).toBe(0);
  });

  it("builds PO inline caption", () => {
    expect(formatSceCompletionInlineCaption(2, 3)).toBe("66% – 2 von 3 erledigt");
  });

  it("marks empty sets", () => {
    const empty = sceCompletionFromCaption("Noch keine Aufgaben", "Noch keine Aufgaben");
    expect(empty.empty).toBe(true);
    const filled = sceCompletionFromCaption("2 von 3 Aufgaben erledigt", "Noch keine Aufgaben");
    expect(filled.inlineCaption).toBe("66% – 2 von 3 erledigt");
  });
});