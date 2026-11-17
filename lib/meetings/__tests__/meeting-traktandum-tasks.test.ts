import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType } from "@prisma/client";
import { TaskValidationError } from "@/lib/tasks/errors";

const { findFirst, findMany, update } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meetingAgendaItem: { findFirst: vi.fn() },
    meetingDecision: { findFirst: vi.fn(), findMany: vi.fn() },
    task: { findFirst, update, findMany },
  },
}));

vi.mock("@/lib/visibility/visibility-guards", () => ({
  requireMeetingAccess: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn().mockResolvedValue({ tenantId: "t1", userId: "u1", permissionKeys: [] }),
}));

const createTaskWithContextDefaults = vi.fn().mockResolvedValue({ id: "task-new" });

vi.mock("@/lib/tasks/contextual-task-create", () => ({
  createTaskWithContextDefaults: (...args: unknown[]) => createTaskWithContextDefaults(...args),
}));

vi.mock("@/lib/meetings/meeting-decision-tasks", () => ({
  createMeetingDecisionTask: vi
    .fn()
    .mockResolvedValue({ taskId: "task-decision", deduplicated: false }),
}));

import { prisma } from "@/lib/db/prisma";
import { createMeetingTraktandumTask } from "@/lib/meetings/meeting-traktandum-tasks";

const actor = { tenantId: "t1", userId: "u1", permissionKeys: [], orgUnitIds: [], targetGroupIds: [] };

const existingRow = {
  id: "task-existing",
  title: "Follow up",
  description: null,
  dueAt: null,
  priority: "NORMAL" as const,
  orgUnitId: null,
  assignees: [] as { userId: string }[],
};

describe("createMeetingTraktandumTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.meetingAgendaItem.findFirst).mockResolvedValue({ id: "a1", meetingId: "m1" });
  });

  it("deduplicates by client occurrence key when payload matches", async () => {
    findFirst.mockResolvedValueOnce(existingRow);
    const result = await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Follow up",
      clientRequestId: "req-1",
    });
    expect(result).toEqual({ taskId: "task-existing", deduplicated: true });
    expect(createTaskWithContextDefaults).not.toHaveBeenCalled();
  });

  it("rejects same request id with changed payload", async () => {
    findFirst.mockResolvedValueOnce({ ...existingRow, title: "Different" });
    await expect(
      createMeetingTraktandumTask(actor, "m1", "a1", {
        title: "Follow up",
        clientRequestId: "req-1",
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("creates MEETING task with occurrence key on first submit", async () => {
    findFirst.mockResolvedValueOnce(null);
    const result = await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Follow up",
      clientRequestId: "req-2",
    });
    expect(result.taskId).toBe("task-new");
    expect(createTaskWithContextDefaults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        task: expect.objectContaining({
          seriesOccurrenceKey: "sce-mtg-traktandum-task:v1:a1:req-2",
        }),
        trustedContext: { contextType: TaskContextType.MEETING, contextId: "m1" },
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("allows distinct client request ids with identical titles", async () => {
    findFirst.mockResolvedValue(null);
    await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Same title",
      clientRequestId: "req-a",
    });
    await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Same title",
      clientRequestId: "req-b",
    });
    expect(createTaskWithContextDefaults).toHaveBeenCalledTimes(2);
    const keys = createTaskWithContextDefaults.mock.calls.map(
      (call) => (call[1] as { task: { seriesOccurrenceKey: string } }).task.seriesOccurrenceKey,
    );
    expect(keys).toEqual([
      "sce-mtg-traktandum-task:v1:a1:req-a",
      "sce-mtg-traktandum-task:v1:a1:req-b",
    ]);
  });

  it("resolves concurrent unique races to the original task", async () => {
    findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingRow);
    createTaskWithContextDefaults.mockRejectedValueOnce({ code: "P2002" });
    const result = await createMeetingTraktandumTask(actor, "m1", "a1", {
      title: "Follow up",
      clientRequestId: "req-race",
    });
    expect(result).toEqual({ taskId: "task-existing", deduplicated: true });
  });
});