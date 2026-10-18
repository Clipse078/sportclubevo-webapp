/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TournamentPlanungBoard from "../TournamentPlanungBoard";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

const model: TournamentPlanungViewModel = {
  tournamentId: "t1",
  availability: "AVAILABLE",
  ownership: "TENANT_ORGANISED",
  scheduleVersionId: "sv1",
  scheduleRevision: 1,
  schedulePresence: "COMPLETE",
  optimisationStatus: "OPTIMAL",
  feasibilityStatus: "FEASIBLE",
  feasibilityUxStatus: "PLAN_FITS",
  pitches: [
    { pitchId: "pitch-a", displayOrder: 0, label: "Feld 1", formatHint: null },
    { pitchId: "pitch-b", displayOrder: 1, label: "Feld 2", formatHint: null },
  ],
  timeScale: {
    rowAnchorsUtc: ["2026-06-01T08:00:00.000Z", "2026-06-01T08:15:00.000Z"],
    matchDurationMinutes: 12,
    transitionMinutes: 3,
    windowStartUtc: "2026-06-01T08:00:00.000Z",
    windowEndUtc: "2026-06-01T18:00:00.000Z",
  },
  cells: [
    {
      kind: "FIXTURE",
      fixtureId: "f1",
      assignmentId: "a1",
      sideA: {
        label: "Team A",
        crestUrl: null,
        isPlaceholder: false,
        participantId: "a",
        qualificationProvenanceLabel: null,
      },
      sideB: {
        label: "Team B",
        crestUrl: null,
        isPlaceholder: false,
        participantId: "b",
        qualificationProvenanceLabel: null,
      },
      startUtc: "2026-06-01T08:00:00.000Z",
      endUtc: "2026-06-01T08:12:00.000Z",
      pitchId: "pitch-a",
      phaseLabel: null,
      groupLabel: null,
      phaseType: "GROUP_MIX",
      lockDimension: null,
      accessibleLabel: "Team A gegen Team B",
      result: null,
      canEnterResult: true,
    },
  ],
  scheduleSections: [],
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
    canRegenerate: true,
    generateLabel: "",
    generatePendingLabel: "",
    regenerateLabel: "",
    regenerateHint: "",
  },
  groupStandings: [],
  schedulingSettings: null,
  timingConsequence: null,
};

const breakModel: TournamentPlanungViewModel = {
  ...model,
  timeScale: {
    ...model.timeScale!,
    rowAnchorsUtc: [
      "2026-06-01T08:00:00.000Z",
      "2026-06-01T08:15:00.000Z",
      "2026-06-01T08:30:00.000Z",
    ],
  },
  cells: [
    ...model.cells,
    {
      kind: "BREAK" as const,
      breakId: "br1",
      label: "Pause",
      startUtc: "2026-06-01T08:15:00.000Z",
      endUtc: "2026-06-01T08:30:00.000Z",
      pitchIds: ["pitch-a", "pitch-b"],
      scope: "ALL_PITCHES" as const,
      accessibleLabel: "Pause alle Felder",
    },
  ],
};

describe("TournamentPlanungBoard 01I", () => {
  it("R7.3 — ALL_PITCHES break renders full-width band", () => {
    render(
      <TournamentPlanungBoard
        model={breakModel}
        timezone="Europe/Zurich"
        selectedFixtureId={null}
        onSelectFixture={vi.fn()}
      />,
    );
    expect(screen.getByTestId("planung-board-all-pitches-break")).toBeInTheDocument();
    expect(screen.getByText(/Pause · .* · Alle Felder/)).toBeInTheDocument();
  });

  it("A — fixture is draggable when unlocked", () => {
    render(
      <TournamentPlanungBoard
        model={model}
        timezone="Europe/Zurich"
        selectedFixtureId={null}
        onSelectFixture={vi.fn()}
        canManage
        onManualMove={vi.fn()}
      />,
    );
    expect(screen.getByTestId("planung-fixture-f1")).toHaveAttribute("data-draggable", "true");
  });

  it("M — uses TournamentPitch column labels", () => {
    render(
      <TournamentPlanungBoard
        model={model}
        timezone="Europe/Zurich"
        selectedFixtureId={null}
        onSelectFixture={vi.fn()}
      />,
    );
    expect(screen.getByText("Feld 1")).toBeInTheDocument();
    expect(screen.getByText("Feld 2")).toBeInTheDocument();
  });

  it("D — valid drop invokes canonical mutation", async () => {
    const onManualMove = vi.fn().mockResolvedValue(undefined);
    render(
      <TournamentPlanungBoard
        model={model}
        timezone="Europe/Zurich"
        selectedFixtureId={null}
        onSelectFixture={vi.fn()}
        canManage
        onManualMove={onManualMove}
      />,
    );
    const fixture = screen.getByTestId("planung-fixture-f1");
    fireEvent.pointerDown(fixture, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(fixture, { clientX: 20, clientY: 20, pointerId: 1 });
    const drop = screen.getByTestId("planung-drop-pitch-b-2026-06-01T08:00:00.000Z");
    fireEvent.pointerEnter(drop);
    fireEvent.pointerUp(drop, { pointerId: 1 });
    expect(onManualMove).toHaveBeenCalledWith({
      fixtureId: "f1",
      targetTournamentPitchId: "pitch-b",
      targetStartAt: "2026-06-01T08:00:00.000Z",
    });
  });
});
