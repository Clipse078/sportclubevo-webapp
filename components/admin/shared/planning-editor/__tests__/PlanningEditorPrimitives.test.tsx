/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningEditorHeader from "../PlanningEditorHeader";
import PlanningEditorSection from "../PlanningEditorSection";
import PlanningEditorProgressiveChangeButton from "../PlanningEditorProgressiveChangeButton";

describe("PlanningEditor primitives", () => {
  it("PlanningEditorHeader renders one h1 and back navigation", () => {
    render(
      <PlanningEditorHeader
        backHref="/dashboard/training"
        backLabel="Trainings"
        title="Junioren F2 · Mo 12.05."
        scheduleContext="18:00–19:30"
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Junioren F2");
    expect(screen.getByTestId("planning-editor-back-link")).toHaveAttribute(
      "href",
      "/dashboard/training",
    );
  });

  it("PlanningEditorSection uses SCE surface without legacy white cards", () => {
    render(
      <PlanningEditorSection testId="demo-section">
        <p>Body</p>
      </PlanningEditorSection>,
    );

    const section = screen.getByTestId("demo-section");
    expect(section.className).toContain("bg-[var(--surface)]");
    expect(section.className).not.toMatch(/bg-white/);
  });

  it("PlanningEditorProgressiveChangeButton exposes aria-expanded for disclosure", () => {
    render(
      <PlanningEditorProgressiveChangeButton
        label="Ändern"
        onClick={() => undefined}
        ariaExpanded={false}
        ariaControls="picker-panel"
      />,
    );

    const button = screen.getByTestId("planning-editor-progressive-change");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "picker-panel");
    expect(button.className).toContain("fca-button-secondary");
  });
});
