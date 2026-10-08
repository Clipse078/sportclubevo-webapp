import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePlannerWeekPaths: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/planning-hub/planner-week-revalidation", () => ({
  revalidatePlannerWeekPaths: mocks.revalidatePlannerWeekPaths,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { revalidateAfterSuccessfulFacilityMutation } from "../facility-mutation-revalidation";

describe("revalidateAfterSuccessfulFacilityMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revalidates canonical planner week/day paths", () => {
    revalidateAfterSuccessfulFacilityMutation();
    expect(mocks.revalidatePlannerWeekPaths).toHaveBeenCalledTimes(1);
  });

  it("revalidates facility admin read model", () => {
    revalidateAfterSuccessfulFacilityMutation();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/admin/facilities");
  });
});
