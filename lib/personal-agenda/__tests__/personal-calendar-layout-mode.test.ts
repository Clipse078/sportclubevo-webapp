import { describe, expect, it } from "vitest";
import { resolvePersonalCalendarLayoutMode } from "../personal-calendar-layout-mode";

describe("SCE-CALENDAR-UX-04 — personal calendar layout mode", () => {
  it("maps viewport widths to deterministic tiers", () => {
    expect(resolvePersonalCalendarLayoutMode(1280)).toBe("desktop-grid");
    expect(resolvePersonalCalendarLayoutMode(1024)).toBe("desktop-grid");
    expect(resolvePersonalCalendarLayoutMode(900)).toBe("tablet-grid");
    expect(resolvePersonalCalendarLayoutMode(640)).toBe("tablet-grid");
    expect(resolvePersonalCalendarLayoutMode(639)).toBe("mobile-compact");
    expect(resolvePersonalCalendarLayoutMode(320)).toBe("mobile-compact");
  });
});
