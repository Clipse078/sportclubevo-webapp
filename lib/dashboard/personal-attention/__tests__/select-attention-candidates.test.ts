import { describe, expect, it } from "vitest";
import {
  collectAttentionTaskIds,
  isPersonalAttentionCandidate,
  selectPersonalAttentionCandidates,
} from "../select-attention-candidates";
import type { PersonalAction } from "@/lib/personal-actions/types";

const now = new Date("2026-09-24T12:00:00.000Z");

function taskAction(overrides: Partial<PersonalAction> = {}): PersonalAction {
  return {
    id: "task:t1",
    sourceType: "TASK",
    sourceId: "t1",
    title: "Task",
    dueAt: null,
    status: "ACTIONABLE",
    href: "/dashboard/aufgaben/t1",
    actionKind: "TASK",
    createdAt: "2026-09-01T00:00:00.000Z",
    priority: "NORMAL",
    ...overrides,
  };
}

describe("DASHBOARD-05 — personal attention candidates", () => {
  it("includes participation and requirement obligations", () => {
    expect(
      isPersonalAttentionCandidate(
        {
          id: "participation:1",
          sourceType: "ATTENDANCE_RESPONSE",
          sourceId: null,
          title: "RSVP",
          dueAt: null,
          status: "ACTIONABLE",
          href: "/x",
          actionKind: "PARTICIPATION_RESPONSE",
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPersonalAttentionCandidate(
        {
          id: "requirement:1",
          sourceType: "REQUIREMENT",
          sourceId: "r1",
          title: "Req",
          dueAt: null,
          status: "ACTIONABLE",
          href: "/y",
          actionKind: "REQUIREMENT_ACK",
        },
        now,
      ),
    ).toBe(true);
  });

  it("includes overdue and due-today tasks only", () => {
    const overdue = taskAction({
      dueAt: "2026-09-20T08:00:00.000Z",
    });
    const dueToday = taskAction({
      id: "task:t2",
      dueAt: "2026-09-24T18:00:00.000Z",
    });
    const dueLater = taskAction({
      id: "task:t3",
      dueAt: "2026-09-28T08:00:00.000Z",
    });
    const noDue = taskAction({ id: "task:t4", dueAt: null });

    expect(isPersonalAttentionCandidate(overdue, now)).toBe(true);
    expect(isPersonalAttentionCandidate(dueToday, now)).toBe(true);
    expect(isPersonalAttentionCandidate(dueLater, now)).toBe(false);
    expect(isPersonalAttentionCandidate(noDue, now)).toBe(false);
  });

  it("dedupes task ids for preview coordination", () => {
    const candidates = selectPersonalAttentionCandidates([
      taskAction({ dueAt: "2026-09-20T08:00:00.000Z" }),
      taskAction({ id: "task:t2", dueAt: "2026-09-28T08:00:00.000Z" }),
    ], now);
    const ids = collectAttentionTaskIds(candidates);
    expect(ids.has("task:t1")).toBe(true);
    expect(ids.has("task:t2")).toBe(false);
  });

  it("ignores completed task semantics at action layer (open actions only)", () => {
    const action = taskAction({
      dueAt: "2026-09-20T08:00:00.000Z",
      status: "ACTIONABLE",
    });
    expect(action.status).toBe("ACTIONABLE");
    expect(isPersonalAttentionCandidate(action, now)).toBe(true);
  });
});
