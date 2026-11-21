/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StrategyProgressIndicator from "../StrategyProgressIndicator";

describe("StrategyProgressIndicator", () => {
  it("shows reason text when percent is null", () => {
    render(
      <StrategyProgressIndicator
        label="Zielerreichung"
        percent={null}
        unknownReason="Keine Kennzahlen — Zielerreichung nicht berechenbar."
      />,
    );
    expect(screen.getByText("Keine Kennzahlen — Zielerreichung nicht berechenbar.")).toBeTruthy();
  });

  it("compact variant keeps bar and percent on one line", () => {
    const { container } = render(
      <StrategyProgressIndicator
        variant="compact"
        label="Aufgabenfortschritt"
        percent={50}
        unknownReason={null}
        countCaption="1 von 2 Aufgaben erledigt"
      />,
    );
    expect(screen.getAllByText(/50% – 1 von 2 erledigt/).length).toBeGreaterThan(0);
    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelector(".sr-only")?.textContent).toContain("1 von 2");
    expect(container.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  it("compact variant shows a dash in the list when percent is null", () => {
    render(
      <StrategyProgressIndicator
        variant="compact"
        label="Zielerreichung"
        percent={null}
        unknownReason="Noch keine Ziele"
      />,
    );
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText("Noch keine Ziele", { selector: "p" })).toBeNull();
  });

  it("renders a bar when percent is known", () => {
    const { container } = render(
      <StrategyProgressIndicator
        label="Aufgabenfortschritt"
        percent={50}
        unknownReason={null}
        countCaption="1 von 2 Aufgaben erledigt"
      />,
    );
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("1 von 2 Aufgaben erledigt")).toBeTruthy();
    expect(container.querySelector('[role="progressbar"]')).toBeTruthy();
    expect(container.querySelector('[style*="width: 50%"]')).toBeTruthy();
  });
});