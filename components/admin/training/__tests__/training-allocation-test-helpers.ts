import { fireEvent, screen } from "@testing-library/react";

/** Select a resource in PlanningResourcePicker / CompactOperationalResourceSelector. */
export function pickOperationalResource(testIdPrefix: string, resourceId: string) {
  fireEvent.click(screen.getByTestId(`${testIdPrefix}-option-${resourceId}`));
}

export async function openSeriesPitchPicker() {
  fireEvent.click(screen.getByTestId("training-allocation-change-pitch-hall"));
}

export async function openSeriesDressingPicker() {
  fireEvent.click(screen.getByTestId("training-allocation-change-dressing-room"));
}
