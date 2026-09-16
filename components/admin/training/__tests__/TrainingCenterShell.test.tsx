/**
 * @vitest-environment jsdom
 *
 * TRAINING-CENTER-UX-01 — shared TrainingCenter shell + width tokens.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrainingCenterShell from "@/components/admin/training/TrainingCenterShell";
import {
  TRAINING_CENTER_WORKSPACE_PLANNING_CLASS,
  TRAINING_CENTER_WORKSPACE_STANDARD_CLASS,
} from "@/lib/training/training-center-layout";

describe("TrainingCenterShell", () => {
  it("renders workspace tabs and standard width by default", () => {
    render(
      <TrainingCenterShell activeTab="kalender" canCreateSeries>
        <p>Body</p>
      </TrainingCenterShell>,
    );

    const shell = screen.getByTestId("training-center-shell");
    expect(shell.className).toContain(TRAINING_CENTER_WORKSPACE_STANDARD_CLASS.replace("mx-auto w-full ", ""));
    expect(screen.getByTestId("trainingcenter-tab-kalender")).toBeTruthy();
    expect(screen.getByTestId("training-center-new-series")).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("uses planning workspace width on Planungsraster", () => {
    render(
      <TrainingCenterShell activeTab="planungsraster" workspaceWidth="planning">
        <p>Grid</p>
      </TrainingCenterShell>,
    );

    const shell = screen.getByTestId("training-center-shell");
    expect(shell.getAttribute("data-workspace-width")).toBe("planning");
    expect(shell.className).toContain(
      TRAINING_CENTER_WORKSPACE_PLANNING_CLASS.replace("mx-auto w-full ", ""),
    );
  });

  it("editor variant omits top workspace tabs", () => {
    render(
      <TrainingCenterShell variant="editor" activeTab="serien" title="Bearbeiten">
        <p>Form</p>
      </TrainingCenterShell>,
    );

    expect(screen.queryByTestId("trainingcenter-tab-serien")).toBeNull();
    expect(screen.getByText("Bearbeiten")).toBeTruthy();
  });
});
