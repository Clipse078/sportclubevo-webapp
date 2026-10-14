/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceActivityDateTimeInput } from "../SceActivityDateTimeInput";

describe("SceActivityDateTimeInput", () => {
  it("keeps manual date/time fields and calendar trigger", () => {
    const onChange = vi.fn();
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "2026-10-14T18:00", endAt: "2026-10-14T20:00" }}
        onChange={onChange}
        testId="dt"
      />,
    );
    expect(screen.getByTestId("dt-date-input")).toBeTruthy();
    expect(screen.getByTestId("dt-date-calendar")).toBeTruthy();
    expect(screen.getByTestId("dt-start-time-input")).toBeTruthy();
    expect(screen.getByTestId("dt-end-time-input")).toBeTruthy();
    const startInput = screen.getByTestId("dt-start-time-input");
    fireEvent.change(startInput, { target: { value: "19:00" } });
    fireEvent.blur(startInput);
    expect(onChange).toHaveBeenCalled();
  });

  it("uses coherent termin row layout token", () => {
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "", endAt: "" }}
        onChange={() => {}}
        testId="dt"
      />,
    );
    expect(screen.getByTestId("dt").getAttribute("data-sce-activity-datetime-layout")).toBe(
      "termin-row",
    );
  });
});
