/**
 * @vitest-environment jsdom
 *
 * External club participant flow via SceClubTeamSelectorDialog (CLUB_ONLY).
 */

import "./tournament-create-form-composer-mock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  openTournamentExternalClubSelector,
  searchTournamentExternalClubSelector,
  TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS,
} from "./tournament-form-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const PITCH_HALL_GROUPS: FacilityGroup[] = [];
const DRESSING_ROOM_GROUPS: FacilityGroup[] = [];

const CLUB_BEYOND_OLD_CAP = {
  id: "club-99",
  name: "SC Zunzgen 99",
  shortName: null,
  logoUrl: null,
  status: "active",
  teamCount: 0,
};
const CLUB_ROSSONERI = {
  id: "club-rossoneri",
  name: "AC Rossoneri",
  shortName: null,
  logoUrl: null,
  status: "active",
  teamCount: 0,
};

function jsonResponse(data: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

function clubDirectoryResponse(allClubs: unknown[], skip = 0, limit = 200) {
  const page = allClubs.slice(skip, skip + limit);
  return jsonResponse({
    clubs: page,
    meta: {
      total: allClubs.length,
      limit,
      skip,
      hasMore: skip + page.length < allClubs.length,
    },
  });
}

function installFetchMock(clubs: unknown[] = [CLUB_BEYOND_OLD_CAP, CLUB_ROSSONERI]) {
  const clubSearchCalls: string[] = [];

  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith("/api/club-directory/clubs")) {
      clubSearchCalls.push(url);
      const parsed = new URL(url, "http://localhost");
      const skip = Number(parsed.searchParams.get("skip") ?? "0");
      const limit = Number(parsed.searchParams.get("limit") ?? "200");
      return clubDirectoryResponse(clubs, skip, limit);
    }
    if (url.startsWith("/api/facilities/availability")) {
      return jsonResponse({ availability: [] });
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, clubSearchCalls };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TournamentCreateForm — external club participant search", () => {
  it("never eagerly fetches the Club Directory on mount (only when selector opens)", async () => {
    const { clubSearchCalls } = installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(clubSearchCalls).toHaveLength(0);

    await openTournamentExternalClubSelector();
    await waitFor(() => expect(clubSearchCalls.length).toBeGreaterThan(0));
  });

  it("9. a club positioned well beyond the previous 50-item cap is retrievable via search", async () => {
    installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await openTournamentExternalClubSelector();
    searchTournamentExternalClubSelector("zu");
    expect(await screen.findByText("SC Zunzgen 99")).toBeInTheDocument();
  });

  it("12. a 2-character search returns matching canonical clubs", async () => {
    installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await openTournamentExternalClubSelector();
    searchTournamentExternalClubSelector("ro");
    expect(await screen.findByText("AC Rossoneri")).toBeInTheDocument();
  });

  it("13. non-matching clubs are excluded from the search result", async () => {
    installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await openTournamentExternalClubSelector();
    searchTournamentExternalClubSelector("ro");
    await screen.findByText("AC Rossoneri");
    expect(screen.queryByText("SC Zunzgen 99")).not.toBeInTheDocument();
  });

  it("selecting a searched club adds it to the participant lobby", async () => {
    installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await openTournamentExternalClubSelector();
    searchTournamentExternalClubSelector("ro");
    fireEvent.click(await screen.findByTestId("sce-club-card-club-rossoneri"));

    await waitFor(() => {
      expect(screen.getByTestId("tournament-create-participant-total")).toHaveTextContent("1 gesamt");
    });
    expect(screen.getAllByText("AC Rossoneri").length).toBeGreaterThanOrEqual(1);
  });

  it("prevents adding the same external club twice", async () => {
    installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    async function addRossoneri() {
      await openTournamentExternalClubSelector();
      searchTournamentExternalClubSelector("ro");
      fireEvent.click(await screen.findByTestId("sce-club-card-club-rossoneri"));
      await waitFor(() =>
        expect(screen.queryByTestId("tournament-participant-club-selector")).not.toBeInTheDocument(),
      );
    }

    await addRossoneri();
    await waitFor(() => expect(screen.getByTestId("tournament-create-participant-total")).toHaveTextContent("1 gesamt"));

    await addRossoneri();
    expect(await screen.findByTestId("tournament-participant-duplicate-notice")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-create-participant-total")).toHaveTextContent("1 gesamt");
  });

  it("1/7. exposes a club beyond the previous 200-item search cap through the add-participant flow", async () => {
    const manyClubs = Array.from({ length: 210 }, (_, i) => ({
      id: `club-many-${i}`,
      name: `Testverein ${String(i).padStart(4, "0")}`,
      shortName: null,
      logoUrl: null,
      status: "active",
      teamCount: 0,
    }));

    installFetchMock(manyClubs);
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    await openTournamentExternalClubSelector();
    searchTournamentExternalClubSelector("testverein");
    fireEvent.click(await screen.findByTestId("sce-club-card-club-many-209"));

    await waitFor(() => {
      expect(screen.getAllByText("Testverein 0209").length).toBeGreaterThanOrEqual(1);
    });
  });
});
