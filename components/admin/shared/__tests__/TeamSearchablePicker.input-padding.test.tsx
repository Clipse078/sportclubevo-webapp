/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TeamSearchablePicker from "@/components/admin/shared/TeamSearchablePicker";

describe("TeamSearchablePicker input padding", () => {
  it("uses shared search/combobox padding classes so leading icons cannot overlap placeholder text", () => {
    render(
      <TeamSearchablePicker
        options={[{ id: "t1", name: "Junioren F2", ageGroup: null, genderGroup: null }]}
        value=""
        onChange={() => {}}
        testId="team-picker"
      />,
    );

    const input = screen.getByTestId("team-picker-select");
    expect(input.className).toContain("fca-search-input");
    expect(input.className).toContain("fca-combobox-input");
    expect(input.className).not.toContain("pl-8");
  });
});
