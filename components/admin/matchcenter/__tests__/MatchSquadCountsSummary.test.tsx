/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchSquadCountsSummary from "../MatchSquadCountsSummary";

describe("MatchSquadCountsSummary", () => {
  it("renders wrapped semantic chips that reconcile to roster total", () => {
    render(
      <MatchSquadCountsSummary
        counts={{
          rosterTotal: 6,
          available: 1,
          unavailable: 2,
          maybe: 1,
          open: 2,
          selected: 2,
          conflicts: 1,
        }}
      />,
    );

    expect(screen.getByTestId("match-squad-counts-summary")).toHaveClass("flex-wrap");
    expect(screen.getByText(/Kader 6/)).toBeInTheDocument();
    expect(screen.getByText(/Verfügbar 1/)).toBeInTheDocument();
    expect(screen.getByText(/Nicht verfügbar 2/)).toBeInTheDocument();
    expect(screen.getByText(/Unsicher 1/)).toBeInTheDocument();
    expect(screen.getByText(/Offen 2/)).toBeInTheDocument();
    expect(screen.getByText(/Zu prüfen 1/)).toBeInTheDocument();
  });
});
