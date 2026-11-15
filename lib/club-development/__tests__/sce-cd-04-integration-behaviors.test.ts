import { describe, expect, it, vi, beforeEach } from "vitest";
import { DevelopmentSprintStatus, TaskStatus } from "@prisma/client";
import { addTaskToSprint, removeTaskFromSprint } from "../sprints/sprint-service";
import { classifySprintCloseTasks } from "../sprints/sprint-close-service";
import { linkInitiativeTarget } from "../initiative-target-links";
import { hasSprintManagePermission } from "../sprints/queries";
import type { ActorContext } from "@/lib/visibility/actor-context";

const prismaMocks = vi.hoisted(() => ({
  developmentSprintFindFirst: vi.fn(),
  developmentSprintTaskMembershipFindFirst: vi.fn(),
  developmentSprintTaskMembershipUpdate: vi.fn(),
  developmentSprintTaskMembershipCreate: vi.fn(),
  developmentSprintTaskMembershipUpdateMany: vi.fn(),
  taskFindFirst: vi.fn(),
  initiativeFindFirst: vi.fn(),
  targetFindFirst: vi.fn(),
  initiativeTargetLinkUpsert: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    developmentSprint: { findFirst: prismaMocks.developmentSprintFindFirst },
    developmentSprintTaskMembership: {
      findFirst: prismaMocks.developmentSprintTaskMembershipFindFirst,
      update: prismaMocks.developmentSprintTaskMembershipUpdate,
      create: prismaMocks.developmentSprintTaskMembershipCreate,
      updateMany: prismaMocks.developmentSprintTaskMembershipUpdateMany,
    },
    task: { findFirst: prismaMocks.taskFindFirst },
    initiative: { findFirst: prismaMocks.initiativeFindFirst },
    target: { findFirst: prismaMocks.targetFindFirst },
    initiativeTargetLink: { upsert: prismaMocks.initiativeTargetLinkUpsert },
  },
}));

function actorWith(perms: string[]): ActorContext {
  return {
    userId: "user-1",
    tenantId: "tenant-1",
    permissionKeys: perms,
    orgUnitIds: [],
    roleKeys: [],
    teamIds: [],
    personId: null,
  } as ActorContext;
}

describe("SCE-CD-04 integration behaviors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sprint manage permission requires initiatives.manage or tasks.manage", () => {
    expect(hasSprintManagePermission(actorWith(["initiatives.view"]))).toBe(false);
    expect(hasSprintManagePermission(actorWith(["tasks.manage"]))).toBe(true);
    expect(hasSprintManagePermission(actorWith(["initiatives.manage"]))).toBe(true);
  });

  it("addTaskToSprint preserves existing initiative context on the task", async () => {
    prismaMocks.developmentSprintFindFirst.mockResolvedValue({
      id: "sprint-1",
      status: DevelopmentSprintStatus.ACTIVE,
    });
    prismaMocks.taskFindFirst.mockResolvedValue({
      id: "task-1",
      contextType: "INITIATIVE",
      contextId: "init-1",
    });
    prismaMocks.developmentSprintTaskMembershipFindFirst.mockResolvedValue(null);
    prismaMocks.developmentSprintTaskMembershipCreate.mockResolvedValue({ id: "mem-1" });

    await addTaskToSprint("tenant-1", "sprint-1", "task-1");

    expect(prismaMocks.developmentSprintTaskMembershipCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        sprintId: "sprint-1",
        taskId: "task-1",
        addedAfterSprintStart: true,
      },
    });
    expect(prismaMocks.taskFindFirst).toHaveBeenCalledWith({
      where: { id: "task-1", tenantId: "tenant-1" },
      select: { id: true, contextType: true, contextId: true },
    });
  });

  it("removeTaskFromSprint soft-removes membership without mutating the task", async () => {
    prismaMocks.developmentSprintTaskMembershipUpdateMany.mockResolvedValue({ count: 1 });

    await removeTaskFromSprint("tenant-1", "sprint-1", "task-2");

    expect(prismaMocks.developmentSprintTaskMembershipUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "tenant-1",
          sprintId: "sprint-1",
          taskId: "task-2",
          removedAt: null,
        },
        data: expect.objectContaining({ removedAt: expect.any(Date) }),
      }),
    );
    expect(prismaMocks.taskFindFirst).not.toHaveBeenCalled();
  });

  it("linkInitiativeTarget validates same-tenant initiative and target", async () => {
    prismaMocks.initiativeFindFirst.mockResolvedValue({ id: "init-1" });
    prismaMocks.targetFindFirst.mockResolvedValue({ id: "target-1" });
    prismaMocks.initiativeTargetLinkUpsert.mockResolvedValue({ id: "link-1" });

    await linkInitiativeTarget("tenant-1", "init-1", "target-1");

    expect(prismaMocks.initiativeFindFirst).toHaveBeenCalledWith({
      where: { id: "init-1", tenantId: "tenant-1" },
      select: { id: true },
    });
    expect(prismaMocks.targetFindFirst).toHaveBeenCalledWith({
      where: { id: "target-1", tenantId: "tenant-1" },
      select: { id: true },
    });
  });

  it("classifies cancelled sprint tasks as unfinished on close", () => {
    const report = classifySprintCloseTasks([
      { taskId: "a", status: TaskStatus.DONE },
      { taskId: "b", status: TaskStatus.CANCELLED },
    ]);
    expect(report.finished).toHaveLength(1);
    expect(report.unfinished).toHaveLength(1);
    expect(report.unfinished[0].taskId).toBe("b");
  });
});
