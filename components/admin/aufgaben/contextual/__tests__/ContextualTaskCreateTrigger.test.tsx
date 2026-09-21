/**
 * @vitest-environment jsdom
 * AUFGABEN-06F1-A2 — trigger variant parity (§18).
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ContextualTaskCreateTrigger from "../ContextualTaskCreateTrigger";

vi.mock("../ContextualTaskCreateDialog", () => ({
  default: () => <div data-testid="contextual-task-create-dialog">dialog</div>,
}));

const dialogProps = {
  contextType: "MATCH" as const,
  contextId: "match-1",
  presentation: null,
  assigneeOptions: [],
  orgUnitOptions: [],
  timeZone: "Europe/Zurich",
  tenantWideVisibility: false,
};

describe("ContextualTaskCreateTrigger variants", () => {
  it("button variant renders shared trigger test id", () => {
    render(<ContextualTaskCreateTrigger variant="button" {...dialogProps} label="Btn" />);
    fireEvent.click(screen.getByTestId("contextual-task-create-trigger"));
    expect(screen.getByTestId("contextual-task-create-dialog")).toBeInTheDocument();
  });

  it("menuItem variant renders shared trigger test id", () => {
    render(<ContextualTaskCreateTrigger variant="menuItem" {...dialogProps} label="Menu" />);
    expect(screen.getByTestId("contextual-task-create-trigger")).toBeInTheDocument();
  });

  it("icon variant renders shared trigger test id", () => {
    render(<ContextualTaskCreateTrigger variant="icon" {...dialogProps} />);
    expect(screen.getByTestId("contextual-task-create-trigger")).toBeInTheDocument();
  });

  it("toolbar variant renders shared trigger test id", () => {
    render(<ContextualTaskCreateTrigger variant="toolbar" {...dialogProps} label="Tool" />);
    expect(screen.getByTestId("contextual-task-create-trigger")).toBeInTheDocument();
  });
});
