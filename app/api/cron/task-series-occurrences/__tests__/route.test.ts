import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  runAutomaticTaskSeriesOccurrenceGeneration: vi.fn(),
  isExternalSideEffectConfigured: vi.fn(),
}));

vi.mock("@/lib/tasks/task-series-auto-generate", () => ({
  runAutomaticTaskSeriesOccurrenceGeneration: mocks.runAutomaticTaskSeriesOccurrenceGeneration,
}));

vi.mock("@/lib/server/external-side-effect-policy", () => ({
  isExternalSideEffectConfigured: mocks.isExternalSideEffectConfigured,
}));

import { GET } from "../route";

describe("GET /api/cron/task-series-occurrences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isExternalSideEffectConfigured.mockReturnValue(true);
    process.env.CRON_SECRET = "test-secret";
    mocks.runAutomaticTaskSeriesOccurrenceGeneration.mockResolvedValue({
      tenantsProcessed: 1,
      seriesProcessed: 2,
      generatedTaskCount: 3,
      failures: [],
    });
  });

  it("rejects unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("runs generation when authorized", async () => {
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mocks.runAutomaticTaskSeriesOccurrenceGeneration).toHaveBeenCalled();
  });
});
