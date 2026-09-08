/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardVenueMetadata } from "@/components/ui/dashboard/DashboardVenueMetadata";

describe("DashboardVenueMetadata", () => {
  it("renders semantic venue groups with readable labels", () => {
    const { container } = render(
      <DashboardVenueMetadata
        groups={[
          { kind: "location", label: "Im Brüel, Allschwil" },
          { kind: "pitch", label: "Kunstrasen 2" },
          { kind: "dressing-rooms", label: "O1 · E4" },
        ]}
      />,
    );

    expect(screen.getByText("Im Brüel, Allschwil")).toBeInTheDocument();
    expect(screen.getByText("Kunstrasen 2")).toBeInTheDocument();
    expect(screen.getByText("O1 · E4")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });

  it("applies semantic accent containers for pitch and dressing rooms", () => {
    const { container } = render(
      <DashboardVenueMetadata
        groups={[
          { kind: "pitch", label: "Kunstrasen 2" },
          { kind: "dressing-rooms", label: "O1 · E4" },
        ]}
      />,
    );

    expect(container.innerHTML).toContain("var(--sce-success-light)");
    expect(container.innerHTML).toContain("var(--sce-info-light)");
  });

  it("returns null when no groups are provided", () => {
    const { container } = render(<DashboardVenueMetadata groups={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
