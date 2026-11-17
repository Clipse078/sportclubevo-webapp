import { TaskContextType, TaskStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTraktandumTaskOccurrenceKey } from "@/lib/meetings/meeting-traktandum-task-link";

const prismaListMock = vi.hoisted(() => ({
  task: { findMany: vi.fn() },
  meetingDecision: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaListMock }));

import { listAgendaLinkedTaskSummaries } from "@/lib/meetings/meeting-traktandum-tasks";

describe("listAgendaLinkedTaskSummaries after Beschluss delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surfaces MEETING-context task via traktandum bridge under correct agendaItemId", async () => {
    const tenantId = "t1";
    const meetingId = "m1";
    const agendaItemId = "a1";
    const traktandumKey = buildTraktandumTaskOccurrenceKey(agendaItemId, "client-req-1");

    prismaListMock.task.findMany.mockImplementation((args: { where?: { OR?: unknown[] } }) => {
      const isPrefixQuery = Boolean(args.where?.OR);
      if (isPrefixQuery) {
        return Promise.resolve([
          {
            id: "task-1",
            title: "Umsetzung",
            status: TaskStatus.OPEN,
            dueAt: null,
            createdAt: new Date("2026-11-17T12:00:00Z"),
            seriesOccurrenceKey: traktandumKey,
            contextType: TaskContextType.MEETING,
            contextId: meetingId,
            taskSeriesId: null,
            assignees: [],
          },
        ]);
      }
      return Promise.resolve([]);
    });
    prismaListMock.meetingDecision.findMany.mockResolvedValue([]);

    const rows = await listAgendaLinkedTaskSummaries(tenantId, meetingId, [agendaItemId]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "task-1",
      agendaItemId,
      decisionId: null,
    });
  });
});