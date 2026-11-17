import { describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";
import {
  countAgendaLinkedTasksByAgendaId,
  mergeAgendaLinkedTaskSummaries,
  reconcileAgendaLinkedTasksWithServer,
} from "@/lib/meetings/agenda-linked-task-state";

const base = {
  title: "Task",
  status: TaskStatus.OPEN,
  dueAt: null,
  assigneeLabel: null,
  createdAt: new Date("2026-11-17T10:00:00Z"),
};

describe("agenda linked task state", () => {
  it("deduplicates by task id when merging", () => {
    const merged = mergeAgendaLinkedTaskSummaries(
      [{ ...base, id: "t1", agendaItemId: "a1", decisionId: null }],
      [{ ...base, id: "t1", title: "Updated", agendaItemId: "a1", decisionId: null }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Updated");
  });

  it("reconciles server rows with optimistic client rows", () => {
    const client = [{ ...base, id: "t-new", agendaItemId: "a1", decisionId: null }];
    const server = [{ ...base, id: "t-old", agendaItemId: "a1", decisionId: null }];
    const merged = reconcileAgendaLinkedTasksWithServer(client, server);
    expect(merged.map((t) => t.id).sort()).toEqual(["t-new", "t-old"]);
  });

  it("recomputes per-agenda counts", () => {
    const counts = countAgendaLinkedTasksByAgendaId([
      { ...base, id: "t1", agendaItemId: "a1", decisionId: null },
      { ...base, id: "t2", agendaItemId: "a1", decisionId: null },
      { ...base, id: "t3", agendaItemId: "a2", decisionId: null },
    ]);
    expect(counts.get("a1")).toBe(2);
    expect(counts.get("a2")).toBe(1);
  });
});