import { describe, expect, it, vi, beforeEach } from "vitest";

const findAgenda = vi.fn();
const findDecision = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meetingAgendaItem: { findFirst: (...args: unknown[]) => findAgenda(...args) },
    meetingDecision: { findFirst: (...args: unknown[]) => findDecision(...args) },
  },
}));

import { resolveMeetingActionLinkedRefs } from "@/lib/meetings/meeting-action-linked-refs";
import { buildMeetingActionLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";

const actor = { tenantId: "t1", userId: "u1", permissionKeys: [] } as never;

describe("meeting action linked refs", () => {
  beforeEach(() => {
    findAgenda.mockReset();
    findDecision.mockReset();
  });

  it("preserves agenda and decision references when both are valid", async () => {
    findAgenda.mockResolvedValue({ id: "a1" });
    findDecision.mockResolvedValue({ id: "d1", sourceAgendaItemId: "a1" });

    const refs = await resolveMeetingActionLinkedRefs(actor, "m1", {
      agendaItemId: "a1",
      decisionId: "d1",
    });

    expect(refs).toEqual({ agendaItemId: "a1", decisionId: "d1" });
  });

  it("fills agenda from Beschluss when only decisionId is sent", async () => {
    findDecision.mockResolvedValue({ id: "d1", sourceAgendaItemId: "a2" });

    const refs = await resolveMeetingActionLinkedRefs(actor, "m1", { decisionId: "d1" });

    expect(refs).toEqual({ agendaItemId: "a2", decisionId: "d1" });
    expect(findAgenda).not.toHaveBeenCalled();
  });

  it("rejects decision on another Traktandum", async () => {
    findAgenda.mockResolvedValue({ id: "a1" });
    findDecision.mockResolvedValue({ id: "d1", sourceAgendaItemId: "a-other" });

    await expect(
      resolveMeetingActionLinkedRefs(actor, "m1", { agendaItemId: "a1", decisionId: "d1" }),
    ).rejects.toThrow(/Traktandum/);
  });

  it("buildMeetingActionLinkedRefs never drops explicit ids", () => {
    expect(buildMeetingActionLinkedRefs({ agendaItemId: "a1", decisionId: "d1" })).toEqual({
      agendaItemId: "a1",
      decisionId: "d1",
    });
  });
});