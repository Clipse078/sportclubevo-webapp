/**
 * @vitest-environment jsdom
 *
 * TournamentCreateForm — composer commit integration (server-props + commit API).
 */

import "./tournament-create-form-composer-mock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  addOwnTeamParticipantViaSelector,
  pickSearchableOption,
  setTournamentCreateScheduleStart,
  TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS,
} from "./tournament-form-test-helpers";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
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
        name: "Hauptplatz",
        code: "PITCH_A",
        type: "FULL_PITCH",
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

function installFetchMock(overrides: { commitResponse?: () => Response } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";

    if (url.startsWith("/api/club-directory/clubs")) {
      return jsonResponse({ clubs: [], meta: { total: 0, limit: 200, skip: 0, hasMore: false } });
    }
    if (url.startsWith("/api/facilities/availability")) {
      return jsonResponse({ availability: [] });
    }
    if (url === "/api/tournament/composer/drafts" && method === "POST") {
      return jsonResponse({ draftId: "draft-test-1" });
    }
    if (url === "/api/tournament/composer/commit" && method === "POST") {
      return overrides.commitResponse
        ? overrides.commitResponse()
        : jsonResponse({ eventId: "event-1", outcome: "PUBLISHED" });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillMinimalRequiredFields() {
  fireEvent.change(screen.getByTestId("tournament-create-title"), { target: { value: "Testturnier" } });
  pickSearchableOption("tournament-create-season", "season-1");
  setTournamentCreateScheduleStart("2026-09-20", "10:00");
  await addOwnTeamParticipantViaSelector("team-1");
  await addOwnTeamParticipantViaSelector("team-2");
}

describe("TournamentCreateForm — composer commit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.push.mockReset();
    mocks.refresh.mockReset();
  });

  it("redirects to the TournamentCenter overview on a fully successful commit", async () => {
    installFetchMock({});

    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );
    await fillMinimalRequiredFields();

    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/dashboard/tournamentcenter?submitted=1"));
  });

  it("does not redirect when composer commit returns an error", async () => {
    const fetchMock = installFetchMock({
      commitResponse: () => jsonResponse({ error: "Turnier konnte nicht erstellt werden." }, 422),
    });

    render(
      <TournamentCreateForm
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        {...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS}
      />,
    );
    await fillMinimalRequiredFields();

    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/tournament/composer/commit")).toBe(true);
    });
    expect(mocks.push).not.toHaveBeenCalledWith("/dashboard/tournamentcenter?submitted=1");
  });
});
