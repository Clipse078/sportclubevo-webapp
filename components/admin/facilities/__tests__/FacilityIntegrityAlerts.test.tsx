/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FacilityIntegrityAlerts } from "../FacilityIntegrityAlerts";

describe("FacilityIntegrityAlerts", () => {
  it("renders nothing when there are no findings", () => {
    const { container } = render(<FacilityIntegrityAlerts findings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows legacy/canonical main pitch warning", () => {
    render(
      <FacilityIntegrityAlerts
        findings={[
          {
            code: "LEGACY_CANONICAL_MAIN_PITCH_PAIR",
            severity: "warning",
            title: "Hauptfeld und Hauptplatz parallel aktiv",
            detail: "Migration erforderlich.",
            facilityIds: ["a", "b"],
            resourceCodes: ["HAUPTFELD", "STADION"],
          },
        ]}
      />,
    );
    expect(screen.getByTestId("facility-integrity-alerts")).toBeInTheDocument();
    expect(screen.getByText(/Hauptfeld und Hauptplatz parallel aktiv/)).toBeInTheDocument();
  });
});
