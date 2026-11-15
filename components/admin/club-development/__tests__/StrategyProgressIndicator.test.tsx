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
      <StrategyProgressIndicator label="Umsetzungsfortschritt" percent={42} unknownReason={null} />,
    );
    expect(screen.getByText("42%")).toBeTruthy();
    expect(container.querySelector('[style*="width: 42%"]')).toBeTruthy();
  });
});