/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FacilityResourceIdentity,
  resolveFacilityResourceVisualKind,
  SoccerPitchLineIcon,
} from "../FacilityResourceIdentity";

describe("resolveFacilityResourceVisualKind", () => {
  it("maps pitch resources and indoor halls", () => {
    expect(resolveFacilityResourceVisualKind("FULL_PITCH", "PITCH")).toBe("pitch");
    expect(resolveFacilityResourceVisualKind("HALF_PITCH", "PITCH")).toBe("pitch");
    expect(resolveFacilityResourceVisualKind("FULL_PITCH", "INDOOR_HALL")).toBe("hall");
    expect(resolveFacilityResourceVisualKind("DRESSING_ROOM")).toBe("dressing_room");
  });
});

describe("FacilityResourceIdentity", () => {
  it("renders name, subtitle, and availability", () => {
    render(
      <FacilityResourceIdentity
        name="Kunstrasen 2"
        resourceType="FULL_PITCH"
        facilityType="PITCH"
        subtitle="Spielfeld"
        availability="FREE"
      />,
    );
    expect(screen.getByText("Kunstrasen 2")).toBeInTheDocument();
    expect(screen.getByText("Frei")).toBeInTheDocument();
  });

  it("exposes accessible pitch icon title when provided", () => {
    render(<SoccerPitchLineIcon title="Spielfeld" />);
    expect(screen.getByTitle("Spielfeld")).toBeInTheDocument();
  });
});
