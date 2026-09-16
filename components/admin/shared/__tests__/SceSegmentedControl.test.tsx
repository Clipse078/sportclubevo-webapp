/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceSegmentedControl } from "../SceSegmentedControl";

describe("SceSegmentedControl", () => {
  it("marks selected option with accent border styling", () => {
    render(
      <SceSegmentedControl
        options={[
          { value: "all", label: "Alle" },
          { value: "linked", label: "Anbieter-verknüpft" },
        ]}
        value="linked"
        onChange={() => {}}
        aria-label="Test"
        testId="seg"
      />,
    );

    const selected = screen.getByTestId("seg-option-linked");
    const other = screen.getByTestId("seg-option-all");
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected.className).toContain("--sce-accent");
    expect(other).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when option clicked", () => {
    const onChange = vi.fn();
    render(
      <SceSegmentedControl
        options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]}
        value="a"
        onChange={onChange}
        aria-label="Test"
        testId="seg"
      />,
    );
    fireEvent.click(screen.getByTestId("seg-option-b"));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
