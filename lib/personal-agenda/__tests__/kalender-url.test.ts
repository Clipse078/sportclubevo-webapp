import { describe, expect, it } from "vitest";
import {
  buildPersonalKalenderHref,
  parsePersonalKalenderUrlState,
} from "../kalender-url";

describe("Personal kalender URL", () => {
  it("parses month and quelle filters", () => {
    const state = parsePersonalKalenderUrlState(
      { monat: "2026-09", quelle: "aufgaben" },
      new Date("2026-06-01"),
    );
    expect(state.month).toBe("2026-09");
    expect(state.quelle).toBe("aufgaben");
  });

  it("builds filter href without leaking authorization scope", () => {
    const href = buildPersonalKalenderHref(
      "/dashboard/kalender",
      { quelle: "aufgaben" },
      { month: "2026-09", quelle: "alle" },
    );
    expect(href).toBe("/dashboard/kalender?monat=2026-09&quelle=aufgaben");
  });
});
