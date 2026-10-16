import { describe, expect, it } from "vitest";
import {
  MEIN_PROGRAMM_BASE_PATH,
  buildLegacyTermineKalenderRedirectTarget,
  buildMeinProgrammHref,
  parseMeinProgrammUrlState,
} from "../mein-programm-url";

describe("mein-programm URL state", () => {
  it("defaults to list view", () => {
    const state = parseMeinProgrammUrlState({});
    expect(state.view).toBe("liste");
    expect(state.quelle).toBe("alle");
  });

  it("parses calendar view and month", () => {
    const state = parseMeinProgrammUrlState({
      ansicht: "kalender",
      monat: "2026-09",
      quelle: "aufgaben",
    });
    expect(state.view).toBe("kalender");
    expect(state.month).toBe("2026-09");
    expect(state.quelle).toBe("aufgaben");
  });

  it("buildMeinProgrammHref omits default list view param", () => {
    const state = parseMeinProgrammUrlState({});
    expect(buildMeinProgrammHref(state, {})).toBe(MEIN_PROGRAMM_BASE_PATH);
  });

  it("buildMeinProgrammHref encodes calendar view", () => {
    const state = parseMeinProgrammUrlState({});
    expect(buildMeinProgrammHref(state, { view: "kalender", month: "2026-10" })).toBe(
      `${MEIN_PROGRAMM_BASE_PATH}?ansicht=kalender&monat=2026-10`,
    );
  });

  it("legacy termine kalender redirect targets canonical calendar", () => {
    expect(buildLegacyTermineKalenderRedirectTarget("2026-09")).toBe(
      `${MEIN_PROGRAMM_BASE_PATH}?ansicht=kalender&monat=2026-09`,
    );
  });
});
