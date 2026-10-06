import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainingSession: {
      findMany,
    },
  },
}));

const { findAllTrainingSessionsForWeekplanner } = await import("../queries");

describe("findAllTrainingSessionsForWeekplanner — CANCELLED read-model invariant", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it("S excludes CANCELLED sessions at the weekplanner query boundary", async () => {
    await findAllTrainingSessionsForWeekplanner("tenant-a", {
      dateFrom: new Date("2026-10-06T00:00:00.000Z"),
      dateTo: new Date("2026-10-12T00:00:00.000Z"),
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["CANCELLED", "RECURRENCE_REMOVED"] },
        }),
      }),
    );
  });
});
