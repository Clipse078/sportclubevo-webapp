/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
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

const sampleTree: FinanceStructureTreeNode[] = [
  {
    type: "group",
    id: "g1",
    name: "Income",
    parentId: null,
    sortOrder: 0,
    lifecycle: "ACTIVE",
    children: [
      {
        type: "account",
        id: "a1",
        name: "Membership",
        reportingGroupId: "g1",
        sortOrder: 0,
        lifecycle: "ACTIVE",
        canonicalSemantic: "INCOME",
      },
    ],
  },
];

function renderPanel(
  props: Partial<{
    tree: FinanceStructureTreeNode[];
    isEmpty: boolean;
    canMutate: boolean;
    groupOptions: { id: string; name: string; depth: number }[];
  }> = {},
) {
  const tree = props.tree ?? sampleTree;
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <FinanceStructureBuilderPanel
        tree={tree}
        isEmpty={props.isEmpty ?? false}
        canMutate={props.canMutate ?? true}
        appliedTemplateKey={null}
        groupOptions={props.groupOptions ?? [{ id: "g1", name: "Income", depth: 0 }]}
      />
    </NextIntlClientProvider>,
  );
}

describe("FinanceStructureBuilderPanel UX (FIN-01C R3)", () => {
  it("uses overflow menus instead of permanent row text actions", () => {
    renderPanel();
    expect(screen.getAllByTestId("structure-row-actions").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  });

  it("exposes row menu actions including destructive delete inside overflow", async () => {
    const user = userEvent.setup();
    renderPanel();
    const triggers = screen.getAllByRole("button", { name: "More actions" });
    await user.click(triggers[0]!);
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
  });

  it("hides mutation menus for view-only users", () => {
    renderPanel({ canMutate: false });
    expect(screen.queryByTestId("structure-row-actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
  });

  it("create account dialog exposes persistent field labels", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Account" }));
    const dialog = await screen.findByRole("dialog", { name: "Create account" });
    expect(within(dialog).getByLabelText(/^Name/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Reporting group/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Account type/)).toBeTruthy();
  });

  it("create reporting group dialog exposes persistent field labels", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Reporting group" }));
    const dialog = await screen.findByRole("dialog", { name: "Create reporting group" });
    expect(within(dialog).getByLabelText(/^Name/)).toBeTruthy();
    expect(within(dialog).getByLabelText("Parent group")).toBeTruthy();
  });

  it("empty group nudge remains without permanent add buttons on the row", () => {
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
    renderPanel({ tree, groupOptions: [{ id: "g1", name: "Income", depth: 0 }] });
    expect(screen.getByTestId("empty-reporting-group-nudge")).toBeTruthy();
    const nudge = screen.getByTestId("empty-reporting-group-nudge");
    expect(within(nudge).queryByRole("button")).toBeNull();
  });

  it("shows create toolbar with compact add affordances", () => {
    renderPanel();
    expect(screen.getByTestId("structure-create-toolbar")).toBeTruthy();
  });
});
