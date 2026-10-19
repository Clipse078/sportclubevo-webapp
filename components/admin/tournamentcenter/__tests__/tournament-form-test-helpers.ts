import { fireEvent, screen, waitFor } from "@testing-library/react";
import { SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES } from "@/lib/operational/defaults";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { TournamentSeasonOption, TournamentTeamOption } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";

/** Props for tournament create/edit tests — duration is configurable, not UI-hardcoded to a club. */
export const TOURNAMENT_FORM_TEST_SCHEDULE_PROPS = {
  defaultTournamentDurationMinutes: SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
  canManageFacilitiesTimeStandards: false,
} as const;

/** Mirrors loadTournamentComposerCreateSurfaceProps — keep in sync with fetch mocks in create-form tests. */
export const TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS: TournamentSeasonOption[] = [
  { id: "season-1", key: "2025-2026", name: "Saison 2025/2026", isActive: true },
];

export const TOURNAMENT_CREATE_FORM_TEST_TEAM_OPTIONS: TournamentTeamOption[] = [
  { id: "team-1", name: "1. Mannschaft", ageGroup: null, genderGroup: null },
  { id: "team-2", name: "2. Mannschaft", ageGroup: null, genderGroup: null },
];

export const TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE: SceActivityEffectiveGovernance = {
  activityType: "TOURNAMENT",
  personId: "person-test-1",
  mayCreate: true,
  publicationAuthority: "DIRECT_PUBLISH",
  approvalStrategy: "ANY_ONE",
  validatorPersonIds: [],
};

/** Server/composer surface props required by TournamentCreateForm (SceActivityCreateMenu contract). */
export const TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS = {
  activeSeasonId: "season-1",
  seasonOptions: TOURNAMENT_CREATE_FORM_TEST_SEASON_OPTIONS,
  teamOptions: TOURNAMENT_CREATE_FORM_TEST_TEAM_OPTIONS,
  tenantClubName: "FC Testverein",
  tenantLogoUrl: null as string | null,
  effectiveGovernance: TOURNAMENT_CREATE_FORM_TEST_GOVERNANCE,
  ...TOURNAMENT_FORM_TEST_SCHEDULE_PROPS,
} as const;

export const TOURNAMENT_CREATE_FORM_TEST_BASE_PROPS = {
  pitchHallFacilityGroups: [] as { facilityId: string; facilityName: string; facilityType: string; resources: never[] }[],
  dressingRoomFacilityGroups: [] as { facilityId: string; facilityName: string; facilityType: string; resources: never[] }[],
  ...TOURNAMENT_CREATE_FORM_TEST_COMPOSER_SURFACE_PROPS,
};

/** Select Heim or Auswärts on HomeAwaySegmentedControl. */
export function selectHomeAway(testIdPrefix: string, value: "HOME" | "AWAY") {
  fireEvent.click(screen.getByTestId(`${testIdPrefix}-option-${value.toLowerCase()}`));
}

/** Select an option in StaticOptionSearchablePicker / TeamSearchablePicker. */
export function pickSearchableOption(testIdPrefix: string, optionValue: string) {
  fireEvent.focus(screen.getByTestId(`${testIdPrefix}-select`));
  fireEvent.click(screen.getByTestId(`${testIdPrefix}-select`));
  fireEvent.click(screen.getByTestId(`${testIdPrefix}-option-${optionValue}`));
}

/** Select a facility resource in FacilityResourceSearchableSelector. */
export function pickFacilityResource(testIdPrefix: string, resourceId: string) {
  fireEvent.click(screen.getByTestId(`${testIdPrefix}-select`));
  fireEvent.click(screen.getByTestId(`${testIdPrefix}-option-${resourceId}`));
}

/** Sets start date/time on the Termin tab (`SceActivityDateTimeInput`). */
export function setTournamentCreateScheduleStart(isoDate = "2026-09-20", startTime = "10:00") {
  const [year, month, day] = isoDate.split("-");
  const displayDate = `${day}.${month}.${year}`;
  const dateInput = screen.getByTestId("tournament-create-schedule-date-input");
  fireEvent.change(dateInput, { target: { value: displayDate } });
  fireEvent.blur(dateInput);
  const timeInput = screen.getByTestId("tournament-create-schedule-start-time-input");
  fireEvent.change(timeInput, { target: { value: startTime } });
  fireEvent.blur(timeInput);
}

export async function openTournamentExternalClubSelector() {
  fireEvent.click(screen.getByTestId("tournament-external-club-add"));
  await waitFor(() => {
    expect(screen.getByTestId("tournament-participant-club-selector")).toBeInTheDocument();
  });
}

export function searchTournamentExternalClubSelector(query: string) {
  fireEvent.change(screen.getByTestId("tournament-participant-club-selector-search"), {
    target: { value: query },
  });
}

export async function addOwnTeamParticipantViaSelector(teamId = "team-1") {
  fireEvent.click(screen.getByTestId("tournament-own-team-add"));
  await waitFor(() => {
    expect(screen.getByTestId("tournament-participant-team-selector")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId(`sce-team-row-${teamId}`));
}
