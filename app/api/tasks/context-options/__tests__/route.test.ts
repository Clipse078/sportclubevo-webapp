/**
 * AUFGABEN-04A1 — GET /api/tasks/context-options security.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiTenantPermissionContext: vi.fn(),
  getTaskServiceContext: vi.fn(),
  searchTaskContextOptions: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-tenant-context", () => ({
  requireApiTenantPermissionContext: mocks.requireApiTenantPermissionContext,
}));
vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: mocks.getTaskServiceContext,
}));
vi.mock("@/lib/tasks/context-selector-service", () => ({
  searchTaskContextOptions: mocks.searchTaskContextOptions,
}));

import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiTenantPermissionContext.mockResolvedValue({
    ok: true,
    context: { tenantId: "t1", actorUserId: "u1", permissionKeys: [], roleKeys: [] },
  });
  mocks.getTaskServiceContext.mockResolvedValue({
    tenantId: "t1",
    userId: "u1",
    permissionKeys: ["tasks.create", "events.view"],
  });
  mocks.searchTaskContextOptions.mockResolvedValue([]);
});

describe("GET /api/tasks/context-options", () => {
  it("returns 400 for unsupported contextType", async () => {
    const res = await GET(
      new Request("http://localhost/api/tasks/context-options?contextType=FOO"),
    );
    expect(res.status).toBe(400);
    expect(mocks.searchTaskContextOptions).not.toHaveBeenCalled();
  });

  it("returns 400 when contextType missing", async () => {
    const res = await GET(new Request("http://localhost/api/tasks/context-options"));
    expect(res.status).toBe(400);
  });

  it("requires task create/manage permission at API gate", async () => {
    await GET(
      new Request("http://localhost/api/tasks/context-options?contextType=MATCH"),
    );
    expect(mocks.requireApiTenantPermissionContext).toHaveBeenCalledWith([
      "tasks.create",
      "tasks.manage",
    ]);
  });
});
