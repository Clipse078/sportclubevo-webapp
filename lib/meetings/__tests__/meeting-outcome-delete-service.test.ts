import { TaskContextType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  meetingDecision: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  meetingAction: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  task: {
    count: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  meetingDecisionApprovalVote: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import {
  getMeetingDecisionDeletionImpact,
  deleteMeetingDecisionWithDependencies,
  getMeetingActionDeletionImpact,
  deleteMeetingActionRecord,
} from "@/lib/meetings/meeting-outcome-delete-service";

describe("meeting-outcome-delete-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts linked pendenzen and tasks for decision delete preview", async () => {
    prismaMock.meetingDecision.findFirst.mockResolvedValue({ id: "d1" });
    prismaMock.meetingAction.findMany.mockResolvedValue([
      { linkedRefs: { agendaItemId: "a1", decisionId: "d1" } },
      { linkedRefs: { agendaItemId: "a1" } },
    ]);
    prismaMock.task.count.mockResolvedValue(2);

    const impact = await getMeetingDecisionDeletionImpact("m1", "t1", "d1");
    expect(impact).toEqual({ linkedPendenzCount: 1, linkedTaskCount: 2 });
    expect(prismaMock.task.count).toHaveBeenCalledWith({
      where: {
        tenantId: "t1",
        contextType: TaskContextType.MEETING_DECISION,
        contextId: "d1",
      },
    });
  });

  it("relinks tasks and clears decision refs before deleting Beschluss", async () => {
    const tx = {
      meetingDecision: {
        findFirst: vi.fn().mockResolvedValue({ id: "d1", sourceAgendaItemId: "a1" }),
        delete: vi.fn(),
      },
      meetingAction: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: "act1", linkedRefs: { agendaItemId: "a1", decisionId: "d1" } }]),
        update: vi.fn(),
      },
      task: {
        findMany: vi.fn().mockResolvedValue([{ id: "t1", seriesOccurrenceKey: null }]),
        update: vi.fn(),
      },
      meetingDecisionApprovalVote: { deleteMany: vi.fn() },
    };
    prismaMock.meetingDecision.findFirst.mockResolvedValue({
      id: "d1",
      title: "Budget",
      sourceAgendaItemId: "a1",
    });
    prismaMock.meetingAction.findMany.mockResolvedValue([
      { linkedRefs: { agendaItemId: "a1", decisionId: "d1" } },
    ]);
    prismaMock.task.count.mockResolvedValue(1);
    prismaMock.$transaction.mockImplementation(async (fn: (ctx: typeof tx) => Promise<void>) => {
      await fn(tx);
    });

    const result = await deleteMeetingDecisionWithDependencies("m1", "t1", "d1");
    expect(result?.title).toBe("Budget");
    expect(tx.task.findMany).toHaveBeenCalled();
    expect(tx.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        contextType: TaskContextType.MEETING,
        contextId: "m1",
      },
    });
    expect(tx.meetingAction.update).toHaveBeenCalledWith({
      where: { id: "act1" },
      data: { linkedRefs: { agendaItemId: "a1" } },
    });
    expect(tx.meetingDecision.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("preview for pendenz delete does not imply task deletion", async () => {
    prismaMock.meetingAction.findFirst.mockResolvedValue({
      id: "p1",
      linkedRefs: { decisionId: "d1" },
    });
    prismaMock.meetingDecision.findFirst.mockResolvedValue({ id: "d1", title: "Beschluss X" });

    const impact = await getMeetingActionDeletionImpact("m1", "t1", "p1");
    expect(impact?.linkedDecisionTitle).toBe("Beschluss X");
  });

  it("deleteMeetingActionRecord removes only the pendenz row", async () => {
    prismaMock.meetingAction.findFirst
      .mockResolvedValueOnce({ id: "p1", title: "Nachfassen" })
      .mockResolvedValueOnce({ id: "p1" });
    const result = await deleteMeetingActionRecord("m1", "t1", "p1");
    expect(result?.title).toBe("Nachfassen");
    expect(prismaMock.meetingAction.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});