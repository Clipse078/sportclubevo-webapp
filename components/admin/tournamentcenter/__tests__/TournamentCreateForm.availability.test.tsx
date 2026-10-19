/**
 * @vitest-environment jsdom
 *
 * Facility availability on TournamentCreateForm Ressourcen tab (HOME vs AWAY).
 */

import "./tournament-create-form-composer-mock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import {
  selectHomeAway,
  setTournamentCreateScheduleStart,
  TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS,
} from "./tournament-form-test-helpers";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const PITCH_HALL_GROUPS: FacilityGroup[] = [
  {
    facilityId: "facility-1",
    facilityName: "Sportanlage Brüel",
    resources: [
      {
        id: "res-pitch-a",
        name: "Kunstrasen 2",
        code: "KUNSTRASEN_2",
        type: "FULL_PITCH",
        facilityId: "facility-1",
        facilityName: "Sportanlage Brüel",
      },
      {
        id: "res-pitch-b",
        name: "Kunstrasen 3 A",
        code: "KUNSTRASEN_3_A",
        type: "HALF_PITCH",
        facilityId: "facility-1",
        facilityName: "Sportanlage Brüel",
      },
    ],
  },
];

const DRESSING_ROOM_GROUPS: FacilityGroup[] = [];

function jsonResponse(data: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

function installFetchMock() {
  const availabilityCalls: string[] = [];

  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith("/api/club-directory/clubs")) {
      return jsonResponse({ clubs: [], meta: { total: 0, limit: 200, skip: 0, hasMore: false } });
    }
    if (url.startsWith("/api/facilities/availability")) {
      availabilityCalls.push(url);
      return jsonResponse({
        availability: [
          { resourceId: "res-pitch-a", resourceCode: "KUNSTRASEN_2", status: "FREE" },
          { resourceId: "res-pitch-b", resourceCode: "KUNSTRASEN_3_A", status: "OCCUPIED" },
        ],
      });
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, availabilityCalls };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TournamentCreateForm — HOME/AWAY facility availability", () => {
  it("HOME: fetches live availability once Start is set", async () => {
    const { availabilityCalls } = installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    setTournamentCreateScheduleStart("2026-09-20", "10:00");

    await waitFor(() => {
      expect(availabilityCalls.some((url) => url.includes("group=PITCH_HALL"))).toBe(true);
    });
  });

  it("AWAY: never calls the availability endpoint and hides the Spielfeld/Halle section", async () => {
    const { availabilityCalls } = installFetchMock();
    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );

    selectHomeAway("tournament-create-home-away", "AWAY");
    setTournamentCreateScheduleStart("2026-09-20", "10:00");

    expect(screen.queryByTestId("tournament-create-resource")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-create-resources-away-section")).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(availabilityCalls).toHaveLength(0);
  });
});
