/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchAvailabilityStatusBadge, {
  MatchAvailabilityConflictBadge,
} from "../MatchAvailabilityStatusBadge";

describe("MatchAvailabilityStatusBadge", () => {
  it("always renders readable label text (not color-only)", () => {
    render(<MatchAvailabilityStatusBadge label="Verfügbar" tone="success" icon="check" />);
    expect(screen.getByText("Verfügbar")).toBeInTheDocument();
  });

  it("renders conflict chip with explicit copy", () => {
    render(<MatchAvailabilityConflictBadge testId="conflict-chip" />);
    expect(screen.getByTestId("conflict-chip")).toHaveTextContent("Aufgebot prüfen");
  });
});
