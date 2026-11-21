import { describe, expect, it } from "vitest";
import {
  groupScheduleDestinationPhases,
  hasScheduleDestinationPhases,
} from "../umsetzungsplanung-workspace";

describe("groupScheduleDestinationPhases", () => {
  const options = [
    { id: "a", slug: "a", title: "Laufend", status: "ACTIVE" as const },
    { id: "p1", slug: "p1", title: "Geplant 1", status: "PLANNED" as const },
    { id: "p2", slug: "p2", title: "Geplant 2", status: "PLANNED" as const },
    { id: "c", slug: "c", title: "Done", status: "COMPLETED" as const },
  ];

  it("groups open phases and excludes source phase", () => {
    const grouped = groupScheduleDestinationPhases(options, "p1");
    expect(grouped.ongoing.map((p) => p.id)).toEqual(["a"]);
    expect(grouped.planned.map((p) => p.id)).toEqual(["p2"]);
    expect(hasScheduleDestinationPhases(options, "p1")).toBe(true);
  });

  it("reports empty when no destinations remain", () => {
    expect(hasScheduleDestinationPhases(options, "a")).toBe(true);
    expect(hasScheduleDestinationPhases([options[0]!], "a")).toBe(false);
  });
});