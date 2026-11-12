import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskContextType, TaskStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  meetingAgendaItemFindMany: vi.fn(),
  meetingDecisionFindMany: vi.fn(),
  initiativeUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findMany: mocks.taskFindMany },
    meetingAgendaItem: { findMany: mocks.meetingAgendaItemFindMany },
    meetingDecision: { findMany: mocks.meetingDecisionFindMany },
    initiative: { updateMany: mocks.initiativeUpdateMany },
  },
}));

import { computeInitiativeProgressSnapshot } from "../initiative-progress";

describe("SCE-TASK-01 initiative progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.meetingAgendaItemFindMany.mockResolvedValue([]);
    mocks.meetingDecisionFindMany.mockResolvedValue([]);
  });

  it("counts subtasks instead of parent for initiative-linked work", async () => {
    mocks.taskFindMany.mockResolvedValue([
      {
        id: "parent",
        status: TaskStatus.OPEN,
        parentTaskId: null,
      },
      {
        id: "child-a",
        status: TaskStatus.DONE,
        parentTaskId: "parent",
      },
      {
        id: "child-b",
        status: TaskStatus.OPEN,
        parentTaskId: "parent",
      },
    ]);

    const snap = await computeInitiativeProgressSnapshot("tenant-1", "init-1");
    expect(snap.eligibleCount).toBe(2);
    expect(snap.completedCount).toBe(1);
    expect(snap.progress).toBe(50);
    expect(snap.taskIds.sort()).toEqual(["child-a", "child-b"].sort());
  });

  it("preserves CD-03 zero progress when no eligible tasks", async () => {
    mocks.taskFindMany.mockResolvedValue([]);
    const snap = await computeInitiativeProgressSnapshot("tenant-1", "init-1");
    expect(snap.progress).toBe(0);
    expect(snap.eligibleCount).toBe(0);
  });

  it("deduplicates meeting-decision and initiative contexts by task id", async () => {
    mocks.meetingAgendaItemFindMany.mockResolvedValue([{ id: "agenda-1" }]);
    mocks.meetingDecisionFindMany.mockResolvedValue([{ id: "dec-1" }]);
    mocks.taskFindMany.mockResolvedValue([
      {
        id: "solo",
        status: TaskStatus.DONE,
        parentTaskId: null,
        contextType: TaskContextType.INITIATIVE,
      },
    ]);

    const snap = await computeInitiativeProgressSnapshot("tenant-1", "init-1");
    expect(snap.eligibleCount).toBe(1);
    expect(snap.progress).toBe(100);
  });
});
