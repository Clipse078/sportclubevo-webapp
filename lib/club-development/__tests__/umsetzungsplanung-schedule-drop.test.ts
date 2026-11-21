import { describe, expect, it } from "vitest";
import {
  isPhaseScheduleDropEligible,
  resolveScheduleDropSectionEligibility,
} from "../umsetzungsplanung-schedule-drop";

describe("umsetzungsplanung schedule drop eligibility", () => {
  it("allows only active and planned phases", () => {
    expect(isPhaseScheduleDropEligible("ACTIVE")).toBe(true);
    expect(isPhaseScheduleDropEligible("PLANNED")).toBe(true);
    expect(isPhaseScheduleDropEligible("COMPLETED")).toBe(false);
  });

  it("marks section without eligible phases as non-accepting", () => {
    const eligibility = resolveScheduleDropSectionEligibility("planned", {
      active: [],
      planned: [],
      completed: [{ status: "COMPLETED" }],
    });
    expect(eligibility.acceptsDrop).toBe(false);
    expect(eligibility.hasEligiblePhases).toBe(false);
  });
});