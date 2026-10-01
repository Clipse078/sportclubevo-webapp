import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/personal-actions/sources/task-source", () => ({
  taskPersonalActionSource: {
    loadActionable: vi.fn().mockResolvedValue([{ id: "task:1", sourceType: "TASK" }]),
    countActionable: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/personal-actions/sources/attendance-source", () => ({
  attendancePersonalActionSource: {
    loadActionable: vi.fn().mockResolvedValue([{ id: "att:1", sourceType: "ATTENDANCE_RESPONSE" }]),
    countActionable: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/personal-actions/sources/requirement-source", () => ({
  requirementPersonalActionSource: {
    loadActionable: vi.fn().mockResolvedValue([]),
    countActionable: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/lib/personal-actions/load-context", () => ({
  resolvePersonalActionSourceContext: vi.fn().mockResolvedValue({
    tenantId: "t1",
    userId: "u1",
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
    now: new Date("2026-09-24T12:00:00.000Z"),
  }),
}));

vi.mock("@/lib/participation/request-scoped-person-ids", () => ({
  getAuthorizedPersonIdsForUserInRequest: vi.fn().mockResolvedValue(["p1"]),
}));

import { taskPersonalActionSource } from "@/lib/personal-actions/sources/task-source";
import { attendancePersonalActionSource } from "@/lib/personal-actions/sources/attendance-source";
import { requirementPersonalActionSource } from "@/lib/personal-actions/sources/requirement-source";
import { loadPersonalActionsWithCounts } from "../load-personal-actions";
import { countPersonalActions } from "../count-personal-actions";

describe("SCE-HOTFIX-LOGIN-01 — dashboard personal-actions performance structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loadPersonalActionsWithCounts loads each adapter once in parallel", async () => {
    const result = await loadPersonalActionsWithCounts({
      tenantId: "t1",
      userId: "u1",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      limit: 50,
    });

    expect(taskPersonalActionSource.loadActionable).toHaveBeenCalledTimes(1);
    expect(attendancePersonalActionSource.loadActionable).toHaveBeenCalledTimes(1);
    expect(requirementPersonalActionSource.loadActionable).toHaveBeenCalledTimes(1);
    expect(result.counts.totalActionable).toBe(2);
    expect(result.actions).toHaveLength(2);
  });

  it("loadPersonalActionsWithCounts skips full attendance/requirement counts when limited", async () => {
    await loadPersonalActionsWithCounts({
      tenantId: "t1",
      userId: "u1",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      limit: 50,
    });

    expect(attendancePersonalActionSource.loadActionable).toHaveBeenCalledTimes(1);
    expect(attendancePersonalActionSource.countActionable).not.toHaveBeenCalled();
    expect(requirementPersonalActionSource.countActionable).not.toHaveBeenCalled();
  });

  it("countPersonalActions uses attendance countActionable (not full loadActionable)", () => {
    const source = readFileSync(
      "/workspace/lib/personal-actions/count-personal-actions.ts",
      "utf8",
    );
    expect(source).toContain("attendancePersonalActionSource.countActionable");
    expect(source).not.toContain("attendancePersonalActionSource.loadActionable");
  });
});
