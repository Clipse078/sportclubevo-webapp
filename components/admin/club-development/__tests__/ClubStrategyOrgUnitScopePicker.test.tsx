/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClubStrategyOrgUnitScopePicker from "../ClubStrategyOrgUnitScopePicker";

vi.mock("@/components/admin/aufgaben/TaskOrgUnitMultiPicker", () => ({
  default: ({
    selectedIds,
    onSelectedIdsChange,
  }: {
    selectedIds: string[];
    onSelectedIdsChange: (ids: string[]) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-add-org-unit"
      onClick={() => onSelectedIdsChange([...selectedIds, "org-junioren"])}
    >
      Mock add unit
    </button>
  ),
}));

describe("ClubStrategyOrgUnitScopePicker", () => {
  const options = [{ id: "org-junioren", label: "Junioren", parentId: null, level: 1 }];

  it("defaults to Gesamtverein (no org unit ids)", () => {
    render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedOrgUnitIds={[]}
        onSelectedOrgUnitIdsChange={() => {}}
      />,
    );
    const gesamtverein = screen.getByTestId("club-strategy-scope-gesamtverein");
    expect(gesamtverein).toHaveAttribute("aria-pressed", "true");
    expect(gesamtverein).toHaveTextContent("Gesamtverein");
  });

  it("clears specific units when Gesamtverein is chosen", async () => {
    const user = userEvent.setup();
    let selected = ["org-junioren"];
    const onChange = vi.fn((ids: string[]) => {
      selected = ids;
    });

    const { rerender } = render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedOrgUnitIds={selected}
        onSelectedOrgUnitIdsChange={onChange}
      />,
    );

    expect(screen.getByTestId("club-strategy-scope-gesamtverein")).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByTestId("club-strategy-scope-gesamtverein"));
    expect(onChange).toHaveBeenCalledWith([]);

    rerender(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedOrgUnitIds={[]}
        onSelectedOrgUnitIdsChange={onChange}
      />,
    );
    expect(screen.getByTestId("club-strategy-scope-gesamtverein")).toHaveAttribute("aria-pressed", "true");
  });

  it("replaces Gesamtverein when a specific unit is added", async () => {
    const user = userEvent.setup();
    let selected: string[] = [];
    const onChange = vi.fn((ids: string[]) => {
      selected = ids;
    });

    const { rerender } = render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedOrgUnitIds={selected}
        onSelectedOrgUnitIdsChange={onChange}
      />,
    );

    await user.click(screen.getByTestId("mock-add-org-unit"));
    expect(onChange).toHaveBeenCalledWith(["org-junioren"]);

    rerender(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedOrgUnitIds={["org-junioren"]}
        onSelectedOrgUnitIdsChange={onChange}
      />,
    );
    expect(screen.getByTestId("club-strategy-scope-gesamtverein")).toHaveAttribute("aria-pressed", "false");
  });
});