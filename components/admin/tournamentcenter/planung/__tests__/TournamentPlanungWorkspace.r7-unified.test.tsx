/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentPlanungWorkspace from "../TournamentPlanungWorkspace";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace }),
  usePathname: () => "/dashboard/tournamentcenter/t1/edit",
  useSearchParams: () => new URLSearchParams("tab=planung"),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { success: vi.fn(), danger: vi.fn() } }),
}));

const scheduledModel: TournamentPlanungViewModel = {
  tournamentId: "t1",
  availability: "AVAILABLE",
  ownership: "TENANT_ORGANISED",
  scheduleVersionId: "sv1",
  scheduleRevision: 1,
  schedulePresence: "COMPLETE",
  optimisationStatus: "FEASIBLE_NOT_PROVEN_OPTIMAL",
  feasibilityStatus: "FEASIBLE",
  feasibilityUxStatus: null,
  pitches: [{ pitchId: "p1", displayOrder: 0, label: "Feld 1" }],
  timeScale: {
    rowAnchorsUtc: ["2026-08-01T08:00:00.000Z"],
    matchDurationMinutes: 20,
    transitionMinutes: 5,
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T12:00:00.000Z",
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
        participantId: "p1",
        qualificationProvenanceLabel: null,
      },
      sideB: {
        label: "Team B",
        crestUrl: null,
        isPlaceholder: false,
        participantId: "p2",
        qualificationProvenanceLabel: null,
      },
      startUtc: "2026-08-01T08:00:00.000Z",
      endUtc: "2026-08-01T08:20:00.000Z",
      pitchId: "p1",
      phaseLabel: "Gruppe A",
      groupLabel: null,
      phaseType: "GROUP",
      lockDimension: null,
      accessibleLabel: "Spiel",
      result: null,
      canEnterResult: true,
    },
  ],
  scheduleSections: [],
  participants: [
    { participantId: "p1", displayName: "Team A", crestUrl: null },
    { participantId: "p2", displayName: "Team B", crestUrl: null },
  ],
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
    generateLabel: "✨ Spielplan erstellen",
    generatePendingLabel: "Spielplan wird erstellt …",
    regenerateLabel: "Spielplan neu berechnen",
    regenerateHint: "Gesperrte Zeiten und Felder bleiben erhalten.",
  },
  groupStandings: [],
};

const tournament = {
  id: "t1",
  title: "Test Cup",
  startAt: "2026-08-01T08:00:00.000Z",
  location: "Sportplatz",
  visibility: { websiteVisible: true },
  updatedAt: "2026-08-01T00:00:00.000Z",
  homeAway: "HOME" as const,
  organizerName: "FC Test",
};

describe("01K-R7 — unified Spielplan view + edit", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("defaults to Spielplan view without Planung/Spielplan inner toggle", () => {
    render(
      <TournamentPlanungWorkspace
        initialModel={scheduledModel}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
        tournament={tournament}
      />,
    );

    expect(screen.getByTestId("tournament-planung-workspace")).toHaveAttribute(
      "data-interaction-mode",
      "view",
    );
    expect(screen.queryByTestId("tournament-planung-mode-planung")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tournament-planung-mode-spielplan")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-planung-spielplan-output")).toBeInTheDocument();
    expect(screen.queryByText("Übersicht nach Runden")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tournament-planung-edit-board")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-planung-edit-spielplan")).toBeInTheDocument();
    expect(screen.getByTestId("spielplan-print-master")).toBeInTheDocument();
  });

  it("opens edit board without redundant round list and exits back to view", async () => {
    render(
      <TournamentPlanungWorkspace
        initialModel={scheduledModel}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
        tournament={tournament}
      />,
    );

    await userEvent.click(screen.getByTestId("tournament-planung-edit-spielplan"));

    expect(screen.getByTestId("tournament-planung-workspace")).toHaveAttribute(
      "data-interaction-mode",
      "edit",
    );
    expect(screen.getByTestId("tournament-planung-edit-board")).toBeInTheDocument();
    expect(screen.queryByTestId("tournament-planung-spielplan-output")).not.toBeInTheDocument();
    expect(screen.queryByText("Übersicht nach Runden")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-planung-regenerate")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("tournament-planung-exit-edit"));

    expect(screen.getByTestId("tournament-planung-workspace")).toHaveAttribute(
      "data-interaction-mode",
      "view",
    );
    expect(screen.getByTestId("tournament-planung-spielplan-output")).toBeInTheDocument();
  });

  it("does not offer edit when no schedule exists", () => {
    render(
      <TournamentPlanungWorkspace
        initialModel={{
          ...scheduledModel,
          schedulePresence: "NONE",
          scheduleVersionId: null,
          scheduleRevision: null,
          timeScale: null,
          cells: [],
          scheduleSections: [],
          planningUx: {
            state: "READY",
            headline: "Alles bereit.",
            summary: null,
            recommendedTiming: null,
            contextLinks: [],
          },
          actions: { ...scheduledModel.actions, canGenerate: true, canRegenerate: false },
        }}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
        tournament={tournament}
      />,
    );

    expect(screen.queryByTestId("tournament-planung-edit-spielplan")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-planung-generate")).toBeInTheDocument();
    expect(screen.getAllByTestId("tournament-planung-generate")).toHaveLength(1);
  });
});
