/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceCompletionProgressInline from "../SceCompletionProgressInline";

describe("SceCompletionProgressInline", () => {
  it("renders PO-style inline caption for two of three", () => {
    render(
      <SceCompletionProgressInline
        metricLabel="Aufgabenfortschritt"
        completedCount={2}
        totalCount={3}
        countCaption={null}
        emptyLabel="Noch keine Aufgaben"
      />,
    );
    expect(screen.getByText("66% – 2 von 3 erledigt")).toBeTruthy();
    expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
  });
});