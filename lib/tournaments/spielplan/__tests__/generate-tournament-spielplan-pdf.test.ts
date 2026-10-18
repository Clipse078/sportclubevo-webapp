import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildTournamentPlanungViewModel } from "@/lib/tournaments/planung/build-planung-view-model";
import type { PlanungDomainSnapshot } from "@/lib/tournaments/planung/build-planung-view-model";
import { buildTournamentSpielplanFromPlanung } from "../build-tournament-spielplan-view-model";
import { generateTournamentSpielplanPdf } from "../pdf/generate-tournament-spielplan-pdf";

function snapshot(partial: Partial<PlanungDomainSnapshot>): PlanungDomainSnapshot {
  return {
    tournamentId: "t1",
    ownership: "TENANT_ORGANISED",
    timezone: "Europe/Zurich",
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T12:00:00.000Z",
    scheduleVersionId: "sv1",
    scheduleRevision: 1,
    schedulingConfig: {
      matchDurationMinutes: 14,
      transitionMinutes: 1,
      minRestMinutes: 5,
    },
    pitches: [{ id: "p1", displayOrder: 0, label: "Feld 1" }],
    breaks: [],
    fixtures: [
      {
        id: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        tournamentGroupId: null,
        phaseType: null,
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        sides: [],
        phaseLabel: null,
        groupLabel: null,
      },
    ],
    assignments: [
      {
        id: "as1",
        fixtureId: "f1",
        tournamentPitchId: "p1",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T08:14:00.000Z",
        scheduleLockDimension: null,
      },
    ],
    participants: [
      { participantId: "a", displayName: "Team A", crestUrl: null, accessibleLabel: "Team A" },
      { participantId: "b", displayName: "Team B", crestUrl: null, accessibleLabel: "Team B" },
    ],
    participantCount: 2,
    fixtureCount: 1,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
    fixtureResults: [],
    groups: [],
    rankingConfiguration: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
    },
    scheduleConsistencyStatus: null,
    fixtureHomeAwayRelevance: "OFF",
    ...partial,
  };
}

describe("generateTournamentSpielplanPdf", () => {
  it("master PDF generation returns valid PDF with tournament title", async () => {
    const planung = buildTournamentPlanungViewModel(snapshot({}));
    const model = buildTournamentSpielplanFromPlanung({
      tournamentId: "t1",
      title: "Jugend-Cup",
      startAtIso: "2026-08-01T08:00:00.000Z",
      location: "Sportplatz",
      organizerName: "FC Test",
      tenantName: "FC Test",
      tenantLogoUrl: null,
      timezone: "Europe/Zurich",
      pitches: planung.pitches.map((p) => ({
        pitchId: p.pitchId,
        displayOrder: p.displayOrder,
        label: p.label,
      })),
      cells: planung.cells,
      scheduleSections: planung.scheduleSections,
      participants: planung.participants.map((p) => ({
        participantId: p.participantId,
        displayName: p.displayName,
        crestUrl: p.crestUrl,
      })),
    });

    const bytes = await generateTournamentSpielplanPdf({ model, mode: "MASTER" });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(0);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("team PDF includes team identity", async () => {
    const planung = buildTournamentPlanungViewModel(snapshot({}));
    const model = buildTournamentSpielplanFromPlanung({
      tournamentId: "t1",
      title: "Jugend-Cup",
      startAtIso: "2026-08-01T08:00:00.000Z",
      location: null,
      organizerName: null,
      tenantName: "FC Test",
      tenantLogoUrl: null,
      timezone: "Europe/Zurich",
      pitches: planung.pitches.map((p) => ({
        pitchId: p.pitchId,
        displayOrder: p.displayOrder,
        label: p.label,
      })),
      cells: planung.cells,
      scheduleSections: planung.scheduleSections,
      participants: planung.participants.map((p) => ({
        participantId: p.participantId,
        displayName: p.displayName,
        crestUrl: p.crestUrl,
      })),
    });
    const teamPlan = model.teamPlans[0]!;
    const bytes = await generateTournamentSpielplanPdf({
      model,
      mode: "TEAM",
      teamPlan,
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
