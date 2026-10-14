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
  usePathname: () => "/dashboard/matchcenter/new",
  useSearchParams: () => new URLSearchParams("tab=teams"),
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
      {
        id: "res-dr-2",
        name: "Garderobe 2",
        code: "DR_2",
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

function renderForm() {
  return render(
    <MatchCreateForm
      activeSeasonId="season-1"
      teamOptions={[{ id: "team-1", name: "1. Mannschaft", ageGroup: null, genderGroup: null }]}
      pitchHallFacilityGroups={PITCH_HALL_GROUPS}
      dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
      tenantClubName="FC Allschwil"
      tenantLogoUrl={null}
      effectiveGovernance={GOVERNANCE}
      containerMode="overlay"
      open
    />,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/club-directory/clubs")) {
        return jsonResponse({ clubs: [CLUB_CONCORDIA] });
      }
      if (url.startsWith("/api/facilities/availability")) {
        return jsonResponse({ availability: [] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
});

import { validateMatchCreateWorkflowStep } from "@/lib/matchcenter/match-create-step-validation";
import { createEmptyMatchComposerDraft } from "@/lib/matchcenter/composer/match-composer-draft-types";

describe("MatchCreateForm guided R2 interactions", () => {
  it("sanity — workflow teams step accepts name-only opponent", () => {
    const draft = createEmptyMatchComposerDraft();
    draft.teamId = "team-1";
    draft.opponentName = "FC Concordia Basel";
    expect(validateMatchCreateWorkflowStep(draft, "teams").valid).toBe(true);
  });
  it("shows matchup selector before team is chosen", () => {
    renderForm();
    expect(screen.getByTestId("match-create-matchup-selector")).toBeTruthy();
    expect(screen.getByTestId("match-create-team-select")).toBeTruthy();
  });

  it("Weiter shows validation when teams incomplete", () => {
    renderForm();
    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    expect(screen.getByTestId("sce-activity-composer-validation-banner")).toHaveTextContent(
      /Team und Gegner/i,
    );
    expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
      "Schritt 1 von 5",
    );
  });

  it("advances after teams and termin are valid", async () => {
    renderForm();
    fireEvent.change(screen.getByTestId("match-create-team-select"), { target: { value: "team-1" } });

    fireEvent.click(screen.getByTestId("match-create-change-opponent-away"));
    fireEvent.change(screen.getByTestId("match-create-opponent-name-away"), {
      target: { value: "FC Concordia Basel" },
    });

    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
        "Schritt 2 von 5",
      ),
    );

    fireEvent.change(screen.getByTestId("match-create-schedule-date-input"), {
      target: { value: "14.10.2026" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-date-input"));
    fireEvent.change(screen.getByTestId("match-create-schedule-start-time-input"), {
      target: { value: "09:35" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-start-time-input"));
    fireEvent.change(screen.getByTestId("match-create-schedule-end-time-input"), {
      target: { value: "13:35" },
    });
    fireEvent.blur(screen.getByTestId("match-create-schedule-end-time-input"));

    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
        "Schritt 3 von 5",
      ),
    );
  });

  it("exposes pitch assignment on HOME ressourcen step after Termin", async () => {
    renderForm();
    fireEvent.change(screen.getByTestId("match-create-team-select"), { target: { value: "team-1" } });
    fireEvent.click(screen.getByTestId("match-create-change-opponent-away"));
    fireEvent.change(screen.getByTestId("match-create-opponent-name-away"), {
      target: { value: "FC Concordia Basel" },
    });

    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
        "Schritt 2 von 5",
      ),
    );

    fireEvent.change(screen.getByTestId("match-create-schedule-date-input"), { target: { value: "14.10.2026" } });
    fireEvent.blur(screen.getByTestId("match-create-schedule-date-input"));
    fireEvent.change(screen.getByTestId("match-create-schedule-start-time-input"), { target: { value: "09:35" } });
    fireEvent.blur(screen.getByTestId("match-create-schedule-start-time-input"));

    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
        "Schritt 3 von 5",
      ),
    );

    expect(screen.getByTestId("match-create-resources-section")).toBeVisible();
    expect(screen.getByTestId("match-create-pitch-action")).toBeVisible();
    expect(screen.getByTestId("match-create-dressing-room")).toBeTruthy();
  });
});
