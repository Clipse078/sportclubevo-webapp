/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceInlineOrgUnitMultiPicker } from "../SceInlineOrgUnitMultiPicker";

describe("SceInlineOrgUnitMultiPicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not mount modal/dialog hosts and keeps selected chips while searching", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          groups: [
            {
              type: "ORG_UNIT",
              items: [{ id: "org-b", type: "ORG_UNIT", label: "Sport", metadata: { level: 0 } }],
            },
          ],
        }),
      }),
    );

    render(
      <SceInlineOrgUnitMultiPicker
        selectedIds={["org-a"]}
        onSelectedIdsChange={onChange}
        knownById={
          new Map([
            [
              "org-a",
              { id: "org-a", label: "Vorstand", level: 0, description: "Organisationseinheit" },
            ],
          ])
        }
        testIdPrefix="inline-org-test"
      />,
    );

    expect(screen.getByTestId("inline-org-test-chip-org-a")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector('[data-sce-list-selector-sheet="true"]')).toBeNull();

    const search = screen.getByTestId("inline-org-test-search");
    await user.type(search, "Sp");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("inline-org-test-chip-org-a")).toBeTruthy();
  });
});