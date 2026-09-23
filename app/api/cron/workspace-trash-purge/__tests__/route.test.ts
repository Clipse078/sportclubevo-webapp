import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  purgeAll: vi.fn(),
}));

vi.mock("@/lib/workspace/governance/workspace-trash-purge-batch-service", () => ({
  purgeExpiredTrashedWorkspaceDocumentsAllTenants: mocks.purgeAll,
}));

vi.mock("@/lib/server/external-side-effect-policy", () => ({
  isExternalSideEffectConfigured: () => true,
}));

import { GET } from "../route";

describe("GET /api/cron/workspace-trash-purge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    mocks.purgeAll.mockResolvedValue({ tenants: [] });
  });

  it("rejects without CRON_SECRET", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/workspace-trash-purge"));
    expect(res.status).toBe(401);
  });

  it("accepts bearer CRON_SECRET and returns operational counts only", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mocks.purgeAll.mockResolvedValueOnce({
      tenants: [{ tenantId: "t1", scanned: 1, purged: 1, skipped: 0, alreadyPurged: 0, failed: 0 }],
    });

    const res = await GET(
      new NextRequest("http://localhost/api/cron/workspace-trash-purge", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenants[0].purged).toBe(1);
    expect(body.tenants[0].documentName).toBeUndefined();
  });
});
