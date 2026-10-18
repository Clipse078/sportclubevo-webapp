/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TournamentPlanungScheduleList from "../TournamentPlanungScheduleList";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { expectCanonicalFixtureIdentityOrder } from "@/components/sce/tournament/__tests__/fixture-identity-order-assertions";

const baseModel: TournamentPlanungViewModel = {
  tournamentId: "t1",
  availability: "AVAILABLE",
  ownership: "TENANT_ORGANISED",
  scheduleVersionId: "sv1",
  scheduleRevision: 1,
  schedulePresence: "COMPLETE",
  optimisationStatus: "OPTIMAL",
  feasibilityStatus: "FEASIBLE",
  feasibilityUxStatus: "PLAN_FITS",
  pitches: [{ pitchId: "p1", displayOrder: 0, label: "Feld 1" }],
  timeScale: null,
  cells: [],
  scheduleSections: [
    {
      sectionId: "r1",
      title: "Runde 1",
      entries: [
        {
          kind: "FIXTURE",
          fixtureId: "f1",
          assignmentId: "as1",
          startUtc: "2026-06-01T08:00:00.000Z",
          endUtc: "2026-06-01T08:12:00.000Z",
          pitchId: "p1",
          phaseLabel: null,
          groupLabel: null,
          phaseType: "GROUP_MIX",
          canEnterResult: true,
          sideA: {
            label: "Team Alpha",
            crestUrl: null,
            isPlaceholder: false,
            participantId: "a",
            qualificationProvenanceLabel: null,
          },
          sideB: {
            label: "Team Beta",
            crestUrl: null,
            isPlaceholder: false,
            participantId: "b",
            qualificationProvenanceLabel: null,
          },
          lockDimension: null,
          accessibleLabel: "Team Alpha gegen Team Beta",
          result: null,
        },
      ],
    },
  ],
  participants: [],
  mobileTimeline: [],
  smartTiming: null,
  diagnostics: [],
  planningUx: null,
  feasibilityGuidance: null,
  regenerationSummary: null,
  incompleteSetup: [],
  actions: {
    canGenerate: false,
    canRegenerate: false,
    generateLabel: "",
    generatePendingLabel: "",
    regenerateLabel: "",
    regenerateHint: "",
  },
  groupStandings: [],
};

describe("TournamentPlanungScheduleList", () => {
  it("uses compact canonical matchup for fixtures", () => {
    render(<TournamentPlanungScheduleList model={baseModel} timezone="Europe/Zurich" />);
    const row = screen.getByTestId("planung-schedule-fixture-f1");
    expect(row.querySelector('[data-testid="sce-tournament-fixture-compact-matchup"]')).toBeTruthy();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    expectCanonicalFixtureIdentityOrder(
      row.querySelector('[data-testid="sce-tournament-fixture-compact-matchup"]')!,
    );
  });
});
