import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveTaskDeletionWorkspaceSignals } from "../task-deletion-workspace-policy";
import type { TaskDto, TaskServiceContext } from "../types";

const TENANT = "tenant-1";
const USER = "user-1";

function taskDto(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "task-1",
    tenantId: TENANT,
    title: "Test",
    status: "OPEN",
    createdByUserId: USER,
    assignees: [],
    visibilityScope: "TENANT",
    orgUnitId: null,
    parentTaskId: null,
    taskSeriesId: null,
    ...overrides,
  } as TaskDto;
}

function ctx(permissionKeys: string[]): TaskServiceContext {
  return { tenantId: TENANT, userId: USER, permissionKeys };
}

describe("PKG-03 — task deletion workspace policy (UI/API parity)", () => {
  it("grants delete UI when tasks.delete authority is present (no tasks.manage required)", () => {
    const signals = resolveTaskDeletionWorkspaceSignals(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_DELETE]),
      taskDto(),
      true,
    );
    expect(signals.canDeletePermanently).toBe(true);
    expect(signals.showDeletePermissionGapHint).toBe(false);
  });

  it("denies delete UI without tasks.delete even when tasks.manage is held", () => {
    const signals = resolveTaskDeletionWorkspaceSignals(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
      taskDto(),
      false,
    );
    expect(signals.canDeletePermanently).toBe(false);
    expect(signals.showDeletePermissionGapHint).toBe(true);
  });

  it("ordinary reader sees no delete and no administrator hint", () => {
    const signals = resolveTaskDeletionWorkspaceSignals(
      ctx([PERMISSIONS.TASKS_VIEW]),
      taskDto({ createdByUserId: "other", assignees: [{ userId: "other-2" }] } as TaskDto),
      false,
    );
    expect(signals.canDeletePermanently).toBe(false);
    expect(signals.showDeletePermissionGapHint).toBe(false);
  });

  it("cross-tenant task row is not deletable in UI signals", () => {
    const signals = resolveTaskDeletionWorkspaceSignals(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_DELETE]),
      taskDto({ tenantId: "tenant-other" }),
      true,
    );
    expect(signals.canDeletePermanently).toBe(false);
  });
});