import { describe, expect, it } from "vitest";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import {
  buildPersonalProgrammeDayActivityMarkers,
  getProgrammeSourcePresentation,
} from "../programme-source-presentation";

function item(
  id: string,
  sourceType: PersonalProgrammeItem["sourceType"],
  iso: string,
): PersonalProgrammeItem {
  return {
    id,
    sourceType,
    startsAt: new Date(iso),
    title: id,
    deepLink: "/dashboard",
    typeLabel: sourceType,
    ariaLabel: `${sourceType}: ${id}`,
  };
}

describe("getProgrammeSourcePresentation", () => {
  it("maps TRAINING to blue semantic palette", () => {
    expect(getProgrammeSourcePresentation("TRAINING").paletteKey).toBe("training-blue");
  });

  it("maps MATCH to green semantic palette", () => {
    expect(getProgrammeSourcePresentation("MATCH").paletteKey).toBe("match-green");
  });

  it("maps TOURNAMENT to SCE orange semantic palette", () => {
    expect(getProgrammeSourcePresentation("TOURNAMENT").paletteKey).toBe("tournament-orange");
  });

  it("maps EVENT to violet semantic palette", () => {
    expect(getProgrammeSourcePresentation("EVENT").paletteKey).toBe("event-violet");
  });

  it("maps MEETING to cyan/teal semantic palette", () => {
    expect(getProgrammeSourcePresentation("MEETING").paletteKey).toBe("meeting-cyan");
  });
});

describe("buildPersonalProgrammeDayActivityMarkers", () => {
  it("bounds markers to three distinct source types with +N overflow", () => {
    const dayItems = [
      item("a", "TRAINING", "2026-09-12T08:00:00.000Z"),
      item("b", "MATCH", "2026-09-12T09:00:00.000Z"),
      item("c", "TOURNAMENT", "2026-09-12T10:00:00.000Z"),
      item("d", "EVENT", "2026-09-12T11:00:00.000Z"),
      item("e", "MEETING", "2026-09-12T12:00:00.000Z"),
    ];
    const result = buildPersonalProgrammeDayActivityMarkers(dayItems, dayItems.length);
    expect(result.markerSourceTypes).toEqual(["TRAINING", "MATCH", "TOURNAMENT"]);
    expect(result.overflowCount).toBe(2);
  });

  it("consolidates duplicate source types while preserving full count overflow", () => {
    const dayItems = [
      item("a", "TRAINING", "2026-09-12T08:00:00.000Z"),
      item("b", "TRAINING", "2026-09-12T09:00:00.000Z"),
      item("c", "MATCH", "2026-09-12T10:00:00.000Z"),
    ];
    const result = buildPersonalProgrammeDayActivityMarkers(dayItems, 3);
    expect(result.markerSourceTypes).toEqual(["TRAINING", "MATCH"]);
    expect(result.overflowCount).toBe(1);
  });
});
