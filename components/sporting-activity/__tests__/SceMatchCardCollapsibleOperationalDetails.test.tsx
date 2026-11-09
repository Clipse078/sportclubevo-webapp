/**
 * SCE-DS2-04R3 — collapsible match operational details
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  SceMatchCardCollapsibleOperationalDetails,
  SceMatchCardReadinessToggle,
} from "@/components/sporting-activity/SceMatchCardCollapsibleOperationalDetails";
import { sceMatchCardOperationalDetailsPanelId } from "@/lib/sporting-activity-presentation/canonical";

describe("SCE-DS2-04R3 — SceMatchCardCollapsibleOperationalDetails", () => {
  const panelId = sceMatchCardOperationalDetailsPanelId("match-1");

  function renderCollapsible(overrides: { details?: ReactNode } = {}) {
  return render(
    <SceMatchCardCollapsibleOperationalDetails
      matchId="match-1"
      panelId={panelId}
      summary={<div data-testid="fixture-summary">Fixture row</div>}
      summaryControl={({ expanded, toggle, panelId: controlsPanelId }) => (
        <SceMatchCardReadinessToggle
          panelId={controlsPanelId}
          expanded={expanded}
          onToggle={toggle}
          testId="readiness-toggle"
        >
          <span>3 Punkte offen</span>
        </SceMatchCardReadinessToggle>
      )}
      details={overrides.details ?? <div data-testid="prep-details">Checklist content</div>}
    />,
  );
  }

  it("keeps preparation details closed by default even when readiness shows open points", () => {
    renderCollapsible();
    expect(screen.getByTestId("fixture-summary")).toBeInTheDocument();
    expect(screen.getByText("3 Punkte offen")).toBeInTheDocument();
    expect(screen.queryByTestId("prep-details")).not.toBeInTheDocument();
    const panel = screen.getByTestId("sce-match-collapsible-operational-details-panel");
    expect(panel).toHaveAttribute("hidden");
  });

  it("reveals details after chevron activation and toggles aria-expanded", async () => {
    const user = userEvent.setup();
    renderCollapsible();

    const toggle = screen.getByTestId("sce-match-collapsible-operational-details-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", panelId);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("prep-details")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("prep-details")).not.toBeInTheDocument();
  });

  it("opens details from readiness control and supports keyboard activation", async () => {
    const user = userEvent.setup();
    renderCollapsible();

    const readiness = screen.getByTestId("readiness-toggle");
    expect(readiness).toHaveAttribute("aria-expanded", "false");
    readiness.focus();
    await user.keyboard("{Enter}");
    expect(readiness).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("prep-details")).toBeInTheDocument();
  });

  it("allows independent expansion per match card", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SceMatchCardCollapsibleOperationalDetails
          matchId="a"
          panelId={sceMatchCardOperationalDetailsPanelId("a")}
          summary={<span>A</span>}
          details={<div data-testid="details-a">A details</div>}
        />
        <SceMatchCardCollapsibleOperationalDetails
          matchId="b"
          panelId={sceMatchCardOperationalDetailsPanelId("b")}
          summary={<span>B</span>}
          details={<div data-testid="details-b">B details</div>}
        />
      </div>,
    );

    const toggles = screen.getAllByTestId("sce-match-collapsible-operational-details-toggle");
    await user.click(toggles[0]!);
    expect(screen.getByTestId("details-a")).toBeInTheDocument();
    expect(screen.queryByTestId("details-b")).not.toBeInTheDocument();
  });

  it("supports controlled expansion without persisting implicit state", () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <SceMatchCardCollapsibleOperationalDetails
        matchId="match-1"
        panelId={panelId}
        summary={<span>Fixture</span>}
        details={<div data-testid="prep-details">Checklist</div>}
        expanded={false}
        onExpandedChange={onExpandedChange}
      />,
    );
    expect(screen.queryByTestId("prep-details")).not.toBeInTheDocument();

    rerender(
      <SceMatchCardCollapsibleOperationalDetails
        matchId="match-1"
        panelId={panelId}
        summary={<span>Fixture</span>}
        details={<div data-testid="prep-details">Checklist</div>}
        expanded
        onExpandedChange={onExpandedChange}
      />,
    );
    expect(screen.getByTestId("prep-details")).toBeInTheDocument();
  });
});
