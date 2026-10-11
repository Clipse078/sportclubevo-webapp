/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  ActivityDirtyNavigationProvider,
  useActivityDirtyNavigation,
} from "../ActivityDirtyNavigationContext";

function Probe() {
  const { isDirty, setDirty, confirmNavigationIfDirty } = useActivityDirtyNavigation();
  return (
    <div>
      <span data-testid="dirty">{isDirty ? "yes" : "no"}</span>
      <button type="button" onClick={() => setDirty(true)}>
        mark dirty
      </button>
      <button type="button" onClick={() => confirmNavigationIfDirty()}>
        confirm
      </button>
    </div>
  );
}

describe("SCE-ACTIVITY-NAV-01 — dirty navigation guard", () => {
  it("blocks navigation confirmation when dirty unless accepted", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <ActivityDirtyNavigationProvider>
        <Probe />
      </ActivityDirtyNavigationProvider>,
    );

    fireEvent.click(screen.getByText("mark dirty"));
    expect(screen.getByTestId("dirty")).toHaveTextContent("yes");

    fireEvent.click(screen.getByText("confirm"));
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
