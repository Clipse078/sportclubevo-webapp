/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamPlayerReleaseSection from "../TeamPlayerReleaseSection";

const sampleRelease = {
  id: "release-1",
  personId: "p1",
  personDisplayName: "SCE Testspieler 01",
  sourceTeamSeasonId: "ts-1",
  sourceTeamLabel: "Junioren B1",
  targetTeamSeasonId: "ts-2",
  targetTeamLabel: "Junioren B2",
  validFrom: "2026-10-10",
  validUntil: "2026-11-30",
  validityLabel: "10.10.–30.11.",
  maxMinutes: 45,
  maxMinutesLabel: "max. 45 Min.",
  reason: "SPIELPRAXIS" as const,
  reasonLabel: "Spielpraxis",
  note: null,
  status: "ACTIVE" as const,
  displayPhase: "ACTIVE",
  displayLabel: "Aktiv",
  operationallyActive: true,
  sourceRosterMember: true,
  updatedAt: "2026-10-10T10:00:00.000Z",
  version: "2026-10-10T10:00:00.000Z",
  scope: "PERIOD" as const,
  eventId: null,
  trainingSessionId: null,
};

describe("TeamPlayerReleaseSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          releases: [sampleRelease],
          rosterPlayers: [{ personId: "p1", displayName: "SCE Testspieler 01" }],
          canEdit: true,
        }),
      }),
    );
  });

  it("renders grouped release overview", async () => {
    render(<TeamPlayerReleaseSection teamId="team-1" teamSeasonId="ts-1" />);

    await waitFor(() => {
      expect(screen.getByText("Spielerfreigaben")).toBeInTheDocument();
    });

    expect(screen.getByText("SCE Testspieler 01")).toBeInTheDocument();
    expect(screen.getByText(/Junioren B2/)).toBeInTheDocument();
    expect(screen.getByText(/max\. 45 Min\./)).toBeInTheDocument();
    expect(screen.getByText(/Spielpraxis/)).toBeInTheDocument();
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
  });

  it("shows create action", async () => {
    render(<TeamPlayerReleaseSection teamId="team-1" teamSeasonId="ts-1" />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Für anderes Team freigeben/i }),
      ).toBeInTheDocument();
    });
  });

  it("uses SCE switch for history toggle (no checkbox)", async () => {
    render(<TeamPlayerReleaseSection teamId="team-1" teamSeasonId="ts-1" />);
    await waitFor(() => {
      expect(screen.getByRole("switch", { name: /Vergangen \/ Widerrufen anzeigen/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("opens create sheet", async () => {
    const user = userEvent.setup();
    render(<TeamPlayerReleaseSection teamId="team-1" teamSeasonId="ts-1" />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Für anderes Team freigeben/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /Für anderes Team freigeben/i }));
    expect(await screen.findByText("Spieler freigeben")).toBeInTheDocument();
  });
});
