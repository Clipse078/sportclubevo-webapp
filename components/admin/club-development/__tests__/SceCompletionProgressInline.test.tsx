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

  it("keeps caption visible when captionPriority is set", () => {
    render(
      <SceCompletionProgressInline
        metricLabel="Aufgabenfortschritt"
        completedCount={2}
        totalCount={2}
        countCaption={null}
        emptyLabel="Noch keine Aufgaben"
        showUnitShortLabel={false}
        captionPriority
      />,
    );
    const caption = screen.getByText("100% – 2 von 2 erledigt");
    expect(caption.className).toContain("whitespace-nowrap");
    expect(screen.queryByText("Aufgaben")).toBeNull();
  });
});