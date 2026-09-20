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

describe("GET /api/cron/task-series-occurrences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
    const { GET: getRoute } = await import("../route");
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences");
    const res = await getRoute(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(JSON.stringify(body)).not.toContain("test-secret");
  });

  it("rejects malformed authorization header", async () => {
    const { GET: getRoute } = await import("../route");
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences", {
      headers: { authorization: "Basic test-secret" },
    });
    expect((await getRoute(req)).status).toBe(401);
  });

  it("rejects wrong bearer secret", async () => {
    const { GET: getRoute } = await import("../route");
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect((await getRoute(req)).status).toBe(401);
  });

  it("fails closed when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    mocks.isExternalSideEffectConfigured.mockReturnValue(false);
    const { GET: getRoute } = await import("../route");
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences", {
      headers: { authorization: "Bearer test-secret" },
    });
    expect((await getRoute(req)).status).toBe(401);
  });

  it("runs generation when authorized", async () => {
    const { GET: getRoute } = await import("../route");
    const req = new NextRequest("http://localhost/api/cron/task-series-occurrences", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await getRoute(req);
    expect(res.status).toBe(200);
    expect(mocks.runAutomaticTaskSeriesOccurrenceGeneration).toHaveBeenCalled();
  });
});
