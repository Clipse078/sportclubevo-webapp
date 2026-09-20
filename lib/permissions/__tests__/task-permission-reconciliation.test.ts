import { describe, it, expect } from "vitest";
import {
  TASK_CLUB_ADMIN_PERMISSION_KEYS,
  TASK_PERMISSION_DEFS,
  TASK_ROLE_ASSIGNMENTS,
} from "@/lib/permissions/task-permission-reconciliation";

describe("AUFGABEN task permission reconciliation", () => {
  it("defines the five canonical task permissions including tasks.view_all", () => {
    expect(TASK_PERMISSION_DEFS.map((p) => p.key)).toEqual([
      "tasks.view",
      "tasks.create",
      "tasks.assign",
      "tasks.view_all",
      "tasks.manage",
    ]);
  });

  it("bootstraps super_admin with all task permissions", () => {
    expect(TASK_ROLE_ASSIGNMENTS[0].roleKey).toBe("super_admin");
    expect(TASK_ROLE_ASSIGNMENTS[0].permissionKeys).toEqual([
      "tasks.view",
      "tasks.create",
      "tasks.assign",
      "tasks.view_all",
      "tasks.manage",
    ]);
  });

  it("assigns full task capability set to materialized tenant Club Admin roles", () => {
    expect(TASK_CLUB_ADMIN_PERMISSION_KEYS).toEqual([
      "tasks.view",
      "tasks.create",
      "tasks.assign",
      "tasks.view_all",
      "tasks.manage",
    ]);
  });
});
