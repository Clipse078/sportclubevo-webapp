/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FacilityResourceSearchableSelector } from "@/components/admin/shared/FacilityResourceSearchableSelector";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

const GROUPS: FacilityGroup[] = [
  {
    facilityId: "f1",
    facilityName: "Sportanlage",
    resources: [
      {
        id: "res-1",
        name: "Kunstrasen 2",
        code: "K2",
        type: "FULL_PITCH",
        facilityId: "f1",
        facilityName: "Sportanlage",
      },
    ],
  },
];

describe("FacilityResourceSearchableSelector input padding", () => {
  it("uses shared fca-search-input padding so the leading icon cannot overlap placeholder text", () => {
    render(
      <FacilityResourceSearchableSelector
        facilityGroups={GROUPS}
        allocatedResourceIds={new Set()}
        onAdd={async () => {}}
        testId="facility-resource"
        placeholder="Spiel­feld / Halle auswählen…"
      />,
    );

    const input = screen.getByTestId("facility-resource-select");
    expect(input.className).toContain("fca-input");
    expect(input.className).toContain("fca-search-input");
    expect(input.className).not.toMatch(/\bpl-8\b/);
  });
});
