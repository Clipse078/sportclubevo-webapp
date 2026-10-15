import { describe, expect, it } from "vitest";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import {
  formatSceActivityLocationHierarchy,
  venueIsRedundantParentOfResource,
} from "@/lib/sporting-activity-presentation/canonical/location-format";

describe("SCE-ACTIVITY-CREATE-01I-R4 — resource hierarchy compaction", () => {
  it("A: Kunstrasen 2 + Kunstrasen 2 B → Kunstrasen 2 B", () => {
    const location = buildSportingActivityLocation({
      mode: "HOME",
      venueName: "Kunstrasen 2",
      facilityResource: "Kunstrasen 2 B",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Kunstrasen 2 B",
    );
  });

  it("B: Hauptfeld + Hauptfeld A → Hauptfeld A", () => {
    const location = buildSportingActivityLocation({
      mode: "HOME",
      venueName: "Hauptfeld",
      facilityResource: "Hauptfeld A",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Hauptfeld A",
    );
  });

  it("C: Im Brüel + KR2 → Im Brüel · KR2", () => {
    const location = buildSportingActivityLocation({
      mode: "HOME",
      venueName: "Im Brüel",
      facilityResource: "KR2",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Im Brüel · KR2",
    );
  });

  it("D: Sportzentrum Tannenbrunn + Platz 2 → Sportzentrum Tannenbrunn · Platz 2", () => {
    const location = buildSportingActivityLocation({
      mode: "NEUTRAL",
      venueName: "Sportzentrum Tannenbrunn",
      facilityResource: "Platz 2",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Sportzentrum Tannenbrunn · Platz 2",
    );
  });

  it("E: preserves authoritative provider free-text in venue-only AWAY strings", () => {
    const location = buildSportingActivityLocation({
      mode: "AWAY",
      venueName: "Sportzentrum Tannenbrunn, Sissach - 2",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Sportzentrum Tannenbrunn, Sissach - 2",
    );
  });

  it("H: MICRO AWAY omits host club when includeHostClub is false", () => {
    const location = buildSportingActivityLocation({
      mode: "AWAY",
      hostOrOrganiser: "FC Concordia Basel b",
      venueName: "Sportanlagen St. Jakob, Basel - wird vor Ort zugeteilt",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Sportanlagen St. Jakob, Basel - wird vor Ort zugeteilt",
    );
  });

  it("F: preserves original display casing on compacted child resource", () => {
    const location = buildSportingActivityLocation({
      mode: "HOME",
      venueName: "kunstrasen 2",
      facilityResource: "Kunstrasen 2 B",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Kunstrasen 2 B",
    );
  });

  it("G: avoids false-positive suppression for merely similar names", () => {
    expect(venueIsRedundantParentOfResource("Kunstrasen", "Kunstrasen 2 B")).toBe(false);
    const location = buildSportingActivityLocation({
      mode: "HOME",
      venueName: "Kunstrasen",
      facilityResource: "Kunstrasen 2 B",
    });
    expect(formatSceActivityLocationHierarchy(location, { includeHostClub: false })).toBe(
      "Kunstrasen · Kunstrasen 2 B",
    );
  });
});
