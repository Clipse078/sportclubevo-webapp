import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
}));

vi.mock("@/lib/workspace/background-jobs/workspace-background-job-dispatcher", () => ({
  dispatchWorkspaceBackgroundJobs: mocks.dispatch,
}));

vi.mock("@/lib/server/external-side-effect-policy", () => ({
  isExternalSideEffectConfigured: () => true,
}));

import { GET } from "../route";

describe("GET /api/cron/workspace-background-jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    mocks.dispatch.mockResolvedValue({
      claimed: 0,
      succeeded: 0,
      retried: 0,
      dead: 0,
      failed: 0,
      byType: {},
    });
  });

  it("rejects without CRON_SECRET", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/cron/workspace-background-jobs"),
    );
    expect(res.status).toBe(401);
  });

  it("returns safe operational counts without payload leakage", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mocks.dispatch.mockResolvedValueOnce({
      claimed: 2,
      succeeded: 1,
      retried: 1,
      dead: 0,
      failed: 0,
      byType: { MALWARE_SCAN_VERSION: 2 },
    });

    const res = await GET(
      new NextRequest("http://localhost/api/cron/workspace-background-jobs", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.claimed).toBe(2);
    expect(body.payloadJson).toBeUndefined();
    expect(body.storageKey).toBeUndefined();
  });
});
