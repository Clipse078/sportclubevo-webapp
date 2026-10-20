/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentPlanungWorkspace from "../TournamentPlanungWorkspace";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/t1/edit",
  useSearchParams: () => new URLSearchParams("tab=planung"),
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
  feasibilityStatus: "FEASIBLE",
  feasibilityUxStatus: null,
  pitches: [{ pitchId: "p1", displayOrder: 0, label: "Feld 1", formatHint: null, playersPerSide: null }],
  timeScale: null,
  cells: [],
  scheduleSections: [],
  participants: [],
  mobileTimeline: [],
  smartTiming: null,
  diagnostics: [],
  planningUx: {
    state: "READY",
    headline: "Alles bereit.",
    summary: null,
    recommendedTiming: null,
    contextLinks: [],
  },
  feasibilityGuidance: null,
  regenerationSummary: null,
  incompleteSetup: [],
  actions: {
    canGenerate: true,
    canRegenerate: false,
    generateLabel: "✨ Spielplan erstellen",
    generatePendingLabel: "Spielplan wird erstellt …",
    regenerateLabel: "Spielplan neu berechnen",
    regenerateHint: "Gesperrte Zeiten und Felder bleiben erhalten.",
  },
  groupStandings: [],
  schedulingSettings: null,
  timingConsequence: null,
};

describe("TournamentPlanungWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toast.success.mockReset();
    toast.danger.mockReset();
  });

  it("shows READY state with single generate CTA", () => {
    render(
      <TournamentPlanungWorkspace
        initialModel={model}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expect(screen.getByTestId("tournament-planung-ready")).toBeInTheDocument();
    expect(screen.getByText("Alles bereit.")).toBeInTheDocument();
    expect(screen.getAllByTestId("tournament-planung-generate")).toHaveLength(1);
  });

  it("shows actionable Turnierplanung einrichten for incomplete HOME planner setup", () => {
    render(
      <TournamentPlanungWorkspace
        initialModel={{
          ...model,
          planningUx: null,
          actions: { ...model.actions, canGenerate: false },
          incompleteSetup: [
            {
              code: "PLANNER_SETUP",
              label: "Turnierplanung einrichten — Format, Felder, Timing und Pausen vervollständigen",
              href: null,
            },
            { code: "PITCHES", label: "Turnierfelder fehlen", href: null },
          ],
        }}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expect(screen.getByTestId("tournament-planung-setup-open")).toBeInTheDocument();
  });

  it("does not render for externally organised tournaments", () => {
    const { container } = render(
      <TournamentPlanungWorkspace
        initialModel={{
          ...model,
          availability: "UNAVAILABLE_EXTERNALLY_ORGANISED",
          actions: { ...model.actions, canGenerate: false },
          planningUx: null,
        }}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows structural guidance without duplicate diagnostics when generation fails", async () => {
    const guidance = {
      state: "STRUCTURAL_CHANGE" as const,
      headline: "Der Spielplan passt noch nicht in die verfügbare Zeit.",
      summary: "Du brauchst mehr Zeit oder ein zusätzliches Spielfeld.",
      recommendedTiming: null,
      contextLinks: [{ label: "Spielfeld hinzufügen", href: "/dashboard/tournamentcenter/t1/edit?tab=spielfelder" }],
    };
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        viewModel: {
          ...model,
          feasibilityStatus: "INFEASIBLE",
          planningUx: guidance,
          feasibilityGuidance: guidance,
          actions: { ...model.actions, canGenerate: false },
          diagnostics: [],
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

    expect(await screen.findByTestId("tournament-planung-planning-state")).toBeInTheDocument();
    expect(screen.queryByText(/Spieldauer verkürzen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CAPACITY_PITCH_MINUTES_SHORT/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Planungsdiagnose")).not.toBeInTheDocument();
    expect(toast.danger).toHaveBeenCalledWith(
      "Spielplan konnte mit der aktuellen Konfiguration nicht erstellt werden.",
    );
  });

  it("shows smart timing recommendation and apply action when provided", async () => {
    const guidance = {
      state: "AUTO_FIX" as const,
      headline: "Der Spielplan passt noch nicht.",
      summary: "SCE empfiehlt:",
      recommendedTiming: { matchDurationMinutes: 12, transitionMinutes: 3 },
      contextLinks: [],
    };
    render(
      <TournamentPlanungWorkspace
        initialModel={{
          ...model,
          feasibilityStatus: "INFEASIBLE",
          planningUx: guidance,
          feasibilityGuidance: guidance,
          actions: { ...model.actions, canGenerate: false },
        }}
        tournamentId="t1"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expect(screen.getByTestId("tournament-planung-recommended-timing-line")).toHaveTextContent(
      "12 Min. Spielzeit · 3 Min. Wechselzeit",
    );
    expect(screen.getByTestId("tournament-planung-apply-recommended-timing")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-planung-self-adjust")).toBeInTheDocument();
    expect(screen.queryByText("Spieldauer verkürzen")).not.toBeInTheDocument();
  });

  it("reconciles generated schedule without manual refresh", async () => {
    const generatedModel: TournamentPlanungViewModel = {
      ...model,
      schedulePresence: "COMPLETE",
      scheduleVersionId: "sv1",
      scheduleRevision: 2,
      planningUx: null,
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
      expect(screen.queryByTestId("tournament-planung-ready")).not.toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Spielplan wurde erstellt.");
  });
});
