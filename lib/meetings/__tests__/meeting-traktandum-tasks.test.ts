import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType } from "@prisma/client";

const { findFirst, update, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meetingAgendaItem: { findFirst: vi.fn() },
    meetingDecision: { findFirst: vi.fn() },
    task: { findFirst, update, findMany },
  },
}));

vi.mock("@/lib/visibility/visibility-guards", () => ({
  requireMeetingAccess: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn().mockResolvedValue({ tenantId: "t1", userId: "u1", permissionKeys: [] }),
}));

vi.mock("@/lib/tasks/contextual-task-create", () => ({
  createTaskWithContextDefaults: vi.fn().mockResolvedValue({ id: "task-new" }),
}));

vi.mock("@/lib/meetings/meeting-decision-tasks", () => ({
  createMeetingDecisionTask: vi
    .fn()
    .mockResolvedValue({ taskId: "task-decision", deduplicated: false }),
}));

import { prisma } from "@/lib/db/prisma";
import { createMeetingTraktandumTask } from "@/lib/meetings/meeting-traktandum-tasks";
import { createTaskWithContextDefaults } from "@/lib/tasks/contextual-task-create";

const actor = { tenantId: "t1", userId: "u1", permissionKeys: [], orgUnitIds: [], targetGroupIds: [] };

describe("createMeetingTraktandumTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.meetingAgendaItem.findFirst).mockResolvedValue({ id: "a1", meetingId: "m1" });
  });

  it("deduplicates by client occurrence key", async () => {
    findFirst.mockResolvedValueOnce({ id: "task-existing" });
    const result = await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Follow up",
      clientRequestId: "req-1",
    });
    expect(result).toEqual({ taskId: "task-existing", deduplicated: true });
    expect(createTaskWithContextDefaults).not.toHaveBeenCalled();
  });

  it("creates MEETING task and stamps occurrence key", async () => {
    findFirst.mockResolvedValueOnce(null);
    const result = await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Follow up",
      clientRequestId: "req-2",
    });
    expect(result.taskId).toBe("task-new");
    expect(createTaskWithContextDefaults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        trustedContext: { contextType: TaskContextType.MEETING, contextId: "m1" },
      }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: "task-new" },
      data: { seriesOccurrenceKey: "sce-mtg-traktandum-task:v1:a1:req-2" },
    });
  });
});