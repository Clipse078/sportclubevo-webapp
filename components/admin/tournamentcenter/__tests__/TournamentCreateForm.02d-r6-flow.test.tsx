/**
 * @vitest-environment jsdom
 *
 * SCE-TOURNAMENT-PLANNER-02D R6 — real creator journey (no planner panel mocks).
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SceActivityComposerProps } from "@/lib/sce/activity-composer/types";
import type { ContextTabId } from "@/lib/context-tabs/types";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  addOwnTeamParticipantViaSelector,
  makeTournamentComposerTeamOption,
  setTournamentCreateScheduleStart,
  TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE,
  TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS,
} from "./tournament-form-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/sce/activity-composer/SceActivityComposer", () => ({
  default: function TournamentCreateFormR6ComposerMock<
    TDraft,
    TResult,
    TTabId extends ContextTabId,
  >(props: SceActivityComposerProps<TDraft, TResult, TTabId>) {
    const { definition, draft, testId } = props;
    const tabCtx = {
      draft,
      setDraft: () => undefined,
      isSubmitting: false,
      isSavingDraft: false,
      submitError: null,
      draftSaveError: null,
      fieldErrors: undefined as Record<string, string> | undefined,
    };

    return (
      <div data-testid={testId ?? "tournament-create-composer-r6"}>
        {definition.tabs.map((tab) => (
          <section key={String(tab.key)} data-testid={`tournament-create-tab-${String(tab.key)}`}>
            {tab.render(tabCtx)}
          </section>
        ))}
      </div>
    );
  },
}));

const PITCH_HALL_GROUPS: FacilityGroup[] = [];
const DRESSING_ROOM_GROUPS: FacilityGroup[] = [];

const E_TEAM_OPTIONS = [
  makeTournamentComposerTeamOption({ id: "team-e1", name: "Junioren E1", ageGroup: "E" }),
];

const F_TEAM_OPTIONS = [
  makeTournamentComposerTeamOption({ id: "team-f1", name: "Junioren F1", ageGroup: "F" }),
];

function installFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/club-directory/clubs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ clubs: [], meta: { total: 0, limit: 200, skip: 0, hasMore: false } }),
        } as Response;
      }
      if (url.startsWith("/api/facilities/availability")) {
        return { ok: true, status: 200, json: async () => ({ availability: [] }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

async function addOwnTeamRepeated(teamId: string, count: number) {
  for (let i = 0; i < count; i += 1) {
    await addOwnTeamParticipantViaSelector(teamId);
  }
}

async function seedE4Tournament() {
  fireEvent.change(screen.getByTestId("tournament-create-title"), { target: { value: "E Turnier" } });
  setTournamentCreateScheduleStart("2026-06-01", "10:00");
  fireEvent.change(screen.getByTestId("tournament-create-schedule-end-time-input"), {
    target: { value: "12:00" },
  });
  fireEvent.blur(screen.getByTestId("tournament-create-schedule-end-time-input"));
  await addOwnTeamRepeated("team-e1", 4);
}

describe("SCE-TOURNAMENT-PLANNER-02D R6 — real creator flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installFetchMock();
  });

  it("CASE A — supported E tournament materialises fields and Spielplan", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={E_TEAM_OPTIONS}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Test"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    await seedE4Tournament();

    const formatSection = await screen.findByTestId("tournament-create-format-section");
    expect(within(formatSection).queryByTestId("tournament-meetings-per-opponent")).toBeNull();
    expect(screen.getByText(/SCE hat auf Basis der Teilnehmer einen passenden Spielplan vorbereitet/)).toBeTruthy();

    const pitchesSection = screen.getByTestId("tournament-create-pitches-section");
    const pitchRows = within(pitchesSection).getAllByTestId(/tournament-composer-pitch-row-/);
    expect(pitchRows).toHaveLength(3);

    for (const row of pitchRows) {
      const formatSelect = within(row).getByTestId(/tournament-pitch-format-/) as HTMLSelectElement;
      expect(formatSelect.value).not.toBe("");
    }

    await waitFor(() => {
      expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy();
    });
    expect(screen.getAllByText(/^Runde \d+$/).length).toBeGreaterThan(0);
  });

  it("CASE B — supported F tournament field proposal and TP01 Spielplan", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={F_TEAM_OPTIONS}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Test"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    fireEvent.change(screen.getByTestId("tournament-create-title"), { target: { value: "F Turnier" } });
    setTournamentCreateScheduleStart("2026-06-01", "10:00");
    fireEvent.change(screen.getByTestId("tournament-create-schedule-end-time-input"), {
      target: { value: "12:00" },
    });
    fireEvent.blur(screen.getByTestId("tournament-create-schedule-end-time-input"));
    await addOwnTeamRepeated("team-f1", 6);

    const pitchRows = within(screen.getByTestId("tournament-create-pitches-section")).getAllByTestId(
      /tournament-composer-pitch-row-/,
    );
    expect(pitchRows).toHaveLength(4);
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });

  it("CASE C — user pitch override is preserved", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={E_TEAM_OPTIONS}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Test"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    await seedE4Tournament();
    const pitchesSection = screen.getByTestId("tournament-create-pitches-section");
    const firstRow = within(pitchesSection).getAllByTestId(/tournament-composer-pitch-row-/)[0]!;
    const labelInput = within(firstRow).getByTestId(/tournament-pitch-label-/);
    fireEvent.change(labelInput, { target: { value: "Hauptfeld" } });
    expect(labelInput).toHaveValue("Hauptfeld");
    expect(screen.getByTestId("tournament-composer-restore-proposal")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });

  it("CASE D — generic flow without curated template stays functional", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[
          makeTournamentComposerTeamOption({ id: "team-a", name: "Aktive", ageGroup: "Aktive" }),
        ]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Test"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    fireEvent.change(screen.getByTestId("tournament-create-title"), { target: { value: "Generic" } });
    setTournamentCreateScheduleStart("2026-06-01", "10:00");
    fireEvent.change(screen.getByTestId("tournament-create-schedule-end-time-input"), {
      target: { value: "12:00" },
    });
    fireEvent.blur(screen.getByTestId("tournament-create-schedule-end-time-input"));
    await addOwnTeamRepeated("team-a", 2);

    expect(screen.getByTestId("tournament-meetings-per-opponent")).toBeTruthy();
    const formatField = screen.getByTestId(/tournament-pitch-format-/);
    fireEvent.change(formatField, { target: { value: "6" } });
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });
});
