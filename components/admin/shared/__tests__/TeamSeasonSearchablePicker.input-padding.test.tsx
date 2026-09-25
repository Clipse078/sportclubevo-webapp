/**
 * @vitest-environment jsdom
 *
 * PLANNING-UX-07R7B — Team / Saison combobox must use shared icon-leading padding.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TeamSeasonSearchablePicker from "@/components/admin/shared/TeamSeasonSearchablePicker";

const OPTIONS = [
  {
    id: "ts-1",
    teamId: "team-1",
    teamName: "Seniorinnen",
    seasonName: "2025/2026",
    category: "FRAUEN",
  },
];

describe("TeamSeasonSearchablePicker input padding", () => {
  it("uses shared search/combobox padding classes so leading icons cannot overlap placeholder text", () => {
    render(
      <TeamSeasonSearchablePicker options={OPTIONS} value="" onChange={() => {}} testId="team-season-picker" />,
    );

    const input = screen.getByTestId("team-season-picker-search");
    expect(input.className).toContain("fca-search-input");
    expect(input.className).toContain("fca-combobox-input");
    expect(input.className).not.toContain("pl-8");
  });
});
