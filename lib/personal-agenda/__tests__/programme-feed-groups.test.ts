import { describe, expect, it } from "vitest";
import {
  buildProgrammeFeedGroups,
  filterProgrammeItemsToRange,
} from "../programme-feed-groups";
import { resolvePersonalProgrammeRange } from "../programme-range";
import type { PersonalProgrammeItem } from "../personal-programme-types";

function item(
  id: string,
  startsAt: Date,
  overrides: Partial<PersonalProgrammeItem> = {},
): PersonalProgrammeItem {
  return {
    id,
    sourceType: "TRAINING",
    startsAt,
    title: `Event ${id}`,
    deepLink: `/dashboard/planner/edit/${id}`,
    typeLabel: "Training",
    ariaLabel: `Training: Event ${id}`,
    ...overrides,
  };
}

describe("programme feed groups", () => {
  it("labels today and tomorrow groups", () => {
    const timeZone = "Europe/Zurich";
    const now = new Date("2026-09-24T10:00:00.000Z");
    const groups = buildProgrammeFeedGroups({
      items: [
        item("a", new Date("2026-09-24T14:00:00.000Z")),
        item("b", new Date("2026-09-25T14:00:00.000Z")),
      ],
      timeZone,
      locale: "de-CH",
      now,
    });

    expect(groups).toHaveLength(2);
    expect(groups[0]?.labelKind).toBe("today");
    expect(groups[1]?.labelKind).toBe("tomorrow");
  });

  it("filters items to programme feed range", () => {
    const timeZone = "Europe/Zurich";
    const now = new Date("2026-09-24T10:00:00.000Z");
    const range = resolvePersonalProgrammeRange({ timeZone, now });
    const filtered = filterProgrammeItemsToRange(
      [
        item("in", new Date("2026-09-26T10:00:00.000Z")),
        item("out", new Date("2030-01-01T10:00:00.000Z")),
      ],
      range,
    );
    expect(filtered.map((row) => row.id)).toEqual(["in"]);
  });
});
