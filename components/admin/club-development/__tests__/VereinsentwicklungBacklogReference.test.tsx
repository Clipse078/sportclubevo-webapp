/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
import { render, screen } from "@testing-library/react";
import VereinsentwicklungBacklogReferenceCell from "../VereinsentwicklungBacklogReferenceCell";
import VereinsentwicklungConnectedTaskTable from "../VereinsentwicklungConnectedTaskTable";
import type { VereinsentwicklungConnectedTaskTableRowModel } from "@/lib/club-development/vereinsentwicklung-connected-task-table";

const baseRow: VereinsentwicklungConnectedTaskTableRowModel = {
  taskId: "task-1",
  publicReference: "SCE-001051",
  title: "Very long task title that should stay on one line in the backlog grid without wrapping",
  taskHref: "/dashboard/aufgaben/task-1",
  targetId: "t1",
  targetTitle: "Ziel",
  targetHref: "/vereinsleitung/targets/t1",
  strategyId: null,
  strategyTitle: null,
  strategyHref: null,
  orgUnitLabel: null,
  status: "IN_PROGRESS",
  statusLabel: "In Arbeit",
  assignees: [{ userId: "u1", displayName: "Alex", imageUrl: null }],
  progressHasChildRollup: true,
  progressCompletedCount: 2,
  progressTotalCount: 3,
};

describe("Vereinsentwicklung backlog reference column", () => {
  it("renders tabular SCE reference without truncation", () => {
    render(<VereinsentwicklungBacklogReferenceCell reference="SCE-001042" testId="ref-cell" />);
    const cell = screen.getByTestId("ref-cell");
    expect(cell.textContent).toBe("SCE-001042");
    expect(cell.className).toContain("whitespace-nowrap");
    expect(cell.className).not.toContain("truncate");
  });

  it("fits seven-digit SCE references without ellipsis", () => {
    render(<VereinsentwicklungBacklogReferenceCell reference="SCE-1000000" testId="ref-long" />);
    expect(screen.getByTestId("ref-long").textContent).toBe("SCE-1000000");
  });

  it("shows Referenz column before Titel with progress on the same row", () => {
    render(
      <VereinsentwicklungConnectedTaskTable
        layoutVariant="full"
        rows={[baseRow]}
        showRowProgress
        testId="task-table"
      />,
    );
    expect(screen.getByText("Referenz")).toBeTruthy();
    expect(screen.getByText("SCE-001051")).toBeTruthy();
    expect(screen.getByText("66% – 2 von 3 erledigt")).toBeTruthy();
    expect(screen.getByText("In Arbeit")).toBeTruthy();
  });
});