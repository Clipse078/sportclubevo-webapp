/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentPlanungWorkspace from "../TournamentPlanungWorkspace";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const toast = {
  success: vi.fn(),
  danger: vi.fn(),
};

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

const model: TournamentPlanungViewModel = {
  tournamentId: "t1",
  availability: "AVAILABLE",
  ownership: "TENANT_ORGANISED",
  scheduleVersionId: null,
  scheduleRevision: null,
  schedulePresence: "NONE",
  optimisationStatus: null,
  feasibilityStatus: null,
  feasibilityUxStatus: null,
  pitches: [{ pitchId: "p1", displayOrder: 0, label: "Feld 1" }],
  timeScale: null,
  cells: [],
  scheduleSections: [],
  participants: [],
  mobileTimeline: [],
  smartTiming: null,
  diagnostics: [],
  feasibilityGuidance: null,
  regenerationSummary: null,
  incompleteSetup: [],
  actions: {
    canGenerate: true,
    canRegenerate: false,
    generateLabel: "✨ Spielplan automatisch erstellen",
    generatePendingLabel: "Spielplan wird erstellt …",
    regenerateLabel: "Spielplan neu berechnen",
    regenerateHint: "Gesperrte Zeiten und Felder bleiben erhalten.",
  },
  groupStandings: [],
};

describe("TournamentPlanungWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toast.success.mockReset();
    toast.danger.mockReset();
  });

  it("shows guided empty state with generate CTA", () => {
    render(
      <TournamentPlanungWorkspace
        initialModel={model}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expect(screen.getByTestId("tournament-planung-empty")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-planung-generate")).toBeInTheDocument();
  });

  it("does not render for externally organised tournaments", () => {
    const { container } = render(
      <TournamentPlanungWorkspace
        initialModel={{
          ...model,
          availability: "UNAVAILABLE_EXTERNALLY_ORGANISED",
          actions: { ...model.actions, canGenerate: false },
        }}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows actionable guidance when automatic generation is infeasible", async () => {
    const guidance = {
      headline: "Spielplan kann noch nicht erstellt werden",
      summary: "Das verfügbare Zeitfenster reicht für die geplanten Spiele und Spielfelder nicht aus.",
      adjustments: ["Spieldauer verkürzen", "Weiteres Spielfeld hinzufügen"],
    };
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        viewModel: {
          ...model,
          feasibilityGuidance: guidance,
          diagnostics: [
            {
              id: "CAPACITY.PITCH_MINUTES_SHORT",
              message: guidance.summary,
              severity: "danger" as const,
            },
          ],
        },
        generation: {
          attempted: true,
          succeeded: false,
          optimisationStatus: "INFEASIBLE_PROVEN",
          guidance,
        },
      }),
    } as Response);

    render(
      <TournamentPlanungWorkspace
        initialModel={model}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );

    await userEvent.click(screen.getByTestId("tournament-planung-generate"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tournaments/t1/planung/generate",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(await screen.findByTestId("tournament-planung-generation-blocked")).toBeInTheDocument();
    expect(screen.getByText(guidance.headline)).toBeInTheDocument();
    expect(screen.getByText("Spieldauer verkürzen")).toBeInTheDocument();
    expect(screen.queryByText(/CAPACITY_PITCH_MINUTES_SHORT/i)).not.toBeInTheDocument();
    expect(toast.danger).toHaveBeenCalledWith(guidance.headline);
  });

  it("reconciles generated schedule without manual refresh", async () => {
    const generatedModel: TournamentPlanungViewModel = {
      ...model,
      schedulePresence: "COMPLETE",
      scheduleVersionId: "sv1",
      scheduleRevision: 2,
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
          sideA: { label: "A", crestUrl: null, isPlaceholder: false, participantId: "p1", qualificationProvenanceLabel: null },
          sideB: { label: "B", crestUrl: null, isPlaceholder: false, participantId: "p2", qualificationProvenanceLabel: null },
          startUtc: "2026-08-01T08:00:00.000Z",
          endUtc: "2026-08-01T08:20:00.000Z",
          pitchId: "p1",
          phaseLabel: null,
          groupLabel: null,
          phaseType: null,
          lockDimension: null,
          accessibleLabel: "Spiel",
          result: null,
          canEnterResult: true,
        },
      ],
      scheduleSections: [],
      mobileTimeline: [],
      actions: { ...model.actions, canGenerate: false, canRegenerate: true },
      feasibilityGuidance: null,
    };

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        viewModel: generatedModel,
        generation: {
          attempted: true,
          succeeded: true,
          optimisationStatus: "FEASIBLE_NOT_PROVEN_OPTIMAL",
          guidance: null,
        },
      }),
    } as Response);

    render(
      <TournamentPlanungWorkspace
        initialModel={model}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );

    await userEvent.click(screen.getByTestId("tournament-planung-generate"));

    await waitFor(() => {
      expect(screen.queryByTestId("tournament-planung-empty")).not.toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Spielplan wurde erstellt.");
  });
});
