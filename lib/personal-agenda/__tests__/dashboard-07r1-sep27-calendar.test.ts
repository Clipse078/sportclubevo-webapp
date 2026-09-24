import { describe, expect, it } from "vitest";
import {
  groupPersonalProgrammeItemsByDay,
  personalProgrammeDayKey,
} from "../programme-day-key";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import { buildMonthGridCells } from "@/lib/calendar/month-grid";
import { getProgrammeSourcePresentation } from "../programme-source-presentation";

const TIME_ZONE = "Europe/Zurich";

/** Acceptance fixture: Blitzturnier Sunday 27 Sep 2026 09:30 Europe/Zurich. */
const BLITZ_TURNIER_START = new Date("2026-09-27T07:30:00.000Z");

function buildBlitzturnierItem(
  startsAt: Date | string = BLITZ_TURNIER_START,
): PersonalProgrammeItem {
  return {
    id: "event:blitz-2026-09-27",
    sourceType: "TOURNAMENT",
    startsAt: startsAt as Date,
    title: "Blitzturnier",
    deepLink: "/dashboard/tournaments/x",
    typeLabel: "Turnier",
    contextLabel: "Junioren F2 · Trainer/in",
    venue: "Im Brüel",
    ariaLabel: "Turnier: Blitzturnier",
  };
}

describe("DASHBOARD-07R1 — Sep 27 2026 Blitzturnier calendar regression", () => {
  it("A — programme tenant-local day key is 2026-09-27", () => {
    expect(personalProgrammeDayKey(BLITZ_TURNIER_START, TIME_ZONE)).toBe("2026-09-27");
  });

  it("B — same item maps to Sep 27 in programme day grouping (serialized startsAt)", () => {
    const item = buildBlitzturnierItem(BLITZ_TURNIER_START.toISOString());
    const map = groupPersonalProgrammeItemsByDay([item], TIME_ZONE);
    expect(map.get("2026-09-27")).toHaveLength(1);
  });

  it("C — September grid contains matching tenant-local cell for programme day", () => {
    const programmeKey = personalProgrammeDayKey(BLITZ_TURNIER_START, TIME_ZONE);
    const cells = buildMonthGridCells("2026-09", TIME_ZONE);
    const cell = cells.find((entry) => entry.dayKey === programmeKey);
    expect(cell).toBeDefined();
    expect(cell?.dayNumber).toBe("27");
  });

  it("D — calendar activity count is at least one for Sep 27", () => {
    const map = groupPersonalProgrammeItemsByDay([buildBlitzturnierItem()], TIME_ZONE);
    expect((map.get("2026-09-27") ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("E — Blitzturnier TOURNAMENT uses canonical SCE-orange presentation contract", () => {
    const item = buildBlitzturnierItem();
    expect(item.typeLabel).toBe("Turnier");
    expect(getProgrammeSourcePresentation(item.sourceType).paletteKey).toBe("tournament-orange");
  });
});
