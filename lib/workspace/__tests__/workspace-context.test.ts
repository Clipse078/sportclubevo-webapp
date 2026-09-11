import { describe, expect, it } from "vitest";
import {
  resolveWorkspaceContext,
  resolveWorkspaceContextFromSessionUser,
} from "@/lib/workspace/workspace-context";

describe("resolveWorkspaceContext", () => {
  it("resolves platform for super_admin without active tenant", () => {
    expect(
      resolveWorkspaceContext({
        activeTenantId: null,
        roleKeys: ["super_admin"],
      }),
    ).toBe("platform");
  });

  it("resolves club when super_admin has an active tenant", () => {
    expect(
      resolveWorkspaceContext({
        activeTenantId: "tenant-1",
        roleKeys: ["super_admin"],
      }),
    ).toBe("club");
  });

  it("resolves club for tenant users without super_admin", () => {
    expect(
      resolveWorkspaceContext({
        activeTenantId: "tenant-1",
        roleKeys: ["club_admin"],
      }),
    ).toBe("club");
  });

  it("does not infer platform context from email-like role keys", () => {
    expect(
      resolveWorkspaceContext({
        activeTenantId: null,
        roleKeys: ["admin@example.com"],
      }),
    ).toBe("club");
  });

  it("resolveWorkspaceContextFromSessionUser handles missing user", () => {
    expect(resolveWorkspaceContextFromSessionUser(null)).toBe("club");
  });
});
