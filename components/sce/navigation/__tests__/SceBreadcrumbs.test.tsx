/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SceBreadcrumbs } from "../SceBreadcrumbs";

describe("SceBreadcrumbs", () => {
  it("exposes accessible nav and current page", () => {
    render(
      <SceBreadcrumbs
        items={[
          { label: "Teams", href: "/dashboard/teams" },
          { label: "Junioren F2", href: "/dashboard/teams/t1" },
          { label: "Programm" },
        ]}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Brotkrumen" })).toBeTruthy();
    const currentMarkers = screen
      .getAllByText("Programm")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(currentMarkers.length).toBeGreaterThan(0);
  });

  it("renders mobile parent back link when parent has href", () => {
    render(
      <SceBreadcrumbs
        items={[
          { label: "Personen", href: "/dashboard/persons" },
          { label: "Max Muster" },
        ]}
      />,
    );

    const links = screen.getAllByRole("link", { name: /Personen/i });
    expect(links.some((el) => el.getAttribute("href") === "/dashboard/persons")).toBe(
      true,
    );
  });
});
