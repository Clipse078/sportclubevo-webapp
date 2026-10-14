/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MatchCreateForm from "@/components/admin/matchcenter/MatchCreateForm";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/sce/activity-composer/SceActivityComposer", () => ({
  default: ({
    definition,
    testId,
  }: {
    definition: { tabs: Array<{ key: string; render: () => React.ReactNode }> };
    testId?: string;
  }) => (
    <div data-testid={testId ?? "match-create-composer-mock"}>
      {definition.tabs.map((tab) => (
        <section key={tab.key} data-testid={`match-create-tab-${tab.key}`}>
          {tab.render({})}
        </section>
      ))}
    </div>
  ),
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
    ],
  },
];

const DRESSING_ROOM_GROUPS: FacilityGroup[] = [
  {
    facilityId: "facility-1",
    facilityName: "Sportanlage Brüel",
    resources: [
      {
        id: "res-dr-1",
        name: "Garderobe 1",
        code: "DR_1",
        type: "DRESSING_ROOM",
        facilityId: "facility-1",
        facilityName: "Sportanlage Brüel",
      },
    ],
  },
];

const GOVERNANCE: SceActivityEffectiveGovernance = {
  activityType: "MATCH",
  personId: "person-1",
  mayCreate: true,
  publicationAuthority: "DIRECT_PUBLISH",
  approvalStrategy: "ANY_ONE",
  validatorPersonIds: [],
};

const CLUB_CONCORDIA = { id: "club-1", name: "FC Concordia Basel", shortName: null, logoUrl: null };

function jsonResponse(data: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

function renderForm(overrides: Partial<Parameters<typeof MatchCreateForm>[0]> = {}) {
  return render(
    <MatchCreateForm
      activeSeasonId="season-1"
      teamOptions={[{ id: "team-1", name: "1. Mannschaft", ageGroup: null, genderGroup: null }]}
      pitchHallFacilityGroups={PITCH_HALL_GROUPS}
      dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
      tenantClubName="FC Allschwil"
      tenantLogoUrl={null}
      effectiveGovernance={GOVERNANCE}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  refreshMock.mockClear();
});

describe("MatchCreateForm — composer tabs (01E)", () => {
  it("renders canonical tabs including Termin location field", () => {
    renderForm();
    expect(screen.getByTestId("match-create-tab-termin")).toBeTruthy();
    expect(screen.getByTestId("match-create-location")).toBeTruthy();
  });

  it("shows identity preview after team and opponent are set", () => {
    renderForm();
    fireEvent.change(screen.getByTestId("match-create-team-select"), { target: { value: "team-1" } });
    fireEvent.click(screen.getByTestId("match-create-change-opponent-away"));
    fireEvent.change(screen.getByTestId("match-create-opponent-name-away"), {
      target: { value: "FC Rival" },
    });
    fireEvent.change(screen.getByTestId("match-create-schedule-date-input"), {
      target: { value: "20.09.2026" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-date-input"));
    fireEvent.change(screen.getByTestId("match-create-schedule-start-time-input"), {
      target: { value: "17:00" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-start-time-input"));
    expect(screen.getByTestId("match-create-identity-preview")).toBeTruthy();
  });

  it("AWAY ressourcen tab explains no tenant facilities", () => {
    renderForm();
    fireEvent.click(screen.getByTestId("match-create-home-away-switch"));
    expect(screen.getByText(/keine Vereinsressourcen zugewiesen/)).toBeTruthy();
  });
});

describe("MatchCreateForm — Gegner", () => {
  it("searches club directory on demand", async () => {
    const clubSearchCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/club-directory/clubs")) {
          clubSearchCalls.push(url);
          return jsonResponse({ clubs: [CLUB_CONCORDIA] });
        }
        if (url.startsWith("/api/facilities/availability")) {
          return jsonResponse({ availability: [] });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    renderForm();
    fireEvent.click(screen.getByTestId("match-create-change-opponent-away"));
    const input = screen.getByTestId("match-create-opponent-club-search-away-input");
    fireEvent.change(input, { target: { value: "Concord" } });

    await waitFor(() => {
      expect(clubSearchCalls.some((u) => u.includes("search="))).toBe(true);
    });
  });
});

describe("MatchCreateForm — HOME availability", () => {
  it("fetches availability when HOME and Termin set", async () => {
    const availabilityCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/facilities/availability")) {
          availabilityCalls.push(url);
          return jsonResponse({ availability: [] });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    renderForm();
    fireEvent.change(screen.getByTestId("match-create-schedule-date-input"), {
      target: { value: "20.09.2026" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-date-input"));
    fireEvent.change(screen.getByTestId("match-create-schedule-start-time-input"), {
      target: { value: "17:00" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-start-time-input"));

    await waitFor(() => {
      expect(availabilityCalls.length).toBeGreaterThan(0);
    });
  });
});
