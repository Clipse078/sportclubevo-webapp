/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClubDirectoryFilterBar } from "../ClubDirectoryFilterBar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("ClubDirectoryFilterBar segmented filters", () => {
  it("navigates with provider=manual when Manuell is selected", () => {
    push.mockClear();
    render(<ClubDirectoryFilterBar showArchived={false} provider="all" teams="all" />);

    fireEvent.click(screen.getByTestId("vereine-filter-provider-option-manual"));
    expect(push).toHaveBeenCalledWith("/dashboard/vereine?provider=manual");
  });

  it("navigates with teams=with when Mit Teams is selected", () => {
    push.mockClear();
    render(<ClubDirectoryFilterBar showArchived={false} provider="all" teams="all" />);

    fireEvent.click(screen.getByTestId("vereine-filter-teams-option-with"));
    expect(push).toHaveBeenCalledWith("/dashboard/vereine?teams=with");
  });
});
