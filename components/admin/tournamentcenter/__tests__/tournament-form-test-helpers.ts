import { fireEvent, screen } from "@testing-library/react";
import { SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES } from "@/lib/operational/defaults";

/** Props for tournament create/edit tests — duration is configurable, not UI-hardcoded to a club. */
export const TOURNAMENT_FORM_TEST_SCHEDULE_PROPS = {
  defaultTournamentDurationMinutes: SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
  canManageFacilitiesTimeStandards: false,
} as const;

export const TOURNAMENT_CREATE_FORM_TEST_BASE_PROPS = {
  pitchHallFacilityGroups: [] as { facilityId: string; facilityName: string; facilityType: string; resources: never[] }[],
  dressingRoomFacilityGroups: [] as { facilityId: string; facilityName: string; facilityType: string; resources: never[] }[],
  ...TOURNAMENT_FORM_TEST_SCHEDULE_PROPS,
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
