/**
 * Tests for GET /api/cron/sfv-bounded-schedule-refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRunBounded = vi.fn();

vi.mock("@/lib/integrations/sfv/sync/bounded-schedule-sync", () => ({
  runBoundedSfvScheduleSync: mockRunBounded,
}));

vi.mock("@/lib/env", () => ({
  getRuntimeEnvironment: () => ({ isStage: true, isProd: false, isLocal: false }),
}));

const { GET } = await import("../route");

const ORIGINAL_ENV = { ...process.env };

function makeRequest(
  query: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(
    `http://x/api/cron/sfv-bounded-schedule-refresh?${query}`,
    { method: "GET", headers },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, CRON_SECRET: "test-cron-secret" };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("GET /api/cron/sfv-bounded-schedule-refresh", () => {
  it("rejects without CRON_SECRET", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(
      makeRequest("tenantId=fc-allschwil&seasonId=2027&dateFrom=2026-08-01&dateTo=2026-11-03", {
        authorization: "Bearer test-cron-secret",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("requires query parameters", async () => {
    const response = await GET(
      makeRequest("tenantId=fc-allschwil", {
        authorization: "Bearer test-cron-secret",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockRunBounded).not.toHaveBeenCalled();
  });

  it("returns sync result on success", async () => {
    mockRunBounded.mockResolvedValue({
      ok: true,
      result: { fetched: 5, updated: 2 },
    });

    const response = await GET(
      makeRequest(
        "tenantId=fc-allschwil&seasonId=2027&dateFrom=2026-08-01&dateTo=2026-11-03",
        { authorization: "Bearer test-cron-secret" },
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.fetched).toBe(5);
  });
});
