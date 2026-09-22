/**
 * AUFGABEN-05-UI — multi-role acceptance (mocked domain boundaries).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";

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

vi.mock("../sources/requirement-obligations", () => ({
  loadRequirementObligationCandidates: vi.fn().mockResolvedValue([]),
  countOpenRequirementObligationsForUser: vi.fn().mockResolvedValue(0),
}));

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { listMyTasks } from "@/lib/tasks/task-service";
import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { loadAttendanceObligationCandidates } from "../sources/attendance-obligations";
import { loadPersonalActions } from "../load-personal-actions";
import { countPersonalActions } from "../count-personal-actions";
import { resolvePersonalActionsModuleCapabilities } from "../access";

describe("AUFGABEN-05-UI — multi-role integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — parent-only: nav fallback + attendance without tasks.view", async () => {
    const sections = getVisibleNavSections([], "club", { personalActionsModule: true });
    const keys = sections.flatMap((s) => s.items.map((i) => i.key));
    expect(keys).toContain("aufgaben");

    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({ platform: [], tenant: [] });
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-a"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-a",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "F2",
        eventKind: "TRAINING",
        trainingSessionId: "s1",
        eventTitle: "Training F2",
        eventStartAt: new Date("2026-09-21T17:00:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ] as never);

    const actions = await loadPersonalActions({ tenantId: "t1", userId: "parent" });
    expect(listMyTasks).not.toHaveBeenCalled();
    expect(actions).toHaveLength(1);
    expect(actions[0].sourceType).toBe("ATTENDANCE_RESPONSE");
  });

  it("F — vice president + trainer + parent keeps personal task scope only", async () => {
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL, PERMISSIONS.TASKS_MANAGE],
    });
    vi.mocked(listMyTasks).mockResolvedValue([
      {
        id: "my-task",
        title: "Personal assignment",
        dueAt: null,
        parentTask: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        priority: "NORMAL",
      },
    ] as never);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-b"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-b",
        personDisplayName: "Memphis",
        teamSeasonId: "ts-2",
        teamDisplayName: "U12",
        eventKind: "MATCH",
        eventId: "m1",
        eventTitle: "Turnier FC Example",
        eventStartAt: new Date("2026-09-27T09:30:00.000Z"),
        responseId: null,
        responseStatus: "OPEN",
      },
    ] as never);

    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: "t1",
      userId: "vp",
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL, PERMISSIONS.TASKS_MANAGE],
      participationNavCapable: true,
      requirementRecipientCapable: false,
    });
    expect(caps.taskManagement).toBe(true);

    const actions = await loadPersonalActions({ tenantId: "t1", userId: "vp" });
    expect(actions.filter((a) => a.sourceType === "TASK")).toHaveLength(1);
    expect(actions.filter((a) => a.sourceType === "ATTENDANCE_RESPONSE")).toHaveLength(1);
  });

  it("J — dashboard count 2 tasks + 2 attendance = 4", async () => {
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
    vi.mocked(listMyTasks).mockResolvedValue([
      { id: "t1" },
      { id: "t2" },
    ] as never);
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-a", "child-b"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-a",
        personDisplayName: "James",
        teamSeasonId: "ts-1",
        teamDisplayName: "F2",
        eventKind: "TRAINING",
        trainingSessionId: "s1",
        eventTitle: "Training",
        eventStartAt: new Date(),
        responseId: null,
        responseStatus: "OPEN",
      },
      {
        personId: "child-b",
        personDisplayName: "Memphis",
        teamSeasonId: "ts-1",
        teamDisplayName: "F2",
        eventKind: "MATCH",
        eventId: "m1",
        eventTitle: "Spiel",
        eventStartAt: new Date(),
        responseId: null,
        responseStatus: "OPEN",
      },
    ] as never);

    const { countMyOpenTasks } = await import("@/lib/tasks/task-service");
    vi.mocked(countMyOpenTasks).mockResolvedValue(2);

    const counts = await countPersonalActions({ tenantId: "t1", userId: "mixed" });
    expect(counts.totalActionable).toBe(4);
  });
});
