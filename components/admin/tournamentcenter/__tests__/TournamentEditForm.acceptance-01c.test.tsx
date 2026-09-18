/**
 * @vitest-environment jsdom
 *
 * TURNIERE-UX-01C — semantic icons, HOME/AWAY polish, central duration reference.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentEditForm from "@/components/admin/tournamentcenter/TournamentEditForm";
import TournamentStandardDurationHint from "@/components/admin/tournamentcenter/TournamentStandardDurationHint";
import { HomeAwaySegmentedControl, TOURNAMENT_HOME_AWAY_SEGMENTS } from "@/components/admin/shared/HomeAwaySegmentedControl";
import { TournamentTeamLogo } from "@/components/admin/tournamentcenter/tournament-semantic-icons";
import { FACILITIES_ZEITSTANDARDS_HREF } from "@/lib/tournaments/tournament-schedule-presentation";
import type { TournamentDto } from "@/lib/tournaments/types";
import { utcInstantToDateTimeLocalValue } from "@/lib/events/tenant-local-datetime";
import { FacilityResourceIdentity } from "@/components/admin/shared/planning/FacilityResourceIdentity";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { success: vi.fn(), danger: vi.fn() } }),
}));

const BASE_TOURNAMENT: TournamentDto = {
  id: "tournament-1",
  tenantId: "tenant-a",
  title: "U13 Hallenturnier",
  description: null,
  status: "SCHEDULED",
  source: "MANUAL",
  startAt: "2026-01-10T09:00:00.000Z",
  endAt: "2026-01-10T12:00:00.000Z",
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
  reviewStage: "APPROVED",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

describe("TURNIERE-UX-01C HOME/AWAY", () => {
  it("uses concise Heim and Auswärts labels without verbose tenant copy", () => {
    expect(TOURNAMENT_HOME_AWAY_SEGMENTS.map((s) => s.label)).toEqual(["Heim", "Auswärts"]);
    render(<HomeAwaySegmentedControl value="HOME" onChange={() => {}} testId="ha" />);
    expect(screen.getByText("Heim")).toBeInTheDocument();
    expect(screen.getByText("Auswärts")).toBeInTheDocument();
    expect(screen.queryByText(/FC Allschwil ausrichtend/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/extern ausgerichtet/i)).not.toBeInTheDocument();
  });

  it("renders bus icon for AWAY and not airplane", () => {
    render(<HomeAwaySegmentedControl value="AWAY" onChange={() => {}} testId="ha" />);
    expect(screen.getByTestId("ha-icon-away")).toBeInTheDocument();
    expect(screen.getByTestId("ha-icon-home")).toBeInTheDocument();
    const awayIcon = screen.getByTestId("ha-icon-away");
    expect(awayIcon.getAttribute("class") ?? "").not.toMatch(/plane/i);
  });
});

describe("TURNIERE-UX-01C duration reference", () => {
  it("shows configured tournament standard dynamically", () => {
    render(
      <TournamentStandardDurationHint
        defaultTournamentDurationMinutes={120}
        canManageFacilitiesTimeStandards={false}
      />,
    );
    expect(screen.getByTestId("tournament-standard-duration")).toHaveTextContent("Standarddauer: 120 Min.");
  });

  it("reflects changed configured standard without hardcoding", () => {
    render(
      <TournamentStandardDurationHint
        defaultTournamentDurationMinutes={150}
        canManageFacilitiesTimeStandards={false}
      />,
    );
    expect(screen.getByTestId("tournament-standard-duration")).toHaveTextContent("150 Min.");
  });

  it("shows facilities management link only for authorized users", () => {
    const { rerender } = render(
      <TournamentStandardDurationHint
        defaultTournamentDurationMinutes={120}
        canManageFacilitiesTimeStandards
      />,
    );
    const link = screen.getByTestId("tournament-standard-duration-manage-link");
    expect(link).toHaveTextContent("Zeitstandard verwalten");
    expect(link).toHaveAttribute("href", FACILITIES_ZEITSTANDARDS_HREF);

    rerender(
      <TournamentStandardDurationHint
        defaultTournamentDurationMinutes={120}
        canManageFacilitiesTimeStandards={false}
      />,
    );
    expect(screen.queryByTestId("tournament-standard-duration-manage-link")).not.toBeInTheDocument();
  });

  it("does not overwrite existing tournament end time in the editor", () => {
    render(
      <TournamentEditForm
        tournament={BASE_TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        tenantLogoUrl="https://example.com/crest.png"
        defaultTournamentDurationMinutes={120}
        canManageFacilitiesTimeStandards={false}
      />,
    );
    const endInput = screen.getByLabelText(/^Ende$/i) as HTMLInputElement;
    expect(endInput.value).toBe(
      utcInstantToDateTimeLocalValue(BASE_TOURNAMENT.endAt!, "Europe/Zurich"),
    );
  });

  it("applies green and blue semantic resource icon treatments", () => {
    const { rerender } = render(
      <FacilityResourceIdentity
        name="Hauptplatz"
        resourceType="FULL_PITCH"
        facilityType="OUTDOOR"
        semanticResourceColors
      />,
    );
    expect(screen.getByTestId("facility-resource-semantic-icon-tile").className).toMatch(/emerald/);

    rerender(
      <FacilityResourceIdentity
        name="Heimgarderobe"
        resourceType="DRESSING_ROOM"
        semanticResourceColors
      />,
    );
    expect(screen.getByTestId("facility-resource-semantic-icon-tile").className).toMatch(/blue/);
  });
});

describe("TURNIERE-UX-01C team logos", () => {
  it("uses tenant crest for internal teams when available", () => {
    render(
      <TournamentTeamLogo logoUrl="https://example.com/tenant.png" name="Junioren G" className="h-7 w-7" />,
    );
    expect(screen.getByAltText(/Junioren G/i)).toHaveAttribute("src", "https://example.com/tenant.png");
  });

  it("falls back to generic team icon when logo unavailable", () => {
    render(<TournamentTeamLogo logoUrl={null} name="Junioren G" className="h-7 w-7" />);
    expect(screen.getByTestId("tournament-team-logo-fallback")).toBeInTheDocument();
  });
});
