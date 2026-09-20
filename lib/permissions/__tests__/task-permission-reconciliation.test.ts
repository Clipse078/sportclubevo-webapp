import { describe, it, expect } from "vitest";
import {
  TASK_PERMISSION_DEFS,
  TASK_ROLE_ASSIGNMENTS,
} from "@/lib/permissions/task-permission-reconciliation";

describe("AUFGABEN-01 task permission reconciliation", () => {
  it("defines the four canonical task permissions", () => {
    expect(TASK_PERMISSION_DEFS.map((p) => p.key)).toEqual([
      "tasks.view",
      "tasks.create",
      "tasks.manage",
      "tasks.assign",
    ]);
  });

  it("bootstraps super_admin with all task permissions", () => {
    expect(TASK_ROLE_ASSIGNMENTS[0].roleKey).toBe("super_admin");
    expect(TASK_ROLE_ASSIGNMENTS[0].permissionKeys).toEqual([
      "tasks.view",
      "tasks.create",
      "tasks.manage",
      "tasks.assign",
    ]);
  });
});
