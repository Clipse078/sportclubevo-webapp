/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import { FinanceStructureBuilderPanel } from "@/components/admin/finance/FinanceStructureBuilderPanel";
import type { FinanceStructureTreeNode } from "@/lib/finance/structure/build-structure-tree";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/finance/structure/actions", () => ({
  applyStructureTemplateAction: vi.fn(),
  archiveFinancialAccountAction: vi.fn(),
  archiveReportingGroupAction: vi.fn(),
  createFinancialAccountAction: vi.fn(),
  createReportingGroupAction: vi.fn(),
  deleteFinancialAccountAction: vi.fn(),
  deleteReportingGroupAction: vi.fn(),
  moveFinancialAccountAction: vi.fn(),
  renameFinancialAccountAction: vi.fn(),
  renameReportingGroupAction: vi.fn(),
  reactivateFinancialAccountAction: vi.fn(),
  reactivateReportingGroupAction: vi.fn(),
  reorderFinancialAccountAction: vi.fn(),
  reorderReportingGroupAction: vi.fn(),
  reparentReportingGroupAction: vi.fn(),
}));

function renderPanel(props: {
  tree?: FinanceStructureTreeNode[];
  isEmpty?: boolean;
  canMutate?: boolean;
  appliedTemplateKey?: string | null;
  groupOptions?: { id: string; name: string; depth: number }[];
}) {
  const tree = props.tree ?? [];
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <FinanceStructureBuilderPanel
        tree={tree}
        isEmpty={props.isEmpty ?? tree.length === 0}
        canMutate={props.canMutate ?? true}
        appliedTemplateKey={props.appliedTemplateKey ?? null}
        groupOptions={props.groupOptions ?? []}
      />
    </NextIntlClientProvider>,
  );
}

describe("FinanceStructureBuilderPanel nudging", () => {
  it("shows empty-state guidance with recommended template path", () => {
    renderPanel({ isEmpty: true, canMutate: true });
    expect(screen.getByTestId("structure-empty-state")).toBeTruthy();
    expect(screen.getByText("Recommended")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Preview starter template" })).toBeTruthy();
    expect(screen.getByText("Or build manually")).toBeTruthy();
  });

  it("shows view-only hint without mutation affordances", () => {
    renderPanel({ isEmpty: true, canMutate: false });
    expect(screen.getByTestId("structure-view-only-hint")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create first reporting group" })).toBeNull();
  });

  it("shows post-template next-step cue when structure exists", () => {
    const tree: FinanceStructureTreeNode[] = [
      {
        type: "group",
        id: "g1",
        name: "Income",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        children: [],
      },
    ];
    renderPanel({
      tree,
      isEmpty: false,
      canMutate: true,
      appliedTemplateKey: "generic_income_expense_v1",
      groupOptions: [{ id: "g1", name: "Income", depth: 0 }],
    });
    expect(screen.getByTestId("template-applied-nudge")).toBeTruthy();
  });

  it("shows empty-group hint for groups without children", () => {
    const tree: FinanceStructureTreeNode[] = [
      {
        type: "group",
        id: "g1",
        name: "Income",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        children: [],
      },
    ];
    renderPanel({
      tree,
      isEmpty: false,
      groupOptions: [{ id: "g1", name: "Income", depth: 0 }],
    });
    expect(screen.getByTestId("empty-reporting-group-nudge")).toBeTruthy();
    expect(screen.getByText("This group is empty.")).toBeTruthy();
  });

  it("explains template customization before apply in preview dialog", async () => {
    const user = userEvent.setup();
    renderPanel({ isEmpty: true, canMutate: true });
    await user.click(screen.getByRole("button", { name: "Preview starter template" }));
    expect(screen.getByTestId("template-apply-customize-note")).toBeTruthy();
  });
});
