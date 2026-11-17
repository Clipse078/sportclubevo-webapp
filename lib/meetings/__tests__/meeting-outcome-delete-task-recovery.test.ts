import { TaskContextType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMeetingDecisionTaskOccurrenceKey,
  buildTraktandumTaskOccurrenceKey,
  parseAgendaItemIdFromTraktandumTaskOccurrenceKey,
} from "@/lib/meetings/meeting-traktandum-task-link";

const tenantId = "tenant-1";
const meetingId = "m1";
const agendaItemId = "a1";
const decisionId = "d1";
const taskId = "task-1";
const clientRequestId = "client-req-1";

const prismaMock = vi.hoisted(() => {
  const tx = {
    meetingDecision: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    meetingAction: { findMany: vi.fn() },
    task: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    meetingDecisionApprovalVote: { deleteMany: vi.fn() },
  };
  return {
    meetingDecision: { findFirst: vi.fn() },
    meetingAction: { findMany: vi.fn() },
    task: { count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (fn: (ctx: typeof tx) => Promise<void>) => fn(tx)),
    __tx: tx,
  };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { deleteMeetingDecisionWithDependencies } from "@/lib/meetings/meeting-outcome-delete-service";

describe("Beschluss delete preserves linked Aufgabe origin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.meetingDecision.findFirst.mockResolvedValue({
      id: decisionId,
      title: "Budget",
      sourceAgendaItemId: agendaItemId,
    });
    prismaMock.meetingAction.findMany.mockResolvedValue([]);
    prismaMock.task.count.mockResolvedValue(1);
    prismaMock.__tx.meetingDecision.findFirst.mockResolvedValue({
      id: decisionId,
      sourceAgendaItemId: agendaItemId,
    });
    prismaMock.__tx.meetingAction.findMany.mockResolvedValue([]);
    const decisionBridgeKey = buildMeetingDecisionTaskOccurrenceKey(decisionId, clientRequestId);
    prismaMock.__tx.task.findMany.mockResolvedValue([
      { id: taskId, seriesOccurrenceKey: decisionBridgeKey },
    ]);
  });

  it("relinks task to MEETING and rehomes seriesOccurrenceKey to traktandum bridge", async () => {
    await deleteMeetingDecisionWithDependencies(meetingId, tenantId, decisionId);

    expect(prismaMock.__tx.task.update).toHaveBeenCalledWith({
      where: { id: taskId },
      data: {
        contextType: TaskContextType.MEETING,
        contextId: meetingId,
        seriesOccurrenceKey: buildTraktandumTaskOccurrenceKey(agendaItemId, clientRequestId),
      },
    });
    expect(prismaMock.__tx.meetingDecision.delete).toHaveBeenCalledWith({ where: { id: decisionId } });
    expect(prismaMock.__tx.meetingDecisionApprovalVote.deleteMany).toHaveBeenCalled();
  });

  it("preserves idempotency client segment on rehomed bridge key", async () => {
    await deleteMeetingDecisionWithDependencies(meetingId, tenantId, decisionId);
    const key = (prismaMock.__tx.task.update.mock.calls[0]?.[0] as { data: { seriesOccurrenceKey: string } })
      .data.seriesOccurrenceKey;
    expect(parseAgendaItemIdFromTraktandumTaskOccurrenceKey(key)).toBe(agendaItemId);
    expect(key).toBe(buildTraktandumTaskOccurrenceKey(agendaItemId, clientRequestId));
  });
});