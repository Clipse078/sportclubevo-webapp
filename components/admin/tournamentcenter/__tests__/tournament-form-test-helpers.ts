import { fireEvent, screen } from "@testing-library/react";

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
