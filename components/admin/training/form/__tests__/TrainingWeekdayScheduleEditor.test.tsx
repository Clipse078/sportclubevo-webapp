/**
 * @vitest-environment jsdom
 *
 * TRAININGS-UX-02B — weekday schedule time control integrity.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingWeekdayScheduleEditor from "@/components/admin/training/form/TrainingWeekdayScheduleEditor";
import {
  TRAINING_FORM_COMPACT_TIME_INPUT_CLASS,
  TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS,
  TRAINING_WEEKDAY_SCHEDULE_TIME_GRID_TRACK,
} from "@/components/admin/training/form/training-form-layout";
import type { Weekday } from "@/lib/training/types";

const ROWS = [
  {
    weekday: "WEDNESDAY" as Weekday,
    label: "Mittwoch",
    enabled: true,
    startsAt: "19:45",
    endsAt: "21:15",
  },
];

describe("TrainingWeekdayScheduleEditor — HH:MM display integrity", () => {
  it("preserves full HH:MM values in controlled inputs (19:45, 21:15)", () => {
    render(
      <TrainingWeekdayScheduleEditor
        rows={ROWS}
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
        testIdPrefix="training-series-weekday"
      />,
    );

    expect(screen.getByTestId("training-series-weekday-wednesday-start")).toHaveValue("19:45");
    expect(screen.getByTestId("training-series-weekday-wednesday-end")).toHaveValue("21:15");
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
  });

  it("emits complete values on change without truncating minutes", () => {
    const onTimeChange = vi.fn();
    render(
      <TrainingWeekdayScheduleEditor rows={ROWS} onToggle={vi.fn()} onTimeChange={onTimeChange} />,
    );

    fireEvent.change(screen.getByLabelText("Mittwoch Beginn"), { target: { value: "08:00" } });
    expect(onTimeChange).toHaveBeenCalledWith("WEDNESDAY", "startsAt", "08:00");

    fireEvent.change(screen.getByLabelText("Mittwoch Ende"), { target: { value: "23:59" } });
    expect(onTimeChange).toHaveBeenCalledWith("WEDNESDAY", "endsAt", "23:59");
  });

  it("supports additional canonical wall-clock samples", () => {
    render(
      <TrainingWeekdayScheduleEditor
        rows={[
          {
            weekday: "MONDAY",
            label: "Montag",
            enabled: true,
            startsAt: "17:00",
            endsAt: "18:30",
          },
        ]}
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Montag Beginn")).toHaveValue("17:00");
    expect(screen.getByLabelText("Montag Ende")).toHaveValue("18:30");
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
  });

  it("uses layout contract wide enough for native time inputs (7rem Von/Bis tracks)", () => {
    render(
      <TrainingWeekdayScheduleEditor rows={ROWS} onToggle={vi.fn()} onTimeChange={vi.fn()} />,
    );

    expect(TRAINING_WEEKDAY_SCHEDULE_TIME_GRID_TRACK).toBe("7rem");
    expect(TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS).toContain("7rem_7rem");

    const row = screen.getByTestId("training-weekday-wednesday");
    expect(row.className).toMatch(/sm:grid-cols-\[minmax\(0,1\.2fr\)_7rem_7rem/);

    const startInput = screen.getByLabelText("Mittwoch Beginn");
    for (const token of TRAINING_FORM_COMPACT_TIME_INPUT_CLASS.split(" ")) {
      expect(startInput.className).toContain(token);
    }
  });
});
