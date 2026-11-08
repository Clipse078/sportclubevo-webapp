/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceTeamName } from "../SceTeamName";

describe("SceTeamName", () => {
  it("renders original team string in the DOM", () => {
    render(<SceTeamName data-testid="team">Junioren F2</SceTeamName>);
    expect(screen.getByTestId("team")).toHaveTextContent("Junioren F2");
    expect(screen.getByTestId("team").textContent).toBe("Junioren F2");
  });

  it("applies presentation classes", () => {
    render(<SceTeamName data-testid="team">FC Allschwil</SceTeamName>);
    const el = screen.getByTestId("team");
    expect(el.className).toContain("sce-team-name");
    expect(el.getAttribute("data-sce-team-name")).toBe("");
  });

  it("sets title when truncating", () => {
    render(
      <SceTeamName data-testid="team" truncate lineClamp={1}>
        FC Allschwil Senioren 50+
      </SceTeamName>,
    );
    expect(screen.getByTestId("team")).toHaveAttribute(
      "title",
      "FC Allschwil Senioren 50+",
    );
  });
});
