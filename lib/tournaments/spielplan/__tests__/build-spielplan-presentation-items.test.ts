import { describe, expect, it } from "vitest";
import { buildSpielplanPresentationItems } from "../build-spielplan-presentation-items";
import type { TournamentSpielplanFixturePresentation } from "../types";

const TZ = "Europe/Zurich";

const fixture: TournamentSpielplanFixturePresentation = {
  fixtureId: "f1",
  sideALabel: "A",
  sideBLabel: "B",
  sideAParticipantId: "a",
  sideBParticipantId: "b",
  sideAIsPlaceholder: false,
  sideBIsPlaceholder: false,
  pairingLabel: "A – B",
  startUtc: "2026-08-01T08:00:00.000Z",
  endUtc: "2026-08-01T08:14:00.000Z",
  pitchId: "p1",
  pitchLabel: "Feld 1",
  roundTitle: "Runde 1",
  result: null,
};

describe("buildSpielplanPresentationItems", () => {
  it("groups fixtures by schedule section title (competition round)", () => {
    const items = buildSpielplanPresentationItems({
      scheduleSections: [
        {
          sectionId: "group-a:0",
          title: "Gruppe A · Runde 1",
          entries: [
            {
              kind: "FIXTURE",
              fixtureId: "f1",
              assignmentId: "as1",
              sideA: {
                label: "A",
                crestUrl: null,
                isPlaceholder: false,
                participantId: "a",
                qualificationProvenanceLabel: null,
              },
              sideB: {
                label: "B",
                crestUrl: null,
                isPlaceholder: false,
                participantId: "b",
                qualificationProvenanceLabel: null,
              },
              startUtc: fixture.startUtc,
              endUtc: fixture.endUtc,
              pitchId: "p1",
              phaseLabel: null,
              groupLabel: "Gruppe A",
              phaseType: "GROUP_MIX",
              lockDimension: null,
              accessibleLabel: "A vs B",
              result: null,
              canEnterResult: true,
            },
          ],
        },
      ],
      fixtures: [fixture],
      timezone: TZ,
      pitchLabelById: new Map([["p1", "Feld 1"]]),
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("ROUND_GROUP");
    if (items[0]?.kind === "ROUND_GROUP") {
      expect(items[0].group.title).toBe("Gruppe A · Runde 1");
      expect(items[0].group.fixtureCount).toBe(1);
      expect(items[0].group.pitchSummaryLabel).toBe("Feld 1");
    }
  });

  it("emits schedule breaks separately from fixture cards", () => {
    const items = buildSpielplanPresentationItems({
      scheduleSections: [
        {
          sectionId: "break:br1",
          title: "Pause",
          entries: [
            {
              kind: "BREAK",
              breakId: "br1",
              label: "Mittagspause",
              startUtc: "2026-08-01T09:00:00.000Z",
              endUtc: "2026-08-01T09:15:00.000Z",
              scope: "ALL_PITCHES",
              pitchIds: [],
              accessibleLabel: "Pause",
            },
          ],
        },
      ],
      fixtures: [],
      timezone: TZ,
      pitchLabelById: new Map(),
    });
    expect(items[0]?.kind).toBe("SCHEDULE_BREAK");
  });
});
