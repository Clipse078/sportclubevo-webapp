/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TournamentPlanungWorkspace from "../TournamentPlanungWorkspace";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
  mobileTimeline: [],
  smartTiming: null,
  diagnostics: [],
  regenerationSummary: null,
  incompleteSetup: [],
  actions: {
    canGenerate: true,
    canRegenerate: false,
    generateLabel: "✨ Spielplan automatisch erstellen",
    regenerateLabel: "Spielplan neu berechnen",
    regenerateHint: "Gesperrte Zeiten und Felder bleiben erhalten.",
  },
};

describe("TournamentPlanungWorkspace", () => {
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
});
