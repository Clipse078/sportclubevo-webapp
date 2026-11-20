/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClubStrategyOrgUnitScopePicker from "../ClubStrategyOrgUnitScopePicker";
import {
  CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE,
  CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN,
  defaultClubStrategyOrgScopeSelection,
  selectGesamtvereinScope,
} from "@/lib/club-development/club-strategy-org-scope";

vi.mock("@/components/admin/aufgaben/TaskOrgUnitMultiPicker", () => ({
  default: ({
    selectedIds,
    onSelectedIdsChange,
  }: {
    selectedIds: string[];
    onSelectedIdsChange: (ids: string[]) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="mock-add-org-unit-a"
        onClick={() => onSelectedIdsChange([...selectedIds, "org-a"])}
      >
        Mock add A
      </button>
      <button
        type="button"
        data-testid="mock-add-org-unit-b"
        onClick={() => onSelectedIdsChange([...selectedIds, "org-b"])}
      >
        Mock add B
      </button>
    </div>
  ),
}));

describe("ClubStrategyOrgUnitScopePicker", () => {
  const options = [
    { id: "org-a", label: "Junioren A", parentId: null, level: 1 },
    { id: "org-b", label: "Junioren B", parentId: null, level: 1 },
  ];

  it("shows default Gesamtverein chip with remove control", () => {
    render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={defaultClubStrategyOrgScopeSelection()}
        onSelectedScopeChange={() => {}}
      />,
    );
    expect(screen.getByTestId("club-strategy-scope-gesamtverein-chip")).toHaveTextContent("Gesamtverein");
    expect(screen.getByTestId("club-strategy-scope-gesamtverein-remove")).toBeInTheDocument();
  });

  it("removes Gesamtverein without auto-reselect", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={defaultClubStrategyOrgScopeSelection()}
        onSelectedScopeChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("club-strategy-scope-gesamtverein-remove"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("replaces Gesamtverein when adding a specific unit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={defaultClubStrategyOrgScopeSelection()}
        onSelectedScopeChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("mock-add-org-unit-a"));
    expect(onChange).toHaveBeenCalledWith(["org-a"]);
  });

  it("supports two units and removes the last chip", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={["org-a", "org-b"]}
        onSelectedScopeChange={onChange}
      />,
    );
    expect(screen.queryByTestId("club-strategy-scope-gesamtverein-chip")).toBeNull();
    expect(screen.getByTestId("club-strategy-scope-gesamtverein-add")).toBeInTheDocument();

    await user.click(screen.getByTestId("club-strategy-org-unit-remove-org-b"));
    expect(onChange).toHaveBeenCalledWith(["org-a"]);

    rerender(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={["org-a"]}
        onSelectedScopeChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("club-strategy-org-unit-remove-org-a"));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("reselects Gesamtverein and replaces unit selections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={["org-a", "org-b"]}
        onSelectedScopeChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("club-strategy-scope-gesamtverein-add"));
    expect(onChange).toHaveBeenCalledWith(selectGesamtvereinScope());
  });

  it("shows required hint when requested", () => {
    render(
      <ClubStrategyOrgUnitScopePicker
        options={options}
        selectedScope={[]}
        onSelectedScopeChange={() => {}}
        showRequiredHint
      />,
    );
    expect(screen.getByTestId("club-strategy-org-scope-required")).toHaveTextContent(
      CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE,
    );
  });

  it("ignores gesamtverein token in unit list when parsing payload", () => {
    expect(CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN).toBe("__gesamtverein__");
  });
});