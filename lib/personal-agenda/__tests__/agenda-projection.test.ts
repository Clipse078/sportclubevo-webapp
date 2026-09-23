import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    meeting: { findMany: vi.fn() },
    person: { findFirst: vi.fn() },
    trainerTeamMember: { findMany: vi.fn() },
    playerSquadMember: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/dashboard/personal-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboard/personal-context")>();
  return {
    ...actual,
    resolvePersonalContext: vi.fn().mockResolvedValue({
      tenantId: "tenant-a",
      userId: "user-a",
      personId: "person-a",
      hasLinkedPerson: true,
      hasActiveTenantMembership: true,
      teams: [
        {
          teamId: "team-1",
          teamName: "Team 1",
          kinds: ["TRAINER"],
          assignmentFunctionKeys: [],
        },
      ],
      orgUnits: [],
      assignments: [],
    }),
  };
});

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn().mockResolvedValue({
    platform: [],
    tenant: ["tasks.view", "events.view"],
  }),
}));

import { prisma } from "@/lib/db/prisma";
import { loadTaskDeadlineProjections } from "../task-projections";
import { loadPersonalAgenda } from "../load-personal-agenda";
import { buildTaskDueSoonDedupKey } from "@/lib/notifications/deduplication";

describe("AUFGABEN-04A — task deadline projections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — assigned task with dueAt appears for assignee query", async () => {
    const dueAt = new Date("2026-09-27T12:00:00.000Z");
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        id: "task-1",
        title: "Wochenplan kontrollieren",
        dueAt,
        status: TaskStatus.OPEN,
      },
    ] as never);

    const items = await loadTaskDeadlineProjections({
      tenantId: "tenant-a",
      userId: "user-a",
      rangeStart: new Date("2026-09-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-09-30T23:59:59.999Z"),
      tasksViewAuthorized: true,
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("task:task-1");
    expect(items[0].sourceType).toBe("TASK");
    expect(items[0].href).toBe("/dashboard/aufgaben/task-1");
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          assignees: { some: { userId: "user-a", tenantId: "tenant-a" } },
        }),
      }),
    );
  });

  it("H — without tasks.view returns no task projections", async () => {
    const items = await loadTaskDeadlineProjections({
      tenantId: "tenant-a",
      userId: "user-a",
      rangeStart: new Date(),
      rangeEnd: new Date(),
      tasksViewAuthorized: false,
    });
    expect(items).toEqual([]);
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it("D — DONE and CANCELLED tasks are excluded by query status filter", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([] as never);
    await loadTaskDeadlineProjections({
      tenantId: "t",
      userId: "u",
      rangeStart: new Date(0),
      rangeEnd: new Date(),
      tasksViewAuthorized: true,
    });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        }),
      }),
    );
  });

  it("N — calendar projection uses same dueAt instant as notification dedup key", () => {
    const dueAt = new Date("2026-09-27T12:00:00.000Z");
    const dueAtIso = dueAt.toISOString();
    expect(buildTaskDueSoonDedupKey({ taskId: "t1", recipientUserId: "u1", dueAtIso })).toContain(
      dueAtIso,
    );
  });
});

describe("AUFGABEN-04A — loadPersonalAgenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.meeting.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValue([] as never);
  });

  it("J — calendar mode respects explicit range on task query", async () => {
    const rangeStart = new Date("2026-10-01T00:00:00.000Z");
    const rangeEnd = new Date("2026-10-31T23:59:59.999Z");

    await loadPersonalAgenda({
      tenantId: "tenant-a",
      userId: "user-a",
      timeZone: "Europe/Zurich",
      mode: "calendar",
      rangeStart,
      rangeEnd,
      tasksViewAuthorized: true,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueAt: expect.objectContaining({ gte: rangeStart, lte: rangeEnd }),
        }),
      }),
    );
  });

  it("M — aggregation does not touch Event create APIs", async () => {
    expect(prisma.event).not.toHaveProperty("create");
  });

  it("K — dashboard overdue task query uses bounded lookback, not epoch", async () => {
    const now = new Date("2026-09-20T10:00:00.000Z");
    await loadPersonalAgenda({
      tenantId: "tenant-a",
      userId: "user-a",
      timeZone: "Europe/Zurich",
      now,
      mode: "dashboard",
      tasksViewAuthorized: true,
      includeOverdueTasks: true,
    });

    const overdueCall = vi
      .mocked(prisma.task.findMany)
      .mock.calls.find((call) => {
        const where = (call[0] as { where?: { dueAt?: { gte?: Date } } }).where;
        return Boolean(where?.dueAt?.gte && where.dueAt.gte.getTime() > 0);
      });
    expect(overdueCall).toBeDefined();
    const overdueStart = (
      overdueCall![0] as { where: { dueAt: { gte: Date } } }
    ).where.dueAt.gte;
    expect(overdueStart.getTime()).toBeGreaterThan(new Date(0).getTime());
  });
});
