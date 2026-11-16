import { describe, expect, it } from "vitest";
import { createMeetingAgendaTimerState } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";
import {
  getSitzungsmodusSummaryActionLabel,
  isSitzungsmodusResumable,
} from "@/lib/meetings/sitzungsmodus/meeting-guided-sitzungsmodus";
import { shouldOfferGuidedSitzungsmodusSummary } from "@/lib/meetings/sitzungsmodus/meeting-guided-summary-action";
import { MEETING_GUIDED_OUTCOMES_SCHEMA_NOTE } from "@/lib/meetings/sitzungsmodus/meeting-guided-outcomes-schema";

const scope = { meetingId: "m1", tenantId: "t1", userId: "u1" };

describe("meeting guided sitzungsmodus", () => {
  it("detects resumable session snapshots", () => {
    const base = createMeetingAgendaTimerState(scope);
    expect(isSitzungsmodusResumable(base)).toBe(false);
    expect(getSitzungsmodusSummaryActionLabel(base)).toBe("Sitzungsmodus starten");

    const resumed = { ...base, modeActive: true };
    expect(isSitzungsmodusResumable(resumed)).toBe(true);
    expect(getSitzungsmodusSummaryActionLabel(resumed)).toBe("Sitzungsmodus fortsetzen");
  });

  it("offers summary action when timer scope and agenda exist", () => {
    expect(
      shouldOfferGuidedSitzungsmodusSummary({
        canManage: true,
        hasTimerScope: true,
        agendaCount: 2,
        status: "PLANNED",
      }),
    ).toBe(true);
    expect(
      shouldOfferGuidedSitzungsmodusSummary({
        canManage: true,
        hasTimerScope: false,
        agendaCount: 2,
        status: "PLANNED",
      }),
    ).toBe(false);
  });

  it("documents durable outcome schema links", () => {
    expect(MEETING_GUIDED_OUTCOMES_SCHEMA_NOTE).toContain("sourceAgendaItemId");
    expect(MEETING_GUIDED_OUTCOMES_SCHEMA_NOTE).toContain("linkedRefs");
  });
});