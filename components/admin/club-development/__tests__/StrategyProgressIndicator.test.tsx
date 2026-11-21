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