import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/tasks/task-service", () => ({
  listMyTasks: vi.fn(),
  countMyOpenTasks: vi.fn(),
}));

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: vi.fn(),
}));

vi.mock("../sources/attendance-obligations", () => ({
  loadAttendanceObligationCandidates: vi.fn(),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { countMyOpenTasks, listMyTasks } from "@/lib/tasks/task-service";
import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { loadAttendanceObligationCandidates } from "../sources/attendance-obligations";
import { loadPersonalActions, loadDashboardPersonalActions } from "../load-personal-actions";
import { countPersonalActions } from "../count-personal-actions";

const baseTask = {
  tenantId: "tenant-a",
  description: null,
  status: TaskStatus.OPEN,
  priority: "NORMAL" as const,
  completedAt: null,
  contextType: null,
  contextId: null,
  parentTaskId: null,
  taskSeriesId: null,
  createdByUserId: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  assignees: [],
  parentTask: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
    platform: [],
    tenant: [PERMISSIONS.TASKS_VIEW],
  });
  vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue([]);
  vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([]);
  vi.mocked(listMyTasks).mockResolvedValue([]);
});

describe("AUFGABEN-05 — PersonalAction aggregator", () => {
  it("Z — mixed tasks and attendance merge into one ordered list", async () => {
    vi.mocked(listMyTasks).mockResolvedValue([
      {
        ...baseTask,
        id: "task-a",
        title: "Task A",
        dueAt: "2026-09-19T00:00:00.000Z",
      },
      {
        ...baseTask,
        id: "task-b",
        title: "Task B",
        dueAt: "2026-09-28T00:00:00.000Z",
      },
    ]);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Match 1",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "TRAINING",
        trainingSessionId: "session-1",
        eventTitle: "Training",
        eventStartAt: new Date("2026-09-22T17:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ]);

    const actions = await loadPersonalActions({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(actions).toHaveLength(4);
    expect(actions.filter((a) => a.sourceType === "TASK")).toHaveLength(2);
    expect(actions.filter((a) => a.sourceType === "ATTENDANCE_RESPONSE")).toHaveLength(2);
  });

  it("C — parent without tasks.view still receives attendance actions", async () => {
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [],
    });
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Match 1",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ]);

    const actions = await loadPersonalActions({
      tenantId: "tenant-a",
      userId: "guardian",
    });

    expect(listMyTasks).not.toHaveBeenCalled();
    expect(actions).toHaveLength(1);
    expect(actions[0].sourceType).toBe("ATTENDANCE_RESPONSE");
  });

  it("32 — dedupes by stable identity only", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Match 1",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Match 1 duplicate path",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ]);

    const actions = await loadPersonalActions({
      tenantId: "tenant-a",
      userId: "guardian",
      permissionKeys: [],
    });
    expect(actions).toHaveLength(1);
  });

  it("31 — respects limit", async () => {
    vi.mocked(listMyTasks).mockResolvedValue([
      { ...baseTask, id: "t1", title: "T1", dueAt: "2026-09-18T00:00:00.000Z" },
      { ...baseTask, id: "t2", title: "T2", dueAt: "2026-09-19T00:00:00.000Z" },
      { ...baseTask, id: "t3", title: "T3", dueAt: "2026-09-20T00:00:00.000Z" },
    ]);

    const actions = await loadPersonalActions({
      tenantId: "tenant-a",
      userId: "user-a",
      limit: 2,
    });
    expect(actions).toHaveLength(2);
  });

  it("dashboard helper applies preview limit", async () => {
    vi.mocked(listMyTasks).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        ...baseTask,
        id: `t${i}`,
        title: `T${i}`,
        dueAt: `2026-09-${10 + i}T00:00:00.000Z`,
      })),
    );

    const actions = await loadDashboardPersonalActions({
      tenantId: "tenant-a",
      userId: "user-a",
    });
    expect(actions).toHaveLength(5);
  });

  it("W — count totals task + unique attendance", async () => {
    vi.mocked(listMyTasks).mockResolvedValue([]);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Match 1",
        eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ]);

    vi.mocked(countMyOpenTasks).mockResolvedValue(1);

    const counts = await countPersonalActions({
      tenantId: "tenant-a",
      userId: "user-a",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });

    expect(counts).toEqual({
      taskActionable: 1,
      attendanceActionable: 1,
      totalActionable: 2,
    });
  });
});
