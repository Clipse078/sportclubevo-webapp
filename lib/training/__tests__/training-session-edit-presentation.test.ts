import { describe, expect, it } from "vitest";
import {
  buildTrainingSessionEditPageTitle,
  formatTrainingSessionEditScheduleContext,
  pickTrainingSessionEditPresentation,
} from "../training-session-edit-presentation";

describe("training-session-edit-presentation", () => {
  it("uses series title as page title without duplicating team in one string", () => {
    expect(
      buildTrainingSessionEditPageTitle("FC Allschwil Junioren F2", "Junioren F2 Training"),
    ).toBe("Junioren F2 Training");
  });

  it("builds compact schedule context from team, date and wall times", () => {
    const context = formatTrainingSessionEditScheduleContext({
      teamName: "Junioren F2",
      date: "2026-09-21",
      startTime: "17:00",
      endTime: "18:30",
      locale: "de-CH",
      timezone: "Europe/Zurich",
    });
    expect(context).toContain("Junioren F2");
    expect(context).toContain("17:00–18:30");
    expect(context).toMatch(/Sep|sept|Sept/i);
    expect(context).not.toMatch(/2026/);
  });

  it("pickTrainingSessionEditPresentation returns title and context", () => {
    const result = pickTrainingSessionEditPresentation({
      teamName: "Junioren F2",
      trainingSeriesTitle: "Junioren F2 Training",
      date: "2026-09-21",
      startTime: "17:00",
      endTime: "18:30",
      locale: "de-CH",
      timezone: "Europe/Zurich",
    });
    expect(result.pageTitle).toBe("Junioren F2 Training");
    expect(result.scheduleContext).toContain("17:00–18:30");
  });
});
