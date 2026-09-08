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
          {
            kind: "dressing-rooms",
            label: "Heim O1 · Gast E4",
            ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
            dressingRooms: {
              semantics: "home-away",
              ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
              sides: [
                { roleLabel: "Heim", rooms: ["O1"] },
                { roleLabel: "Gast", rooms: ["E4"] },
              ],
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("Im Brüel, Allschwil")).toBeInTheDocument();
    expect(screen.getByText("Kunstrasen 2")).toBeInTheDocument();
    expect(screen.getByText("Heim")).toBeInTheDocument();
    expect(screen.getByText("O1")).toBeInTheDocument();
    expect(screen.getByText("Gast")).toBeInTheDocument();
    expect(screen.getByText("E4")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Heim Garderobe O1, Gast Garderobe E4"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });

  it("applies semantic accent containers for pitch and dressing rooms", () => {
    const { container } = render(
      <DashboardVenueMetadata
        groups={[
          { kind: "pitch", label: "Kunstrasen 2" },
          {
            kind: "dressing-rooms",
            label: "Heim O1 · Gast E4",
            ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
            dressingRooms: {
              semantics: "home-away",
              ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
              sides: [
                { roleLabel: "Heim", rooms: ["O1"] },
                { roleLabel: "Gast", rooms: ["E4"] },
              ],
            },
          },
        ]}
      />,
    );

    expect(container.innerHTML).toContain("var(--sce-success-light)");
    expect(container.innerHTML).toContain("var(--sce-info-light)");
  });

  it("renders multiple rooms on one side compactly", () => {
    render(
      <DashboardVenueMetadata
        groups={[
          {
            kind: "dressing-rooms",
            label: "Heim O1 / O3 · Gast E2 / E4",
            ariaLabel: "Heim Garderobe O1, O3, Gast Garderobe E2, E4",
            dressingRooms: {
              semantics: "home-away",
              ariaLabel: "Heim Garderobe O1, O3, Gast Garderobe E2, E4",
              sides: [
                { roleLabel: "Heim", rooms: ["O1", "O3"] },
                { roleLabel: "Gast", rooms: ["E2", "E4"] },
              ],
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("O1 / O3")).toBeInTheDocument();
    expect(screen.getByText("E2 / E4")).toBeInTheDocument();
  });

  it("returns null when no groups are provided", () => {
    const { container } = render(<DashboardVenueMetadata groups={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
