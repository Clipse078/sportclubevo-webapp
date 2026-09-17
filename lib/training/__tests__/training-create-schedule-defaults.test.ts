import { describe, expect, it } from "vitest";
import { SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES } from "@/lib/operational/defaults";
import { mapTenantOperationalDurationPolicyRow } from "@/lib/operational/map-tenant-operational-duration-policy";
import {
  defaultNewTrainingSlotTimes,
  defaultTrainingCreateEndTime,
} from "@/lib/training/training-create-schedule-defaults";

describe("training create schedule defaults (TRAININGS-UX-02A)", () => {
  it("A: 90 minutes from 17:00 → 18:30", () => {
    expect(defaultTrainingCreateEndTime(90)).toBe("18:30");
    expect(defaultNewTrainingSlotTimes(90)).toEqual({ startsAt: "17:00", endsAt: "18:30" });
  });

  it("B: 120 minutes from 17:00 → 19:00", () => {
    expect(defaultTrainingCreateEndTime(120)).toBe("19:00");
  });

  it("C: platform fallback when tenant training duration is unset", () => {
    const policy = mapTenantOperationalDurationPolicyRow(null);
    expect(policy.TRAINING.durationMinutes).toBe(SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES);
    expect(defaultTrainingCreateEndTime(policy.TRAINING.durationMinutes)).toBe("18:30");
  });
});
