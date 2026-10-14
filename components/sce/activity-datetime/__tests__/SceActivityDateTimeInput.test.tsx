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

  it("normalizes compact date on blur (paste DDMMYYYY)", () => {
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "", endAt: "" }}
        onChange={() => {}}
        testId="dt"
      />,
    );
    const dateInput = screen.getByTestId("dt-date-input");
    fireEvent.change(dateInput, { target: { value: "17102026" } });
    fireEvent.blur(dateInput);
    expect(dateInput).toHaveValue("17.10.2026");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("emits datetime-local when compact date is committed with start time", () => {
    const onChange = vi.fn();
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "2026-10-14T09:00", endAt: "" }}
        onChange={onChange}
        testId="dt"
      />,
    );
    const dateInput = screen.getByTestId("dt-date-input");
    fireEvent.change(dateInput, { target: { value: "17102026" } });
    fireEvent.blur(dateInput);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ startAt: "2026-10-17T09:00" }),
    );
  });

  it("rejects invalid compact date on blur without mutating to another day", () => {
    const onChange = vi.fn();
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "", endAt: "" }}
        onChange={onChange}
        testId="dt"
      />,
    );
    const dateInput = screen.getByTestId("dt-date-input");
    fireEvent.change(dateInput, { target: { value: "31112026" } });
    fireEvent.blur(dateInput);
    expect(screen.getByRole("alert").textContent).toContain("TT.MM.JJJJ");
    expect(dateInput).toHaveValue("31112026");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows editing/backspace without corrupting committed display date", () => {
    const onChange = vi.fn();
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "2026-10-17T09:30", endAt: "" }}
        onChange={onChange}
        testId="dt"
      />,
    );
    const dateInput = screen.getByTestId("dt-date-input");
    expect(dateInput).toHaveValue("17.10.2026");
    fireEvent.change(dateInput, { target: { value: "17.10.202" } });
    expect(dateInput).toHaveValue("17.10.202");
    fireEvent.change(dateInput, { target: { value: "17.10.2026" } });
    fireEvent.blur(dateInput);
    expect(dateInput).toHaveValue("17.10.2026");
  });

  it("normalizes pasted compact start time on blur", () => {
    const onChange = vi.fn();
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "2026-10-17T09:00", endAt: "" }}
        onChange={onChange}
        testId="dt"
      />,
    );
    const startInput = screen.getByTestId("dt-start-time-input");
    fireEvent.change(startInput, { target: { value: "0930" } });
    fireEvent.blur(startInput);
    expect(startInput).toHaveValue("09:30");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ startAt: "2026-10-17T09:30" }),
    );
  });

  it("rejects impossible compact time on blur", () => {
    render(
      <SceActivityDateTimeInput
        value={{ startAt: "2026-10-17T09:00", endAt: "" }}
        onChange={() => {}}
        testId="dt"
      />,
    );
    const startInput = screen.getByTestId("dt-start-time-input");
    fireEvent.change(startInput, { target: { value: "2460" } });
    fireEvent.blur(startInput);
    expect(startInput).toHaveValue("2460");
    expect(screen.getByRole("alert").textContent).toContain("HH:MM");
  });
});
