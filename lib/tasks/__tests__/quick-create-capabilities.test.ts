import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveQuickCreateCapabilities } from "../quick-create";

describe("AUFGABEN-06P quick create capabilities", () => {
  const base = { tenantId: "t1", userId: "u1" };

  it("self create requires tasks.view", () => {
    expect(
      resolveQuickCreateCapabilities({
        ...base,
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      }).canCreateSelf,
    ).toBe(true);
    expect(
      resolveQuickCreateCapabilities({
        ...base,
        permissionKeys: [],
      }).canCreateSelf,
    ).toBe(false);
  });

  it("assign others requires create + assign", () => {
    expect(
      resolveQuickCreateCapabilities({
        ...base,
        permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE],
      }).canAssignOthers,
    ).toBe(false);
    expect(
      resolveQuickCreateCapabilities({
        ...base,
        permissionKeys: [
          PERMISSIONS.TASKS_VIEW,
          PERMISSIONS.TASKS_CREATE,
          PERMISSIONS.TASKS_ASSIGN,
        ],
      }).canAssignOthers,
    ).toBe(true);
  });
});
