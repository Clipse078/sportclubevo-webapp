/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceSemanticFeedback } from "../SceSemanticFeedback";
import { SceReadinessStatusPanel } from "../SceReadinessStatusPanel";
import { SceEmptyState } from "../SceEmptyState";
import { SceActionableError } from "../SceActionableError";
import { SceSkeleton } from "../SceSkeleton";

describe("Sce feedback primitives", () => {
  it("renders semantic feedback with alert role for errors", () => {
    render(
      <SceSemanticFeedback tone="ERROR" title="Fehler" description="Details" data-testid="fb" />,
    );
    const node = screen.getByTestId("fb");
    expect(node).toHaveAttribute("role", "alert");
    expect(screen.getByText("Fehler")).toBeInTheDocument();
  });

  it("renders readiness rows with screen-reader state labels", () => {
    render(
      <SceReadinessStatusPanel
        title="Bereitschaft"
        rows={[
          {
            id: "a",
            label: "Punkt A",
            tone: "SUCCESS",
            stateLabel: "Erfüllt",
          },
        ]}
        data-testid="ready"
      />,
    );
    expect(screen.getByTestId("ready")).toBeInTheDocument();
    expect(document.querySelector(".sr-only")?.textContent).toContain("Erfüllt");
  });

  it("tags empty state variants", () => {
    render(
      <SceEmptyState
        variant="FILTERED_NO_RESULTS"
        title="Keine Treffer"
        data-testid="empty"
      />,
    );
    expect(screen.getByTestId("empty")).toHaveAttribute(
      "data-sce-empty-state",
      "FILTERED_NO_RESULTS",
    );
    expect(screen.getByTestId("empty")).toHaveAttribute("data-sce-empty-contained", "no");
    expect(document.querySelector("[data-sce-empty-state-icon]")).toBeTruthy();
  });

  it("supports contained filtered no-results with reset action slot", () => {
    render(
      <SceEmptyState
        variant="FILTERED_NO_RESULTS"
        layout="compact-stacked"
        contained
        title="Keine Personen gefunden"
        primaryAction={<button type="button">Filter zurücksetzen</button>}
        data-testid="empty-contained"
      />,
    );
    expect(screen.getByTestId("empty-contained")).toHaveAttribute("data-sce-empty-contained", "yes");
    expect(screen.getByRole("button", { name: "Filter zurücksetzen" })).toBeInTheDocument();
  });

  it("supports retry on actionable errors", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <SceActionableError
        title="Laden fehlgeschlagen"
        description="Bitte erneut versuchen."
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("exposes skeleton recipe markers", () => {
    render(<SceSkeleton recipe="readiness-panel" data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveAttribute("data-sce-skeleton");
  });
});
