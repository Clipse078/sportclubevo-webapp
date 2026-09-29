/**
 * SCE-PERF-02B1 — week-bounded tournament reads for Weekplanner aggregation.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { findAllTournamentEvents } from "../queries";

const findMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

describe("findAllTournamentEvents — overlapsWindow", () => {
  beforeEach(() => {
    findMany.mockResolvedValue([]);
  });

  it("adds interval overlap predicates when overlapsWindow is set", async () => {
    const from = new Date("2026-09-28T00:00:00.000Z");
    const to = new Date("2026-10-05T00:00:00.000Z");

    await findAllTournamentEvents("tenant-a", { overlapsWindow: { from, to } });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          type: "TOURNAMENT",
          startAt: { lt: to },
          OR: [{ endAt: { gt: from } }, { endAt: null, startAt: { gte: from } }],
        }),
      }),
    );
  });
});
