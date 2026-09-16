/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentEditForm from "@/components/admin/tournamentcenter/TournamentEditForm";
import type { TournamentDto } from "@/lib/tournaments/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { success: vi.fn(), danger: vi.fn() } }),
}));

const TOURNAMENT: TournamentDto = {
  id: "tournament-1",
  tenantId: "tenant-a",
  title: "U13 Hallenturnier",
  description: null,
  status: "SCHEDULED",
  source: "MANUAL",
  startAt: "2026-01-10T09:00:00.000Z",
  endAt: null,
  meetingTime: null,
  location: null,
  organizerName: null,
  organizerLogoUrl: null,
  organizerExternalClubId: null,
  competitionLabel: null,
  resultLabel: null,
  remarks: null,
  season: { id: "season-1", key: "2025-2026", name: "Saison 2025/2026" },
  team: null,
  teamLogoUrl: null,
  homeAway: "HOME",
  participants: [],
  resourceAllocations: [],
  visibility: {
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: false,
    teamPageVisible: false,
  },
  reviewStage: "DRAFT",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

describe("TournamentEditForm Heim/Auswärts", () => {
  it("uses segmented control without combobox dropdown", () => {
    render(
      <TournamentEditForm
        tournament={TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.getByTestId("tournament-home-away-option-home")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-home-away-option-away")).toBeInTheDocument();
    expect(screen.queryByTestId("tournament-home-away-select")).not.toBeInTheDocument();
  });
});
