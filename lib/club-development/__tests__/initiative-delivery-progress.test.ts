import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  computeInitiativeProgressSnapshot: vi.fn(),
}));

vi.mock("@/lib/club-development/initiative-progress", () => ({
  computeInitiativeProgressSnapshot: mocks.computeInitiativeProgressSnapshot,
}));

import {
  initiativeDeliveryProgressPercentFromSnapshot,
  loadInitiativeDeliveryProgressPercentByIds,
  VORHABEN_WORKSPACE_ROOT_TASK_DISPLAY_LIMIT,
} from "../initiative-delivery-progress";
import { strategySupportingMaterialCounts } from "../initiative-delivery-progress-presentation";

describe("initiative delivery progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clamps canonical snapshot progress to 0–100", () => {
    expect(initiativeDeliveryProgressPercentFromSnapshot({ progress: 140 })).toBe(100);
    expect(initiativeDeliveryProgressPercentFromSnapshot({ progress: -5 })).toBe(0);
    expect(initiativeDeliveryProgressPercentFromSnapshot({ progress: 62 })).toBe(62);
  });

  it("loads delivery progress per initiative from computeInitiativeProgressSnapshot", async () => {
    mocks.computeInitiativeProgressSnapshot.mockImplementation(async (_tenant, id: string) => ({
      progress: id === "a" ? 25 : 75,
      completedCount: 0,
      eligibleCount: 4,
      taskIds: [],
    }));
    const map = await loadInitiativeDeliveryProgressPercentByIds("t1", ["a", "b", "a"]);
    expect(mocks.computeInitiativeProgressSnapshot).toHaveBeenCalledTimes(2);
    expect(map.get("a")).toBe(25);
    expect(map.get("b")).toBe(75);
  });

  it("exposes root task display limit of 40", () => {
    expect(VORHABEN_WORKSPACE_ROOT_TASK_DISPLAY_LIMIT).toBe(40);
  });

  it("counts only accessible strategy documents in supporting summary", () => {
    const counts = strategySupportingMaterialCounts({
      meetingRefs: [{ slug: "m1", title: "M" }],
      decisionRefs: [],
      documentReferences: [
        {
          referenceId: "r1",
          kind: "SUPPORTING",
          linkedAt: "2026-01-01T00:00:00.000Z",
          presentation: { accessible: true, referenceId: "r1" },
        },
        {
          referenceId: "r2",
          kind: "SUPPORTING",
          linkedAt: "2026-01-01T00:00:00.000Z",
          presentation: { accessible: false, referenceId: "r2" },
        },
      ],
    });
    expect(counts).toEqual({ meetings: 1, decisions: 0, documents: 1 });
  });
});