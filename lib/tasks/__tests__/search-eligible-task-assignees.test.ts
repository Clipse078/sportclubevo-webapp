import { beforeEach, describe, expect, it, vi } from "vitest";
import { ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT } from "../quick-create-assignee-search";
import { searchEligibleTaskAssignees } from "../queries";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findMany: mocks.findMany },
  },
}));

describe("searchEligibleTaskAssignees", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue([]);
  });

  it("returns empty for short search terms without querying full tenant", async () => {
    const rows = await searchEligibleTaskAssignees("tenant-1", "a");
    expect(rows).toEqual([]);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("applies tenant scope, active filters, and take limit", async () => {
    await searchEligibleTaskAssignees("tenant-1", "san", 10);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          isActive: true,
        }),
        take: 10,
      }),
    );
  });

  it("uses default bounded limit", async () => {
    await searchEligibleTaskAssignees("tenant-1", "michael");
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT }),
    );
  });
});
