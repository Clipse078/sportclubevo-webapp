// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SceUnsavedChangesDialog } from "@/components/sce/composer/SceUnsavedChangesDialog";

describe("SceUnsavedChangesDialog — SCE-CD-02R6", () => {
  it("renders DS 2.0 copy and two actions only", () => {
    render(
      <SceUnsavedChangesDialog open onContinueEditing={vi.fn()} onDiscard={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "Ungespeicherte Änderungen" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Deine Änderungen wurden noch nicht gespeichert. Möchtest du die Seite wirklich verlassen?",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sce-unsaved-continue")).toHaveTextContent("Weiter bearbeiten");
    expect(screen.getByTestId("sce-unsaved-discard")).toHaveTextContent("Änderungen verwerfen");
    expect(screen.queryByTestId("sce-unsaved-cancel")).not.toBeInTheDocument();
  });

  it("invokes callbacks for continue and discard", () => {
    const onContinue = vi.fn();
    const onDiscard = vi.fn();
    render(
      <SceUnsavedChangesDialog open onContinueEditing={onContinue} onDiscard={onDiscard} />,
    );
    fireEvent.click(screen.getByTestId("sce-unsaved-continue"));
    fireEvent.click(screen.getByTestId("sce-unsaved-discard"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
