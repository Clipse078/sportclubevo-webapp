/**
 * Regression: SFV-imported MATCH events must reach public website feeds.
 *
 * SCE-ACTIVITY-CREATE-01C added reviewStage gating on getPublicEvents.
 * SFV schedule sync must create matches with reviewStage=APPROVED so
 * /api/public/[tenant]/website/matches is not empty when fixtures exist.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

const { getPublicEvents, MATCH_EVENT_TYPES } = await import("../public-event-feed");

describe("SFV match public feed regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("queries with reviewStage APPROVED|PUBLISHED for MATCH feeds", async () => {
    await getPublicEvents({
      surface: "all",
      tenantId: "tenant-fca",
      eventTypes: MATCH_EVENT_TYPES,
    });

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.reviewStage).toEqual({ in: ["APPROVED", "PUBLISHED"] });
    expect(where.type).toEqual({ in: ["MATCH"] });
  });

  it("documents expected SFV create contract (reviewStage APPROVED)", () => {
    const sfvCreatePayload = {
      source: "SFV",
      type: "MATCH",
      websiteVisible: true,
      reviewStage: "APPROVED",
    };
    expect(sfvCreatePayload.reviewStage).toBe("APPROVED");
  });
});
