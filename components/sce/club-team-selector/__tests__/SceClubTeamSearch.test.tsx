/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceClubTeamSearch } from "../SceClubTeamSearch";
import {
  SCE_CLUB_TEAM_SEARCH_INPUT_CLASS,
  SCE_CLUB_TEAM_SEARCH_INPUT_WITH_CLEAR_CLASS,
} from "@/lib/sce/club-team-selector/club-team-search-contract";

describe("SceClubTeamSearch", () => {
  it("renders leading icon slot and canonical search input padding", () => {
    render(<SceClubTeamSearch value="" onChange={() => {}} testId="club-search" />);
    expect(document.querySelector('[data-sce-search-leading-icon="true"]')).toBeTruthy();
    const input = screen.getByTestId("club-search");
    expect(input.className).toContain("fca-search-input");
    expect(SCE_CLUB_TEAM_SEARCH_INPUT_CLASS.split(" ").every((c) => input.className.includes(c))).toBe(
      true,
    );
  });

  it("uses trailing padding and clear control without colliding", () => {
    const onChange = vi.fn();
    render(<SceClubTeamSearch value="Basel" onChange={onChange} testId="club-search" />);
    const input = screen.getByTestId("club-search");
    expect(input.className).toContain("fca-combobox-input");
    expect(SCE_CLUB_TEAM_SEARCH_INPUT_WITH_CLEAR_CLASS.split(" ").every((c) => input.className.includes(c))).toBe(
      true,
    );
    fireEvent.click(screen.getByTestId("club-search-clear"));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
