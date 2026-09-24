/**
 * @vitest-environment jsdom
 * PLANNING-UX-05R2 — compact operational resource selectors (no PitchVisual).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CompactDressingRoomResourceSelector,
  CompactPitchHallResourceSelector,
} from "../CompactOperationalResourceSelector";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

const pitchGroups: FacilityGroup[] = [
  {
    facilityId: "f1",
    facilityName: "Sportanlage",
    resources: [
      {
        id: "p1",
        name: "Kunstrasen 1",
        code: "K1",
        type: "FULL_PITCH",
        facilityId: "f1",
        facilityName: "Sportanlage",
      },
    ],
  },
];

const dressingGroups: FacilityGroup[] = [
  {
    facilityId: "f1",
    facilityName: "Sportanlage",
    resources: [
      {
        id: "d1",
        name: "Garderobe 1",
        code: "G1",
        type: "DRESSING_ROOM",
        facilityId: "f1",
        facilityName: "Sportanlage",
      },
    ],
  },
];

describe("CompactOperationalResourceSelector — PLANNING-UX-05R2", () => {
  it("does not render PitchVisual pitch diagrams", () => {
    render(
      <CompactPitchHallResourceSelector
        facilityGroups={pitchGroups}
        selectedResourceIds={new Set()}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        testId="compact-pitch"
      />,
    );
    expect(screen.queryByTestId("pitch-visual")).not.toBeInTheDocument();
    expect(screen.getByTestId("compact-pitch-grid")).toBeInTheDocument();
    expect(screen.getByText("Kunstrasen 1")).toBeInTheDocument();
  });

  it("selects and deselects a dressing room with semantic compact chips", () => {
    const onSelect = vi.fn();
    const onDeselect = vi.fn();
    const { rerender } = render(
      <CompactDressingRoomResourceSelector
        facilityGroups={dressingGroups}
        selectedResourceIds={new Set()}
        onSelect={onSelect}
        onDeselect={onDeselect}
        singleSelect
        testId="compact-dressing"
      />,
    );
    fireEvent.click(screen.getByTestId("compact-dressing-option-d1"));
    expect(onSelect).toHaveBeenCalledWith("d1");

    rerender(
      <CompactDressingRoomResourceSelector
        facilityGroups={dressingGroups}
        selectedResourceIds={new Set(["d1"])}
        onSelect={onSelect}
        onDeselect={onDeselect}
        singleSelect
        testId="compact-dressing"
      />,
    );
    fireEvent.click(screen.getByTestId("compact-dressing-option-d1"));
    expect(onDeselect).toHaveBeenCalledWith("d1");
  });

  it("splits aggregated free and occupied sections", () => {
    const availability = new Map([
      ["p1", { status: "OCCUPIED" as const, conflictLabel: "Training E1" }],
    ]);
    render(
      <CompactPitchHallResourceSelector
        facilityGroups={pitchGroups}
        selectedResourceIds={new Set()}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        availabilityByResourceId={availability}
        layout="aggregated"
        availableLabel="Frei"
        occupiedLabel="Belegt"
        testId="agg-pitch"
      />,
    );
    expect(screen.getByText("Belegt")).toBeInTheDocument();
    expect(screen.getByText(/Training E1/)).toBeInTheDocument();
  });
});
