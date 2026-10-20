/**
 * @vitest-environment jsdom
 *
 * SCE-TOURNAMENT-PLANNER-02D R7 — production-shaped team contract (PO UAT regression).
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
import { hydrateTournamentComposerFormFromDraft } from "@/lib/tournaments/composer/hydrate-tournament-composer-form-from-draft";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/sce/activity-composer/SceActivityComposer", () => ({
  default: function TournamentCreateFormR7ComposerMock<
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
      <div data-testid={testId ?? "tournament-create-composer-r7"}>
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

/** FCA-like row: long name + shortName stufe, ageGroup often E1 not E (see player-birth-year-eligibility). */
const FCA_E_TEAM_OPTION = makeTournamentComposerTeamOption({
  id: "team-fca-e1",
  name: "FC Allschwil Junioren E1",
  shortName: "E1",
  ageGroup: "E1",
  genderGroup: null,
});

const FCA_F_TEAM_OPTION = makeTournamentComposerTeamOption({
  id: "team-fca-f1",
  name: "FC Allschwil Junioren F1",
  shortName: "F1",
  ageGroup: "F1",
  genderGroup: null,
});

/** ageGroup null with shortName only — common on public/API snapshots. */
const FCA_E_SHORTNAME_ONLY = makeTournamentComposerTeamOption({
  id: "team-fca-e2",
  name: "FC Allschwil Junioren E2",
  shortName: "E2",
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

describe("SCE-TOURNAMENT-PLANNER-02D R7 — real FCA team contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installFetchMock();
  });

  it("CASE A — REAL E flow (ageGroup E1) materialises curated planner", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[FCA_E_TEAM_OPTION]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    await seedSchedule();
    await addOwnTeamRepeated("team-fca-e1", 4);

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
    expect(screen.getAllByText(/^Runde \d+$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FC Allschwil Junioren E1/).length).toBeGreaterThan(0);
  });

  it("CASE B — REAL F flow (ageGroup F1) field proposal + Spielplan", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[FCA_F_TEAM_OPTION]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );

    await seedSchedule();
    await addOwnTeamRepeated("team-fca-f1", 6);

    const pitchRows = within(screen.getByTestId("tournament-create-pitches-section")).getAllByTestId(
      /tournament-composer-pitch-row-/,
    );
    expect(pitchRows.length).toBeGreaterThan(1);
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });

  it("CASE F — R6 regression: canonical E without shortName still works", async () => {
    const legacyIdeal = makeTournamentComposerTeamOption({
      id: "team-e-canonical",
      name: "Junioren E1",
      ageGroup: "E",
      genderGroup: null,
    });
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[legacyIdeal]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Test"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );
    await seedSchedule();
    await addOwnTeamRepeated("team-e-canonical", 4);
    expect(screen.queryByTestId("tournament-meetings-per-opponent")).toBeNull();
    expect(
      within(screen.getByTestId("tournament-create-pitches-section")).getAllByTestId(
        /tournament-composer-pitch-row-/,
      ),
    ).toHaveLength(3);
  });

  it("CASE C — user pitch override survives navigation context", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[FCA_E_TEAM_OPTION]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );
    await seedSchedule();
    await addOwnTeamRepeated("team-fca-e1", 4);
    const pitchesSection = screen.getByTestId("tournament-create-pitches-section");
    const firstRow = within(pitchesSection).getAllByTestId(/tournament-composer-pitch-row-/)[0]!;
    fireEvent.change(within(firstRow).getByTestId(/tournament-pitch-label-/), {
      target: { value: "Hauptfeld" },
    });
    expect(within(firstRow).getByTestId(/tournament-pitch-label-/)).toHaveValue("Hauptfeld");
    expect(screen.getByTestId("tournament-composer-restore-proposal")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });

  it("CASE E — unknown category stays generic TP01", async () => {
    render(
      <TournamentCreateForm
        activeSeasonId="season-1"
        seasonOptions={TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS}
        teamOptions={[
          makeTournamentComposerTeamOption({ id: "team-a", name: "Aktive", ageGroup: "Aktive" }),
        ]}
        pitchHallFacilityGroups={PITCH_HALL_GROUPS}
        dressingRoomFacilityGroups={DRESSING_ROOM_GROUPS}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        effectiveGovernance={TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE}
        defaultTournamentDurationMinutes={120}
      />,
    );
    await seedSchedule();
    await addOwnTeamRepeated("team-a", 2);
    expect(screen.getByTestId("tournament-meetings-per-opponent")).toBeTruthy();
    const formatField = screen.getByTestId(/tournament-pitch-format-/);
    fireEvent.change(formatField, { target: { value: "6" } });
    await waitFor(() => expect(screen.getByTestId("tournament-composer-schedule-preview")).toBeTruthy());
  });

  it("CASE D — hydrate preserves proposal after reload (shortName-only ageGroup)", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00:00.000Z";
    draft.endAt = "2026-06-01T12:00:00.000Z";
    draft.participants = Array.from({ length: 4 }, (_, i) => ({
      localId: `p${i}`,
      kind: "TEAM" as const,
      teamId: "team-fca-e2",
      teamAgeGroup: null,
      displayName: "FC Allschwil Junioren E2 · E2",
      subLabel: "FC Allschwil",
      dressingRooms: [],
    }));
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    draft.spielplanCreationEnabled = true;

    const hydrated = hydrateTournamentComposerFormFromDraft(draft, {
      teamOptions: [FCA_E_SHORTNAME_ONLY],
    });
    expect(hydrated.planner!.pitches).toHaveLength(3);
    expect(hydrated.planner!.pitches.every((p) => p.playersPerSide == null)).toBe(true);
    expect(hydrated.participants[0]?.teamJuniorCategoryCode).toBe("E");
  });
});
