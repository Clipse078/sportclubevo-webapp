/**
 * @vitest-environment jsdom
 * AUFGABEN-06F1-A2 — trigger variant parity (§18).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextualTaskCreateTrigger from "../ContextualTaskCreateTrigger";

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
  it("button variant links to full create page", () => {
    render(<ContextualTaskCreateTrigger variant="button" {...dialogProps} label="Btn" />);
    const el = screen.getByTestId("contextual-task-create-trigger");
    expect(el).toHaveAttribute("href", "/dashboard/aufgaben/neu?contextType=MATCH&contextId=match-1");
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
