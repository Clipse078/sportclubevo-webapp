/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClubEventOrganisationalAudienceEditor from "../ClubEventOrganisationalAudienceEditor";
import { emptyClubEventOrganisationalAudienceDto } from "@/lib/events/club-event-organisational-audience-types";

vi.mock("@/components/sce/list-selector/SceChipMultiSelectorField", () => ({
  SceChipMultiSelectorField: () => <div data-testid="mock-chip-multi-selector" />,
}));

describe("ClubEventOrganisationalAudienceEditor", () => {
  it("uses segmented scope control and hides target selector for CLUB_WIDE", () => {
    const onChange = vi.fn();
    render(
      <ClubEventOrganisationalAudienceEditor
        initial={emptyClubEventOrganisationalAudienceDto()}
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId("club-event-organisational-audience-scope")).toBeTruthy();
    expect(screen.queryByTestId("club-event-organisational-audience-targets")).toBeNull();

    fireEvent.click(
      screen.getByTestId("club-event-organisational-audience-scope-option-SELECTED_ORG_UNITS"),
    );
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByTestId("mock-chip-multi-selector")).toBeTruthy();
  });
});
