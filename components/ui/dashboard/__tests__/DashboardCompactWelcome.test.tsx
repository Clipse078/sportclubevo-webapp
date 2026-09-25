/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardCompactWelcome } from "../DashboardCompactWelcome";

describe("DashboardCompactWelcome", () => {
  it("does not append a trailing exclamation mark after the highlighted name", () => {
    render(
      <DashboardCompactWelcome greeting="Guten Tag, Michael" highlightName="Michael" />,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Guten Tag, Michael");
  });
});
