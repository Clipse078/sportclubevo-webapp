/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HomeAwaySegmentedControl,
  TOURNAMENT_HOME_AWAY_SEGMENTS,
} from "@/components/admin/shared/HomeAwaySegmentedControl";

describe("HomeAwaySegmentedControl", () => {
  it("renders two immediate radio options without combobox/dropdown", () => {
    render(<HomeAwaySegmentedControl value="HOME" onChange={() => {}} testId="ha" />);

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByTestId("ha-option-home")).toHaveAttribute("role", "radio");
    expect(screen.getByTestId("ha-option-away")).toHaveAttribute("role", "radio");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("selecting Heim and Auswärts emits HOME and AWAY domain values", () => {
    const onChange = vi.fn();
    render(<HomeAwaySegmentedControl value="HOME" onChange={onChange} testId="ha" />);

    fireEvent.click(screen.getByTestId("ha-option-away"));
    expect(onChange).toHaveBeenCalledWith("AWAY");

    fireEvent.click(screen.getByTestId("ha-option-home"));
    expect(onChange).toHaveBeenCalledWith("HOME");
  });

  it("uses concise Heim and Auswärts labels", () => {
    expect(TOURNAMENT_HOME_AWAY_SEGMENTS.map((s) => s.label)).toEqual(["Heim", "Auswärts"]);
    render(<HomeAwaySegmentedControl value="HOME" onChange={() => {}} testId="ha" />);
    expect(screen.queryByText(/FC Allschwil/i)).not.toBeInTheDocument();
  });

  it("marks the active segment with aria-checked", () => {
    render(<HomeAwaySegmentedControl value="AWAY" onChange={() => {}} testId="ha" />);

    expect(screen.getByTestId("ha-option-away")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("ha-option-home")).toHaveAttribute("aria-checked", "false");
  });
});
