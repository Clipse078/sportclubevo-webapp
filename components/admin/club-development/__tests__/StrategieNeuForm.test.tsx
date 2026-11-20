/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StrategieNeuForm from "../StrategieNeuForm";
import { CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE } from "@/lib/club-development/club-strategy-org-scope";

vi.mock("@/lib/club-development/client-fetch", () => ({
  clubDevelopmentFetchJson: vi.fn(),
}));

vi.mock("../ClubStrategyOrgUnitScopePicker", () => ({
  default: ({
    selectedScope,
    onSelectedScopeChange,
    showRequiredHint,
  }: {
    selectedScope: string[];
    onSelectedScopeChange: (s: string[]) => void;
    showRequiredHint?: boolean;
  }) => (
    <div>
      {showRequiredHint ? (
        <p data-testid="club-strategy-org-scope-required">{CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE}</p>
      ) : null}
      <button type="button" data-testid="mock-clear-scope" onClick={() => onSelectedScopeChange([])}>
        Clear scope
      </button>
      <span data-testid="mock-scope-length">{selectedScope.length}</span>
    </div>
  ),
}));

describe("StrategieNeuForm", () => {
  it("blocks submit with empty scope and keeps title", async () => {
    const user = userEvent.setup();
    const { clubDevelopmentFetchJson } = await import("@/lib/club-development/client-fetch");
    vi.mocked(clubDevelopmentFetchJson).mockClear();

    render(
      <StrategieNeuForm
        orgUnitOptions={[]}
        onCancel={() => {}}
        onSuccess={() => {}}
      />,
    );

    const titleInput = screen.getByTestId("strategie-create-title");
    await user.type(titleInput, "Meine Strategie");
    await user.click(screen.getByTestId("mock-clear-scope"));
    await user.click(screen.getByTestId("strategie-create-submit"));

    expect(screen.getByTestId("club-strategy-org-scope-required")).toHaveTextContent(
      CD_CLUB_STRATEGY_ORG_SCOPE_REQUIRED_MESSAGE,
    );
    expect(titleInput).toHaveValue("Meine Strategie");
    expect(clubDevelopmentFetchJson).not.toHaveBeenCalled();
  });
});