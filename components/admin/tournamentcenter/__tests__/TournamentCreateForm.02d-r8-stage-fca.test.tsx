/**
 * @vitest-environment jsdom
 *
 * SCE-TOURNAMENT-PLANNER-02D R8 — FC Allschwil STAGE team contract (shortName Junioren E1).
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
  enableTournamentCreateSpielplanCreation,
  TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE,
  TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS,
} from "./tournament-form-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/new",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/sce/activity-composer/SceActivityComposer", () => ({
  default: function TournamentCreateFormR8ComposerMock<
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
      <div data-testid={testId ?? "tournament-create-composer-r8"}>
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

/** Exact STAGE shape for FC Allschwil Junioren E1 (ageGroup null, long shortName). */
const FCA_STAGE_E1 = makeTournamentComposerTeamOption({
  id: "fca-e1",
  name: "FC Allschwil Junioren E1",
  shortName: "Junioren E1",
  alternativeName: "E1",
  ageGroup: null,
  genderGroup: null,
});

const FCA_STAGE_F1 = makeTournamentComposerTeamOption({
  id: "fca-f1",
  name: "FC Allschwil Junioren F1",
  shortName: "Junioren F1",
  alternativeName: null,
  ageGroup: null,
  genderGroup: null,
});

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

async function seedSchedule() {
  fireEvent.change(screen.getByTestId("tournament-create-title"), { target: { value: "Turnier" } });
  setTournamentCreateScheduleStart("2026-06-01", "10:00");
  enableTournamentCreateSpielplanCreation();
  fireEvent.change(screen.getByTestId("tournament-create-schedule-end-time-input"), {
    target: { value: "12:00" },
  });
  fireEvent.blur(screen.getByTestId("tournament-create-schedule-end-time-input"));
}

describe("SCE-TOURNAMENT-PLANNER-02D R8 — STAGE FCA creator UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installFetchMock();
  });

  it("materialises E/4 curated planner for STAGE Junioren E1 teams", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[FCA_STAGE_E1]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    await seedSchedule();
    await addOwnTeamRepeated("fca-e1", 4);

    expect(screen.queryByTestId("tournament-meetings-per-opponent")).toBeNull();
    expect(
      screen.getByText(/SCE hat auf Basis der Teilnehmer einen passenden Spielplan vorbereitet/),
    ).toBeTruthy();

    const pitchRows = within(screen.getByTestId("tournament-create-pitches-section")).getAllByTestId(
      /tournament-composer-pitch-row-/,
    );
    expect(pitchRows).toHaveLength(3);
    const formats = pitchRows.map(
      (row) => (within(row).getByTestId(/tournament-pitch-format-/) as HTMLSelectElement).value,
    );
    expect(formats).toEqual(["3", "3", "6"]);

    await waitFor(() => {
      expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy();
    });
  });

  it("materialises F field proposal for STAGE Junioren F1", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[FCA_STAGE_F1]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    await seedSchedule();
    await addOwnTeamRepeated("fca-f1", 6);

    const pitchRows = within(screen.getByTestId("tournament-create-pitches-section")).getAllByTestId(
      /tournament-composer-pitch-row-/,
    );
    expect(pitchRows.length).toBeGreaterThan(1);
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });
});
